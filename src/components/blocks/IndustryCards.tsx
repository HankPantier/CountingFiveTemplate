import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Icon } from './Icon'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { IndustryCardsProps } from '@/lib/assembly/extract-block-props'

export type { IndustryCardsProps }

export function IndustryCards({ variant, heading, intro, industries }: IndustryCardsProps) {
  const colsClass =
    variant === '4-col'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <Section dataBlock="industry-cards">
      <header className="max-w-2xl mx-auto text-center">
        <h2
          className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
        >
          {heading}
        </h2>
        {intro && (
          <InlineProse text={intro} className="mt-3 text-foreground/70 leading-relaxed" />
        )}
      </header>

      <div className={cn('mt-12 grid gap-6', colsClass)}>
        {industries.map((industry) => {
          const itemKey = industry.url ?? industry.title
          const cardContent = (
            <Card
              className={cn(
                'h-full p-6 flex flex-col items-start gap-3 shadow-card transition-shadow',
                industry.url && 'hover:shadow-card-hover cursor-pointer'
              )}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-lg"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--color-primary,theme(colors.blue.700)) 12%, transparent)',
                }}
              >
                <Icon
                  name={industry.icon}
                  className="h-6 w-6 text-[color:var(--color-primary,theme(colors.blue.700))]"
                />
              </div>
              <h3
                className="font-heading font-semibold text-lg text-foreground"
              >
                {industry.title}
              </h3>
              {industry.description && (
                <p className="text-foreground/70 text-sm leading-relaxed">
                  {industry.description}
                </p>
              )}
            </Card>
          )

          if (industry.url) {
            return (
              <Link key={itemKey} href={industry.url} aria-label={industry.title} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
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
