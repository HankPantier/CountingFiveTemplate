/**
 * BlockRenderer — dispatches a parsed page section to its block component.
 *
 * The dispatch table lives in `block-registry.tsx`; this file just looks up
 * the entry and falls back to `UnknownBlockPlaceholder` for any blockId not
 * yet implemented (so pages stay rendering during incremental delivery).
 *
 * Hero is NOT in the registry — it's page-level and rendered by PageLayout.
 */

import type { PageSection, PageManifest } from '@/lib/assembly/parse-page-md'
import { BLOCK_REGISTRY } from './block-registry'

type BlockRendererProps = {
  section: PageSection
  manifest: PageManifest
}

/**
 * Placeholder rendered for any blockId that doesn't have a registry entry.
 * Shows the metadata + a content preview so pages don't crash mid-delivery.
 */
function UnknownBlockPlaceholder({ section }: { section: PageSection }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="rounded-md border border-dashed border-border bg-muted/40 p-6">
        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
          Block not yet implemented: {section.blockId}
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{section.heading}</h2>
        <pre className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap">
          {section.content.slice(0, 400)}
          {section.content.length > 400 ? '\n[…truncated]' : ''}
        </pre>
      </div>
    </section>
  )
}

export function BlockRenderer({ section, manifest }: BlockRendererProps) {
  const render = BLOCK_REGISTRY[section.blockId]
  if (render) return render(section, manifest)
  // A live site never shows the debug placeholder: an annotation the registry
  // doesn't render (e.g. a page-level `page-header` placed in the body) falls
  // back to plain prose, so the section's heading and copy still read.
  if (process.env.NODE_ENV === 'production') return BLOCK_REGISTRY['content-prose'](section, manifest)
  return <UnknownBlockPlaceholder section={section} />
}
