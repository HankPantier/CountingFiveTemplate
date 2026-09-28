import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOGO_SIZE_ATTRIBUTE, logoSizeAttributes } from './logo-size'
import type { DesignJson } from './types'

// Template-only (see e2e/template-default.ts): a client's own design.json may
// legitimately opt into logo.size "large", so this default-content check skips there.
const IS_TEMPLATE_DEFAULT = existsSync(path.join(process.cwd(), 'content', '.template-default'))

describe('logoSizeAttributes', () => {
  it('emits the attribute only for logo.size "large"', () => {
    expect(logoSizeAttributes({ logo: { size: 'large' } })).toEqual({ [LOGO_SIZE_ATTRIBUTE]: 'large' })
  })

  it('is inert when absent, "standard" or malformed (R1)', () => {
    expect(logoSizeAttributes({})).toEqual({})
    expect(logoSizeAttributes({ logo: {} })).toEqual({})
    expect(logoSizeAttributes({ logo: { size: 'standard' } })).toEqual({})
    expect(logoSizeAttributes(null)).toEqual({})
    // Hand-edited design.json: never throws, never emits an unknown value.
    for (const logo of ['large', ['large'], { size: 'huge' }, { size: 44 }]) {
      expect(logoSizeAttributes({ logo } as unknown as Pick<DesignJson, 'logo'>)).toEqual({})
    }
  })

  it.skipIf(!IS_TEMPLATE_DEFAULT)('the template default design.json emits nothing', () => {
    const design = JSON.parse(readFileSync(path.join(process.cwd(), 'content/design.json'), 'utf-8'))
    expect(logoSizeAttributes(design)).toEqual({})
  })
})

describe('src/styles/logo-size.css', () => {
  const css = readFileSync(path.join(process.cwd(), 'src/styles/logo-size.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')
  // Flatten @media wrappers, then collect every rule's selector list.
  const flat = css.replace(/@media[^{]+\{([\s\S]*?\})\s*\}/g, '$1')
  const selectors = [...flat.matchAll(/([^{}]+)\{[^}]*\}/g)].flatMap((m) => m[1].split(',').map((p) => p.trim()))

  it('gates EVERY selector on html[data-c5-logo-size="large"] (R1: inert by default)', () => {
    expect(selectors.length).toBeGreaterThan(0)
    for (const sel of selectors) expect(sel, sel).toMatch(/^html\[data-c5-logo-size="large"\] /)
  })

  it('header: 40px on phones, 44px from md; footer: 40px', () => {
    expect(css).toMatch(/\[data-component="navbar"\] \[data-c5="logo"\] img,\s*html\[data-c5-logo-size="large"\] \[data-component="footer"\] \[data-c5="logo"\] img \{\s*height: 2\.5rem;/)
    expect(css).toMatch(/@media \(min-width: 48rem\) \{\s*html\[data-c5-logo-size="large"\] \[data-component="navbar"\] \[data-c5="logo"\] img \{\s*height: 2\.75rem;/)
  })

  it('never recolours or filters the logo', () => {
    expect(css).not.toMatch(/filter\s*:/)
  })

  it('is imported after action-edge.css and before the client overrides', () => {
    const g = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8')
    const i = (s: string) => g.indexOf(s)
    expect(i('@import "../styles/logo-size.css";')).toBeGreaterThan(i('@import "../styles/action-edge.css";'))
    expect(i('@import "../styles/logo-size.css";')).toBeLessThan(i('@import "../../content/design-overrides.css";'))
  })
})
