import { Section } from './Section'

/**
 * Renders the generated `answer_block` (a 2–3 sentence direct answer to the
 * page's likely search query) as a "quick answer" callout at the top of the
 * body. Surfaces AIO / featured-snippet content that was previously only in
 * the metadata trailer and never shown. No-op when absent.
 */
export function AnswerCallout({ answer }: { answer?: string }) {
  if (!answer?.trim()) return null
  return (
    <Section dataBlock="answer-callout" className="pb-0">
      <div className="max-w-3xl mx-auto rounded-lg border bg-card p-6">
        <p className="font-heading text-xs font-semibold uppercase tracking-wide text-primary mb-2">
          Quick answer
        </p>
        <p className="text-lg leading-relaxed text-foreground">{answer}</p>
      </div>
    </Section>
  )
}
