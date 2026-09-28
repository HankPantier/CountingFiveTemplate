import { describe, expect, it } from 'vitest'
import { KNOWN_BLOCK_IDS } from '@/components/assembly/block-registry'
import { SAMPLE_CONTENT, makeSampleHeroManifest, makeSampleManifest, makeSampleSection } from './samples'

describe('showcase samples', () => {
  it('only samples known blocks', () => {
    for (const id of Object.keys(SAMPLE_CONTENT)) expect(KNOWN_BLOCK_IDS).toContain(id)
  })
  it('builds a titled section per block (empty content when unsampled)', () => {
    expect(makeSampleSection('feature-grid')).toMatchObject({ blockId: 'feature-grid', heading: 'Feature Grid', position: 0 })
    expect(makeSampleSection('map').content).toBe('')
  })
  it('the sample manifest carries the FAQ the faq-accordion block reads', () => {
    expect(makeSampleManifest().faq_block?.length).toBe(2)
  })
  it.each(['hero', 'hero-split', 'page-header'] as const)('builds a %s hero manifest', (kind) => {
    const m = makeSampleHeroManifest(kind)
    expect(m.hero_block).toBe(kind)
    expect(m.hero_headline).toContain('*')
  })
})

describe('layout specimen cells (2026.09.9)', () => {
  it('one cell per catalogued layout variant, plus one per accepted theme', async () => {
    const { BLOCK_CATALOG, BLOCK_IDS } = await import('@/lib/assembly/block-catalog')
    const expected = BLOCK_IDS.flatMap((id) =>
      (BLOCK_CATALOG[id].variants as readonly { value: string; layout?: true }[])
        .filter((v) => v.layout)
        .flatMap((v) => [undefined, ...BLOCK_CATALOG[id].themes].map((t) => [id, v.value, t].filter(Boolean).join(':'))),
    )
    const { layoutSpecimenCells } = await import('./samples')
    const cells = layoutSpecimenCells()
    expect(cells.map((c) => c.key)).toEqual(expected)
    expect(cells.map((c) => c.key)).toContain('service-cards:list:ink')
    for (const c of cells) expect(c.section).toMatchObject({ blockId: c.blockId, variant: c.variant })
  })
})
