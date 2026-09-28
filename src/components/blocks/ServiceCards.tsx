import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Icon } from './Icon'
import { Button } from '@/components/ui/button'
import { FramedMedia } from '@/components/ui/framed-media'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import type { ServiceCardsProps } from '@/lib/assembly/extract-block-props'
import { layoutSlot } from './layout-slot'

export type { ServiceCardsProps }

export function ServiceCards({ variant, theme, heading, intro, cards }: ServiceCardsProps) {
  // Nothing parsed (and no intro to show): render nothing rather than an
  // empty heading shell.
  if (!cards?.length && !intro?.trim()) return null
  const colsClass =
    variant === '2-col'
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  const isInk = theme === 'ink'
  // 'list' (2026.09.9): default markup + data-layout + slot hooks; the rows come
  // from src/styles/block-layouts.css (shared with the site-wide cards preset).
  const layout = variant === 'list' ? 'list' : undefined

  const grid = (
    <>
      <header className="mx-auto max-w-2xl text-center">
        <h2 className={cn('t-h2', isInk ? 'text-primary-foreground' : 'text-foreground')}>
          {heading}
        </h2>
        {intro && (
          <InlineProse
            text={intro}
            className={cn('t-body-lg mt-4', isInk ? 'text-primary-foreground/75' : 'text-foreground/70')}
          />
        )}
      </header>
      <div className={cn('mt-12 grid gap-6', colsClass)} data-c5-slot={layoutSlot(layout, 'items')}>
        {cards.map((card, i) => (
          <div
            key={i}
            data-c5-slot={layoutSlot(layout, 'item')}
            className={cn(
              'u-card h-full flex flex-col overflow-hidden',
              card.url && 'u-card-interactive',
            )}
          >
            {card.image && (
              <FramedMedia
                src={resolveImageSrc(card.image)!}
                alt={card.title}
                ratio="16/9"
                grade="duotone"
                framed={false}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                slot={layoutSlot(layout, 'media')}
              />
            )}
            <div className="flex flex-1 flex-col p-6" data-c5-slot={layoutSlot(layout, 'body')}>
              {card.icon && !card.image && (
                <div className="u-icon-square mb-4 flex h-12 w-12 items-center justify-center">
                  <Icon name={card.icon} className="h-6 w-6" />
                </div>
              )}
              <h3 className="t-h3 text-foreground">{card.title}</h3>
              <p className="t-small mt-2 flex-1 text-foreground/70">{card.description}</p>
              {card.url && (
                <div className="mt-4">
                  <Button asChild variant="link" className="px-0 text-sm">
                    <Link href={card.url} aria-label={`Learn more about ${card.title}`}>
                      Learn more &rarr;
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  if (isInk) {
    return (
      <Section fullBleed bg="primary" spacing="spacious" dataBlock="service-cards" dataLayout={layout} className="u-band-ink">
        {grid}
      </Section>
    )
  }

  return <Section dataBlock="service-cards" dataLayout={layout}>{grid}</Section>
}
