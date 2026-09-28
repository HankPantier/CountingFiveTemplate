import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAV_FIT_INSTALL, NAV_FIT_SCRIPT } from './nav-fit'

describe('NAV_FIT_SCRIPT', () => {
  it('is valid standalone JavaScript (what ships inline is what the tests run)', () => {
    expect(() => new Function('d', 'w', NAV_FIT_INSTALL)).not.toThrow()
    expect(() => new Function(NAV_FIT_SCRIPT)).not.toThrow()
  })

  it('never breaks the page: it is wrapped in try/catch and cannot close its <script>', () => {
    expect(NAV_FIT_SCRIPT).toMatch(/^\(function\(d,w\)\{try\{[\s\S]*\}catch\(e\)\{\}\}\)\(document,window\)$/)
    expect(NAV_FIT_SCRIPT).not.toMatch(/<\/script/i)
  })

  it('layout.tsx emits it right after <NavBar>', () => {
    const layout = readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf-8')
    expect(layout).toMatch(/<NavBar brand=\{brand\} nav=\{nav\} \/>\s*\{\/\*[\s\S]*?\*\/\}\s*<script dangerouslySetInnerHTML=\{\{ __html: NAV_FIT_SCRIPT \}\} \/>/)
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
