/**
 * Block catalog contract: every block id the assembly pipeline knows, where it
 * may be placed, and which annotation values it accepts. The Revaltus platform
 * mirrors docs/design/blocks.json (onboarding lib/content/block-catalog.ts) and
 * parity-tests it byte for byte; its validator, editor outline, layout picker
 * and Design Studio brief read their block vocabulary from that mirror.
 *
 * CONTRACT ONLY: no runtime code imports this module (the registry, parser and
 * extractors stay the source of behaviour). block-catalog.test.ts holds it to
 * BLOCK_REGISTRY, the hero switch and the extract-block-props unions, so a new
 * block or variant fails the tests until it is listed here, then
 * `npm run design-contracts` regenerates the JSON.
 *
 * - placement: `inline` = a `<!-- block: … -->` section in the page body;
 *   `frontmatter` = page opener chosen by `hero` + `hero_variant`, never inline;
 *   `auto` = inserted by the platform's builders (FAQ from faq_block, contact
 *   page details + map, pricing pages), never picked by a content model.
 * - insertable: a content model or operator may add it to a page body.
 * - default: the variant the extractor renders when the annotation has none.
 * - variants[].since: first template release that renders the value. Values
 *   that predate release versioning carry BASELINE_SINCE.
 * - variants[].layout: a structural layout choice that wins over a site-wide
 *   layout preset (none yet — the Phase 3 layouts set it).
 * - themes: `theme:` values the extractor accepts (`ink` = the deep band).
 */

/** Field order the parser's annotation regex requires (parse-page-md.ts). */
export const ANNOTATION_FIELD_ORDER = ['variant', 'image', 'alt', 'query', 'theme'] as const

/** `since` for every value that shipped before 2026.09.1 started versioning. */
export const BASELINE_SINCE = '2026.09.1'

export type BlockPlacement = 'inline' | 'frontmatter' | 'auto'
export type BlockVariantSpec = { value: string; since: string; layout?: true }
export type BlockSpec = {
  label: string
  placement: BlockPlacement
  insertable: boolean
  default: string | null
  variants: readonly BlockVariantSpec[]
  themes: readonly string[]
}

// Generic so BlockVariant<B> stays a literal union (the extractor parity test needs it).
function v<T extends string>(...values: T[]): { value: T; since: string }[] {
  return values.map((value) => ({ value, since: BASELINE_SINCE }))
}

export const BLOCK_CATALOG = {
  // Page openers (frontmatter `hero` + `hero_variant`)
  hero: { label: 'Hero', placement: 'frontmatter', insertable: false, default: 'image', variants: v('statement', 'image', 'video', 'slider'), themes: [] },
  'hero-split': { label: 'Split hero', placement: 'frontmatter', insertable: false, default: 'image-right', variants: v('image-right', 'image-left'), themes: [] },
  'page-header': { label: 'Page header', placement: 'frontmatter', insertable: false, default: null, variants: [], themes: [] },

  // Content
  'intro-text': { label: 'Intro text', placement: 'inline', insertable: true, default: 'centered', variants: v('centered', 'left-aligned'), themes: [] },
  'content-split': { label: 'Text + image', placement: 'inline', insertable: true, default: 'image-right', variants: v('image-right', 'image-left'), themes: [] },
  'content-prose': { label: 'Text', placement: 'inline', insertable: true, default: null, variants: [], themes: [] },
  'checklist-section': {
    label: 'Checklist',
    placement: 'inline',
    insertable: true,
    default: 'standalone',
    variants: v('with-image', 'with-image-right', 'with-image-left', 'standalone'),
    themes: [],
  },
  'process-steps': { label: 'Process steps', placement: 'inline', insertable: true, default: 'vertical', variants: v('horizontal', 'vertical'), themes: [] },

  // Card grids
  'feature-grid': { label: 'Feature grid', placement: 'inline', insertable: true, default: '3-col', variants: v('3-col', '4-col'), themes: ['ink'] },
  'service-cards': { label: 'Services', placement: 'inline', insertable: true, default: '3-col', variants: v('2-col', '3-col'), themes: ['ink'] },
  'content-cards': { label: 'Content cards', placement: 'inline', insertable: true, default: '3-col', variants: v('3-col', '2-col'), themes: [] },
  'team-grid': { label: 'Team', placement: 'inline', insertable: true, default: '3-col', variants: v('2-col', '3-col', '4-col'), themes: [] },
  'industry-cards': { label: 'Industries', placement: 'inline', insertable: true, default: '3-col', variants: v('3-col', '4-col'), themes: ['ink'] },

  // Social proof
  testimonials: { label: 'Testimonials', placement: 'inline', insertable: true, default: 'grid', variants: v('carousel', 'grid'), themes: [] },
  'stats-bar': { label: 'Stats', placement: 'inline', insertable: true, default: '3-up', variants: v('3-up', '4-up'), themes: ['ink'] },
  'logo-bar': { label: 'Logos', placement: 'inline', insertable: true, default: null, variants: [], themes: [] },

  // Conversion
  'cta-banner': { label: 'Call to action', placement: 'inline', insertable: true, default: 'color-bg', variants: v('color-bg', 'image-bg'), themes: ['ink'] },
  pricing: { label: 'Pricing', placement: 'inline', insertable: true, default: '3-tier', variants: v('2-tier', '3-tier', '4-tier'), themes: [] },
  'faq-accordion': { label: 'FAQ', placement: 'auto', insertable: false, default: null, variants: [], themes: [] },
  form: { label: 'Form', placement: 'inline', insertable: true, default: 'contact', variants: v('contact', 'quote', 'newsletter', 'custom'), themes: [] },

  // Utility
  'content-table': { label: 'Table', placement: 'inline', insertable: true, default: null, variants: [], themes: [] },

  // Data- and config-driven (content comes from brand.json / site.config / JSON)
  'contact-info': { label: 'Contact details', placement: 'auto', insertable: false, default: null, variants: [], themes: [] },
  map: { label: 'Map', placement: 'auto', insertable: false, default: null, variants: [], themes: [] },
  booking: { label: 'Booking', placement: 'inline', insertable: false, default: null, variants: [], themes: [] },
  'resource-list': { label: 'Resources', placement: 'inline', insertable: false, default: null, variants: [], themes: [] },
  'pricing-calculator': { label: 'Pricing calculator', placement: 'auto', insertable: false, default: null, variants: [], themes: [] },
  'pricing-plans': { label: 'Pricing plans', placement: 'auto', insertable: false, default: null, variants: [], themes: [] },
} as const satisfies Record<string, BlockSpec>

export type BlockId = keyof typeof BLOCK_CATALOG
export type BlockVariant<B extends BlockId> = (typeof BLOCK_CATALOG)[B]['variants'][number]['value']
export const BLOCK_IDS = Object.keys(BLOCK_CATALOG) as BlockId[]

export function blockCatalogJson(): string {
  return (
    JSON.stringify(
      { version: 1, baselineSince: BASELINE_SINCE, fieldOrder: ANNOTATION_FIELD_ORDER, blocks: BLOCK_CATALOG },
      null,
      2,
    ) + '\n'
  )
}
