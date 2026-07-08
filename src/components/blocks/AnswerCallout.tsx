import { Sparkles } from 'lucide-react'
import { Section } from './Section'

/**
 * Renders the generated `answer_block` (a 2–3 sentence direct answer to the
 * page's likely search query) as a "quick answer" callout at the top of the
 * body. Surfaces AIO / featured-snippet content that was previously only in
 * the metadata trailer and never shown. No-op when absent.
 *
 * Spans the full content width and uses the brand action color (a left accent
 * bar + a soft tint) to stand out as the page's featured answer. All styling is
 * token-based, so it adapts to each site's palette and to dark mode.
 */
export function AnswerCallout({ answer }: { answer?: string }) {
  if (!answer?.trim()) return null
  return (
    <Section dataBlock="answer-callout" className="pb-0">
      <div className="relative overflow-hidden rounded-xl border border-border border-l-4 border-l-[color:var(--color-action)] bg-card p-6 shadow-card md:p-8">
        {/* Soft brand-action wash so the callout reads as highlighted without a loud fill. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color:var(--color-action)]/[0.07] to-transparent"
        />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles
              aria-hidden="true"
              className="h-4 w-4 text-[color:var(--color-action)]"
            />
            <p className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
              Quick answer
            </p>
          </div>
          <p className="text-lg leading-relaxed text-foreground md:text-xl">{answer}</p>
        </div>
      </div>
    </Section>
  )
}
