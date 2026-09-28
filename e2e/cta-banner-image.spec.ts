import { test, expect, type Locator, type Page } from '@playwright/test'
import { measureContrast } from './contrast'

/**
 * Template 2026.09.10 — image-bg / image-bg-centered cta-banners draw their
 * photo (before, the photo painted behind the section's bg-primary fill and
 * every image banner rendered flat). Measured from real pixels:
 *
 *   1. The photo shows through: the same banner over a white and a black
 *      photo must differ visibly (it was pixel-identical before the fix).
 *   2. WCAG AA for the copy over the photo: the text is hidden, the banner is
 *      screenshotted, and EVERY pixel under the heading's and the body's line
 *      boxes is compared with the text colour composited over that pixel
 *      (the body is 80% alpha). The minimum must be ≥ 4.5:1 — the small-text
 *      bar, for the heading too — over a bright (pure white, the worst case)
 *      photo, a dark (pure black) photo and the specimen's real photo.
 *   3. The button label sits on its own opaque action fill, so its ratio
 *      must equal the colour banner's (a palette property the photo cannot
 *      change). The fill-vs-scrim edge is recorded as an annotation only.
 *
 * Light and dark colour schemes, desktop and phone widths, the centred and the
 * plain banner (the centred cell with its layout hooks removed = the plain
 * image-bg markup), the ink cell, and a light brand primary (the scrim must
 * stay dark enough whatever the palette). Content-agnostic: the specimen
 * cells render from the template's sample content in every repo.
 */
const LAYOUTS = '/design-specimen?layouts=1'
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]
const AA = 4.5

type Photo = 'white' | 'black' | 'real'

/** Replace the banner photo with a flat colour (a worst-case "photo"). */
async function setPhoto(section: Locator, photo: Photo) {
  if (photo === 'real') return
  await section.evaluate(async (root, fill) => {
    const img = root.querySelector('img')!
    const c = document.createElement('canvas')
    c.width = 1600
    c.height = 900
    const ctx = c.getContext('2d')!
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, c.width, c.height)
    img.removeAttribute('srcset')
    img.removeAttribute('loading')
    img.src = c.toDataURL('image/png')
    await img.decode()
  }, photo === 'white' ? '#ffffff' : '#000000')
}

/** Screenshot of the banner with its copy made transparent (the background only). */
async function backgroundShot(page: Page, section: Locator): Promise<string> {
  await section.evaluate((el) => el.setAttribute('data-e2e-hide-copy', ''))
  const style = await page.addStyleTag({
    content: '[data-e2e-hide-copy] :is(h2, .prose, .prose *) { color: transparent !important; text-shadow: none !important; }',
  })
  const png = await section.screenshot({ animations: 'disabled' })
  await style.evaluate((s) => (s as HTMLElement).remove())
  await section.evaluate((el) => el.removeAttribute('data-e2e-hide-copy'))
  return png.toString('base64')
}

type CopySample = { label: string; min: number; bgLumMin: number; bgLumMax: number; pixels: number }

/**
 * For the heading and each body paragraph: every background pixel under its
 * text line boxes vs. the text colour (alpha + opacity composited over that
 * pixel). Returns the minimum WCAG ratio and the luminance range sampled.
 */
async function copyContrast(section: Locator, base64: string): Promise<CopySample[]> {
  return section.evaluate(async (root, b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const origin = root.getBoundingClientRect()
    const scale = canvas.width / origin.width

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const rgba = (css: string): [number, number, number, number] => {
      probe.clearRect(0, 0, 1, 1)
      probe.fillStyle = '#000'
      probe.fillStyle = css
      probe.fillRect(0, 0, 1, 1)
      const d = probe.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const lum = (r: number, g: number, b: number) => {
      const lin = (c: number) => {
        const s = c / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    const opacityUpTo = (el: Element) => {
      let o = 1
      for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
      return o
    }

    const targets = [root.querySelector('h2'), ...root.querySelectorAll('.prose p')].filter(Boolean) as Element[]
    return targets.map((el) => {
      const [fr, fg, fb, fa0] = rgba(getComputedStyle(el).color)
      const fa = fa0 * opacityUpTo(el)
      const range = document.createRange()
      range.selectNodeContents(el)
      let min = Infinity
      let bgLumMin = Infinity
      let bgLumMax = -Infinity
      let pixels = 0
      for (const r of Array.from(range.getClientRects())) {
        const x0 = Math.max(0, Math.floor((r.left - origin.left) * scale))
        const x1 = Math.min(canvas.width, Math.ceil((r.right - origin.left) * scale))
        const y0 = Math.max(0, Math.floor((r.top - origin.top) * scale))
        const y1 = Math.min(canvas.height, Math.ceil((r.bottom - origin.top) * scale))
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * canvas.width + x) * 4
            const [br, bg, bb] = [data[i], data[i + 1], data[i + 2]]
            const lb = lum(br, bg, bb)
            const lf = lum(fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa))
            const ratio = (Math.max(lb, lf) + 0.05) / (Math.min(lb, lf) + 0.05)
            if (ratio < min) min = ratio
            if (lb < bgLumMin) bgLumMin = lb
            if (lb > bgLumMax) bgLumMax = lb
            pixels++
          }
        }
      }
      return {
        label: `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 24)}"`,
        min: Math.round(min * 100) / 100,
        bgLumMin: Math.round(bgLumMin * 1000) / 1000,
        bgLumMax: Math.round(bgLumMax * 1000) / 1000,
        pixels,
      }
    })
  }, base64)
}

/** Mean absolute per-channel difference between two same-size screenshots. */
async function meanDiff(page: Page, a: string, b: string): Promise<number> {
  return page.evaluate(async ([pa, pb]) => {
    const load = async (b64: string) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)
      return ctx.getImageData(0, 0, c.width, c.height).data
    }
    const [da, db] = [await load(pa), await load(pb)]
    let sum = 0
    let n = 0
    for (let i = 0; i < Math.min(da.length, db.length); i += 4) {
      sum += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
      n += 3
    }
    return sum / n
  }, [a, b] as const)
}

/** Button fill vs the scrim pixels just outside its box (min ratio; informational). */
async function buttonEdgeContrast(section: Locator): Promise<number> {
  const button = section.locator('a[data-c5="button"]')
  const fill = await button.evaluate((el) => getComputedStyle(el).backgroundColor)
  const shot = await section.screenshot({ animations: 'disabled' })
  return section.evaluate(async (root, [b64, fillCss]) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0)
    const o = root.getBoundingClientRect()
    const scale = c.width / o.width
    const r = root.querySelector('a[data-c5="button"]')!.getBoundingClientRect()
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    probe.fillStyle = fillCss
    probe.fillRect(0, 0, 1, 1)
    const f = probe.getImageData(0, 0, 1, 1).data
    const lum = (r: number, g: number, b: number) => {
      const lin = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    const lf = lum(f[0], f[1], f[2])
    let min = Infinity
    const pad = 4
    const ring = [
      ...Array.from({ length: Math.round(r.width) }, (_, i) => [r.left + i, r.top - pad]),
      ...Array.from({ length: Math.round(r.width) }, (_, i) => [r.left + i, r.bottom + pad]),
      ...Array.from({ length: Math.round(r.height) }, (_, i) => [r.left - pad, r.top + i]),
      ...Array.from({ length: Math.round(r.height) }, (_, i) => [r.right + pad, r.top + i]),
    ]
    for (const [x, y] of ring) {
      const px = Math.round((x - o.left) * scale)
      const py = Math.round((y - o.top) * scale)
      if (px < 0 || py < 0 || px >= c.width || py >= c.height) continue
      const d = ctx.getImageData(px, py, 1, 1).data
      const lb = lum(d[0], d[1], d[2])
      min = Math.min(min, (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05))
    }
    return Math.round(min * 100) / 100
  }, [shot.toString('base64'), fill] as const)
}

type Banner = { name: string; cell: string; plain?: boolean }
const BANNERS: Banner[] = [
  { name: 'image-bg', cell: 'cta-banner:image-bg-centered', plain: true },
  { name: 'image-bg-centered', cell: 'cta-banner:image-bg-centered' },
  { name: 'image-bg-centered ink', cell: 'cta-banner:image-bg-centered:ink' },
]

async function openBanner(page: Page, b: Banner): Promise<Locator> {
  await page.goto(LAYOUTS)
  await page.waitForLoadState('networkidle')
  const section = page.locator(`[data-specimen-layout="${b.cell}"] [data-block="cta-banner"]`)
  await section.scrollIntoViewIfNeeded()
  if (b.plain) {
    // The plain image-bg banner = the centred cell minus its layout hooks (R1).
    await section.evaluate((el) => {
      el.removeAttribute('data-layout')
      for (const n of el.querySelectorAll('[data-c5-slot]')) n.removeAttribute('data-c5-slot')
    })
  }
  await section.evaluate(async (el) => {
    const img = el.querySelector('img')!
    img.removeAttribute('loading')
    if (!img.complete) await new Promise((r) => img.addEventListener('load', r, { once: true }))
    await document.fonts.ready
  })
  await page.addStyleTag({ content: '.fixed, .sticky { visibility: hidden !important; }' })
  return section
}

for (const vp of VIEWPORTS) {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`cta-banner image (${vp.name}, ${scheme})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.emulateMedia({ colorScheme: scheme })
      })

      for (const b of BANNERS) {
        test(`${b.name}: the photo shows and the copy holds ${AA}:1 over bright, dark and real photos`, async ({ page }) => {
          const section = await openBanner(page, b)
          if (scheme === 'dark') expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)

          const shots: Partial<Record<Photo, string>> = {}
          for (const photo of ['real', 'white', 'black'] as const) {
            await setPhoto(section, photo)
            const shot = await backgroundShot(page, section)
            shots[photo] = shot
            const samples = await copyContrast(section, shot)
            test.info().annotations.push({ type: `contrast ${photo} photo`, description: samples.map((s) => `${s.label} ${s.min}:1`).join(', ') })
            expect(samples.length, 'heading + body sampled').toBeGreaterThanOrEqual(2)
            for (const s of samples) {
              expect(s.pixels, `${s.label}: no pixels sampled`).toBeGreaterThan(100)
              expect(s.min, `${b.name} ${photo} photo — ${s.label} (bg luminance ${s.bgLumMin}–${s.bgLumMax})`).toBeGreaterThanOrEqual(AA)
            }
            // Informational: the button's opaque action fill vs the scrim just
            // outside it. Not a WCAG requirement for a text button (its label
            // identifies it — Understanding 1.4.11), and palette-dependent.
            const edge = await buttonEdgeContrast(section)
            test.info().annotations.push({ type: `button edge ${photo} photo`, description: `${edge}:1` })
          }
          // The photo is drawn: white vs black photo changes the banner visibly.
          const diff = await meanDiff(page, shots.white!, shots.black!)
          test.info().annotations.push({ type: 'photo visibility', description: `white vs black photo: mean channel diff ${diff.toFixed(1)}` })
          expect(diff, 'the photo does not show through (flat banner)').toBeGreaterThan(20)

          // Button (WCAG 1.4.3): its label sits on its own opaque action fill,
          // so the photo cannot change it — it must read exactly as on the
          // colour banner (whatever the palette gives; see the colour cell).
          const label = async (cell: string) =>
            (await measureContrast(page, { selector: `[data-specimen-layout="${cell}"] [data-block="cta-banner"] a[data-c5="button"]` }))[0]
          const [onImage, onColour] = [await label(b.cell), await label('cta-banner:color-bg-centered')]
          test.info().annotations.push({ type: 'button label', description: `${onImage.ratio}:1 (${onImage.fg} on ${onImage.bg}); colour banner ${onColour.ratio}:1` })
          expect(onImage.ratio).toBe(onColour.ratio)
          expect(onImage.bg).toBe(onColour.bg)
        })
      }
    })
  }
}

test('palette-independent: a light brand primary, and a theme without the ink token', async ({ browser }) => {
  const cases: Record<string, Record<string, string>> = {
    // A light gold brand: its generated primary-foreground is dark and its ink
    // is generate-theme.ts's mix(near-black, primary, .4, lab) at 12% lightness.
    'gold primary': { '--color-primary': '#E8C547', '--color-primary-foreground': '#1A1C1E', '--color-ink': '#292414' },
    // Themes generated before the ink token (e.g. Slachta, TruCount): the
    // scrim falls back to near-black (`initial` = guaranteed-invalid → var() fallback).
    'no ink token': { '--color-ink': 'initial' },
  }
  for (const [name, vars] of Object.entries(cases)) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const section = await openBanner(page, BANNERS[0])
    await page.evaluate((v) => {
      for (const [k, val] of Object.entries(v)) document.documentElement.style.setProperty(k, val)
    }, vars)
    // White last: setPhoto('real') keeps whatever photo is loaded.
    for (const photo of ['real', 'white'] as const) {
      await setPhoto(section, photo)
      const samples = await copyContrast(section, await backgroundShot(page, section))
      test.info().annotations.push({ type: `${name}, ${photo} photo`, description: samples.map((s) => `${s.label} ${s.min}:1`).join(', ') })
      for (const s of samples) expect(s.min, `${name}, ${photo} photo — ${s.label}`).toBeGreaterThanOrEqual(AA)
    }
    await page.close()
  }
})

test('color-bg banners are untouched: no stacking context, no photo', async ({ page }) => {
  await page.goto(LAYOUTS)
  for (const cell of ['cta-banner:color-bg-centered', 'cta-banner:color-bg-centered:ink']) {
    const section = page.locator(`[data-specimen-layout="${cell}"] [data-block="cta-banner"]`)
    await expect(section.locator('img')).toHaveCount(0)
    expect(await section.evaluate((el) => getComputedStyle(el).isolation)).toBe('auto')
  }
  const image = page.locator('[data-specimen-layout="cta-banner:image-bg-centered"] [data-block="cta-banner"]')
  expect(await image.evaluate((el) => getComputedStyle(el).isolation)).toBe('isolate')
})
