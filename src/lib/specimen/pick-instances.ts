/**
 * Pure: choose what /design-specimen shows — the FIRST real instance of each
 * block across the client's pages (home first, then the other pages in slug
 * order), falling back to the showcase sample for blocks no page uses. Heroes
 * are page-level (manifest.hero_block), one per kind.
 */
import type { PageManifest, PageSection } from '@/lib/assembly/parse-page-md'
import { makeSampleHeroManifest, makeSampleManifest, makeSampleSection } from '@/lib/showcase/samples'

export const HERO_KINDS = ['hero', 'hero-split', 'page-header'] as const
export type HeroKind = (typeof HERO_KINDS)[number]

export type SpecimenPage = { url: string; manifest: PageManifest }
export type SpecimenHero = { kind: HeroKind; source: 'page' | 'sample'; pageUrl: string | null; manifest: PageManifest }
export type SpecimenBlock = {
  blockId: string
  source: 'page' | 'sample'
  pageUrl: string | null
  section: PageSection
  manifest: PageManifest
}

export function pickSpecimenInstances(
  pages: SpecimenPage[],
  knownBlockIds: readonly string[],
): { heroes: SpecimenHero[]; blocks: SpecimenBlock[] } {
  const heroes: SpecimenHero[] = HERO_KINDS.map((kind) => {
    const hit = pages.find((p) => p.manifest.hero_block === kind)
    return hit
      ? { kind, source: 'page', pageUrl: hit.url, manifest: hit.manifest }
      : { kind, source: 'sample', pageUrl: null, manifest: makeSampleHeroManifest(kind) }
  })

  const sampleManifest = makeSampleManifest('/design-specimen', 'Sample page')
  const blocks: SpecimenBlock[] = knownBlockIds.map((blockId) => {
    for (const p of pages) {
      const section = p.manifest.sections.find((s) => s.blockId === blockId)
      if (section) return { blockId, source: 'page', pageUrl: p.url, section, manifest: p.manifest }
    }
    return { blockId, source: 'sample', pageUrl: null, section: makeSampleSection(blockId), manifest: sampleManifest }
  })

  return { heroes, blocks }
}
