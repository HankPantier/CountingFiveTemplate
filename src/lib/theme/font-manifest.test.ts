import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_TYPOGRAPHY, FONT_MANIFEST, MONO_FAMILY, ROLE_WEIGHTS, fontManifestJson } from './font-manifest'

type FontData = Record<string, { weights: string[]; styles: string[]; subsets: string[] }>
const FONT_DATA = JSON.parse(
  readFileSync(path.join(process.cwd(), 'node_modules/next/dist/compiled/@next/font/dist/google/font-data.json'), 'utf-8'),
) as FontData

// Mirror of the platform's CURATED_FONTS (lib/content/type-pairing-catalog.ts).
// The manifest MUST be a superset — the platform only ever writes these.
const CURATED_FONTS = [
  'Bitter', 'DM Sans', 'DM Serif Display', 'Fraunces', 'IBM Plex Sans', 'IBM Plex Serif', 'Inter', 'Karla',
  'Libre Caslon Text', 'Libre Franklin', 'Lora', 'Manrope', 'Merriweather', 'Nunito', 'Nunito Sans', 'Open Sans',
  'Playfair Display', 'Plus Jakarta Sans', 'Public Sans', 'Source Sans 3', 'Source Serif 4',
]

describe('FONT_MANIFEST', () => {
  it('covers every curated font plus the mono family', () => {
    const families = FONT_MANIFEST.map((e) => e.family)
    for (const f of [...CURATED_FONTS, MONO_FAMILY]) expect(families).toContain(f)
  })
  it('is sorted and unique', () => {
    const families = FONT_MANIFEST.map((e) => e.family)
    expect(families).toEqual([...new Set(families)].sort())
  })
  it.each(FONT_MANIFEST.map((e) => [e.family, e] as const))('%s matches next/font font-data', (family, entry) => {
    const data = FONT_DATA[family]
    expect(data, `${family} missing from next/font`).toBeDefined()
    expect(data.subsets).toContain('latin')
    expect(entry.importName).toBe(family.replace(/ /g, '_'))
    expect(entry.weights).toEqual(ROLE_WEIGHTS.filter((w) => data.weights.includes(w)))
    expect(entry.weights.length).toBeGreaterThan(0)
    expect(entry.italic).toBe(data.styles.includes('italic'))
  })
  it('defaults reproduce today’s layout.tsx fonts', () => {
    expect(DEFAULT_TYPOGRAPHY).toEqual({ headingFont: 'Public Sans', bodyFont: 'Public Sans', accentFont: 'Fraunces' })
  })
  it('serialises deterministically', () => {
    const json = JSON.parse(fontManifestJson())
    expect(json).toEqual({ version: 1, defaults: DEFAULT_TYPOGRAPHY, mono: MONO_FAMILY, fonts: FONT_MANIFEST })
    expect(fontManifestJson().endsWith('\n')).toBe(true)
  })
})
