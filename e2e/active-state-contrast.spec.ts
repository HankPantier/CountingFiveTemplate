import { test, expect } from '@playwright/test'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'
import { contrastRatio, cssRgba, measureContrast, over, surfaceRgb } from './contrast'

/**
 * Current/active-item indicators outside the top nav stay AA in BOTH themes.
 * --color-primary is deliberately not flipped under .dark, so a text-primary
 * "current" marker measured 1.57:1 on dark surfaces. Content-dependent (the
 * template's /privacy-policy has a breadcrumb), so it skips in client repos.
 * SideNav only renders for nav.json children (none in the template) — its
 * dark treatment mirrors these and was measured manually (see CHANGELOG).
 */
test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)

async function indicatorRatio(page: import('@playwright/test').Page, selector: string, side: 'Left' | 'Bottom') {
  const color = await page.locator(selector).first().evaluate((el, s) => getComputedStyle(el)[`border${s}Color` as 'borderLeftColor'], side)
  const bg = await surfaceRgb(page, selector)
  return contrastRatio(over(await cssRgba(page, color), bg), bg)
}

for (const scheme of ['light', 'dark'] as const) {
  test(`(${scheme}) breadcrumb current item and contact-drawer active tab meet WCAG AA`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/privacy-policy')
    await page.waitForLoadState('networkidle')
    if (scheme === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    const crumb = await measureContrast(page, { selector: 'main [aria-current="page"]' })
    expect(crumb.length, 'no breadcrumb current item').toBeGreaterThan(0)
    for (const c of crumb) expect(c.ratio, `breadcrumb ${JSON.stringify(c)}`).toBeGreaterThanOrEqual(4.5)

    await page.getByRole('button', { name: /contact/i }).last().click()
    const tab = '[role="tab"][aria-selected="true"]'
    await expect(page.locator(tab).first()).toBeVisible()
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
    const tabText = await measureContrast(page, { selector: tab })
    expect(tabText.length).toBeGreaterThan(0)
    for (const c of tabText) expect(c.ratio, `active tab ${JSON.stringify(c)}`).toBeGreaterThanOrEqual(4.5)
    expect(await indicatorRatio(page, tab, 'Bottom'), 'active tab underline (non-text, 3:1)').toBeGreaterThanOrEqual(3)
  })
}
