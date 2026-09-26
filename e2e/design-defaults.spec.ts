import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { styleAxisAttributes } from '../src/lib/theme/style-axes'
import { capabilitiesMetaContent, TEMPLATE_MARKER } from '../src/lib/theme/template-marker'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'

/**
 * Default-state contract for an untouched design.json (R1). Runs on CI.
 * Extended by T1 (capability meta) and T2 (no data-c5-* on <html>).
 *
 * Content-agnostic checks run in every repo. Checks that assume the
 * template's OWN content/design.json are gated on content/.template-default
 * (see e2e/template-default.ts) so they skip in client repos.
 */
// Content-agnostic: <html> carries exactly the data-c5-* attributes for the
// NON-default values in THIS repo's content/design.json "style" (none when
// style is absent or all-default), so client repos that opt into axes pass.
test('<html> data-c5-* style-axis attributes match design.json style (none by default)', async ({ page }) => {
  const design = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'content', 'design.json'), 'utf-8')) as {
    style?: unknown
  }
  const expected = styleAxisAttributes(design.style)
  await page.goto('/')
  const actual = await page.evaluate(() => {
    const el = document.documentElement
    return Object.fromEntries(
      el.getAttributeNames().filter((n) => n.startsWith('data-c5')).map((n) => [n, el.getAttribute(n) ?? '']),
    )
  })
  expect(actual).toEqual(expected)
})

// Content-agnostic (every page ships from the shared root layout): the
// Revaltus Design Studio reads this to know which levers the deployed site
// supports (see src/lib/theme/template-marker.ts). Derived from
// c5-template.json (not hard-coded) so this stays correct in client repos
// at any template version.
const expectedCapabilitiesMeta = capabilitiesMetaContent(TEMPLATE_MARKER)
for (const path of ['/', '/privacy-policy']) {
  test(`${path} advertises the template capabilities`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('meta[name="c5-capabilities"]')).toHaveAttribute('content', expectedCapabilitiesMeta)
  })
}

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
