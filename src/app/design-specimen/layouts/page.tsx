import type { Metadata } from 'next'
import { Section } from '@/components/blocks/Section'
import { BLOCK_REGISTRY } from '@/components/assembly/block-registry'
import { Hero } from '@/components/blocks/Hero'
import { extractHeroProps } from '@/lib/assembly/extract-block-props'
import { layoutSpecimenCells, makeSampleManifest, mediaSpecimenCells } from '@/lib/showcase/samples'

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
 *
 * Below the layout cells (2026.09.10): the media background cells — the
 * full-bleed image / slider Hero and an image cta-banner with a long body
 * ([data-specimen-media]), for e2e/hero-image.spec.ts and
 * e2e/cta-banner-image.spec.ts.
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
      {mediaSpecimenCells().map((c) => (
        <div key={c.key} data-specimen-media={c.key}>
          <Section as="div" spacing="none" className="border-t border-border py-3">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {c.key} · media background · sample content
            </p>
          </Section>
          {c.kind === 'hero'
            ? <Hero {...extractHeroProps(c.manifest)} />
            : BLOCK_REGISTRY[c.blockId]?.(c.section, manifest)}
        </div>
      ))}
    </main>
  )
}
