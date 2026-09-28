import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ACTION_EDGE_ATTRIBUTE, actionEdgeAttributes, actionOnPrimaryRatio } from './action-edge'
import { renderedPrimarySurface } from './surface-contrast'
import { hslTokensToHex } from './action-text-contrast'
import type { BrandJson } from '@/lib/brand/types'

// The eight live palettes (content/brand.json on each client repo, 2026-09-27)
// and the rendered action-vs-primary ratio measured on the live sites.
const FLEET: Array<{ site: string; palette: BrandJson['palette']; live: number; edge: boolean }> = [
  { site: 'Accord', live: 1.5, edge: true, palette: { primary: '#403838', secondary: '#a31e37', complementary: '#f8e2e2', action: '#a31e37', nearBlack: '#1c1717', nearWhite: '#fef9f9' } },
  { site: 'Aurora', live: 2.08, edge: true, palette: { primary: '#484042', secondary: '#ee589a', complementary: '#f7e1e8', action: '#cc377d', nearBlack: '#1c1718', nearWhite: '#fef8fa' } },
  { site: 'Abramson', live: 2.19, edge: true, palette: { primary: '#782223', secondary: '#4f0008', complementary: '#ffdfdd', action: '#9d6900', nearBlack: '#211514', nearWhite: '#fef9f8' } },
  { site: 'Pryor', live: 2.64, edge: true, palette: { primary: '#261f23', secondary: '#964876', complementary: '#f5e2eb', action: '#964876', nearBlack: '#1b1719', nearWhite: '#fdf9fb' } },
  { site: 'Berg', live: 2.91, edge: true, palette: { primary: '#202f42', secondary: '#fdec55', complementary: '#d9eaff', action: '#a06700', nearBlack: '#15191d', nearWhite: '#f7fafe' } },
  { site: 'Buss', live: 2.93, edge: true, palette: { primary: '#2d2524', secondary: '#d32827', complementary: '#f8e2df', action: '#d32827', nearBlack: '#1c1716', nearWhite: '#fef9f8' } },
  { site: 'Kinexus', live: 3.14, edge: false, palette: { primary: '#12284c', secondary: '#ff6c0d', complementary: '#dbe9ff', action: '#c34f00', nearBlack: '#131921', nearWhite: '#f8fafe' } },
  { site: 'bblcpa', live: 5.32, edge: false, palette: { primary: '#003767', secondary: '#043464', complementary: '#f57f09', action: '#ff8e27', nearBlack: '#222222', nearWhite: '#FeFefe' } },
]

describe('actionEdgeAttributes', () => {
  it.each(FLEET)('$site: edge only when raw action < 3:1 on the rendered primary', ({ palette, live, edge }) => {
    // Same figure the browser painted on the live site (±0.01 rounding).
    expect(actionOnPrimaryRatio(palette)).toBeCloseTo(live, 1)
    expect(actionEdgeAttributes({ palette })).toEqual(edge ? { [ACTION_EDGE_ATTRIBUTE]: 'on' } : {})
  })

  it('emits nothing for the template default palette (R1)', () => {
    const brand = JSON.parse(readFileSync(path.join(process.cwd(), 'content/brand.json'), 'utf-8')) as BrandJson
    expect(actionEdgeAttributes(brand)).toEqual({})
  })

  it('never throws on a malformed palette', () => {
    expect(actionEdgeAttributes({ palette: undefined as unknown as BrandJson['palette'] })).toEqual({})
    expect(actionEdgeAttributes({ palette: { ...FLEET[0].palette, action: 'not-a-colour' } })).toEqual({})
    expect(actionEdgeAttributes({ palette: { ...FLEET[0].palette, primary: '' } })).toEqual({})
  })
})

describe('renderedPrimarySurface', () => {
  it('equals the --color-primary the generator wrote to theme.css', () => {
    const brand = JSON.parse(readFileSync(path.join(process.cwd(), 'content/brand.json'), 'utf-8')) as BrandJson
    const css = readFileSync(path.join(process.cwd(), 'src/styles/theme.css'), 'utf-8')
    const m = css.match(/--color-primary:\s*hsl\(([^)]+)\)/)
    expect(m).not.toBeNull()
    expect(renderedPrimarySurface(brand.palette)).toBe(hslTokensToHex(m![1]))
  })
})

describe('src/styles/action-edge.css', () => {
  const css = readFileSync(path.join(process.cwd(), 'src/styles/action-edge.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors = [...css.matchAll(/([^{}]+)\{[^}]*\}/g)].flatMap((m) => m[1].split(/,(?![^(]*\))/).map((p) => p.trim()))

  it('gates EVERY selector on html[data-c5-action-edge="on"] (R1: inert for passing palettes)', () => {
    expect(selectors.length).toBeGreaterThan(0)
    for (const sel of selectors) expect(sel, sel).toMatch(/^html\[data-c5-action-edge="on"\] /)
  })

  it('never changes layout, fill or label colour (outline only)', () => {
    const bodies = [...css.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]).join(';')
    const props = [...bodies.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1])
    expect(props.length).toBeGreaterThan(0)
    for (const p of props) expect(['outline', 'outline-offset']).toContain(p)
  })

  it('is imported after logo-tone.css and before the client overrides', () => {
    const g = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8')
    const i = (s: string) => g.indexOf(s)
    expect(i('@import "../styles/action-edge.css";')).toBeGreaterThan(i('@import "../styles/logo-tone.css";'))
    expect(i('@import "../styles/action-edge.css";')).toBeLessThan(i('@import "../../content/design-overrides.css";'))
  })
})
