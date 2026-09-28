/**
 * Site-wide layout presets (2026.09.9). design.json `layout` → <html
 * data-c5-layout-*> attributes (layout.tsx) → the SAME rules the per-section
 * layout variants use, in src/styles/block-layouts.css, applied to the family's
 * sections that carry no data-layout.
 *
 * Precedence: the preset sets the site's family; an explicit per-section layout
 * variant (block-catalog.ts `layout: true`) always wins; legacy column and
 * background variants follow the preset; ink bands (.u-band-ink) never take one.
 *
 * 'default' (or an absent / unknown / malformed key) emits NO attribute, so an
 * untouched site matches no rule (R1). Like logo.size, `layout` is a sibling
 * design.json key (not a style axis), gated by the `layout-presets` capability.
 * The Revaltus platform mirrors docs/design/layout-presets.json and
 * parity-tests it.
 */
export const DEFAULT_LAYOUT_PRESET = 'default'

export const LAYOUT_PRESETS = {
  cards: {
    attribute: 'data-c5-layout-cards',
    blocks: ['service-cards', 'feature-grid', 'content-cards'],
    summary: 'Card grids (services, features, content cards): list = one item per row, media or icon left, text right.',
    values: ['default', 'list'],
  },
  ctaBanner: {
    attribute: 'data-c5-layout-cta-banner',
    blocks: ['cta-banner'],
    summary: 'Call-to-action banners: centered = heading, text and button stacked and centred.',
    values: ['default', 'centered'],
  },
  faq: {
    attribute: 'data-c5-layout-faq',
    blocks: ['faq-accordion'],
    summary: 'FAQ: split = heading in a left column, questions on the right (desktop).',
    values: ['default', 'split'],
  },
  team: {
    attribute: 'data-c5-layout-team',
    blocks: ['team-grid'],
    summary: 'Team: list = one member per row, photo left, credentials and bio right.',
    values: ['default', 'list'],
  },
  testimonials: {
    attribute: 'data-c5-layout-testimonials',
    blocks: ['testimonials'],
    summary: 'Testimonials (grid): featured = the first quote as a large pull quote, the rest below.',
    values: ['default', 'featured'],
  },
} as const

export type LayoutPresetName = keyof typeof LAYOUT_PRESETS
export type LayoutPresetValue<P extends LayoutPresetName> = (typeof LAYOUT_PRESETS)[P]['values'][number]
export type LayoutPresets = { [P in LayoutPresetName]?: LayoutPresetValue<P> }
export const LAYOUT_PRESET_NAMES = Object.keys(LAYOUT_PRESETS) as LayoutPresetName[]

export function layoutPresetAttributes(layout: unknown): Record<string, string> {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return {}
  const out: Record<string, string> = {}
  for (const name of LAYOUT_PRESET_NAMES) {
    const value = (layout as Record<string, unknown>)[name]
    const def = LAYOUT_PRESETS[name]
    if (typeof value === 'string' && value !== DEFAULT_LAYOUT_PRESET && (def.values as readonly string[]).includes(value)) {
      out[def.attribute] = value
    }
  }
  return out
}

export function layoutPresetsJson(): string {
  return JSON.stringify({ version: 1, defaultValue: DEFAULT_LAYOUT_PRESET, presets: LAYOUT_PRESETS }, null, 2) + '\n'
}
