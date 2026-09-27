import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import chroma from 'chroma-js'
import { describe, expect, it } from 'vitest'
import { deriveActionTextColors, ensureTextContrast } from './action-text-contrast'

const root = process.cwd()
const IS_TEMPLATE_DEFAULT = existsSync(path.join(root, 'content', '.template-default'))

const NAVY_BG = '#003B71' // house primary (already AA with near-white fg → primaryBg = primary)
const NEAR_WHITE = '#F7F5F2'

function hueDelta(a: string, b: string): number {
  const d = Math.abs(chroma(a).oklch()[2] - chroma(b).oklch()[2]) % 360
  return Math.min(d, 360 - d)
}

describe('ensureTextContrast', () => {
  it('returns an already-passing colour EXACTLY (same string, same case)', () => {
    expect(ensureTextContrast('#00C1DE', NAVY_BG)).toBe('#00C1DE')
    expect(ensureTextContrast('#B8422E', NEAR_WHITE)).toBe('#B8422E')
  })

  it('treats exactly-at-threshold as passing (boundary)', () => {
    const exact = chroma.contrast('#777777', '#ffffff')
    expect(ensureTextContrast('#777777', '#ffffff', exact)).toBe('#777777')
    // …and a hair above the ratio forces an adjustment
    expect(ensureTextContrast('#777777', '#ffffff', exact + 0.001)).not.toBe('#777777')
  })

  it('darkens the house cyan on the near-white canvas to just past 4.5:1, hue held', () => {
    const out = ensureTextContrast('#00C1DE', NEAR_WHITE)
    expect(out).toBe('#007c90')
    const r = chroma.contrast(out, NEAR_WHITE)
    expect(r).toBeGreaterThanOrEqual(4.5)
    expect(r).toBeLessThan(4.6) // smallest step that passes
    expect(hueDelta(out, '#00C1DE')).toBeLessThan(2)
  })

  it('bblcpa orange on white: 2.29 → ≥4.5, hue held', () => {
    const out = ensureTextContrast('#ff8e27', '#FeFefe')
    expect(chroma.contrast('#ff8e27', '#FeFefe')).toBeLessThan(2.3)
    expect(chroma.contrast(out, '#FeFefe')).toBeGreaterThanOrEqual(4.5)
    expect(hueDelta(out, '#ff8e27')).toBeLessThan(2)
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

  it('handles achromatic input', () => {
    const out = ensureTextContrast('#999999', '#ffffff')
    expect(chroma.contrast(out, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    const [r, g, b] = chroma(out).rgb()
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('never throws on a bad colour — returns it unchanged', () => {
    expect(ensureTextContrast('not-a-colour', '#ffffff')).toBe('not-a-colour')
  })

  it('hue scan: every hue passes on both surfaces with its hue preserved', () => {
    for (let h = 0; h < 360; h += 10) {
      const action = chroma.oklch(0.75, 0.14, h).hex()
      const { actionText, actionOnPrimary } = deriveActionTextColors(action, NEAR_WHITE, NAVY_BG, '#1f2226')
      expect(chroma.contrast(actionText, NEAR_WHITE), `h=${h} text`).toBeGreaterThanOrEqual(4.5)
      expect(chroma.contrast(actionOnPrimary, NAVY_BG), `h=${h} on-primary`).toBeGreaterThanOrEqual(4.5)
      if (actionText !== action) expect(hueDelta(actionText, action), `h=${h}`).toBeLessThan(4)
      if (actionOnPrimary !== action) expect(hueDelta(actionOnPrimary, action), `h=${h}`).toBeLessThan(4)
    }
  })

  it('is deterministic', () => {
    expect(ensureTextContrast('#e0a526', '#fafaf7')).toBe(ensureTextContrast('#e0a526', '#fafaf7'))
  })
})

describe('deriveActionTextColors', () => {
  // Passing BOTH light surfaces at 4.5:1 needs contrast(bg, primary) >= 20.25,
  // i.e. a black primary on white — #C45300 sits in that narrow band.
  it('R1: an action that already passes both light surfaces is emitted verbatim', () => {
    expect(chroma.contrast('#C45300', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(chroma.contrast('#C45300', '#000000')).toBeGreaterThanOrEqual(4.5)
    const out = deriveActionTextColors('#C45300', '#FFFFFF', '#000000', '#212121')
    expect(out.actionText).toBe('#C45300')
    expect(out.actionOnPrimary).toBe('#C45300')
  })

  it('R1 (dark): an action that already passes the dark card is emitted verbatim', () => {
    expect(deriveActionTextColors('#00C1DE', NEAR_WHITE, NAVY_BG, '#1f2226').darkActionText).toBe('#00C1DE')
  })

  it('dark token is lightened past 4.5:1 on the dark card when the raw action is too dark', () => {
    const { darkActionText } = deriveActionTextColors('#C45300', '#FFFFFF', '#000000', '#212121')
    expect(chroma.contrast('#C45300', '#212121')).toBeLessThan(4.5)
    expect(chroma.contrast(darkActionText, '#212121')).toBeGreaterThanOrEqual(4.5)
    expect(chroma.contrast(darkActionText, '#171717')).toBeGreaterThanOrEqual(4.5) // darker dark bg too
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

function tokenValues(css: string, name: string): string[] {
  return [...css.matchAll(new RegExp(`${name}: ([^;]+);`, 'g'))].map((m) => m[1])
}

describe('generate-theme.ts action-text tokens', () => {
  const brand = JSON.parse(readFileSync(path.join(root, 'content', 'brand.json'), 'utf-8'))
  const design = readFileSync(path.join(root, 'content', 'design.json'), 'utf-8')

  it('R1: a palette whose action passes both light surfaces emits the raw action for every light-mode consumer token', () => {
    const css = runGenerator(
      { ...brand, palette: { ...brand.palette, action: '#C45300', primary: '#000000', nearWhite: '#FFFFFF', nearBlack: '#000000' } },
      design
    )
    expect(tokenValues(css, '--color-action')).toEqual(['#C45300', '#C45300'])
    const [themeText, rootText, darkText] = tokenValues(css, '--color-action-text')
    expect([themeText, rootText]).toEqual(['#C45300', '#C45300'])
    expect(tokenValues(css, '--color-action-on-primary')).toEqual(['#C45300', '#C45300'])
    // .dark re-derives against the dark card (setLightness(nearBlack, 13))
    expect(chroma.contrast(darkText, '#212121')).toBeGreaterThanOrEqual(4.5)
  }, 30_000)

  it.skipIf(!IS_TEMPLATE_DEFAULT)('house default: canvas token corrected, primary + dark tokens verbatim', () => {
    const css = runGenerator(brand, design)
    expect(tokenValues(css, '--color-action-text')).toEqual(['#007c90', '#007c90', brand.palette.action])
    expect(tokenValues(css, '--color-action-on-primary')).toEqual([brand.palette.action, brand.palette.action])
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

  it('every var(--color-action-text|on-primary) carries a fallback (sites without the tokens render as before)', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf-8')
      for (const m of src.matchAll(/var\(\s*--color-action-(text|on-primary)\s*([,)])/g)) {
        expect(m[2], `${path.relative(root, f)}: ${m[0]}`).toBe(',')
      }
    }
  })

  it('.t-kicker reads the corrected token and primary surfaces re-scope it', () => {
    const css = readFileSync(path.join(root, 'src', 'app', 'globals.css'), 'utf-8')
    expect(css).toMatch(/\.t-kicker \{[^}]*color: var\(--color-action-text, var\(--color-action\)\);/)
    expect(css).toMatch(/\.bg-primary \{ --color-action-text: var\(--color-action-on-primary, var\(--color-action\)\); \}/)
  })
})
