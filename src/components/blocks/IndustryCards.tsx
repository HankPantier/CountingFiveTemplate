import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Icon } from './Icon'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { IndustryCardsProps } from '@/lib/assembly/extract-block-props'

export type { IndustryCardsProps }

export function IndustryCards({ variant, theme, heading, intro, industries }: IndustryCardsProps) {
  const colsClass =
    variant === '4-col'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  // ---- Signature ink index band ----
  if (theme === 'ink') {
    return (
      <Section fullBleed bg="primary" spacing="spacious" dataBlock="industry-cards">
        <div className="grid gap-y-12 gap-x-10 lg:grid-cols-[0.9fr_1.6fr] lg:items-start">
          <header className="max-w-md">
            <div className="t-kicker mb-4">Industries</div>
            <h2 className="t-h2 text-primary-foreground">{heading}</h2>
            {intro && (
              <InlineProse text={intro} className="mt-4 t-body-lg text-primary-foreground/70" />
            )}
          </header>

          <div className={cn('grid gap-x-8 gap-y-10', colsClass)}>
            {industries.map((industry, i) => {
              const itemKey = industry.url ?? industry.title
              const index = String(i + 1).padStart(2, '0')

              const cell = (
                <div className="flex h-full flex-col items-start gap-3 border-t border-[color:var(--color-primary-foreground)]/15 pt-5">
                  <span className="font-accent text-3xl">{index}</span>
                  <h3 className="t-h4 text-primary-foreground">
                    {industry.title}
                    {industry.url && (
                      <span aria-hidden className="ml-2 inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    )}
                  </h3>
                  {industry.description && (
                    <p className="t-small text-primary-foreground/70">{industry.description}</p>
                  )}
                </div>
              )

              if (industry.url) {
                return (
                  <Link
                    key={itemKey}
                    href={industry.url}
                    aria-label={industry.title}
                    className="group block h-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {cell}
                  </Link>
                )
              }
              return (
                <div key={itemKey} className="h-full">
                  {cell}
                </div>
              )
            })}
          </div>
        </div>
      </Section>
    )
  }

  // ---- Light card grid ----
  return (
    <Section dataBlock="industry-cards">
      <header className="max-w-2xl mx-auto text-center">
        <h2 className="t-h2 text-foreground">{heading}</h2>
        {intro && (
          <InlineProse text={intro} className="mt-3 t-body-lg text-foreground/70" />
        )}
      </header>

      <div className={cn('mt-12 grid gap-6', colsClass)}>
        {industries.map((industry) => {
          const itemKey = industry.url ?? industry.title
          const cardContent = (
            <div
              className={cn(
                'u-card h-full p-6 flex flex-col items-start gap-3',
                industry.url && 'u-card-interactive cursor-pointer'
              )}
            >
              <div className="u-icon-square flex items-center justify-center w-12 h-12">
                <Icon name={industry.icon} className="h-6 w-6" />
              </div>
              <h3 className="t-h4">{industry.title}</h3>
              {industry.description && (
                <p className="t-small text-foreground/70">{industry.description}</p>
              )}
            </div>
          )

          if (industry.url) {
            return (
              <Link
                key={itemKey}
                href={industry.url}
                aria-label={industry.title}
                className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[var(--radius-md)]"
              >
                {cardContent}
              </Link>
            )
          }
          return <div key={itemKey} className="h-full">{cardContent}</div>
        })}
      </div>
    </Section>
  )
}
