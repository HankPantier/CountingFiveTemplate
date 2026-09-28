import { test, expect, type Locator, type Page } from '@playwright/test'
import {
  AA,
  FLEET_PALETTES,
  applyPalette,
  backgroundShot,
  copyContrast,
  meanDiff,
  setPhoto,
  settleMedia,
  type Photo,
} from './media-contrast'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'

/**
 * Template 2026.09.10 — the full-bleed image / slider Hero draws its media
 * (the same bug as the image cta-banner: media at -z-20 behind the section's
 * bg-primary fill, so live Berg / Kinexus `/industries` heroes rendered flat).
 * The video variant shares the markup (unit-tested in hero-media.test.ts).
 *
 * Cells: /design-specimen?layouts=1 [data-specimen-media="hero:image" | "hero:slider"].
 * Measured from pixels (media-contrast.ts), each text element with its own
 * colour: eyebrow (.t-kicker, small caps → 4.5:1), the H1, the headline accent
 * ([data-c5="headline-accent"], the action tint), and the subheadline (85%
 * alpha) — over a white, a black and the specimen photo, light + dark scheme,
 * 1440 / 390, with the sample copy and with long copy. Then every fleet palette
 * over a white photo with long copy.
 */
const LAYOUTS = '/design-specimen?layouts=1'
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]
const COPY = '.t-kicker, h1, h1 *, p'
const TARGETS = '.t-kicker, h1, [data-c5="headline-accent"], p.t-body-lg'

async function openHero(page: Page, cell: string, long = false): Promise<Locator> {
  await page.goto(LAYOUTS)
  await page.waitForLoadState('networkidle')
  const section = page.locator(`[data-specimen-media="${cell}"] [data-block="hero"]`)
  if (long) {
    await section.evaluate((el) => {
      el.querySelector('.t-kicker')!.textContent = 'Sioux Falls & Hartford, SD · Construction, agriculture, attorneys'
      const h1 = el.querySelector('h1')!
      h1.firstChild!.textContent = 'Trusted CPA support for businesses and households across Sioux Falls and Hartford who actually '
      el.querySelector('p.t-body-lg')!.textContent =
        'Fixed-fee outsourced accounting for construction, agriculture, attorneys, engineers, and family offices across the greater Sioux Falls and Hartford SD area — with a partner who answers the phone.'
    })
  }
  await settleMedia(page, section)
  return section
}

for (const vp of VIEWPORTS) {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`hero media (${vp.name}, ${scheme})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.emulateMedia({ colorScheme: scheme })
      })

      for (const [cell, long] of [['hero:image', false], ['hero:image', true], ['hero:slider', false]] as const) {
        test(`${cell}${long ? ' long copy' : ''}: the photo shows and every text element holds ${AA}:1`, async ({ page }) => {
          const section = await openHero(page, cell, long)
          expect(await section.evaluate((el) => getComputedStyle(el).isolation)).toBe('isolate')
          const shots: Partial<Record<Photo, string>> = {}
          for (const photo of ['real', 'white', 'black'] as const) {
            await setPhoto(section, photo)
            const shot = await backgroundShot(page, section, COPY)
            shots[photo] = shot
            const samples = await copyContrast(section, shot, TARGETS)
            test.info().annotations.push({ type: `contrast ${photo} photo`, description: samples.map((s) => `${s.label} ${s.min}:1`).join(', ') })
            expect(samples.map((s) => s.label.split(' ')[0]).sort()).toEqual(['h1', 'headline-accent', 'kicker', 'p'])
            for (const s of samples) expect(s.min, `${cell} ${photo} photo — ${s.label}`).toBeGreaterThanOrEqual(AA)
          }
          const diff = await meanDiff(page, shots.white!, shots.black!)
          test.info().annotations.push({ type: 'photo visibility', description: `white vs black photo: mean channel diff ${diff.toFixed(1)}` })
          expect(diff, 'the photo does not show through (flat hero)').toBeGreaterThan(20)
        })
      }
    })
  }
}

for (const width of [1440, 390]) {
  test(`fleet palettes, long copy over a white photo (${width}px): every text element ≥ ${AA}:1`, async ({ browser }) => {
    test.setTimeout(90_000)
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const section = await openHero(page, 'hero:image', true)
    await setPhoto(section, 'white')
    for (const pal of FLEET_PALETTES) {
      await applyPalette(page, pal)
      const samples = await copyContrast(section, await backgroundShot(page, section, COPY), TARGETS)
      test.info().annotations.push({ type: pal.name, description: samples.map((s) => `${s.label} ${s.min}:1`).join(', ') })
      expect(samples).toHaveLength(4)
      for (const s of samples) expect(s.min, `${pal.name} — ${s.label}`).toBeGreaterThanOrEqual(AA)
    }
    await page.close()
  })
}

test('the statement hero is untouched: no stacking context, no scrim', async ({ page }) => {
  // The specimen hero is the template home's statement hero only in the template.
  test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)
  await page.goto('/design-specimen')
  const hero = page.locator('[data-specimen-hero="hero"] [data-block="hero"]')
  expect(await hero.evaluate((el) => getComputedStyle(el).isolation)).toBe('auto')
  await expect(hero.locator('.-z-10')).toHaveCount(0)
})

test.describe('@visual media cells', () => {
  // The cells use the template's own content-assets images.
  test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)
  for (const vp of VIEWPORTS) {
    test(`@visual ${vp.name} media cells`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(LAYOUTS)
      await page.waitForLoadState('networkidle')
      for (const cell of ['hero:image', 'hero:slider', 'cta-banner:image-bg:long']) {
        const el = page.locator(`[data-specimen-media="${cell}"]`)
        await settleMedia(page, el)
        // The slider crossfades every 6s: pin the first slide.
        await el.evaluate((n) => n.querySelectorAll('img').forEach((img, i) => (img.style.opacity = i === 0 ? '1' : '0')))
        await expect(el).toHaveScreenshot(`${vp.name}-${cell.replace(/:/g, '-')}.png`, { animations: 'disabled' })
      }
    })
  }
})
