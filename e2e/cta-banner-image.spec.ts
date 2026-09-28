import { test, expect, type Locator, type Page } from '@playwright/test'
import { measureContrast } from './contrast'
import {
  AA,
  FLEET_PALETTES,
  applyPalette,
  backgroundShot,
  buttonEdgeContrast,
  copyContrast,
  meanDiff,
  setPhoto,
  settleMedia,
  type Photo,
} from './media-contrast'

/**
 * Template 2026.09.10 — image-bg / image-bg-centered cta-banners draw their
 * photo (before, the photo painted behind the section's bg-primary fill and
 * every image banner rendered flat). Measured from real pixels (media-contrast.ts):
 *
 *   1. The photo shows through: the same banner over a white and a black
 *      photo must differ visibly (it was pixel-identical before the fix).
 *   2. WCAG AA for the copy over the photo: every pixel under the heading's
 *      and each body paragraph's line boxes vs the text colour composited
 *      over it (the body is 80% alpha). Minimum ≥ 4.5:1 — the small-text bar,
 *      for the heading too — over a bright (pure white, the worst case) photo,
 *      a dark (pure black) photo and the specimen photo.
 *   3. The button label sits on its own opaque action fill, so its ratio must
 *      equal the colour banner's (a palette property the photo cannot change).
 *      The fill-vs-scrim edge is recorded as an annotation only.
 *
 * Cells: the plain banner (the centred cell with its layout hooks removed =
 * the plain image-bg markup), the centred and ink-centred cells, and a plain
 * banner with a long multi-paragraph body (its copy reaches the lighter end of
 * the scrim, especially at phone widths). Light and dark schemes, 1440 / 390 /
 * 360. Every fleet palette (incl. the near-black fallback) over a white photo:
 * ≥ 5:1 on the long body. Content-agnostic: the cells render from the
 * template's sample content in every repo.
 */
const LAYOUTS = '/design-specimen?layouts=1'
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]
const COPY = 'h2, .prose, .prose *'
const TARGETS = 'h2, .prose p'

type Banner = { name: string; cell: string; plain?: boolean }
const BANNERS: Banner[] = [
  { name: 'image-bg', cell: '[data-specimen-layout="cta-banner:image-bg-centered"]', plain: true },
  { name: 'image-bg-centered', cell: '[data-specimen-layout="cta-banner:image-bg-centered"]' },
  { name: 'image-bg-centered ink', cell: '[data-specimen-layout="cta-banner:image-bg-centered:ink"]' },
  { name: 'image-bg long body', cell: '[data-specimen-media="cta-banner:image-bg:long"]' },
]

async function openBanner(page: Page, b: Banner): Promise<Locator> {
  await page.goto(LAYOUTS)
  await page.waitForLoadState('networkidle')
  const section = page.locator(`${b.cell} [data-block="cta-banner"]`)
  if (b.plain) {
    // The plain image-bg banner = the centred cell minus its layout hooks (R1).
    await section.evaluate((el) => {
      el.removeAttribute('data-layout')
      for (const n of el.querySelectorAll('[data-c5-slot]')) n.removeAttribute('data-c5-slot')
    })
  }
  await settleMedia(page, section)
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
            const shot = await backgroundShot(page, section, COPY)
            shots[photo] = shot
            const samples = await copyContrast(section, shot, TARGETS)
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
          const label = async (sel: string) =>
            (await measureContrast(page, { selector: `${sel} [data-block="cta-banner"] a[data-c5="button"]` }))[0]
          const [onImage, onColour] = [await label(b.cell), await label('[data-specimen-layout="cta-banner:color-bg-centered"]')]
          test.info().annotations.push({ type: 'button label', description: `${onImage.ratio}:1 (${onImage.fg} on ${onImage.bg}); colour banner ${onColour.ratio}:1` })
          expect(onImage.ratio).toBe(onColour.ratio)
          expect(onImage.bg).toBe(onColour.bg)
        })
      }
    })
  }
}

// Every fleet palette over a pure-white photo (the worst case), long body, at
// the widths where the copy runs furthest down the scrim.
for (const width of [1440, 390, 360]) {
  test(`fleet palettes, long body over a white photo (${width}px): heading and body ≥ 5:1`, async ({ browser }) => {
    test.setTimeout(90_000)
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const b = BANNERS[3]
    const section = await openBanner(page, b)
    await setPhoto(section, 'white')
    for (const pal of FLEET_PALETTES) {
      await applyPalette(page, pal)
      const samples = await copyContrast(section, await backgroundShot(page, section, COPY), TARGETS)
      test.info().annotations.push({ type: pal.name, description: samples.map((s) => `${s.label} ${s.min}:1`).join(', ') })
      expect(samples.length).toBeGreaterThanOrEqual(4)
      // The stress palette (lightest possible ink) must still clear AA.
      for (const s of samples) expect(s.min, `${pal.name} — ${s.label}`).toBeGreaterThanOrEqual(pal.stress ? AA : 5)
    }
    await page.close()
  })
}

test('palette-independent: a light brand primary (dark generated foreground) still gets near-white copy', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const section = await openBanner(page, BANNERS[0])
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--color-primary', '#E8C547')
    document.documentElement.style.setProperty('--color-primary-foreground', '#1A1C1E')
    document.documentElement.style.setProperty('--color-ink', '#292414')
  })
  for (const photo of ['real', 'white'] as const) {
    await setPhoto(section, photo)
    const samples = await copyContrast(section, await backgroundShot(page, section, COPY), TARGETS)
    test.info().annotations.push({ type: `gold primary, ${photo} photo`, description: samples.map((s) => `${s.label} ${s.min}:1`).join(', ') })
    for (const s of samples) expect(s.min, `${photo} photo — ${s.label}`).toBeGreaterThanOrEqual(AA)
  }
  await page.close()
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
