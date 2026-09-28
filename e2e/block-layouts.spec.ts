import { test, expect, type Page } from '@playwright/test'
import { layoutSpecimenCells } from '../src/lib/showcase/samples'
import { LAYOUT_PRESETS, LAYOUT_PRESET_NAMES } from '../src/lib/theme/layout-presets'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'

/**
 * Template 2026.09.9 — layout variants + site-wide layout presets.
 *
 * /design-specimen?layouts=1 renders every block × layout variant cell (and
 * list × ink) from sample content; /design-specimen (default render, unchanged)
 * is where the presets are toggled in-page — exactly the <html> attribute
 * layout.tsx emits from design.json.layout — so no rebuild per value.
 * Everything but the @visual cells is content-agnostic (samples only).
 */
const LAYOUTS = '/design-specimen?layouts=1'
const CELLS = layoutSpecimenCells()
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

/** Every descendant's box relative to the section: the layout fingerprint. */
function boxes(section: import('@playwright/test').Locator) {
  return section.evaluate((root) => {
    const o = root.getBoundingClientRect()
    return [...root.querySelectorAll('*')].map((el) => {
      const r = el.getBoundingClientRect()
      return [r.x - o.x, r.y - o.y, r.width, r.height].map((n) => Math.round(n))
    })
  })
}

/** Scroll the whole page so every lazy image loads, then settle. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 30))
    }
    window.scrollTo(0, 0)
    await Promise.all(
      [...document.images].map((i) =>
        i.complete
          ? null
          : new Promise((r) => {
              i.addEventListener('load', r, { once: true })
              i.addEventListener('error', r, { once: true })
            }),
      ),
    )
    await document.fonts.ready
  })
  // Fixed chrome (consent banner, contact button) would overlap element shots.
  await page.addStyleTag({ content: '.fixed, .sticky { visibility: hidden !important; }' })
}

test('layout specimen renders every cell with no JavaScript; the default specimen has no layout cells', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()
  const res = await page.goto(LAYOUTS)
  expect(res?.status()).toBe(200)
  expect(res?.headers()['x-robots-tag']).toBe('noindex, nofollow')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  for (const c of CELLS) {
    const cell = page.locator(`[data-specimen-layout="${c.key}"]`)
    await expect(cell, c.key).toHaveCount(1)
    await expect(cell.locator(`[data-block="${c.blockId}"][data-layout]`), c.key).toHaveCount(1)
  }
  await page.goto('/design-specimen')
  await expect(page.locator('[data-specimen-layout]')).toHaveCount(0)
  await expect(page.locator('[data-layout]')).toHaveCount(0)
  await ctx.close()
})

for (const vp of VIEWPORTS) {
  test(`no horizontal overflow with long strings (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto(LAYOUTS)
    await page.waitForLoadState('networkidle')
    // Realistic worst case: long titles, bios, excerpts and quotes. (Button
    // labels are nowrap by design in every variant, so they are left alone.)
    await page.evaluate(() => {
      const long = 'Comprehensive multistate tax compliance, representation and intergenerational succession planning for closely held companies'
      for (const el of document.querySelectorAll<HTMLElement>('[data-specimen-layout] :is(h2, h3, blockquote, cite, p)')) {
        el.textContent = `${el.textContent} ${long}`
      }
    })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0)
    const escaping = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-layout] *')]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5)
        .map((el) => `${el.closest('[data-block]')?.getAttribute('data-block')} ${el.tagName}`),
    )
    expect(escaping).toEqual([])
  })
}

test('each layout changes its cell vs the base variant (the layouts render)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(LAYOUTS)
  await settle(page)
  for (const c of CELLS) {
    const section = page.locator(`[data-specimen-layout="${c.key}"] [data-block="${c.blockId}"]`)
    const withLayout = await section.screenshot({ animations: 'disabled' })
    await section.evaluate((el) => el.removeAttribute('data-layout'))
    const base = await section.screenshot({ animations: 'disabled' })
    expect(Buffer.compare(withLayout, base), `${c.key} looks like its base variant`).not.toBe(0)
  }
})

test.describe('site-wide layout presets (in-page <html> attribute)', () => {
  test.describe.configure({ mode: 'serial' })

  test('every non-default preset value visibly changes each block of its family on the specimen', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/design-specimen')
    await settle(page)
    for (const name of LAYOUT_PRESET_NAMES) {
      const def = LAYOUT_PRESETS[name]
      for (const value of def.values.filter((v) => v !== 'default')) {
        for (const block of def.blocks) {
          const cell = page.locator(`[data-specimen-block="${block}"] [data-block="${block}"]`).first()
          if (!(await cell.count())) continue
          // The testimonials preset restyles the grid only (a carousel stays one).
          if (block === 'testimonials' && (await cell.locator('[role="region"]').count())) continue
          const before = await cell.screenshot({ animations: 'disabled' })
          const boxesBefore = await boxes(cell)
          await page.evaluate(([a, v]) => document.documentElement.setAttribute(a, v), [def.attribute, value])
          const after = await cell.screenshot({ animations: 'disabled' })
          const boxesAfter = await boxes(cell)
          await page.evaluate((a) => document.documentElement.removeAttribute(a), def.attribute)
          expect(Buffer.compare(before, after), `${def.attribute}="${value}" had no visible effect on ${block}`).not.toBe(0)
          expect(boxesAfter, `${def.attribute}="${value}" did not move anything in ${block}`).not.toEqual(boxesBefore)
          // Removing the attribute restores the exact geometry (screenshots of
          // a re-laid-out element can differ by sub-pixel antialiasing).
          expect(await boxes(cell), `${block} did not restore`).toEqual(boxesBefore)
        }
      }
    }
  })

  test('an explicit layout variant wins, and ink bands never take a preset', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(LAYOUTS)
    await settle(page)
    const main = page.locator('main')
    const before = await boxes(main)
    // Every preset at once: layout-variant sections carry data-layout, so none may move.
    await page.evaluate((attrs) => {
      for (const [a, v] of attrs) document.documentElement.setAttribute(a, v)
    }, LAYOUT_PRESET_NAMES.map((n) => [LAYOUT_PRESETS[n].attribute, LAYOUT_PRESETS[n].values[1]] as [string, string]))
    expect(await boxes(main)).toEqual(before)

    // Ink: strip the variant from the ink list cells → the base ink grid; the
    // cards preset (still on) must leave it alone.
    const ink = page.locator('[data-specimen-layout$=":ink"] [data-block].u-band-ink')
    expect(await ink.count()).toBeGreaterThan(0)
    for (const el of await ink.all()) {
      await el.evaluate((n) => n.removeAttribute('data-layout'))
      const withPreset = await boxes(el)
      await page.evaluate(() => document.documentElement.removeAttribute('data-c5-layout-cards'))
      expect(await boxes(el)).toEqual(withPreset)
      await page.evaluate(() => document.documentElement.setAttribute('data-c5-layout-cards', 'list'))
    }
  })
})

test.describe('a11y: nothing hidden, reading order kept', () => {
  test('featured testimonials: every quote visible, the first is the pull quote', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(LAYOUTS)
    const figures = page.locator('[data-specimen-layout="testimonials:featured"] figure')
    const n = await figures.count()
    expect(n).toBeGreaterThan(1)
    for (let i = 0; i < n; i++) await expect(figures.nth(i)).toBeVisible()
    const [a, b] = [await figures.nth(0).boundingBox(), await figures.nth(1).boundingBox()]
    expect(a!.width).toBeGreaterThan(b!.width * 1.5)
    expect(a!.y).toBeLessThan(b!.y)
  })

  test('list rows: media or icon sits left of the text it precedes in the DOM', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(LAYOUTS)
    for (const key of ['service-cards:list', 'content-cards:list', 'team-grid:list']) {
      const item = page.locator(`[data-specimen-layout="${key}"] [data-c5-slot="item"]`).first()
      const media = await item.locator('[data-c5-slot="media"]').boundingBox()
      const body = await item.locator('[data-c5-slot="body"]').boundingBox()
      expect(media!.x + media!.width, key).toBeLessThanOrEqual(body!.x + 1)
    }
  })

  for (const vp of VIEWPORTS) {
    test(`team list (${vp.name}): no blank photo box without a photo; long names wrap inside the row`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(LAYOUTS)
      const items = page.locator('[data-specimen-layout="team-grid:list"] [data-c5-slot="item"]')
      // The sample's first member has a photo, the second has none.
      await expect(items.nth(0).locator('[data-c5-slot="media"]')).toBeVisible()
      await expect(items.nth(1).locator('[data-c5-slot="media"]')).toBeHidden()
      await page.evaluate(() => {
        for (const h of document.querySelectorAll('[data-specimen-layout="team-grid:list"] h3'))
          h.firstChild!.textContent = 'Maximilian Alexander Featherstonehaugh-Wolfeschlegelsteinhausen'
      })
      for (const i of [0, 1]) {
        const card = (await items.nth(i).locator(':scope > *').boundingBox())!
        const h3 = (await items.nth(i).locator('h3').boundingBox())!
        expect(h3.x + h3.width, 'name overflows the card').toBeLessThanOrEqual(card.x + card.width + 0.5)
        const media = await items.nth(i).locator('[data-c5-slot="media"]').boundingBox()
        if (media) expect(h3.x, 'name collides with the photo').toBeGreaterThanOrEqual(media.x + media.width)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    })
  }

  test('team grid (no layout) keeps the photo placeholder box (R1)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(LAYOUTS)
    await page.evaluate(() => document.querySelector('[data-specimen-layout="team-grid:list"] [data-block]')!.removeAttribute('data-layout'))
    const items = page.locator('[data-specimen-layout="team-grid:list"] [data-c5-slot="item"]')
    await expect(items.nth(1).locator('[data-c5-slot="media"]')).toBeVisible()
  })

  test('FAQ split (preset): heading left of the questions, still first in the DOM', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/design-specimen')
    const faq = page.locator('[data-specimen-block="faq-accordion"] [data-block="faq-accordion"]')
    await page.evaluate(() => document.documentElement.setAttribute('data-c5-layout-faq', 'split'))
    const h2 = await faq.locator('h2').boundingBox()
    const list = await faq.locator('h2 + *').boundingBox()
    expect(h2!.x + h2!.width).toBeLessThanOrEqual(list!.x)
    expect(Math.abs(h2!.y - list!.y)).toBeLessThan(40)
    expect(await faq.locator('h2 ~ *').count()).toBeGreaterThan(0)
  })
})

test.describe('@visual layout cells', () => {
  // The cells use the template's own content-assets images.
  test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)
  for (const vp of VIEWPORTS) {
    test(`@visual ${vp.name} layout cells`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(LAYOUTS)
      await settle(page)
      for (const c of CELLS) {
        await expect(page.locator(`[data-specimen-layout="${c.key}"]`)).toHaveScreenshot(`${vp.name}-${c.key.replace(/:/g, '-')}.png`, { animations: 'disabled' })
      }
    })
  }
})
