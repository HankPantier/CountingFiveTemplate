import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readBlogConfigFile } from '../src/lib/content/blog-config'

/**
 * Smoke tests against the production build. Covers the surfaces that have
 * the highest "if-this-breaks-the-template-is-broken" weight: every-page
 * routes (home, 404), the generated polish (favicon / OG / RSS / agent
 * card), and the new content marketing surfaces (resources index, showcase).
 *
 * Form submission, BotID classification, and Resend integration are covered
 * by vitest route tests — those don't need a browser and run far faster.
 */

test('home page renders with firm name + navigation', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  // Skip link + main content boundary
  await expect(page.locator('#main-content')).toBeVisible()
  // Site-wide Organization JSON-LD is emitted in <body>
  const orgScript = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(orgScript).toContain('"@type":"Organization"')
})

test('404 page is branded (not the Next default)', async ({ page }) => {
  const res = await page.goto('/this-page-definitely-does-not-exist')
  expect(res?.status()).toBe(404)
  await expect(page.getByText(/can.?t find that page/i)).toBeVisible()
})

test('/feed.xml returns a valid RSS 2.0 channel', async ({ request }) => {
  const res = await request.get('/feed.xml')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/application\/rss\+xml/)
  const body = await res.text()
  expect(body).toContain('<?xml')
  expect(body).toContain('<rss')
  expect(body).toContain('<channel>')
})

test('/icon returns a PNG (favicon generator)', async ({ request }) => {
  const res = await request.get('/icon')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/image\/png/)
})

test('/apple-icon returns a PNG (180x180 Apple touch icon)', async ({ request }) => {
  const res = await request.get('/apple-icon')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/image\/png/)
})

test('/api/og returns a 1200x630 PNG share card', async ({ request }) => {
  const res = await request.get('/api/og')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/image\/png/)
})

test('the blog index renders (empty state in fresh-clone)', async ({ page }) => {
  // content/blog.json names and places the section (default /resources,
  // "Resources"); a client may remap it (korbey: /insights, "Insights").
  const blog = await readBlogConfigFile(path.resolve(__dirname, '..'))
  const res = await page.goto(blog.path)
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: blog.title, exact: true })).toBeVisible()
})

test('/.well-known/agent.json returns a structured A2A card', async ({ request }) => {
  const res = await request.get('/.well-known/agent.json')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/application\/json/)
  const card = await res.json()
  expect(card.name).toBeTruthy()
  expect(card.type).toBe('Organization')
  expect(card.url).toMatch(/^https?:/)
  expect(card.serves).toBeInstanceOf(Array)
})

test('every HTML page response carries the .md alternate Link header', async ({ request }) => {
  const res = await request.get('/')
  const link = res.headers()['link']
  expect(link).toContain('rel="alternate"')
  expect(link).toContain('type="text/markdown"')
})

test('home page .md companion is served at /index.md', async ({ request }) => {
  const res = await request.get('/index.md')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/text\/markdown/)
  const body = await res.text()
  // Frontmatter kept, block annotations stripped
  expect(body.startsWith('---')).toBe(true)
  expect(body).not.toMatch(/<!--\s*block:/)
})
