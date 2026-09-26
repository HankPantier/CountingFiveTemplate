import { test, expect } from '@playwright/test'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'

/**
 * /design-specimen (Design Studio T2). The platform renders this page in
 * headless Chromium with javaScriptEnabled:false, so the no-JS render is
 * load-bearing. Everything here is content-agnostic (every block falls back
 * to a sample) except the "intro-text is a real instance" check, which only
 * holds for the template's own content (PF3).
 */
const CONTENT_BLOCKS = ['intro-text', 'feature-grid', 'content-split', 'cta-banner', 'service-cards', 'faq-accordion', 'testimonials', 'stats-bar']

test('renders every block once with no JavaScript (static, no client JS needed)', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()
  const res = await page.goto('/design-specimen')
  expect(res?.status()).toBe(200)
  for (const id of CONTENT_BLOCKS) {
    await expect(page.locator(`[data-specimen-block="${id}"]`)).toHaveCount(1)
    await expect(page.locator(`[data-specimen-block="${id}"] [data-block="${id}"]`).first()).toBeAttached()
  }
  for (const kind of ['hero', 'hero-split', 'page-header']) {
    await expect(page.locator(`[data-specimen-hero="${kind}"]`)).toHaveCount(1)
  }
  await ctx.close()
})

test('is noindex (meta + header)', async ({ page }) => {
  const res = await page.goto('/design-specimen')
  expect(res?.headers()['x-robots-tag']).toBe('noindex, nofollow')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('is not in the sitemap or llms.txt, not linked from the home page, not disallowed in robots.txt', async ({ page, request }) => {
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('design-specimen')
  expect(await (await request.get('/llms.txt')).text()).not.toContain('design-specimen')
  const robots = await request.get('/robots.txt')
  if (robots.ok()) expect(await robots.text()).not.toContain('design-specimen')
  await page.goto('/')
  await expect(page.locator('a[href*="design-specimen"]')).toHaveCount(0)
})

test.describe('template default content', () => {
  test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)

  test('intro-text comes from a real page (home.md uses it)', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false })
    const page = await ctx.newPage()
    await page.goto('/design-specimen')
    // The template's own home.md uses intro-text → it is a REAL instance.
    await expect(page.locator('[data-specimen-block="intro-text"]')).toHaveAttribute('data-specimen-source', 'page')
    await ctx.close()
  })
})
