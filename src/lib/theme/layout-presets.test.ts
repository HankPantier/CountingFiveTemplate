import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BLOCK_CATALOG, BLOCK_IDS } from '@/lib/assembly/block-catalog'
import { DEFAULT_LAYOUT_PRESET, LAYOUT_PRESETS, LAYOUT_PRESET_NAMES, layoutPresetAttributes, layoutPresetsJson } from './layout-presets'

// Template-only (see e2e/template-default.ts): a client's design.json may opt in.
const IS_TEMPLATE_DEFAULT = existsSync(path.join(process.cwd(), 'content', '.template-default'))

describe('layoutPresetAttributes', () => {
  it('emits one data-c5-layout-* attribute per non-default preset', () => {
    expect(layoutPresetAttributes({ cards: 'list', ctaBanner: 'centered', faq: 'split', team: 'list', testimonials: 'featured' })).toEqual({
      'data-c5-layout-cards': 'list',
      'data-c5-layout-cta-banner': 'centered',
      'data-c5-layout-faq': 'split',
      'data-c5-layout-team': 'list',
      'data-c5-layout-testimonials': 'featured',
    })
    expect(layoutPresetAttributes({ faq: 'split' })).toEqual({ 'data-c5-layout-faq': 'split' })
  })

  it('is inert when absent, default or malformed (R1)', () => {
    expect(layoutPresetAttributes(undefined)).toEqual({})
    expect(layoutPresetAttributes(null)).toEqual({})
    expect(layoutPresetAttributes({})).toEqual({})
    expect(layoutPresetAttributes({ cards: 'default', faq: 'default' })).toEqual({})
    for (const layout of ['list', ['list'], 42, { cards: 'grid' }, { cards: 7 }, { faq: 'list' }, { unknown: 'list' }, { cards: 'LIST' }])
      expect(layoutPresetAttributes(layout), JSON.stringify(layout)).toEqual({})
  })

  it.skipIf(!IS_TEMPLATE_DEFAULT)('the template default design.json emits nothing', () => {
    const design = JSON.parse(readFileSync(path.join(process.cwd(), 'content/design.json'), 'utf-8')) as { layout?: unknown }
    expect(layoutPresetAttributes(design.layout)).toEqual({})
  })
})

describe('LAYOUT_PRESETS vocabulary', () => {
  it('every preset lists default first, unique attributes, and real blocks', () => {
    const attrs = LAYOUT_PRESET_NAMES.map((n) => LAYOUT_PRESETS[n].attribute)
    expect(new Set(attrs).size).toBe(attrs.length)
    for (const name of LAYOUT_PRESET_NAMES) {
      const def = LAYOUT_PRESETS[name]
      expect(def.values[0]).toBe(DEFAULT_LAYOUT_PRESET)
      expect(def.attribute).toMatch(/^data-c5-layout-[a-z-]+$/)
      for (const b of def.blocks) expect(BLOCK_IDS as string[], `${name}: ${b}`).toContain(b)
    }
  })

  it('each non-FAQ preset value has a per-section layout variant on every block of its family', () => {
    // cards/team list → 'list', testimonials featured → 'featured', ctaBanner
    // centered → '<bg>-centered'. FAQ split is preset-only in v1.
    const catalogued = (block: string, value: string) =>
      (BLOCK_CATALOG[block as keyof typeof BLOCK_CATALOG].variants as readonly { value: string; layout?: true }[]).some(
        (v) => v.layout && (v.value === value || v.value.endsWith(`-${value}`)),
      )
    for (const name of LAYOUT_PRESET_NAMES.filter((n) => n !== 'faq')) {
      const def = LAYOUT_PRESETS[name]
      for (const value of def.values.filter((v) => v !== DEFAULT_LAYOUT_PRESET))
        for (const b of def.blocks) expect(catalogued(b, value), `${name}=${value} on ${b}`).toBe(true)
    }
  })

  it('docs/design/layout-presets.json matches (run npm run design-contracts)', () => {
    expect(readFileSync(path.join(process.cwd(), 'docs/design/layout-presets.json'), 'utf-8')).toBe(layoutPresetsJson())
  })
})
