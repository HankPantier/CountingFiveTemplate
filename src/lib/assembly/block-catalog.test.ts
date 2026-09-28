import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isValidElement } from 'react'
import { BLOCK_REGISTRY, KNOWN_BLOCK_IDS } from '@/components/assembly/block-registry'
import {
  ANNOTATION_FIELD_ORDER,
  BLOCK_CATALOG,
  BLOCK_IDS,
  blockCatalogJson,
  type BlockId,
  type BlockSpec,
  type BlockVariant,
} from './block-catalog'
import type * as X from './extract-block-props'
import { extractHeroProps, extractHeroSplitProps } from './extract-block-props'
import { parsePageMd, type PageManifest, type PageSection } from './parse-page-md'

const spec = (id: BlockId): BlockSpec => BLOCK_CATALOG[id]
const section = (blockId: string, extra: Partial<PageSection> = {}): PageSection => ({
  blockId,
  heading: 'Heading',
  content: '',
  position: 0,
  ...extra,
})

const MANIFEST = {
  title: 'T',
  url: '/',
  meta_title: 'T',
  meta_description: 'D',
  target_keyword: '',
  canonical_url: '',
  schema_markup: 'WebPage',
  hero_block: 'page-header',
  sections: [],
  faq_block: [{ question: 'Q?', answer: 'A.' }],
} as PageManifest

// The props BLOCK_REGISTRY hands each block's component — derived from the
// registry itself, so a block whose extractor starts accepting a variant or a
// theme fails here until the catalog lists it (no hand-kept extractor map).
function registryProps(id: string, extra: Partial<PageSection> = {}): Record<string, unknown> {
  const el = BLOCK_REGISTRY[id](section(id, extra), MANIFEST)
  return isValidElement(el) ? (el.props as Record<string, unknown>) : {}
}
const THEME_PROBES = ['ink', 'light', 'dark', 'accent', 'default']

describe('block catalog contract', () => {
  it('docs/design/blocks.json matches the catalog (run npm run design-contracts)', () => {
    expect(readFileSync(path.join(process.cwd(), 'docs', 'design', 'blocks.json'), 'utf-8')).toBe(blockCatalogJson())
  })

  it('lists exactly the registry blocks inline/auto, and the three page openers as frontmatter', () => {
    const body = BLOCK_IDS.filter((id) => spec(id).placement !== 'frontmatter').sort()
    expect(body).toEqual(KNOWN_BLOCK_IDS)
    expect(BLOCK_IDS.filter((id) => spec(id).placement === 'frontmatter').sort()).toEqual(['hero', 'hero-split', 'page-header'])
  })

  it('keeps the annotation field order the parser regex requires', () => {
    expect(ANNOTATION_FIELD_ORDER).toEqual(['variant', 'image', 'alt', 'query', 'theme'])
    const md = `---\ntitle: T\n---\n<!-- block: content-split | variant: image-left | image: a.jpg | alt: "A" | query: "q" | theme: ink -->\n## H\n\nBody\n`
    expect(parsePageMd(md).sections[0]).toMatchObject({ variant: 'image-left', image: 'a.jpg', alt: 'A', query: 'q', theme: 'ink' })
  })

  it('is internally consistent: default ∈ variants, no duplicates, insertable only inline', () => {
    for (const id of BLOCK_IDS) {
      const s = spec(id)
      const values = s.variants.map((x) => x.value)
      expect(new Set(values).size, id).toBe(values.length)
      if (values.length) expect(values, id).toContain(s.default)
      else expect(s.default, id).toBeNull()
      if (s.insertable) expect(s.placement, id).toBe('inline')
      for (const x of s.variants) expect(x.since, id).toMatch(/^\d{4}\.\d{2}\.\d+$/)
    }
  })

  it('lists variants for exactly the registry blocks whose props carry a variant', () => {
    const withVariants = KNOWN_BLOCK_IDS.filter((id) => spec(id as BlockId).variants.length > 0)
    const propsWithVariant = KNOWN_BLOCK_IDS.filter((id) => 'variant' in registryProps(id))
    expect(withVariants).toEqual(propsWithVariant)
  })

  it.each(KNOWN_BLOCK_IDS)('%s: default and every listed variant reach the component', (id) => {
    const s = spec(id as BlockId)
    if (!s.variants.length) return
    expect(registryProps(id).variant).toBe(s.default)
    for (const { value } of s.variants) expect(registryProps(id, { variant: value }).variant).toBe(value)
  })

  it.each(KNOWN_BLOCK_IDS)('%s: themes are exactly the probed values the component receives', (id) => {
    const accepted = THEME_PROBES.filter((t) => registryProps(id, { theme: t }).theme === t)
    expect([...spec(id as BlockId).themes]).toEqual(accepted)
  })

  it('page openers: defaults match the hero extractors', () => {
    const m = { title: 'T', url: '/', meta_description: 'D', sections: [] } as unknown as PageManifest
    expect(extractHeroProps(m).variant).toBe(spec('hero').default)
    expect(extractHeroSplitProps(m).variant).toBe(spec('hero-split').default)
  })
})

// Compile-time parity with the extract-block-props unions. tsc checks this
// file (expectTypeOf is a no-op at runtime): it is the guard on the exact
// VALUE sets; the registry-derived runtime tests above guard which blocks take
// a variant/theme at all and that defaults and listed values reach the component.
describe('variant unions (type-level)', () => {
  it('match the extractor prop types', () => {
    expectTypeOf<BlockVariant<'content-split'>>().toEqualTypeOf<X.ContentSplitProps['variant']>()
    expectTypeOf<BlockVariant<'feature-grid'>>().toEqualTypeOf<X.FeatureGridProps['variant']>()
    expectTypeOf<BlockVariant<'cta-banner'>>().toEqualTypeOf<X.CtaBannerProps['variant']>()
    expectTypeOf<BlockVariant<'intro-text'>>().toEqualTypeOf<X.IntroTextProps['variant']>()
    expectTypeOf<BlockVariant<'service-cards'>>().toEqualTypeOf<X.ServiceCardsProps['variant']>()
    expectTypeOf<BlockVariant<'team-grid'>>().toEqualTypeOf<X.TeamGridProps['variant']>()
    expectTypeOf<BlockVariant<'testimonials'>>().toEqualTypeOf<X.TestimonialsProps['variant']>()
    expectTypeOf<BlockVariant<'stats-bar'>>().toEqualTypeOf<X.StatsBarProps['variant']>()
    expectTypeOf<BlockVariant<'checklist-section'>>().toEqualTypeOf<X.ChecklistSectionProps['variant']>()
    expectTypeOf<BlockVariant<'process-steps'>>().toEqualTypeOf<X.ProcessStepsProps['variant']>()
    expectTypeOf<BlockVariant<'industry-cards'>>().toEqualTypeOf<X.IndustryCardsProps['variant']>()
    expectTypeOf<BlockVariant<'pricing'>>().toEqualTypeOf<X.PricingProps['variant']>()
    expectTypeOf<BlockVariant<'content-cards'>>().toEqualTypeOf<X.ContentCardsProps['variant']>()
    expectTypeOf<BlockVariant<'form'>>().toEqualTypeOf<X.FormProps['variant']>()
    expectTypeOf<BlockVariant<'hero-split'>>().toEqualTypeOf<X.HeroSplitProps['variant']>()
    // HeroProps still carries the dead 'image-right' | 'image-left' values (they
    // render full-bleed); the contract omits them — hero-split is that layout.
    expectTypeOf<BlockVariant<'hero'>>().toEqualTypeOf<Exclude<X.HeroProps['variant'], 'image-right' | 'image-left'>>()
  })
  it('variant-less blocks have no variant prop (a new one must be listed in the catalog)', () => {
    expectTypeOf<X.ContentProseProps>().not.toHaveProperty('variant')
    expectTypeOf<X.LogoBarProps>().not.toHaveProperty('variant')
    expectTypeOf<X.ContentTableProps>().not.toHaveProperty('variant')
    expectTypeOf<X.FaqAccordionProps>().not.toHaveProperty('variant')
    expectTypeOf<X.BookingProps>().not.toHaveProperty('variant')
    expectTypeOf<X.ResourceListProps>().not.toHaveProperty('variant')
    expectTypeOf<X.PricingCalculatorProps>().not.toHaveProperty('variant')
    expectTypeOf<X.PricingPlansProps>().not.toHaveProperty('variant')
    expectTypeOf<X.PageHeaderProps>().not.toHaveProperty('variant')
  })
})
