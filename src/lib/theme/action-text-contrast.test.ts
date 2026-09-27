import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import chroma from 'chroma-js'
import { describe, expect, it } from 'vitest'
import {
  deriveDarkActionTextTokens,
  deriveLightActionTextTokens,
  ensureTextContrast,
  hslTokensToHex,
  renderedHex,
  toHslTokens,
} from './action-text-contrast'

const root = process.cwd()
const IS_TEMPLATE_DEFAULT = existsSync(path.join(root, 'content', '.template-default'))

const NAVY = '#003B71'
const NEAR_WHITE = '#F7F5F2'

function hueDelta(a: string, b: string): number {
  const d = Math.abs(chroma(a).oklch()[2] - chroma(b).oklch()[2]) % 360
  return Math.min(d, 360 - d)
}

describe('rendered surfaces', () => {
  it('round-trips hex through the emitted hsl() token', () => {
    expect(toHslTokens('#003B71')).toBe('209 100% 22%')
    expect(hslTokensToHex('hsl(209 100% 22%)')).toBe(renderedHex('#003B71'))
    // Accord's primary: hex #1F3A5F renders as #1f3a60 — the whole-percent rounding the fix is about.
    expect(renderedHex('#1F3A5F')).toBe('#1f3a60')
    expect(renderedHex('#fafafa')).toBe(hslTokensToHex('0 0% 98%'))
  })
})

describe('ensureTextContrast', () => {
  it('returns an already-passing colour EXACTLY (same string, same case)', () => {
    expect(ensureTextContrast('#00C1DE', NAVY)).toBe('#00C1DE')
    expect(ensureTextContrast('#B8422E', NEAR_WHITE)).toBe('#B8422E')
  })

  it('treats exactly-at-threshold as passing (boundary)', () => {
    const exact = chroma.contrast('#777777', '#ffffff')
    expect(ensureTextContrast('#777777', '#ffffff', exact)).toBe('#777777')
    expect(ensureTextContrast('#777777', '#ffffff', exact + 0.001)).not.toBe('#777777')
  })

  it('clears the LOWEST-contrast of several surfaces', () => {
    const out = ensureTextContrast('#00C1DE', ['#F7F5F2', '#e0e0e0'])
    expect(chroma.contrast(out, '#e0e0e0')).toBeGreaterThanOrEqual(4.5)
    expect(chroma.contrast(out, '#e0e0e0')).toBeLessThan(4.6)
  })

  it('darkens the house cyan on the near-white canvas, hue held', () => {
    const out = ensureTextContrast('#00C1DE', NEAR_WHITE)
    expect(chroma.contrast(out, NEAR_WHITE)).toBeGreaterThanOrEqual(4.5)
    expect(chroma.contrast(out, NEAR_WHITE)).toBeLessThan(4.6) // smallest passing step
    expect(hueDelta(out, '#00C1DE')).toBeLessThan(2)
  })

  it('lightens on a dark primary (vermilion on teal 2.47 → ≥4.5)', () => {
    const out = ensureTextContrast('#cc381e', '#003a42')
    expect(chroma(out).luminance()).toBeGreaterThan(chroma('#cc381e').luminance())
    expect(chroma.contrast(out, '#003a42')).toBeGreaterThanOrEqual(4.5)
  })

  it('darkens on a light primary', () => {
    const out = ensureTextContrast('#00C1DE', '#f5d547')
    expect(chroma(out).luminance()).toBeLessThan(chroma('#00C1DE').luminance())
    expect(chroma.contrast(out, '#f5d547')).toBeGreaterThanOrEqual(4.5)
  })

  it('never throws on a bad colour — returns it unchanged', () => {
    expect(ensureTextContrast('not-a-colour', '#ffffff')).toBe('not-a-colour')
  })

  it('hue scan: every hue passes on the rendered canvas + primary with its hue preserved', () => {
    const s = { background: renderedHex(NEAR_WHITE), muted: renderedHex(chroma(NEAR_WHITE).set('hsl.l', 0.95).hex()), card: renderedHex(NEAR_WHITE), primary: renderedHex(NAVY), ink: '#131c2a' }
    for (let h = 0; h < 360; h += 10) {
      const action = chroma.oklch(0.75, 0.14, h).hex()
      const t = deriveLightActionTextTokens(action, s)
      for (const surf of [s.background, s.muted, s.card]) expect(chroma.contrast(t.actionText, surf), `h=${h}`).toBeGreaterThanOrEqual(4.5)
      expect(chroma.contrast(t.actionOnPrimary, s.primary), `h=${h}`).toBeGreaterThanOrEqual(4.5)
      if (t.actionText !== action) expect(hueDelta(t.actionText, action), `h=${h}`).toBeLessThan(4)
      if (t.actionOnPrimary !== action) expect(hueDelta(t.actionOnPrimary, action), `h=${h}`).toBeLessThan(4)
    }
  })
})

describe('derive*ActionTextTokens', () => {
  // Passing both light surfaces at 4.5:1 needs contrast(bg, primary) >= 20.25 —
  // a black primary on white; #C45300 sits in that narrow band.
  const blackOnWhite = { background: '#ffffff', muted: '#ffffff', card: '#ffffff', primary: '#000000', ink: '#000000' }

  it('R1: an action that passes the canvas + primary is emitted verbatim for those tokens', () => {
    const t = deriveLightActionTextTokens('#C45300', blackOnWhite)
    expect(t.actionText).toBe('#C45300')
    expect(t.actionOnPrimary).toBe('#C45300')
    expect(t.actionOnInk).toBe('#C45300')
  })

  it('tint token clears the 10% and 15% action tints composited over the card', () => {
    const t = deriveLightActionTextTokens('#00C1DE', { ...blackOnWhite, primary: NAVY, ink: '#131c2a' })
    for (const a of [0.1, 0.15]) {
      expect(chroma.contrast(t.actionTextTint, chroma.mix('#ffffff', '#00C1DE', a, 'rgb').hex())).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('dark: verbatim when the raw action passes; lightened past 4.5 on every dark neutral otherwise', () => {
    const dark = { background: '#151719', muted: '#282b2e', card: '#1f2123' }
    expect(deriveDarkActionTextTokens('#00C1DE', dark).actionText).toBe('#00C1DE')
    const t = deriveDarkActionTextTokens('#C45300', dark)
    for (const s of Object.values(dark)) expect(chroma.contrast(t.actionText, s)).toBeGreaterThanOrEqual(4.5)
  })
})

// ---- generator (scripts/generate-theme.ts) ----------------------------------

function runGenerator(brand: unknown, design: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'c5-theme-'))
  mkdirSync(path.join(dir, 'content'))
  writeFileSync(path.join(dir, 'content', 'brand.json'), JSON.stringify(brand))
  writeFileSync(path.join(dir, 'content', 'design.json'), design)
  execFileSync(path.join(root, 'node_modules', '.bin', 'tsx'), [path.join(root, 'scripts', 'generate-theme.ts')], {
    cwd: dir,
    stdio: 'pipe',
  })
  return readFileSync(path.join(dir, 'src', 'styles', 'theme.css'), 'utf-8')
}

const block = (css: string, which: 'root' | 'dark') =>
  which === 'root' ? css.slice(css.indexOf(':root {'), css.indexOf('.dark {')) : css.slice(css.indexOf('.dark {'))
const tok = (blk: string, name: string) => blk.match(new RegExp(`\\n\\s*${name}: ([^;]+);`))![1]
const renderedTok = (blk: string, name: string) => hslTokensToHex(tok(blk, name))

type TableRow = {
  name: string
  palette: Record<string, string>
  light: { actionText: string; actionTextCanvas: string; actionTextTint: string; actionOnPrimary: string; actionOnInk: string }
  dark: { actionText: string; actionTextCanvas: string; actionTextTint: string }
}
// Shared with the onboarding app (lib/content/__fixtures__/action-text-table.json,
// identical bytes) — pins generator parity beyond the one golden.
const TABLE = JSON.parse(readFileSync(path.join(__dirname, '__fixtures__', 'action-text-table.json'), 'utf-8')) as TableRow[]

describe('generate-theme.ts action-text tokens', () => {
  const brand = JSON.parse(readFileSync(path.join(root, 'content', 'brand.json'), 'utf-8'))
  const design = readFileSync(path.join(root, 'content', 'design.json'), 'utf-8')

  it.each(TABLE.map((r) => [r.name, r] as const))('palette→token table: %s (and ≥4.5 on the RENDERED surfaces)', (_, row) => {
    const css = runGenerator({ ...brand, palette: row.palette }, design)
    const root_ = block(css, 'root')
    const dark = block(css, 'dark')
    expect({
      actionText: tok(root_, '--color-action-text'),
      actionTextCanvas: tok(root_, '--color-action-text-canvas'),
      actionTextTint: tok(root_, '--color-action-text-tint'),
      actionOnPrimary: tok(root_, '--color-action-on-primary'),
      actionOnInk: tok(root_, '--color-action-on-ink'),
    }).toEqual(row.light)
    expect({
      actionText: tok(dark, '--color-action-text'),
      actionTextCanvas: tok(dark, '--color-action-text-canvas'),
      actionTextTint: tok(dark, '--color-action-text-tint'),
    }).toEqual(row.dark)
    // What the browser paints: the hsl() surface lines, not the palette hexes.
    for (const s of ['--color-background', '--color-muted', '--color-card'])
      expect(chroma.contrast(row.light.actionText, renderedTok(root_, s)), s).toBeGreaterThanOrEqual(4.5)
    expect(chroma.contrast(row.light.actionOnPrimary, renderedTok(root_, '--color-primary'))).toBeGreaterThanOrEqual(4.5)
    expect(chroma.contrast(row.light.actionOnInk, tok(root_, '--color-ink'))).toBeGreaterThanOrEqual(4.5)
    for (const s of ['--color-background', '--color-muted', '--color-card'])
      expect(chroma.contrast(row.dark.actionText, renderedTok(dark, s)), `.dark ${s}`).toBeGreaterThanOrEqual(4.5)
  }, 30_000)

  it('Accord: on-primary clears the RENDERED primary (#1f3a60), not only the hex #1F3A5F', () => {
    const accord = TABLE.find((r) => r.name === 'accord-advisors')!
    expect(chroma.contrast(accord.light.actionOnPrimary, '#1f3a60')).toBeGreaterThanOrEqual(4.5)
  })

  it('R1: a palette whose action passes the canvas + primary emits the raw action for those tokens', () => {
    const css = runGenerator(
      { ...brand, palette: { ...brand.palette, action: '#C45300', primary: '#000000', nearWhite: '#FFFFFF', nearBlack: '#000000' } },
      design
    )
    const r = block(css, 'root')
    // muted = setLightness(#FFF, 95) = #f2f2f2 is darker than white: #C45300 fails there, so -text moves;
    // on-primary stays verbatim (ink is an L12 grey here, so -on-ink moves).
    expect(tok(r, '--color-action')).toBe('#C45300')
    expect(tok(r, '--color-action-on-primary')).toBe('#C45300')
  }, 30_000)

  it.skipIf(!IS_TEMPLATE_DEFAULT)('committed src/styles/theme.css is exactly the generator output (template default)', () => {
    expect(runGenerator(brand, design)).toBe(readFileSync(path.join(root, 'src', 'styles', 'theme.css'), 'utf-8'))
  }, 30_000)
})

// ---- consumers ---------------------------------------------------------------

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(f) && !f.endsWith('.test.ts') ? [p] : []
  })
}

describe('consumers of the new tokens', () => {
  const files = walk(path.join(root, 'src')).filter((f) => !f.endsWith(path.join('styles', 'theme.css')))

  it('every var(--color-action-text*|on-*) carries a fallback (sites without the tokens render as before)', () => {
    let seen = 0
    for (const f of files) {
      const src = readFileSync(f, 'utf-8')
      for (const m of src.matchAll(/var\(\s*--color-action-(text(?:-canvas|-tint)?|on-primary|on-ink)\s*([,)])/g)) {
        seen++
        expect(m[2], `${path.relative(root, f)}: ${m[0]}`).toBe(',')
      }
    }
    expect(seen).toBeGreaterThanOrEqual(7)
  })

  it('.t-kicker reads the corrected token; primary / ink surfaces re-scope it; light cards inside get the canvas value', () => {
    const css = readFileSync(path.join(root, 'src', 'app', 'globals.css'), 'utf-8')
    expect(css).toMatch(/\.t-kicker \{[^}]*color: var\(--color-action-text, var\(--color-action\)\);/)
    expect(css).toContain('.bg-primary { --color-action-text: var(--color-action-on-primary, var(--color-action)); }')
    expect(css).toContain('.u-surface-ink { --color-action-text: var(--color-action-on-ink, var(--color-action)); }')
    expect(css).toMatch(
      /:is\(\.bg-primary, \.u-surface-ink\) :is\(\.u-card, \.bg-card, \.bg-background\) \{\s*--color-action-text: var\(--color-action-text-canvas, var\(--color-action\)\);/
    )
  })
})
