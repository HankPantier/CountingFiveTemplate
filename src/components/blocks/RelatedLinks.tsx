import Link from 'next/link'
import { Section } from './Section'
import type { InternalLink } from '@/lib/assembly/parse-page-md'

/**
 * Renders the generated `internal_links` as an end-of-page "Related" list.
 * These contextual internal links are a real ranking signal that was
 * previously generated, written to the metadata trailer, then dropped before
 * render. The `reason` (copywriter-facing rationale) is exposed only as a
 * title attribute, not visible body text. No-op when absent.
 */
export function RelatedLinks({ links }: { links?: InternalLink[] }) {
  if (!links || links.length === 0) return null
  return (
    <Section dataBlock="related-links">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground mb-6">
          Related
        </h2>
        <ul className="space-y-3">
          {links.map((l, i) => (
            <li key={i}>
              <Link
                href={l.url}
                title={l.reason || undefined}
                className="font-medium text-primary hover:underline"
              >
                {l.anchor_text}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
