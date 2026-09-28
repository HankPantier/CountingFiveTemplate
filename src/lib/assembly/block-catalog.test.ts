import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { KNOWN_BLOCK_IDS } from '@/components/assembly/block-registry'
import {
  ANNOTATION_FIELD_ORDER,
  BLOCK_CATALOG,
  BLOCK_IDS,
  blockCatalogJson,
  type BlockId,
  type BlockSpec,
  type BlockVariant,
} from './block-catalog'
import * as X from './extract-block-props'
import { parsePageMd, type PageManifest, type PageSection } from './parse-page-md'

const spec = (id: BlockId): BlockSpec => BLOCK_CATALOG[id]
const section = (blockId: string, extra: Partial<PageSection> = {}): PageSection => ({
  blockId,
  heading: 'Heading',
  content: '',
  position: 0,
  ...extra,
})

// Every extractor whose props carry a `variant`, keyed by block id.
const VARIANT_EXTRACTORS: Record<string, (s: PageSection) => { variant: string; theme?: string }> = {
  'content-split': X.extractContentSplitProps,
  'feature-grid': X.extractFeatureGridProps,
  'cta-banner': X.extractCtaBannerProps,
  'intro-text': X.extractIntroTextProps,
  'service-cards': X.extractServiceCardsProps,
  'team-grid': X.extractTeamGridProps,
  testimonials: X.extractTestimonialsProps,
  'stats-bar': X.extractStatsBarProps,
  'checklist-section': X.extractChecklistSectionProps,
  'process-steps': X.extractProcessStepsProps,
  'industry-cards': X.extractIndustryCardsProps,
  pricing: X.extractPricingProps,
  'content-cards': X.extractContentCardsProps,
  form: X.extractFormProps,
}

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

  it('the variant-less blocks are exactly those whose extractor has no variant', () => {
    const withVariants = BLOCK_IDS.filter((id) => spec(id).variants.length && spec(id).placement !== 'frontmatter').sort()
    expect(withVariants).toEqual(Object.keys(VARIANT_EXTRACTORS).sort())
  })

  it.each(Object.entries(VARIANT_EXTRACTORS))('%s: default and every listed variant match the extractor', (id, extract) => {
    const s = spec(id as BlockId)
    expect(extract(section(id)).variant).toBe(s.default)
    for (const { value } of s.variants) expect(extract(section(id, { variant: value })).variant).toBe(value)
  })

  it.each(Object.entries(VARIANT_EXTRACTORS))('%s: themes are exactly what the extractor accepts', (id, extract) => {
    const accepted = extract(section(id, { theme: 'ink' })).theme === 'ink' ? ['ink'] : []
    expect([...spec(id as BlockId).themes]).toEqual(accepted)
  })

  it('page openers: defaults match the hero extractors', () => {
    const m = { title: 'T', url: '/', meta_description: 'D', sections: [] } as unknown as PageManifest
    expect(X.extractHeroProps(m).variant).toBe(spec('hero').default)
    expect(X.extractHeroSplitProps(m).variant).toBe(spec('hero-split').default)
  })
})

// Compile-time parity with the extract-block-props unions (tsc checks this
// file; expectTypeOf is a no-op at runtime).
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
})
