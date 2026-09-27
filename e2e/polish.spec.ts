import { test, expect } from '@playwright/test'
import { measureContrast } from './contrast'
import { IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON } from './template-default'
import { ACTION_DISPLAY_COLOR } from '../src/lib/theme/accent-color'
import { ensureTextContrast, renderedHex } from '../src/lib/theme/action-text-contrast'

/**
 * Template 2026.09.5 (WS-D). Content-agnostic (run in client repos) except
 * the hero-button check: every page-level hero has a button, darkSections moves ink bands
 * onto --color-ink, the image grade is a token CSS can raise, and large
 * accent text on primary reads the contrast-corrected action token.
 */

test('the home hero renders a primary call-to-action button', async ({ page }) => {
  // Template content only: a client hero legitimately has no button when the
  // site has no contact destination (resolveHeroCta never links a 404).
  test.skip(!IS_TEMPLATE_DEFAULT, NOT_TEMPLATE_DEFAULT_REASON)
  await page.goto('/')
  const hero = page.locator('[data-block="hero"], [data-block="hero-split"]').first()
  test.skip((await hero.count()) === 0, 'home uses a page-header hero')
  const cta = hero.locator('a[href]').first()
  await expect(cta).toBeVisible()
  expect((await cta.textContent())?.trim().length).toBeGreaterThan(0)
})

test('darkSections puts ink bands on --color-ink (inert without the flag)', async ({ page }) => {
  await page.goto('/')
  // Pin distinct primary / ink values so the check holds for any client
  // palette (a near-black primary can equal the derived ink).
  await page.evaluate(() => {
    const r = document.documentElement.style
    r.setProperty('--color-primary', 'rgb(10, 80, 160)')
    r.setProperty('--color-primary-foreground', 'rgb(255, 255, 255)')
    r.setProperty('--color-ink', 'rgb(20, 22, 26)')
    r.setProperty('--color-ink-foreground', 'rgb(240, 240, 235)')
  })
  const read = () =>
    page.evaluate(() => {
      const probe = document.createElement('section')
      probe.className = 'u-band-ink bg-primary text-primary-foreground'
      document.body.appendChild(probe)
      const cs = getComputedStyle(probe)
      const out = { bg: cs.backgroundColor, fg: cs.color }
      probe.remove()
      return out
    })
  await page.evaluate(() => document.documentElement.removeAttribute('data-dark-sections'))
  expect(await read()).toEqual({ bg: 'rgb(10, 80, 160)', fg: 'rgb(255, 255, 255)' })
  await page.evaluate(() => document.documentElement.setAttribute('data-dark-sections', 'on'))
  expect(await read()).toEqual({ bg: 'rgb(20, 22, 26)', fg: 'rgb(240, 240, 235)' })
})

test('the page-header accent word clears 3:1 on primary for a palette whose raw action fails', async ({ page }) => {
  // Crimson action on a charcoal primary (Accord's proposed pairing): raw
  // 1.5:1-class. theme.css derives --color-action-on-primary for exactly this;
  // the accent word must read it (via --color-action-text), not raw action.
  const primary = '#2E3033'
  const action = '#A8102E'
  const onPrimary = ensureTextContrast(action, renderedHex(primary))
  await page.goto('/')
  // Inject only after hydration, or React discards the probe node.
  await page.waitForLoadState('networkidle')
  await page.evaluate(
    ({ primary, action, onPrimary, color }) => {
      const r = document.documentElement.style
      r.setProperty('--color-primary', primary)
      r.setProperty('--color-action', action)
      r.setProperty('--color-action-on-primary', onPrimary)
      // A page header rendered exactly as PageHeader renders one (bg-primary
      // Section + h1 + the headline-accent span and its inline colour).
      const header = document.createElement('header')
      header.className = 'bg-primary text-primary-foreground'
      header.dataset.block = 'page-header-probe'
      header.innerHTML = `<h1 class="t-display">We <span class="font-accent" data-c5="headline-accent">answer</span></h1>`
      ;(header.querySelector('[data-c5="headline-accent"]') as HTMLElement).style.color = color
      document.body.appendChild(header)
    },
    { primary, action, onPrimary, color: ACTION_DISPLAY_COLOR },
  )
  const [sample] = await measureContrast(page, { selector: '[data-block="page-header-probe"] [data-c5="headline-accent"]' })
  expect(sample, 'accent rendered').toBeDefined()
  expect(sample.ratio, JSON.stringify(sample)).toBeGreaterThanOrEqual(3)
  // …and the fixture really fails with the raw action.
  const raw = await measureContrast(page, { selector: '[data-block="page-header-probe"] h1' })
  await page.evaluate((a) => {
    ;(document.querySelector('[data-block="page-header-probe"] [data-c5="headline-accent"]') as HTMLElement).style.color = a
  }, action)
  const [rawSample] = await measureContrast(page, { selector: '[data-block="page-header-probe"] [data-c5="headline-accent"]' })
  expect(raw.length).toBeGreaterThan(0)
  expect(rawSample.ratio).toBeLessThan(3)
})

test('the image grade opacity is a token (--c5-media-grade-opacity)', async ({ page }) => {
  await page.goto('/')
  const grade = page.locator('[data-c5="media-grade"]').first()
  test.skip((await grade.count()) === 0, 'no graded image on the home page')
  await page.evaluate(() => document.documentElement.style.setProperty('--c5-media-grade-opacity', '0.5'))
  await expect(grade).toHaveCSS('opacity', '0.5')
})
