import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isValidElement } from 'react'
import { BLOCK_REGISTRY, KNOWN_BLOCK_IDS } from '@/components/assembly/block-registry'
import {
  ANNOTATION_FIELD_ORDER,
  BASELINE_SINCE,
  BLOCK_CATALOG,
  BLOCK_IDS,
  LAYOUTS_SINCE,
  blockCatalogJson,
  type BlockId,
  type BlockSpec,
  type BlockVariant,
} from './block-catalog'
import type * as X from './extract-block-props'
import { ctaBannerAnnotationVariant, extractHeroProps, extractHeroSplitProps } from './extract-block-props'
import { parsePageMd, type PageManifest, type PageSection } from './parse-page-md'
import type { HeroProps as HeroComponentProps } from '@/components/blocks/Hero'

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

// Client repos may predate an opt-in block (pricing-plans is rolled out per
// client on request), so there the registry only has to be catalogued; the
// template itself must match the catalog exactly. See e2e/template-default.ts.
const IS_TEMPLATE_DEFAULT = existsSync(path.join(process.cwd(), 'content', '.template-default'))

// The annotation value the component received. cta-banner splits
// `<bg>-centered` into variant + align (2026.09.9); every other block passes
// the value straight through as `variant`.
function registryVariant(id: string, extra: Partial<PageSection> = {}): unknown {
  const props = registryProps(id, extra)
  if (id === 'cta-banner') return ctaBannerAnnotationVariant(props as Parameters<typeof ctaBannerAnnotationVariant>[0])
  return props.variant
}

describe('block catalog contract', () => {
  it('docs/design/blocks.json matches the catalog (run npm run design-contracts)', () => {
    expect(readFileSync(path.join(process.cwd(), 'docs', 'design', 'blocks.json'), 'utf-8')).toBe(blockCatalogJson())
  })

  it('lists exactly the registry blocks inline/auto, and the three page openers as frontmatter', () => {
    const body = BLOCK_IDS.filter((id) => spec(id).placement !== 'frontmatter').sort()
    if (IS_TEMPLATE_DEFAULT) expect(body).toEqual(KNOWN_BLOCK_IDS)
    else for (const id of KNOWN_BLOCK_IDS) expect(body, `${id} is not in the block catalog`).toContain(id)
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
    const withVariants = KNOWN_BLOCK_IDS.filter((id) => spec(id as BlockId)?.variants.length > 0)
    const propsWithVariant = KNOWN_BLOCK_IDS.filter((id) => 'variant' in registryProps(id))
    expect(withVariants).toEqual(propsWithVariant)
  })

  it.each(KNOWN_BLOCK_IDS)('%s: default and every listed variant reach the component', (id) => {
    const s = spec(id as BlockId)
    if (!s.variants.length) return
    expect(registryVariant(id)).toBe(s.default)
    for (const { value } of s.variants) expect(registryVariant(id, { variant: value })).toBe(value)
  })

  it.each(KNOWN_BLOCK_IDS)('%s: themes are exactly the probed values the component receives', (id) => {
    const accepted = THEME_PROBES.filter((t) => registryProps(id, { theme: t }).theme === t)
    expect([...spec(id as BlockId).themes]).toEqual(accepted)
  })

  it('layout variants: every one ships in a versioned release, only on blocks with a layout family', () => {
    const layouts = BLOCK_IDS.flatMap((id) => spec(id).variants.filter((x) => x.layout).map((x) => `${id}:${x.value}@${x.since}`))
    expect(layouts.sort()).toEqual(
      [
        'content-cards:list',
        'cta-banner:color-bg-centered',
        'cta-banner:image-bg-centered',
        'feature-grid:list',
        'service-cards:list',
        'team-grid:list',
        'testimonials:featured',
      ].map((x) => `${x}@${LAYOUTS_SINCE}`),
    )
    for (const id of BLOCK_IDS) for (const x of spec(id).variants) if (!x.layout) expect(x.since, `${id}:${x.value}`).toBe(BASELINE_SINCE)
  })

  it('cta-banner: the centred values split into background + align; unknown values pass through', () => {
    const cta = (variant?: string) => registryProps('cta-banner', { variant })
    expect(cta('image-bg-centered')).toMatchObject({ variant: 'image-bg', align: 'centered' })
    expect(cta('color-bg-centered')).toMatchObject({ variant: 'color-bg', align: 'centered' })
    expect(cta('image-bg')).not.toHaveProperty('align')
    expect(cta(undefined)).not.toHaveProperty('align')
    // Only the two catalogued backgrounds split; anything else is today's cast.
    expect(cta('bogus-centered')).toMatchObject({ variant: 'bogus-centered' })
    expect(cta('bogus-centered')).not.toHaveProperty('align')
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
    expectTypeOf<BlockVariant<'cta-banner'>>().toEqualTypeOf<X.CtaBannerAnnotationVariant>()
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
    // 2026.09.9 narrowed HeroProps (the dead image-right / image-left are gone).
    expectTypeOf<BlockVariant<'hero'>>().toEqualTypeOf<X.HeroProps['variant']>()
    expectTypeOf<HeroComponentProps['variant']>().toEqualTypeOf<X.HeroProps['variant']>()
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
