import { test, expect, type Page } from '@playwright/test'
import sharp from 'sharp'
import { contrastRatio } from './contrast'

/**
 * Light (white) logos stay visible — a Berg-like fixture: a white wordmark on a
 * transparent background, rendered in the header and the footer exactly as
 * NavBar / Footer render brand.logo.primary. brand.json logo.tone = "light" is
 * what layout.tsx turns into <html data-c5-logo-tone="light">, set in-page here
 * with each nav / footer preset (no rebuild per value).
 *
 * Contrast is measured from PIXELS of the rendered logo (a screenshot of the
 * <img>): the wordmark's fill vs its own transparent margin, i.e. whatever the
 * logo actually sits on (bar, plate or footer), after every filter/opacity.
 * Non-text graphic → WCAG 1.4.11 3:1.
 *
 * Content-agnostic: the fixture replaces whatever logo the site has, so this
 * runs in client repos too.
 */

// 160×32 like NavBar's <Image>, a solid white "wordmark" inset in a
// transparent margin (the Berg asset is a white wordmark with no background).
const WHITE_WORDMARK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="32" viewBox="0 0 160 32">' +
      '<rect x="24" y="8" width="112" height="16" fill="#ffffff"/></svg>',
  )

const NAV_LOGO = '[data-component="navbar"] [data-c5="logo"]'
const FOOTER_LOGO = '[data-component="footer"] [data-c5="logo"]'

async function setup(page: Page, attrs: Record<string, string>, scheme: 'light' | 'dark' = 'light') {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ colorScheme: scheme })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await page.evaluate(
    ({ src, attrs, nav, footer }) => {
      const put = (sel: string, className: string) => {
        const link = document.querySelector(sel)!
        // The primary logo, not a dedicated footer variant.
        link.removeAttribute('data-c5-variant')
        const img = document.createElement('img')
        img.src = src
        img.alt = 'Firm logo'
        img.width = 160
        img.height = 32
        img.className = className
        link.replaceChildren(img)
      }
      // Same classes as NavBar / Footer (primary branch) render.
      put(nav, 'h-8 w-auto')
      put(footer, 'h-8 w-auto invert opacity-90')
      for (const [k, v] of Object.entries(attrs)) document.documentElement.setAttribute(k, v)
    },
    { src: WHITE_WORDMARK, attrs, nav: NAV_LOGO, footer: FOOTER_LOGO },
  )
  await page.evaluate(() =>
    Promise.all([
      ...Array.from(document.images).map((i) => (i.complete ? null : i.decode().catch(() => null))),
      // Settle finite transitions only (the header's transition-colors); a
      // looping page animation (carousel) never finishes.
      ...document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => null)),
    ]),
  )
}

/** Contrast of the rendered wordmark fill against its own backdrop. */
async function logoContrast(page: Page, linkSelector: string): Promise<number> {
  const img = page.locator(`${linkSelector} img`)
  await img.scrollIntoViewIfNeeded()
  const png = await img.screenshot({ animations: 'disabled' })
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const at = (fx: number, fy: number): [number, number, number] => {
    const x = Math.round(fx * (info.width - 1))
    const y = Math.round(fy * (info.height - 1))
    const i = (y * info.width + x) * info.channels
    return [data[i], data[i + 1], data[i + 2]]
  }
  // Centre = wordmark fill; the left margin (x < 24/160) = what it sits on.
  return contrastRatio(at(0.5, 0.5), at(0.05, 0.5))
}

test.describe('light logo (brand.json logo.tone = "light")', () => {
  const LIGHT = { 'data-c5-logo-tone': 'light' }

  test('the fixture reproduces the bug without the flag (invisible logo)', async ({ page }) => {
    await setup(page, { 'data-c5-nav': 'inverted' })
    expect(await logoContrast(page, NAV_LOGO), 'inverted nav: light plate').toBeLessThan(1.5)
    expect(await logoContrast(page, FOOTER_LOGO), 'dark footer: inverted to black').toBeLessThan(1.5)
  })

  for (const nav of ['default', 'bordered', 'inverted']) {
    test(`header nav="${nav}": the white logo meets 3:1 against its backdrop`, async ({ page }) => {
      await setup(page, nav === 'default' ? LIGHT : { ...LIGHT, 'data-c5-nav': nav })
      expect(await logoContrast(page, NAV_LOGO)).toBeGreaterThanOrEqual(3)
    })
  }

  test('inverted nav: no light plate behind a light logo', async ({ page }) => {
    await setup(page, { ...LIGHT, 'data-c5-nav': 'inverted' })
    const [plate, bar] = await page.evaluate(
      (sel) => [
        getComputedStyle(document.querySelector(sel)!).backgroundColor,
        getComputedStyle(document.querySelector('[data-component="navbar"]')!).backgroundColor,
      ],
      NAV_LOGO,
    )
    expect(plate).toBe('rgba(0, 0, 0, 0)')
    expect(bar).not.toBe('rgba(0, 0, 0, 0)')
  })

  for (const footer of ['default', 'light', 'brand']) {
    test(`footer="${footer}": the white logo meets 3:1 against its backdrop`, async ({ page }) => {
      await setup(page, footer === 'default' ? LIGHT : { ...LIGHT, 'data-c5-footer': footer })
      expect(await logoContrast(page, FOOTER_LOGO)).toBeGreaterThanOrEqual(3)
    })
  }

  test('dark colour scheme: header and footer keep the white logo visible', async ({ page }) => {
    await setup(page, LIGHT, 'dark')
    expect(await logoContrast(page, NAV_LOGO)).toBeGreaterThanOrEqual(3)
    expect(await logoContrast(page, FOOTER_LOGO)).toBeGreaterThanOrEqual(3)
  })
})
