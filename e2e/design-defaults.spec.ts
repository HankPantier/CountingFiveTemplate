import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { styleAxisAttributes } from '../src/lib/theme/style-axes'
import { logoToneAttributes } from '../src/lib/brand/logo-tone'
import { actionEdgeAttributes } from '../src/lib/theme/action-edge'
import { logoSizeAttributes } from '../src/lib/theme/logo-size'
import { LAYOUT_PRESETS, LAYOUT_PRESET_NAMES, layoutPresetAttributes } from '../src/lib/theme/layout-presets'
import type { BrandJson } from '../src/lib/brand/types'
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
// style is absent or all-default), so client repos that opt into axes pass —
// plus the brand.json-derived hooks: logo.tone "light" (2026.09.6) and the
// action edge for a palette whose raw action is under 3:1 on primary (2026.09.7),
// design.json logo.size "large" (2026.09.8) and the non-default design.json
// layout presets (data-c5-layout-*, 2026.09.9).
test('<html> data-c5-* style-axis attributes match design.json style (none by default)', async ({ page }) => {
  const design = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'content', 'design.json'), 'utf-8')) as {
    style?: unknown
    logo?: { size?: 'standard' | 'large' }
    layout?: unknown
  }
  const brand = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'content', 'brand.json'), 'utf-8')) as BrandJson
  const expected = {
    ...styleAxisAttributes(design.style),
    ...logoToneAttributes(brand),
    ...actionEdgeAttributes(brand),
    ...logoSizeAttributes(design),
    ...layoutPresetAttributes(design.layout),
  }
  await page.goto('/')
  const actual = await page.evaluate(() => {
    const el = document.documentElement
    return Object.fromEntries(
      el
        .getAttributeNames()
        // data-c5-nav-fit is viewport-derived runtime state (the header fit
        // guard, 2026.09.8), not a design.json/brand.json hook.
        .filter((n) => n.startsWith('data-c5') && n !== 'data-c5-nav-fit')
        .map((n) => [n, el.getAttribute(n) ?? '']),
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
    // The template's own header fits at the default viewport, so the fit guard
    // (data-c5-nav-fit) sets nothing either.
    expect(names.filter((n) => n.startsWith('data-c5'))).toEqual([])
    // Layout presets (2026.09.9): none of the five html attributes by default.
    for (const name of LAYOUT_PRESET_NAMES) expect(names).not.toContain(LAYOUT_PRESETS[name].attribute)
    // …and no section carries a layout variant on the template's own pages.
    await expect(page.locator('[data-layout], [data-c5-slot]')).toHaveCount(0)
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
