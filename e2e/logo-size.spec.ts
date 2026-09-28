import { test, expect, type Page } from '@playwright/test'
import { LOGO_SIZE_ATTRIBUTE } from '../src/lib/theme/logo-size'

/**
 * Template 2026.09.8 — header logo size + the long-nav fit guard.
 *
 * 1. design.json logo.size "large" → <html data-c5-logo-size="large">
 *    (layout.tsx; the attribute-vs-design.json contract lives in
 *    design-defaults.spec.ts). Set in-page here, so no rebuild per value:
 *    the rendered logo is 32px without it (unchanged) and 44px desktop /
 *    40px phone / 40px footer with it, drawn at its own aspect ratio.
 * 2. A Kinexus-like header (287×85 logo, 9 top-level items + a CTA) needs
 *    more than the 1280px bar. The logo used to be flex-shrunk to 0px; now
 *    the desktop nav collapses into the menu button and the logo keeps its
 *    natural width. A nav that fits is untouched.
 *
 * Content-agnostic: the logo and the long nav are injected fixtures (after
 * hydration), so this runs in client repos too.
 */

// Pryor-like stacked lockup (two lines of text), 200×64 → aspect 3.125.
const STACKED_LOGO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="64" viewBox="0 0 200 64">' +
      '<rect x="0" y="6" width="200" height="22" fill="#1f3a5f"/><rect x="0" y="36" width="150" height="22" fill="#1f3a5f"/></svg>',
  )
const STACKED_ASPECT = 200 / 64

// Kinexus's logo file is 287×85.
const KINEXUS_LOGO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="287" height="85" viewBox="0 0 287 85">' +
      '<rect width="287" height="85" fill="#12284c"/></svg>',
  )
const KINEXUS_ASPECT = 287 / 85

// Kinexus-like top level: 9 items + a CTA. Every fixture label is held on one
// line (w-max, as NavigationMenuTrigger renders a dropdown item), so the row's
// MINIMUM width without the logo (≈1320px) matches what Kinexus measured live
// (1311px in the 1280px bar) — the case that crushed the logo to 0px.
const KINEXUS_NAV = [
  'Services & advisory',
  'Industries we serve',
  'About us',
  'Resources',
  'Refund tracker',
  'Privacy policy',
  'Forms',
  'Smart tips',
  'Contact',
]

const NAV_LOGO = '[data-component="navbar"] [data-c5="logo"]'
const FOOTER_LOGO = '[data-component="footer"] [data-c5="logo"]'
const DESKTOP_NAV = '[data-component="navbar"] nav'
const MENU_BUTTON = '[data-component="navbar"] button[aria-label="Open menu"]'

/** Two animation frames: the fit guard decides in a rAF after a resize. */
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
}

async function setup(page: Page, opts: { width: number; logo: string; large?: boolean }) {
  await page.setViewportSize({ width: opts.width, height: 900 })
  await page.goto('/')
  // Inject only after hydration, or React discards the fixture.
  await page.waitForLoadState('networkidle')
  await page.evaluate(
    ({ src, nav, footer, attr, large }) => {
      const put = (sel: string, className: string) => {
        const link = document.querySelector(sel)!
        link.removeAttribute('data-c5-variant')
        const img = document.createElement('img')
        img.src = src
        img.alt = 'Firm logo'
        // NavBar / Footer's next/image width/height props.
        img.width = 160
        img.height = 32
        img.className = className
        link.replaceChildren(img)
      }
      // Same classes as NavBar / Footer (primary-logo branch) render.
      put(nav, 'h-8 w-auto')
      put(footer, 'h-8 w-auto invert opacity-90')
      if (large) document.documentElement.setAttribute(attr, 'large')
      else document.documentElement.removeAttribute(attr)
    },
    { src: opts.logo, nav: NAV_LOGO, footer: FOOTER_LOGO, attr: LOGO_SIZE_ATTRIBUTE, large: !!opts.large },
  )
  await page.evaluate(() => Promise.all(Array.from(document.images).map((i) => (i.complete ? null : i.decode().catch(() => null)))))
  await settle(page)
}

/** Replace the desktop nav with Kinexus's 9 items and add a CTA to the actions. */
async function injectLongNav(page: Page) {
  await page.evaluate((labels) => {
    const list = document.querySelector('[data-component="navbar"] nav ul')!
    const template = list.querySelector(':scope > li')!
    const items = labels.map((label) => {
      const li = template.cloneNode(true) as HTMLElement
      li.dataset.fixture = 'long-nav'
      const item = li.querySelector('a, button')!
      item.textContent = label
      item.classList.add('w-max')
      return li
    })
    for (const li of Array.from(list.children) as HTMLElement[]) li.style.display = 'none'
    list.append(...items)
    const actions = document.querySelector('[data-component="navbar"] > div > div:last-child')!
    const cta = document.createElement('a')
    cta.href = '#'
    cta.dataset.fixture = 'long-nav'
    cta.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-action text-action-foreground'
    cta.textContent = 'Book a consultation'
    actions.prepend(cta)
  }, KINEXUS_NAV)
  await settle(page)
}

async function box(page: Page, sel: string) {
  return page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
}

test.describe('logo size (design.json logo.size)', () => {
  for (const vp of [
    { name: 'desktop', width: 1280, header: 44 },
    { name: 'phone', width: 390, header: 40 },
  ]) {
    test(`${vp.name}: default renders the logo at 32px (unchanged)`, async ({ page }) => {
      await setup(page, { width: vp.width, logo: STACKED_LOGO })
      const nav = await box(page, `${NAV_LOGO} img`)
      expect(nav.height).toBe(32)
      expect(nav.width).toBeCloseTo(32 * STACKED_ASPECT, 0)
      expect((await box(page, `${FOOTER_LOGO} img`)).height).toBe(32)
      expect((await box(page, '[data-component="navbar"] > div')).height).toBe(64)
    })

    test(`${vp.name}: "large" raises the header logo to ${vp.header}px and the footer logo to 40px`, async ({ page }) => {
      await setup(page, { width: vp.width, logo: STACKED_LOGO, large: true })
      const nav = await box(page, `${NAV_LOGO} img`)
      expect(nav.height).toBe(vp.header)
      // Drawn at its own aspect ratio: taller AND proportionally wider.
      expect(nav.width).toBeCloseTo(vp.header * STACKED_ASPECT, 0)
      const footer = await box(page, `${FOOTER_LOGO} img`)
      expect(footer.height).toBe(40)
      // The bar itself keeps its 64px height.
      expect((await box(page, '[data-component="navbar"] > div')).height).toBe(64)
      // Nothing spills sideways on a phone.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width)
    })
  }
})

test.describe('long nav never squeezes the logo (Kinexus)', () => {
  test('a nav that fits is untouched: desktop nav shown, no menu button, logo at natural width', async ({ page }) => {
    await setup(page, { width: 1280, logo: KINEXUS_LOGO })
    await expect(page.locator(DESKTOP_NAV)).toBeVisible()
    await expect(page.locator(MENU_BUTTON)).toBeHidden()
    expect((await box(page, `${NAV_LOGO} img`)).width).toBeCloseTo(32 * KINEXUS_ASPECT, 0)
  })

  test('the fixture reproduces the 0px logo with the old header behaviour', async ({ page }) => {
    await setup(page, { width: 1280, logo: KINEXUS_LOGO })
    await injectLongNav(page)
    // Undo the guard in-page: a shrinkable logo link and the nav forced visible
    // (no collapse). A nav whose min-content exceeds the bar sends the row into
    // flex-shrink; the nav (flex-basis 0) can't shrink, so the logo
    // (min-content 0 through its img's max-width:100%) absorbs it all.
    await page.evaluate(() => {
      const bar = document.querySelector('[data-component="navbar"] > div')!
      ;(bar.querySelector('[data-c5="logo"]') as HTMLElement).style.flexShrink = '1'
      ;(bar.querySelector('nav') as HTMLElement).style.display = 'flex'
      ;(bar.querySelector('button[aria-label="Open menu"]') as HTMLElement).style.display = 'none'
    })
    expect((await box(page, `${NAV_LOGO} img`)).width).toBeLessThan(2)
  })

  for (const large of [false, true]) {
    test(`${large ? 'large' : 'standard'} logo: the long nav collapses into the menu button and the logo keeps its natural width`, async ({ page }) => {
      await setup(page, { width: 1280, logo: KINEXUS_LOGO, large })
      await injectLongNav(page)
      await expect(page.locator(DESKTOP_NAV)).toBeHidden()
      await expect(page.locator(MENU_BUTTON)).toBeVisible()
      await expect(page.locator('[data-fixture="long-nav"]').last()).toBeVisible() // the CTA stays
      const h = large ? 44 : 32
      const logo = await box(page, `${NAV_LOGO} img`)
      expect(logo.height).toBe(h)
      expect(logo.width).toBeCloseTo(h * KINEXUS_ASPECT, 0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
    })
  }

  test('the nav comes back when it fits again (probe on resize)', async ({ page }) => {
    await setup(page, { width: 1100, logo: KINEXUS_LOGO })
    await injectLongNav(page)
    await expect(page.locator(DESKTOP_NAV)).toBeHidden()
    // Back to the site's own (short) nav, then a resize re-probes.
    await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll('[data-fixture="long-nav"]'))) el.remove()
      for (const li of Array.from(document.querySelectorAll('[data-component="navbar"] nav ul > li')) as HTMLElement[]) li.style.display = ''
    })
    await page.setViewportSize({ width: 1110, height: 900 })
    await settle(page)
    await expect(page.locator(DESKTOP_NAV)).toBeVisible()
    await expect(page.locator(MENU_BUTTON)).toBeHidden()
  })
})
