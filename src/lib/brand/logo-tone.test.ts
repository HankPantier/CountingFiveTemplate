import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOGO_TONE_ATTRIBUTE, logoToneAttributes } from './logo-tone'

// Template-only (see e2e/template-default.ts): a client's own brand.json may
// legitimately set logo.tone (Berg), so this default-content check skips there.
const IS_TEMPLATE_DEFAULT = existsSync(path.join(process.cwd(), 'content', '.template-default'))

describe('logoToneAttributes', () => {
  it('emits the attribute only for an explicit light logo image', () => {
    expect(logoToneAttributes({ logo: { primary: 'logo.png', alt: 'x', tone: 'light' } })).toEqual({
      [LOGO_TONE_ATTRIBUTE]: 'light',
    })
  })

  it('is inert for dark, unset or text-wordmark logos (R1)', () => {
    expect(logoToneAttributes({ logo: { primary: 'logo.png', alt: 'x' } })).toEqual({})
    expect(logoToneAttributes({ logo: { primary: 'logo.png', alt: 'x', tone: 'dark' } })).toEqual({})
    // No image: NavBar renders the firm name in currentColor, which a dark
    // plate would hide — so no attribute.
    expect(logoToneAttributes({ logo: { primary: '', alt: 'x', tone: 'light' } })).toEqual({})
  })

  it.skipIf(!IS_TEMPLATE_DEFAULT)('the template default brand.json emits nothing', () => {
    const brand = JSON.parse(readFileSync(path.join(process.cwd(), 'content/brand.json'), 'utf-8'))
    expect(logoToneAttributes(brand)).toEqual({})
  })
})

describe('src/styles/logo-tone.css', () => {
  const css = readFileSync(path.join(process.cwd(), 'src/styles/logo-tone.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors = [...css.matchAll(/([^{}]+)\{[^}]*\}/g)].flatMap((m) => m[1].split(',').map((p) => p.trim()))

  it('gates EVERY selector on html[data-c5-logo-tone="light"] (R1: inert for dark logos)', () => {
    expect(selectors.length).toBeGreaterThan(0)
    for (const sel of selectors) expect(sel, sel).toMatch(/^html\[data-c5-logo-tone="light"\]/)
  })

  it('never recolours the logo (no filter other than removing one)', () => {
    for (const m of css.matchAll(/filter:\s*([^;]+);/g)) expect(m[1].trim()).toBe('none')
  })

  it('is imported after style-axes.css (so it can lift the nav plate) and before the client overrides', () => {
    const g = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8')
    const i = (s: string) => g.indexOf(s)
    expect(i('@import "../styles/logo-tone.css";')).toBeGreaterThan(i('@import "../styles/style-axes.css";'))
    expect(i('@import "../styles/logo-tone.css";')).toBeLessThan(i('@import "../../content/design-overrides.css";'))
  })
})
