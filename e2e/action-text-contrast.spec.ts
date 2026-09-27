import { test, expect } from '@playwright/test'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'
import { measureContrast } from './contrast'

/**
 * Small action-colour text (.t-kicker: hero / section kickers, card dates,
 * page-header kicker, ink index-band kicker) reaches WCAG AA 4.5:1 on every
 * surface it renders on, in both themes — via the generated
 * --color-action-text / --color-action-on-primary tokens. The template's own
 * palette (#00C1DE on #F7F5F2, 1.99:1 raw) fails without them. Content-
 * dependent (template pages + specimen), so it skips in client repos.
 */
test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)

for (const scheme of ['light', 'dark'] as const) {
  for (const path of ['/', '/privacy-policy', '/design-specimen']) {
    test(`(${scheme}) ${path}: small action text (.t-kicker) meets 4.5:1`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)
      const samples = await measureContrast(page, { selector: '.t-kicker' })
      expect(samples.length, 'no kickers rendered').toBeGreaterThan(0)
      for (const s of samples) expect(s.ratio, JSON.stringify(s)).toBeGreaterThanOrEqual(4.5)
    })
  }
}
