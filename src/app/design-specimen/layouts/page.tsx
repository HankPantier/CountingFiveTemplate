import type { Metadata } from 'next'
import { Section } from '@/components/blocks/Section'
import { BLOCK_REGISTRY } from '@/components/assembly/block-registry'
import { layoutSpecimenCells, makeSampleManifest } from '@/lib/showcase/samples'

/**
 * Layout specimen (2026.09.9): every block × layout variant cell (and list ×
 * ink), from sample content. Served at /design-specimen?layouts=1 — src/proxy.ts
 * rewrites that URL here, so /design-specimen itself stays byte-identical and
 * both pages stay static (no searchParams). Same rules as the specimen:
 * noindex, not in the sitemap / llms.txt, linked from nowhere, no client JS
 * needed.
 *
 * The site-wide layout presets (html[data-c5-layout-*]) are not cells: they
 * apply the same rules to the default markup the plain /design-specimen shows
 * (e2e/block-layouts.spec.ts toggles them there). FAQ split is preset-only.
 */
export const metadata: Metadata = {
  title: 'Design specimen — layouts',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function DesignSpecimenLayouts() {
  const manifest = makeSampleManifest('/design-specimen', 'Sample page')
  return (
    <main id="main-content" className="flex-1" data-specimen data-specimen-layouts>
      {layoutSpecimenCells().map((c) => {
        const render = BLOCK_REGISTRY[c.blockId]
        if (!render) return null
        return (
          <div key={c.key} data-specimen-layout={c.key} data-specimen-block={c.blockId}>
            <Section as="div" spacing="none" className="border-t border-border py-3">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {c.blockId} · variant: {c.variant}
                {c.theme ? ` · theme: ${c.theme}` : ''} · sample content
              </p>
            </Section>
            {render(c.section, manifest)}
          </div>
        )
      })}
    </main>
  )
}
