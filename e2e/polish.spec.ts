import { test, expect } from '@playwright/test'

/**
 * Template 2026.09.5 (WS-D) — content-agnostic checks, so they run in client
 * repos too: every page-level hero has a button, darkSections moves ink bands
 * onto --color-ink, and the image grade is a token CSS can raise.
 */

test('the home hero renders a primary call-to-action button', async ({ page }) => {
  await page.goto('/')
  const hero = page.locator('[data-block="hero"], [data-block="hero-split"]').first()
  test.skip((await hero.count()) === 0, 'home uses a page-header hero')
  const cta = hero.locator('a[href]').first()
  await expect(cta).toBeVisible()
  expect((await cta.textContent())?.trim().length).toBeGreaterThan(0)
})

test('darkSections puts ink bands on --color-ink (inert without the flag)', async ({ page }) => {
  await page.goto('/')
  const read = () =>
    page.evaluate(() => {
      const probe = document.createElement('section')
      probe.className = 'u-band-ink bg-primary text-primary-foreground'
      document.body.appendChild(probe)
      const cs = getComputedStyle(probe)
      const out = { bg: cs.backgroundColor, fg: cs.color }
      probe.remove()
      const ref = document.createElement('div')
      ref.style.backgroundColor = 'var(--color-ink, var(--color-near-black))'
      ref.style.color = 'var(--color-ink-foreground, var(--color-near-white))'
      document.body.appendChild(ref)
      const rs = getComputedStyle(ref)
      const ink = { bg: rs.backgroundColor, fg: rs.color }
      ref.remove()
      return { out, ink }
    })
  await page.evaluate(() => document.documentElement.removeAttribute('data-dark-sections'))
  const off = await read()
  expect(off.out.bg).not.toBe(off.ink.bg)
  await page.evaluate(() => document.documentElement.setAttribute('data-dark-sections', 'on'))
  const on = await read()
  expect(on.out.bg).toBe(on.ink.bg)
  expect(on.out.fg).toBe(on.ink.fg)
})

test('the image grade opacity is a token (--c5-media-grade-opacity)', async ({ page }) => {
  await page.goto('/')
  const grade = page.locator('[data-c5="media-grade"]').first()
  test.skip((await grade.count()) === 0, 'no graded image on the home page')
  await page.evaluate(() => document.documentElement.style.setProperty('--c5-media-grade-opacity', '0.5'))
  await expect(grade).toHaveCSS('opacity', '0.5')
})
