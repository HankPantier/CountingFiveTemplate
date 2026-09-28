import { test, expect, type Page } from '@playwright/test'
import { LOGO_SIZE_ATTRIBUTE } from '../src/lib/theme/logo-size'
import { NAV_FIT_ATTRIBUTE } from '../src/lib/nav/nav-fit'

/**
 * Template 2026.09.8 — header logo size + the long-nav fit guard.
 *
 * 1. design.json logo.size "large" → <html data-c5-logo-size="large">
 *    (layout.tsx; the attribute-vs-design.json contract lives in
 *    design-defaults.spec.ts). Set in-page here, so no rebuild per value:
 *    the rendered logo is 32px without it (unchanged) and 44px desktop /
 *    40px phone / 40px footer with it, drawn at its own aspect ratio.
 * 2. The header fit guard (src/lib/nav/nav-fit.ts): a header row wider than
 *    the bar used to flex-shrink the logo (to 0px on Kinexus). The inline
 *    script now collapses the desktop nav into the menu button BEFORE first
 *    paint. Those fixtures are written into the served HTML itself
 *    (page.route), so the decision the page is first painted with is what's
 *    measured — with the JS bundles blocked, i.e. before hydration.
 *
 * Content-agnostic: the logo and the long navs are fixtures, so this runs in
 * client repos too.
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

// Served-HTML fixtures: the header exactly as SSR emits it, with a fixture
// logo, top level and CTA written in — so the inline fit script decides on
// them while the page is parsed. Every label is held on one line (w-max, as a
// NavigationMenuTrigger dropdown item renders).
type NavFixture = { logo: string; aspect: number; labels: string[] }
// Kinexus-like: row minimum ≈1430px with the 108px logo (Kinexus measured
// 1311px without it) — overflows the 1280px bar at every width.
const KINEXUS: NavFixture = { logo: KINEXUS_LOGO, aspect: KINEXUS_ASPECT, labels: KINEXUS_NAV }
// Buss-like: a 164px logo and a row that fits the 1280px bar with a little to
// spare but not a 1180px one (Buss: 1280 of 1280 live).
const BUSS_LOGO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="820" height="160" viewBox="0 0 820 160"><rect width="820" height="160" fill="#2d2524"/></svg>',
  )
const BUSS: NavFixture = {
  logo: BUSS_LOGO,
  aspect: 820 / 160,
  labels: ['Tax services', 'Accounting', 'Advisory', 'Industries', 'About us', 'Resources', 'Client portal', 'Contact'],
}

function rewriteHeader(html: string, f: NavFixture): string {
  const li = (label: string) =>
    `<li class="relative"><a class="w-max inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium" href="#">${label}</a></li>`
  const cta =
    '<a data-fixture="cta" class="hidden md:inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-action text-action-foreground" href="#">Book a consultation</a>'
  const out = html
    .replace(/(<a [^>]*data-c5="logo"[^>]*>)[\s\S]*?(<\/a>)/, `$1<img src="${f.logo}" alt="Firm logo" width="160" height="32" class="h-8 w-auto">$2`)
    .replace(/(<nav aria-label="Main"[\s\S]*?<ul[^>]*>)[\s\S]*?(<\/ul>)/, `$1${f.labels.map(li).join('')}$2`)
    .replace('</nav><div class="flex items-center gap-2">', `</nav><div class="flex items-center gap-2">${cta}`)
  if (out === html) throw new Error('header fixture did not apply')
  return out
}

/** Load / with the fixture header; `hydrate: false` blocks the JS bundles. */
async function servedFixture(page: Page, f: NavFixture, width: number, opts: { hydrate?: boolean; large?: boolean } = {}) {
  await page.setViewportSize({ width, height: 900 })
  await page.route('**/*', async (route) => {
    const req = route.request()
    if (req.resourceType() === 'document') {
      const res = await route.fetch()
      let body = rewriteHeader(await res.text(), f)
      if (opts.large) body = body.replace('<html ', `<html ${LOGO_SIZE_ATTRIBUTE}="large" `)
      await route.fulfill({ response: res, body })
    } else if (!opts.hydrate && req.resourceType() === 'script') {
      await route.abort()
    } else {
      await route.continue()
    }
  })
  await page.goto('/')
  await page.waitForLoadState('load')
  await settle(page)
}

async function headerState(page: Page) {
  return page.evaluate(
    ({ attr }) => {
      const bar = document.querySelector('[data-component="navbar"] > div')!
      const logo = bar.querySelector('[data-c5="logo"]')!.getBoundingClientRect()
      return {
        attr: document.documentElement.getAttribute(attr),
        logoWidth: logo.width,
        navShown: getComputedStyle(bar.querySelector(':scope > nav')!).display !== 'none',
        menuShown: getComputedStyle(bar.querySelector('button[aria-label="Open menu"]')!).display !== 'none',
        scrollWidth: document.documentElement.scrollWidth,
      }
    },
    { attr: NAV_FIT_ATTRIBUTE },
  )
}

test.describe('header fit guard (decided before first paint)', () => {
  test('a nav that fits is untouched: no attribute, desktop nav shown, logo at natural width', async ({ page }) => {
    await setup(page, { width: 1280, logo: KINEXUS_LOGO })
    await expect(page.locator(DESKTOP_NAV)).toBeVisible()
    await expect(page.locator(MENU_BUTTON)).toBeHidden()
    expect(await page.evaluate((a) => document.documentElement.getAttribute(a), NAV_FIT_ATTRIBUTE)).toBeNull()
    expect((await box(page, `${NAV_LOGO} img`)).width).toBeCloseTo(32 * KINEXUS_ASPECT, 0)
  })

  test('the Kinexus fixture reproduces the 0px logo without the guard (2026.09.7 layout)', async ({ page }) => {
    await servedFixture(page, KINEXUS, 1280)
    // NavBar's markup is 2026.09.7's: without the attribute it lays out as before.
    await page.evaluate((a) => document.documentElement.removeAttribute(a), NAV_FIT_ATTRIBUTE)
    const s = await headerState(page)
    expect(s.navShown).toBe(true)
    expect(s.logoWidth).toBeLessThan(2)
    expect(s.scrollWidth).toBeGreaterThan(1280)
  })

  for (const width of [1024, 1180, 1280]) {
    test(`Kinexus fixture at ${width}px, before hydration: nav collapsed, logo natural, no sideways scroll`, async ({ page }) => {
      await servedFixture(page, KINEXUS, width)
      const s = await headerState(page)
      expect(s.attr).toBe('collapse')
      expect(s.navShown).toBe(false)
      expect(s.menuShown).toBe(true)
      expect(s.logoWidth).toBeCloseTo(32 * KINEXUS_ASPECT, 0)
      expect(s.scrollWidth).toBeLessThanOrEqual(width)
    })
  }

  for (const [width, collapse] of [
    [1024, true],
    [1180, true],
    [1280, false],
    [1440, false],
  ] as const) {
    test(`Buss fixture at ${width}px, before hydration: ${collapse ? 'collapsed' : 'untouched (fits)'}`, async ({ page }) => {
      await servedFixture(page, BUSS, width)
      const s = await headerState(page)
      expect(s.attr).toBe(collapse ? 'collapse' : null)
      expect(s.navShown).toBe(!collapse)
      expect(s.logoWidth).toBeCloseTo(32 * BUSS.aspect, 0)
      expect(s.scrollWidth).toBeLessThanOrEqual(width)
    })
  }

  test('large logo: the Kinexus fixture collapses and the 44px logo keeps its natural width', async ({ page }) => {
    await servedFixture(page, KINEXUS, 1280, { large: true })
    const s = await headerState(page)
    expect(s.attr).toBe('collapse')
    const logo = await box(page, `${NAV_LOGO} img`)
    expect(logo.height).toBe(44)
    expect(logo.width).toBeCloseTo(44 * KINEXUS_ASPECT, 0)
    expect(s.scrollWidth).toBeLessThanOrEqual(1280)
  })

  test('after hydration, a content change with no resize re-decides (bar-content ResizeObserver)', async ({ page }) => {
    await setup(page, { width: 1280, logo: KINEXUS_LOGO })
    expect((await headerState(page)).attr).toBeNull()
    // Grow the hydrated nav in place (same viewport): only the nav's own size changes.
    await page.evaluate((labels) => {
      const list = document.querySelector('[data-component="navbar"] nav ul')!
      const tpl = list.querySelector(':scope > li')!
      for (const label of labels) {
        const li = tpl.cloneNode(true) as HTMLElement
        const a = li.querySelector('a, button')!
        a.textContent = label
        a.classList.add('w-max')
        list.append(li)
      }
    }, KINEXUS_NAV)
    await settle(page)
    const s = await headerState(page)
    expect(s.attr).toBe('collapse')
    expect(s.menuShown).toBe(true)
    expect(s.logoWidth).toBeCloseTo(32 * KINEXUS_ASPECT, 0)
  })

  test('the decision follows the viewport (resize re-probes, before hydration)', async ({ page }) => {
    await servedFixture(page, BUSS, 1180)
    expect((await headerState(page)).attr).toBe('collapse')
    await page.setViewportSize({ width: 1280, height: 900 })
    await settle(page)
    expect((await headerState(page)).attr).toBeNull()
    expect((await headerState(page)).navShown).toBe(true)
    await page.setViewportSize({ width: 1180, height: 900 })
    await settle(page)
    expect((await headerState(page)).attr).toBe('collapse')
  })
})
