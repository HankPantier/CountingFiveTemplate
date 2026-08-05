import { Section } from './Section'
import { cn } from '@/lib/utils'
import type { StatsBarProps } from '@/lib/assembly/extract-block-props'

export type { StatsBarProps }

export function StatsBar({ variant, theme, heading, stats }: StatsBarProps) {
  if (!stats || stats.length === 0) return null

  const isLight = theme === 'light'

  const colsClass =
    variant === '4-up'
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-3'

  // Hairline divider between stats at md+. On ink the divider is a faint tint
  // of the light foreground; on the light canvas it uses the border token.
  const dividerClass = isLight
    ? 'md:border-l md:border-[color:var(--color-border)] md:pl-8'
    : 'md:border-l md:border-[color:var(--color-primary-foreground)]/15 md:pl-8'

  const valueColor = isLight ? 'var(--color-primary)' : 'var(--color-action)'
  const headingClass = isLight ? 'text-foreground' : 'text-primary-foreground'
  // .t-kicker hardcodes the action colour; override it via inline style so the
  // label reads as a muted caption on both surfaces rather than a second accent.
  const labelColor = isLight
    ? 'color-mix(in srgb, var(--color-foreground) 60%, transparent)'
    : 'color-mix(in srgb, var(--color-primary-foreground) 70%, transparent)'

  return (
    <Section
      as="section"
      fullBleed
      bg={isLight ? 'none' : 'primary'}
      spacing="spacious"
      dataBlock="stats-bar"
    >
      {heading && (
        <h2 className={cn('t-h2 mb-12 text-center', headingClass)}>{heading}</h2>
      )}
      <dl className={cn('grid gap-y-10 gap-x-8', colsClass)}>
        {stats.map((stat, i) => (
          <div key={i} className={i > 0 ? dividerClass : undefined}>
            <dd
              className="t-display font-accent leading-none"
              style={{ fontVariantNumeric: 'tabular-nums', color: valueColor }}
            >
              {stat.value}
            </dd>
            {stat.label && (
              <dt className="t-kicker mt-4" style={{ color: labelColor }}>
                {stat.label}
              </dt>
            )}
          </div>
        ))}
      </dl>
    </Section>
  )
}
