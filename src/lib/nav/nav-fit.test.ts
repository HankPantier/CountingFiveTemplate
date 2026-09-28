import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAV_FIT_ATTRIBUTE, NAV_FIT_INSTALL, NAV_FIT_SCRIPT } from './nav-fit'

describe('NAV_FIT_SCRIPT', () => {
  it('is valid standalone JavaScript (what ships inline is what the tests run)', () => {
    expect(() => new Function('d', 'w', NAV_FIT_INSTALL)).not.toThrow()
    expect(() => new Function(NAV_FIT_SCRIPT)).not.toThrow()
  })

  it('never breaks the page: it is wrapped in try/catch and cannot close its <script>', () => {
    expect(NAV_FIT_SCRIPT).toMatch(
      /^\(function\(d,w\)\{try\{if\(w\.__c5NavFit\)w\.__c5NavFit\(\);w\.__c5NavFit=\(function\(\)\{[\s\S]*\}\)\(\);\}catch\(e\)\{\}\}\)\(document,window\)$/,
    )
    expect(NAV_FIT_SCRIPT).not.toMatch(/<\/script/i)
  })

  it('layout.tsx emits it right after <NavBar>', () => {
    const layout = readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf-8')
    expect(layout).toMatch(/<NavBar brand=\{brand\} nav=\{nav\} \/>\s*\{\/\*[\s\S]*?\*\/\}\s*<script dangerouslySetInnerHTML=\{\{ __html: NAV_FIT_SCRIPT \}\} \/>/)
  })
})

// ---------------------------------------------------------------------------
// The installer's logic, executed against a minimal fake DOM (the test env is
// node). The fake lays the row out like the real flex row: while the logo link
// is shrinkable it is squeezed by the overflow (down to 0), and with the
// inline flex-shrink:0 the script sets it is at its natural width.
// ---------------------------------------------------------------------------
type Listener = () => void
function fakePage(o: { bar: number; logo: number; nav: number; actions: number; mdUp?: boolean; imgComplete?: boolean }) {
  const state = { bar: o.bar, nav: o.nav, mdUp: o.mdUp ?? true }
  const attrs = new Map<string, string>()
  const html = {
    getAttribute: (k: string) => attrs.get(k) ?? null,
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    removeAttribute: (k: string) => void attrs.delete(k),
  }
  const collapsed = () => attrs.get(NAV_FIT_ATTRIBUTE) === 'collapse'
  const navShown = () => state.mdUp && !collapsed()
  const PAD = 32
  const imgListeners = new Map<string, Listener>()
  const img = o.imgComplete === undefined ? null : {
    complete: o.imgComplete,
    addEventListener: (t: string, f: Listener) => void imgListeners.set(t, f),
    removeEventListener: (t: string) => void imgListeners.delete(t),
  }
  const actions = { nextElementSibling: null, getBoundingClientRect: () => ({ width: o.actions }) }
  const nav = { nextElementSibling: actions, getBoundingClientRect: () => ({ width: navShown() ? state.nav : 0 }) }
  const logo = {
    style: { flexShrink: '' },
    nextElementSibling: nav,
    querySelector: () => img,
    getBoundingClientRect: () => {
      if (logo.style.flexShrink === '0') return { width: o.logo }
      const over = 2 * PAD + o.logo + (navShown() ? state.nav : 0) + o.actions - state.bar
      return { width: Math.max(0, o.logo - Math.max(0, over)) }
    },
  }
  const bar = {
    firstElementChild: logo,
    get clientWidth() { return state.bar },
    querySelector: (sel: string) => (sel === ':scope > nav' ? nav : null),
  }
  const frames: (() => void)[] = []
  let cancelled = 0
  const winListeners = new Map<string, Listener>()
  const fontListeners = new Map<string, Listener>()
  let resolveFonts: () => void = () => {}
  const observers: { cb: Listener; targets: unknown[]; disconnected: boolean }[] = []
  const w = {
    getComputedStyle: (el: unknown) =>
      el === nav ? { display: navShown() ? 'flex' : 'none' } : { paddingLeft: `${PAD}px`, paddingRight: `${PAD}px` },
    requestAnimationFrame: (f: () => void) => frames.push(f),
    cancelAnimationFrame: () => void cancelled++,
    addEventListener: (t: string, f: Listener) => void winListeners.set(t, f),
    removeEventListener: (t: string) => void winListeners.delete(t),
    ResizeObserver: class {
      rec: { cb: Listener; targets: unknown[]; disconnected: boolean }
      constructor(cb: Listener) {
        this.rec = { cb, targets: [], disconnected: false }
        observers.push(this.rec)
      }
      observe(t: unknown) { this.rec.targets.push(t) }
      disconnect() { this.rec.disconnected = true }
    },
  }
  const d = {
    documentElement: html,
    querySelector: (sel: string) => (sel === '[data-component="navbar"] > div' ? bar : null),
    fonts: {
      ready: new Promise<void>((r) => { resolveFonts = r }),
      addEventListener: (t: string, f: Listener) => void fontListeners.set(t, f),
      removeEventListener: (t: string) => void fontListeners.delete(t),
    },
  }
  const dispose = new Function('d', 'w', NAV_FIT_INSTALL)(d, w) as () => void
  const flush = () => { while (frames.length) frames.shift()!() }
  return {
    state, attrs, logo, img, imgListeners, winListeners, fontListeners, observers, frames, dispose, flush,
    resolveFonts: () => resolveFonts(),
    get cancelled() { return cancelled },
    attr: () => attrs.get(NAV_FIT_ATTRIBUTE) ?? null,
    bar, nav, actions,
  }
}

describe('nav fit installer (fake DOM)', () => {
  // Kinexus at 1280: row ≈ 64 + 108 + 1052 + 205 = 1429.
  const KINEXUS = { bar: 1280, logo: 108, nav: 1052, actions: 205 }

  it('a row that fits sets nothing (R1)', () => {
    const p = fakePage({ bar: 1280, logo: 164, nav: 700, actions: 44 })
    expect(p.attr()).toBeNull()
  })

  it('an overflowing row collapses, measured with the logo at its NATURAL width, and restores the inline style', () => {
    // Would "fit" if the squeezed (0px) logo were measured: 64 + 0 + 1000 + 200 = 1264.
    const p = fakePage({ bar: 1280, logo: 108, nav: 1000, actions: 200 })
    expect(p.attr()).toBe('collapse')
    expect(p.logo.style.flexShrink).toBe('')
  })

  it('exactly full or within 1px of rounding still fits', () => {
    expect(fakePage({ bar: 1280, logo: 116, nav: 900, actions: 200 }).attr()).toBeNull() // 1280
    expect(fakePage({ bar: 1280, logo: 117, nav: 900, actions: 200 }).attr()).toBeNull() // 1281
    expect(fakePage({ bar: 1280, logo: 118, nav: 900, actions: 200 }).attr()).toBe('collapse') // 1282
  })

  it('below md (desktop nav hidden) never collapses, and clears a collapse on the next check', () => {
    expect(fakePage({ ...KINEXUS, mdUp: false }).attr()).toBeNull()
    const p = fakePage(KINEXUS)
    expect(p.attr()).toBe('collapse')
    p.state.mdUp = false
    p.winListeners.get('resize')!()
    p.flush()
    expect(p.attr()).toBeNull()
  })

  it('while collapsed a check probes: expands when the bar is wide enough, stays collapsed otherwise', () => {
    const p = fakePage({ bar: 1180, logo: 164, nav: 850, actions: 213 }) // needs 1291
    expect(p.attr()).toBe('collapse')
    p.state.bar = 1285
    p.winListeners.get('resize')!()
    p.flush()
    expect(p.attr()).toBe('collapse')
    p.state.bar = 1291
    p.winListeners.get('resize')!()
    p.flush()
    expect(p.attr()).toBeNull()
  })

  it('waits for the logo image to load instead of guessing its width', () => {
    const p = fakePage({ ...KINEXUS, imgComplete: false })
    expect(p.attr()).toBeNull()
    p.img!.complete = true
    p.imgListeners.get('load')!()
    p.flush()
    expect(p.attr()).toBe('collapse')
  })

  it('re-checks on resize, every font load, fonts.ready and a resize of the bar or its content — coalesced per frame', async () => {
    const p = fakePage({ bar: 1280, logo: 108, nav: 900, actions: 200 })
    expect(p.attr()).toBeNull()
    expect(p.observers).toHaveLength(1)
    expect(p.observers[0].targets).toEqual([p.bar, p.logo, p.nav, p.actions])
    p.state.nav = 1100 // labels grew (a font swap)
    p.fontListeners.get('loadingdone')!()
    p.winListeners.get('resize')!()
    p.observers[0].cb()
    expect(p.frames).toHaveLength(1)
    p.flush()
    expect(p.attr()).toBe('collapse')
    p.state.nav = 900
    p.resolveFonts()
    await Promise.resolve()
    await Promise.resolve()
    p.flush()
    expect(p.attr()).toBeNull()
  })

  it('dispose() stops everything, including a fonts.ready that settles afterwards', async () => {
    const p = fakePage({ ...KINEXUS, imgComplete: false })
    p.winListeners.get('resize')!() // a frame is pending
    p.dispose()
    expect(p.cancelled).toBe(1)
    expect(p.winListeners.size).toBe(0)
    expect(p.fontListeners.size).toBe(0)
    expect(p.imgListeners.size).toBe(0)
    expect(p.observers[0].disconnected).toBe(true)
    p.resolveFonts()
    await Promise.resolve()
    await Promise.resolve()
    p.flush()
    expect(p.frames).toHaveLength(0)
    expect(p.attr()).toBeNull()
  })

  it('no header on the page: installs nothing', () => {
    const d = { documentElement: {}, querySelector: () => null }
    const dispose = new Function('d', 'w', NAV_FIT_INSTALL)(d, {}) as () => void
    expect(typeof dispose).toBe('function')
    expect(() => dispose()).not.toThrow()
  })
})

describe('src/styles/nav-fit.css', () => {
  const css = readFileSync(path.join(process.cwd(), 'src/styles/nav-fit.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')
  const block = (media: string) => {
    const i = css.indexOf(`@media ${media}`)
    expect(i, media).toBeGreaterThanOrEqual(0)
    const open = css.indexOf('{', i)
    let depth = 0
    for (let j = open; j < css.length; j++) {
      if (css[j] === '{') depth++
      else if (css[j] === '}' && --depth === 0) return css.slice(open + 1, j)
    }
    throw new Error('unbalanced')
  }
  const selectors = (body: string) =>
    [...body.matchAll(/([^{}]+)\{[^}]*\}/g)].flatMap((m) => m[1].split(',').map((p) => p.trim()))

  it('from md up, every rule is gated on html[data-c5-nav-fit="collapse"] (R1: inert when the row fits)', () => {
    const sel = selectors(block('(min-width: 48rem)'))
    expect(sel).toEqual([
      'html[data-c5-nav-fit="collapse"] [data-component="navbar"] > div > nav',
      'html[data-c5-nav-fit="collapse"] [data-component="navbar"] button[aria-label="Open menu"]',
    ])
  })

  it('the only ungated rule applies with JavaScript off (scripting: none): the bar clips its overflow', () => {
    expect(selectors(block('(scripting: none)'))).toEqual(['[data-component="navbar"] > div'])
    expect(block('(scripting: none)')).toMatch(/overflow-x:\s*clip;/)
    // Nothing outside the two media blocks.
    const outside = css.replace(/@media[^{]+\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '').trim()
    expect(outside).toBe('')
  })

  it('is imported after logo-size.css and before the client overrides', () => {
    const g = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8')
    const i = (s: string) => g.indexOf(s)
    expect(i('@import "../styles/nav-fit.css";')).toBeGreaterThan(i('@import "../styles/logo-size.css";'))
    expect(i('@import "../styles/nav-fit.css";')).toBeLessThan(i('@import "../../content/design-overrides.css";'))
  })
})
