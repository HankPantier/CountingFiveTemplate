import { notFound } from 'next/navigation'
import { BLOCK_REGISTRY, KNOWN_BLOCK_IDS } from '@/components/assembly/block-registry'
import { Section } from '@/components/blocks/Section'
import { makeSampleManifest, makeSampleSection } from '@/lib/showcase/samples'

/**
 * Dev-only showcase route. Renders every block in BLOCK_REGISTRY with a
 * realistic sample so designers (Claude.ai handoff included) and reviewers
 * can see the visual vocabulary before any real content is unpacked.
 *
 * Production: hard 404 via notFound(). The route compiles but never serves.
 */

export const metadata = {
  title: 'Block showcase (dev)',
  robots: 'noindex,nofollow',
}

export default function Showcase() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const manifest = makeSampleManifest()

  return (
    <>
      <Section>
        <h1 className="font-heading text-4xl font-semibold text-foreground">Block showcase</h1>
        <p className="mt-3 text-foreground/70">
          Every block in the registry, rendered once with synthetic-but-realistic
          content. Dev-only — returns 404 in production builds. Useful for
          designers (Claude.ai brief handoff) and reviewers previewing the
          visual vocabulary before real content is unpacked.
        </p>
        <p className="mt-2 text-sm font-mono text-muted-foreground">
          {KNOWN_BLOCK_IDS.length} blocks · sorted alphabetically
        </p>
      </Section>

      {KNOWN_BLOCK_IDS.map((id) => {
        const render = BLOCK_REGISTRY[id]
        if (!render) return null
        return (
          <div key={id} data-showcase-block={id}>
            <Section as="div" className="!py-4 border-t border-border">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {id}
              </p>
            </Section>
            {render(makeSampleSection(id), manifest)}
          </div>
        )
      })}
    </>
  )
}
