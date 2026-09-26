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
