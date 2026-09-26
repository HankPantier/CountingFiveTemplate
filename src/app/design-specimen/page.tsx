import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Section } from '@/components/blocks/Section'
import { BLOCK_REGISTRY, KNOWN_BLOCK_IDS } from '@/components/assembly/block-registry'
import { Hero } from '@/components/blocks/Hero'
import { HeroSplit } from '@/components/blocks/HeroSplit'
import { PageHeader } from '@/components/blocks/PageHeader'
import { extractHeroProps, extractHeroSplitProps, extractPageHeaderProps } from '@/lib/assembly/extract-block-props'
import { loadSpecimenPages } from '@/lib/specimen/load-pages'
import { pickSpecimenInstances, type SpecimenHero } from '@/lib/specimen/pick-instances'

/**
 * Design specimen (template T2, capability "specimen"). Every block rendered
 * once — the FIRST real instance from this site's own pages, else the
 * showcase sample — so the Revaltus Design Studio can render and critique a
 * design against the whole block vocabulary in one page.
 *
 * Production route, but: noindex (meta here + X-Robots-Tag in next.config),
 * not in the sitemap / llms.txt (both are built from content pages), linked
 * from nowhere. Static: only 'use cache' loaders, server components only.
 */
export const metadata: Metadata = {
  title: 'Design specimen',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

function renderHero(h: SpecimenHero): ReactNode {
  if (h.kind === 'hero') return <Hero {...extractHeroProps(h.manifest)} />
  if (h.kind === 'hero-split') return <HeroSplit {...extractHeroSplitProps(h.manifest)} />
  return <PageHeader {...extractPageHeaderProps(h.manifest)} />
}

function Label({ id, source, pageUrl }: { id: string; source: 'page' | 'sample'; pageUrl: string | null }) {
  return (
    <Section as="div" spacing="none" className="border-t border-border py-3">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {id} · {source === 'page' ? `from ${pageUrl}` : 'sample content'}
      </p>
    </Section>
  )
}

export default async function DesignSpecimen() {
  const pages = await loadSpecimenPages()
  const { heroes, blocks } = pickSpecimenInstances(pages, KNOWN_BLOCK_IDS)
  return (
    <main id="main-content" className="flex-1" data-specimen>
      {heroes.map((h) => (
        <div key={h.kind} data-specimen-hero={h.kind} data-specimen-source={h.source}>
          <Label id={h.kind} source={h.source} pageUrl={h.pageUrl} />
          {renderHero(h)}
        </div>
      ))}
      {blocks.map((b) => {
        const render = BLOCK_REGISTRY[b.blockId]
        if (!render) return null
        return (
          <div key={b.blockId} data-specimen-block={b.blockId} data-specimen-source={b.source}>
            <Label id={b.blockId} source={b.source} pageUrl={b.pageUrl} />
            {render(b.section, b.manifest)}
          </div>
        )
      })}
    </main>
  )
}
