import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Section } from './Section'
import type { InternalLink } from '@/lib/assembly/parse-page-md'

/**
 * Normalize anchor casing: ensure the label starts with a capital, without
 * downcasing the rest — so "tax planning" → "Tax planning" while proper names
 * like "Business Foundation Services" are preserved as-is.
 */
function capitalizeFirst(text: string): string {
  const t = text.trimStart()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Renders the generated `internal_links` as an end-of-page "Related" section.
 * These contextual internal links are a real ranking signal that was
 * previously generated, written to the metadata trailer, then dropped before
 * render. The `reason` (copywriter-facing rationale) is exposed only as a
 * title attribute, not visible body text. No-op when absent.
 *
 * Presented as a card grid: each link is a full tap-target card with a hover
 * lift + arrow affordance. All colors/shadows are design tokens, so the
 * section adapts to dark mode automatically.
 */
export function RelatedLinks({ links }: { links?: InternalLink[] }) {
  if (!links || links.length === 0) return null
  return (
    <Section dataBlock="related-links" className="border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Keep exploring
          </p>
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground mt-1">
            Related
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {links.map((l, i) => (
            <li key={i}>
              <Link
                href={l.url}
                title={l.reason || undefined}
                className="group flex h-full items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              >
                <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                  {capitalizeFirst(l.anchor_text)}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
