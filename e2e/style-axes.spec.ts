import { test, expect } from '@playwright/test'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'

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
