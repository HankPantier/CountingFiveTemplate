import { test, expect } from '@playwright/test'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'

/**
 * Default-state contract for an untouched design.json (R1). Runs on CI.
 * Extended by T1 (capability meta) and T2 (no data-c5-* on <html>).
 *
 * Content-agnostic checks run in every repo. Checks that assume the
 * template's OWN content/design.json are gated on content/.template-default
 * (see e2e/template-default.ts) so they skip in client repos.
 */
test('no data-c5-* style-axis attributes on <html> by default', async ({ page }) => {
  await page.goto('/')
  const names = await page.evaluate(() => document.documentElement.getAttributeNames())
  expect(names.filter((n) => n.startsWith('data-c5'))).toEqual([])
})

test.describe('template default content', () => {
  test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)

  test('untouched site keeps the default <html> treatments and no style axes', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-headline', 'sans')
    await expect(html).toHaveAttribute('data-eyebrow', 'standard')
    const names = await page.evaluate(() => document.documentElement.getAttributeNames())
    expect(names.filter((n) => n.startsWith('data-c5'))).toEqual([])
  })

  test('untouched site loads today’s fonts (Public Sans heading/body, Fraunces accent)', async ({ page }) => {
    await page.goto('/')
    const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
    expect(body).toMatch(/Public Sans/)
    const h1 = await page.evaluate(() => getComputedStyle(document.querySelector('h1') as Element).fontFamily)
    expect(h1).toMatch(/Public Sans/)
    const accent = page.locator('.font-accent').first()
    await expect(accent).toBeVisible()
    expect(await accent.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Fraunces/)
  })
})
