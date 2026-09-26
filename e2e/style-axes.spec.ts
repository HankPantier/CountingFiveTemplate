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
