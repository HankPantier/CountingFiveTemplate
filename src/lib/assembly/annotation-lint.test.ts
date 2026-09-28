import { describe, expect, it } from 'vitest'
import { lintBlockAnnotations } from './annotation-lint'

describe('lintBlockAnnotations (validate-deliverable warnings)', () => {
  it('passes catalogued blocks, variants (incl. 2026.09.9 layouts) and themes', () => {
    const body = [
      '<!-- block: service-cards | variant: list | theme: ink -->',
      '<!-- block: cta-banner | variant: image-bg-centered | image: a.jpg -->',
      '<!-- block: content-prose -->',
      '<!-- block: testimonials | variant: featured -->',
    ].join('\n## H\n\n')
    expect(lintBlockAnnotations(body, { hero: 'hero', hero_variant: 'statement' })).toEqual([])
  })
  it('warns on unknown ids, inline openers, unknown variants and variants on variant-less blocks', () => {
    const w = lintBlockAnnotations(
      '<!-- block: mystery -->\n<!-- block: hero-split | variant: image-right -->\n<!-- block: content-table | variant: 2-col -->\n<!-- block: feature-grid | variant: 5-col -->',
      {},
    )
    expect(w).toHaveLength(4)
    expect(w[0]).toMatch(/unknown block "mystery"/)
    expect(w[1]).toMatch(/page opener/)
    expect(w[2]).toMatch(/content-table" takes no variant/)
    expect(w[3]).toMatch(/unknown variant "5-col"/)
  })
  it('checks the hero pair', () => {
    expect(lintBlockAnnotations('', { hero: 'hero', hero_variant: 'image-right' })[0]).toMatch(/hero: unknown hero_variant "image-right"/)
    expect(lintBlockAnnotations('', { hero: 'hero-split', hero_variant: 'image-left' })).toEqual([])
    expect(lintBlockAnnotations('', { hero_block: 'banner' })[0]).toMatch(/not a page opener/)
    expect(lintBlockAnnotations('', { hero_variant: 'image' })[0]).toMatch(/ignored by the default page header/)
    expect(lintBlockAnnotations('', { hero: 'page-header', hero_variant: 'image' })[0]).toMatch(/ignored by "page-header"/)
  })
})
