import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Icon } from './Icon'
import { cn } from '@/lib/utils'
import type { FeatureGridProps } from '@/lib/assembly/extract-block-props'

export type { FeatureGridProps }

export function FeatureGrid({ variant, theme, heading, intro, items }: FeatureGridProps) {
  const colsClass =
    variant === '4-col'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  // ---- Ink band: index register on the primary surface ----
  if (theme === 'ink') {
    return (
      <Section fullBleed bg="primary" spacing="spacious" dataBlock="feature-grid">
        <header className="max-w-2xl mx-auto text-center">
          <h2 className="t-h2 text-primary-foreground">{heading}</h2>
          {intro && (
            <InlineProse text={intro} className="mt-3 t-body-lg text-primary-foreground/70" />
          )}
        </header>
        <div className={cn('mt-14 grid gap-x-8 gap-y-10', colsClass)}>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-start gap-3 border-t border-[color:var(--color-primary-foreground)]/15 pt-5"
            >
              <span className="font-accent text-2xl">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="t-h4 text-primary-foreground">{item.title}</h3>
              <p className="t-small text-primary-foreground/70">{item.description}</p>
            </div>
          ))}
        </div>
      </Section>
    )
  }

  // ---- Light card grid ----
  return (
    <Section dataBlock="feature-grid">
      <header className="max-w-2xl mx-auto text-center">
        <h2 className="t-h2 text-foreground">{heading}</h2>
        {intro && (
          <InlineProse text={intro} className="mt-3 t-body-lg text-foreground/70" />
        )}
      </header>
      <div className={cn('mt-12 grid gap-6', colsClass)}>
        {items.map((item, i) => (
          <div key={i} className="u-card h-full p-6 flex flex-col items-start gap-3">
            <div className="u-icon-square flex items-center justify-center w-12 h-12">
              <Icon name={item.icon} className="h-6 w-6" />
            </div>
            <h3 className="t-h4">{item.title}</h3>
            <p className="t-small text-foreground/70">{item.description}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
