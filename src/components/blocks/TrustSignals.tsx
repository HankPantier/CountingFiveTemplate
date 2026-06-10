import { Section } from './Section'

/**
 * Renders the generated `eeat_signals` (concrete expertise/credential claims,
 * e.g. "Ron Lague holds the PFS designation") as a compact trust block.
 * Surfaces E-E-A-T evidence that was previously captured but never displayed.
 * No-op when absent.
 */
export function TrustSignals({ signals }: { signals?: string[] }) {
  if (!signals || signals.length === 0) return null
  return (
    <Section dataBlock="trust-signals" bg="surface">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
          Why clients trust us
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-foreground/80">
              <span aria-hidden className="text-primary mt-1">
                &#10003;
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
