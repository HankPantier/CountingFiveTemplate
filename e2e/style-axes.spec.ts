import { test, expect } from '@playwright/test'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'
import { contrastRatio, cssRgba, measureContrast, over, relativeLuminance, surfaceRgb, type ContrastSample } from './contrast'

/**
 * Each non-default style-axis value must visibly change the home page
 * (the spec's "screenshot diffs for each axis value"). Sets the attribute on
 * <html> in-page — exactly what layout.tsx emits from design.json.style — so
 * no rebuild per value. Compares within one run, so it is CI-safe.
 */
const AXES: Record<string, string[]> = {
  'data-c5-section-rhythm': ['compact', 'generous'],
  'data-c5-cards': ['flat', 'outlined', 'elevated'],
  'data-c5-buttons': ['pill', 'sharp', 'bold'],
  'data-c5-hero-scale': ['compact', 'dramatic'],
  'data-c5-image-treatment': ['natural', 'mono', 'rounded'],
  'data-c5-nav': ['bordered', 'inverted'],
  'data-c5-footer': ['light', 'brand'],
  'data-c5-accent-usage': ['subtle', 'plain', 'underline'],
}

test.describe.configure({ mode: 'serial' })

// Content-dependent (PF3): assumes the template's home page, which renders
// every hooked surface, starting with no axis set. Skips in client repos.
test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)

test('every non-default axis value changes the rendered page', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  const shot = () => page.screenshot({ fullPage: true, animations: 'disabled' })
  const baseline = await shot()
  for (const [attr, values] of Object.entries(AXES)) {
    for (const value of values) {
      await page.evaluate(([a, v]) => document.documentElement.setAttribute(a, v), [attr, value])
      const changed = await shot()
      expect(Buffer.compare(baseline, changed), `${attr}="${value}" had no visible effect`).not.toBe(0)
      await page.evaluate((a) => document.documentElement.removeAttribute(a), attr)
    }
  }
  expect(Buffer.compare(baseline, await shot())).toBe(0)
})

test('nav="inverted" keeps the active item and the CTA visible on the bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  // An interior page whose top-level nav item is active.
  await page.goto('/pricing-calculator')
  await page.evaluate(() => document.documentElement.setAttribute('data-c5-nav', 'inverted'))
  const header = page.locator('[data-component="navbar"]')
  const active = header.locator('nav [aria-current="page"], nav button[data-active]').first()
  await expect(active).toBeVisible()
  // The template nav has no CTA; add one with the Button default-variant
  // surface (bg-primary) when absent, exactly as NavBar renders it.
  await page.evaluate(() => {
    const bar = document.querySelector('[data-component="navbar"]')!
    if (bar.querySelector('a[data-c5="button"]')) return
    const a = document.createElement('a')
    a.href = '/contact'
    a.textContent = 'Get started'
    a.setAttribute('data-c5', 'button')
    a.className = 'inline-flex h-10 items-center rounded-md px-4 py-2 bg-primary text-primary-foreground'
    bar.querySelector(':scope > div > div:last-child')!.prepend(a)
  })
  // The header has transition-colors: read settled values, not a mid-fade.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
  const bg = await header.evaluate((el) => getComputedStyle(el).backgroundColor)
  const activeColor = await active.evaluate((el) => getComputedStyle(el).color)
  const ctaBg = await header.locator('a[data-c5="button"]').first().evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(activeColor, 'active nav item is invisible on the inverted bar').not.toBe(bg)
  expect(ctaBg, 'nav CTA merges into the inverted bar').not.toBe(bg)
})

/* ---- WCAG contrast of the nav / footer presets (P7 A/B critic findings) ----
 * Every preset must keep its text AA on its own surface: 4.5:1 for text,
 * 3:1 for icons (UI components). Sets the attribute in-page, exactly as
 * layout.tsx emits it, on an interior page whose nav item is active. */
const NAV = '[data-component="navbar"]'
const FOOTER = '[data-component="footer"]'

function expectAll(samples: ContrastSample[], min: number, what: string) {
  expect(samples.length, `no ${what} sampled`).toBeGreaterThan(0)
  const failing = samples.filter((s) => s.ratio < min)
  expect(failing, `${what} below ${min}:1 — ${JSON.stringify(failing)}`).toEqual([])
}

/* The chrome overrides real client repos ship in content/design-overrides.css
 * (loaded AFTER style-axes.css) — e.g. bblcpa paints its footer primary and
 * whitens every footer image. A preset must still hold on top of them; this is
 * exactly what made footer="light" render 1.54:1 in the A/B run. */
const CLIENT_STYLE_OVERRIDES = `
[data-component="footer"] { background: var(--color-primary); color: var(--color-primary-foreground); }
[data-component="footer"] img { filter: brightness(0) invert(1); opacity: 0.92; }
[data-component="navbar"] { border-bottom: 1px solid transparent; }
`
type Page = import('@playwright/test').Page

async function withAxis(page: Page, attr: string, value: string, overrides = false, scheme: 'light' | 'dark' = 'light') {
  await page.setViewportSize({ width: 1280, height: 900 })
  // defaultTheme="system": next-themes puts .dark on <html> for a dark OS.
  await page.emulateMedia({ colorScheme: scheme })
  await page.goto('/pricing-calculator')
  await page.waitForLoadState('networkidle')
  if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  if (overrides) await page.addStyleTag({ content: CLIENT_STYLE_OVERRIDES })
  if (value !== 'default') await page.evaluate(([a, v]) => document.documentElement.setAttribute(a, v), [attr, value])
  // The header has transition-colors: read settled values, not a mid-fade.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
}

for (const scheme of ['light', 'dark'] as const) {
  for (const value of ['default', 'bordered', 'inverted']) {
    test(`nav="${value}" (${scheme}): links, active item and icons meet WCAG AA on the bar`, async ({ page }) => {
      await withAxis(page, 'data-c5-nav', value, true, scheme)
      // Each item on its OWN stacked surface: the bordered active item sits on
      // its tinted chip, the rest on the bar.
      const links = await measureContrast(page, { selector: `${NAV} nav > div > ul > li > :is(a, button)` })
      expectAll(links, 4.5, 'nav links')
      const active = await measureContrast(page, { selector: `${NAV} nav :is([aria-current="page"], button[data-active])` })
      expectAll(active, 4.5, 'active nav item')
      expectAll(await measureContrast(page, { selector: `${NAV} button svg`, bgOf: NAV }), 3, 'nav icons')
      // The logo link: a wordmark (template) or an image; text measured on its own surface.
      await expect(page.locator(`${NAV} [data-c5="logo"]`)).toHaveCount(1)
      const wordmark = await measureContrast(page, { selector: `${NAV} [data-c5="logo"] span` })
      if (wordmark.length) expectAll(wordmark, 4.5, 'wordmark')
    })
  }
}

test('nav="inverted" puts the logo on a light plate distinct from the bar', async ({ page }) => {
  await withAxis(page, 'data-c5-nav', 'inverted', true)
  const bar = await surfaceRgb(page, NAV)
  const plate = await surfaceRgb(page, `${NAV} [data-c5="logo"]`)
  expect(plate, 'logo plate is the bar colour').not.toEqual(bar)
  expect(relativeLuminance(plate), `logo plate is not light: rgb(${plate})`).toBeGreaterThan(0.8)
  // A dark client logo stays legible: the plate must contrast with the bar too.
  expect(contrastRatio(plate, bar)).toBeGreaterThan(3)
  // Never filter/recolour the client's logo image.
  const filters = await page.locator(`${NAV} [data-c5="logo"] img`).evaluateAll((els) => els.map((e) => getComputedStyle(e).filter))
  for (const f of filters) expect(f).toBe('none')
})

test('nav="bordered" draws a clearly visible rule under the bar', async ({ page }) => {
  await withAxis(page, 'data-c5-nav', 'bordered', true)
  const { width, color } = await page.locator(NAV).evaluate((el) => {
    const cs = getComputedStyle(el)
    return { width: parseFloat(cs.borderBottomWidth), color: cs.borderBottomColor }
  })
  expect(width, 'bordered bar has no bottom border').toBeGreaterThanOrEqual(1)
  const pageBg = await surfaceRgb(page, 'body')
  const ratio = contrastRatio(over(await cssRgba(page, color), pageBg), pageBg)
  expect(ratio, `bordered rule ${color} is ${ratio.toFixed(2)}:1 vs the page`).toBeGreaterThanOrEqual(1.5)
})

for (const value of ['light', 'brand']) {
  for (const overrides of [false, true]) {
    test(`footer="${value}"${overrides ? ' over client chrome overrides' : ''}: all footer text, links and icons meet WCAG AA`, async ({ page }) => {
      await withAxis(page, 'data-c5-footer', value, overrides)
      const text = await measureContrast(page, { selector: `${FOOTER} :is(a, p, address, span, button, h2, h3)` })
      expect(text.length, 'too few footer elements sampled').toBeGreaterThanOrEqual(6)
      expectAll(text, 4.5, 'footer text')
      const icons = await measureContrast(page, { selector: `${FOOTER} svg` })
      if (icons.length) expectAll(icons, 3, 'footer icons')
    })
  }
}

test('footer="light" drops the dark-footer logo inversion (template + client filters)', async ({ page }) => {
  await withAxis(page, 'data-c5-footer', 'light', true)
  // The template brand has a wordmark only: add the primary-logo image exactly
  // as Footer renders it when brand.logo.footer is unset (invert opacity-90).
  await page.evaluate(() => {
    const link = document.querySelector('[data-component="footer"] [data-c5="logo"]')!
    const img = document.createElement('img')
    img.alt = 'logo'
    img.width = 120
    img.height = 32
    img.className = 'h-8 w-auto invert opacity-90'
    img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32"><rect width="120" height="32" fill="navy"/></svg>')
    link.replaceChildren(img)
  })
  const filter = await page.locator(`${FOOTER} [data-c5="logo"] img`).evaluate((e) => getComputedStyle(e).filter)
  expect(filter, 'footer logo is still recoloured on the light footer').toBe('none')
})
