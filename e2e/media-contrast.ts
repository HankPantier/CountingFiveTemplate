import type { Locator, Page } from '@playwright/test'

/**
 * Pixel contrast for copy over a photo (2026.09.10 media backgrounds: the image
 * cta-banner and the image / video / slider Hero). Computed styles can't see a
 * photo, so the copy is hidden, the section is screenshotted, and EVERY pixel
 * under each text element's line boxes is compared with that element's text
 * colour composited (alpha × ancestor opacity) over the pixel.
 */
export const AA = 4.5

export type Photo = 'white' | 'black' | 'real'

/**
 * Every draft palette of the managed fleet (theme.css tokens read 2026-09-28)
 * plus two stress palettes. `ink: null` = a theme generated before the ink
 * token (Slachta, TruCount): the scrim falls back to near-black.
 */
export type Palette = { name: string; ink: string | null; nearBlack: string; nearWhite: string; actionOnInk: string; stress?: true }
export const FLEET_PALETTES: Palette[] = [
  { name: 'Abramson', ink: '#2c1211', nearBlack: '#211514', nearWhite: '#fef9f8', actionOnInk: '#ac771d' },
  { name: 'Accord', ink: '#211c1c', nearBlack: '#1c1717', nearWhite: '#fef9f9', actionOnInk: '#dd5765' },
  { name: 'Aurora', ink: '#211c1d', nearBlack: '#1c1718', nearWhite: '#fef8fa', actionOnInk: '#e14c8f' },
  { name: 'bblcpa', ink: '#161c27', nearBlack: '#222222', nearWhite: '#fefefe', actionOnInk: '#ff8e27' },
  { name: 'Berg', ink: '#171e26', nearBlack: '#15191d', nearWhite: '#f7fafe', actionOnInk: '#b37822' },
  { name: 'Buss', ink: '#221b1b', nearBlack: '#1c1716', nearWhite: '#fef9f8', actionOnInk: '#ee463f' },
  { name: 'Kinexus', ink: '#121b2b', nearBlack: '#131921', nearWhite: '#f8fafe', actionOnInk: '#d55f1f' },
  { name: 'korbey', ink: '#231627', nearBlack: '#1a1a2e', nearWhite: '#f5f7fa', actionOnInk: '#e54f2b' },
  { name: 'Slachta / TruCount (no ink token)', ink: null, nearBlack: '#1a1c1e', nearWhite: '#f7f5f2', actionOnInk: '#00c1de' },
  { name: 'Pryor', ink: '#211c1f', nearBlack: '#1b1719', nearWhite: '#fdf9fb', actionOnInk: '#bb6a98' },
  // A light gold brand (generate-theme.ts ink for #E8C547): the lightest ink a brand can get.
  { name: 'stress: light gold brand', ink: '#292414', nearBlack: '#1a1c1e', nearWhite: '#f7f5f2', actionOnInk: '#e8c547', stress: true },
]

/** Apply a palette's tokens on <html> (`initial` = guaranteed-invalid → the var() fallback). */
export async function applyPalette(page: Page, p: Palette) {
  await page.evaluate((pal) => {
    const s = document.documentElement.style
    s.setProperty('--color-ink', pal.ink ?? 'initial')
    s.setProperty('--color-near-black', pal.nearBlack)
    s.setProperty('--color-near-white', pal.nearWhite)
    s.setProperty('--color-action-on-ink', pal.actionOnInk)
  }, p)
}

/** Replace every photo in the section with a flat colour (a worst-case "photo"). */
export async function setPhoto(section: Locator, photo: Photo) {
  if (photo === 'real') return
  await section.evaluate(async (root, fill) => {
    const c = document.createElement('canvas')
    c.width = 1600
    c.height = 900
    const ctx = c.getContext('2d')!
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, c.width, c.height)
    const url = c.toDataURL('image/png')
    for (const img of root.querySelectorAll('img')) {
      img.removeAttribute('srcset')
      img.removeAttribute('loading')
      img.src = url
      await img.decode()
    }
  }, photo === 'white' ? '#ffffff' : '#000000')
}

/** Load the section's media and hide fixed chrome. */
export async function settleMedia(page: Page, section: Locator) {
  await section.scrollIntoViewIfNeeded()
  await section.evaluate(async (el) => {
    for (const img of el.querySelectorAll('img')) {
      img.removeAttribute('loading')
      if (!img.complete) await new Promise((r) => img.addEventListener('load', r, { once: true }))
    }
    await document.fonts.ready
  })
  // No skeleton-image placeholder may sit over the media (Hero used one until
  // 2026.09.10: z-auto above the photo, pulsing 0 → 50% forever).
  if (await section.locator('.animate-pulse').count()) throw new Error('a pulse placeholder sits over the media')
  await page.addStyleTag({ content: '.fixed, .sticky { visibility: hidden !important; }' })
}

/** Screenshot of the section with the given copy made transparent (the background only). */
export async function backgroundShot(page: Page, section: Locator, copy: string): Promise<string> {
  await section.evaluate((el) => el.setAttribute('data-e2e-hide-copy', ''))
  const style = await page.addStyleTag({
    content: `[data-e2e-hide-copy] :is(${copy}) { color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; }`,
  })
  const png = await section.screenshot({ animations: 'disabled' })
  await style.evaluate((s) => (s as HTMLElement).remove())
  await section.evaluate((el) => el.removeAttribute('data-e2e-hide-copy'))
  return png.toString('base64')
}

export type CopySample = { label: string; min: number; bgLumMin: number; bgLumMax: number; pixels: number }

/**
 * For each element matching `targets` inside the section: every background
 * pixel under its text line boxes vs. the element's own text colour
 * composited over that pixel. Returns the minimum WCAG ratio per element.
 */
export async function copyContrast(section: Locator, base64: string, targets: string): Promise<CopySample[]> {
  return section.evaluate(async (root, [b64, sel]) => {
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

    return [...root.querySelectorAll(sel)]
      .filter((el) => (el.textContent ?? '').trim())
      .map((el) => {
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
        const tag = el.getAttribute('data-c5') ?? (el.classList.contains('t-kicker') ? 'kicker' : el.tagName.toLowerCase())
        return {
          label: `${tag} "${(el.textContent ?? '').trim().slice(0, 24)}"`,
          min: Math.round(min * 100) / 100,
          bgLumMin: Math.round(bgLumMin * 1000) / 1000,
          bgLumMax: Math.round(bgLumMax * 1000) / 1000,
          pixels,
        }
      })
  }, [base64, targets] as const)
}

/** Mean absolute per-channel difference between two same-size screenshots. */
export async function meanDiff(page: Page, a: string, b: string): Promise<number> {
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
export async function buttonEdgeContrast(section: Locator): Promise<number | null> {
  const button = section.locator('a[data-c5="button"]').first()
  if (!(await button.count())) return null
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
