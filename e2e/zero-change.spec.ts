import { test, expect } from '@playwright/test'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'

/**
 * R1 zero-visual-change gate for the Design Studio template work (T1/T2).
 * Baselines were captured on a540d1e BEFORE the fonts module / style axes
 * landed. Re-run after each phase: any diff means an untouched site changed.
 * Local only (grepInvert on CI) — see playwright.config.ts.
 * Baselines are of the template's OWN content, so this skips in client repos
 * (gated on content/.template-default — see e2e/template-default.ts).
 */
const PAGES = ['/', '/privacy-policy', '/pricing-calculator', '/this-page-does-not-exist']
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)

for (const vp of VIEWPORTS) {
  for (const path of PAGES) {
    test(`@visual ${vp.name} ${path} is unchanged`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.evaluate(() => document.fonts.ready)
      const name = `${vp.name}${path === '/' ? '-home' : path.replace(/\//g, '-')}.png`
      await expect(page).toHaveScreenshot(name, { fullPage: true, animations: 'disabled' })
    })
  }
}
