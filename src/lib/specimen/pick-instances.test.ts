import { describe, expect, it } from 'vitest'
import type { PageManifest, PageSection } from '@/lib/assembly/parse-page-md'
import { makeSampleManifest } from '@/lib/showcase/samples'
import { pickSpecimenInstances } from './pick-instances'

const sec = (blockId: string, heading: string): PageSection => ({ blockId, heading, content: `${heading} body`, position: 0 })
const page = (url: string, hero: string, sections: PageSection[]): { url: string; manifest: PageManifest } => ({
  url,
  manifest: { ...makeSampleManifest(url, url), hero_block: hero, sections },
})

describe('pickSpecimenInstances', () => {
  const pages = [
    page('/', 'hero', [sec('intro-text', 'Home intro'), sec('feature-grid', 'Home grid')]),
    page('/about', 'page-header', [sec('intro-text', 'About intro'), sec('team-grid', 'Team')]),
  ]
  const { heroes, blocks } = pickSpecimenInstances(pages, ['feature-grid', 'intro-text', 'team-grid', 'map'])

  it('takes the FIRST real instance of each block, in page order', () => {
    expect(blocks.find((b) => b.blockId === 'intro-text')).toMatchObject({ source: 'page', pageUrl: '/', section: { heading: 'Home intro' } })
    expect(blocks.find((b) => b.blockId === 'team-grid')).toMatchObject({ source: 'page', pageUrl: '/about' })
  })
  it('falls back to the showcase sample for blocks no page uses', () => {
    expect(blocks.find((b) => b.blockId === 'map')).toMatchObject({ source: 'sample', pageUrl: null, section: { blockId: 'map' } })
  })
  it('keeps the known-block order', () => {
    expect(blocks.map((b) => b.blockId)).toEqual(['feature-grid', 'intro-text', 'team-grid', 'map'])
  })
  it('picks one hero per kind, sampling the missing ones', () => {
    expect(heroes.map((h) => [h.kind, h.source, h.pageUrl])).toEqual([
      ['hero', 'page', '/'],
      ['hero-split', 'sample', null],
      ['page-header', 'page', '/about'],
    ])
  })
  it('works with no pages at all (fresh template)', () => {
    const r = pickSpecimenInstances([], ['intro-text'])
    expect(r.blocks[0].source).toBe('sample')
    expect(r.heroes.every((h) => h.source === 'sample')).toBe(true)
  })
})
