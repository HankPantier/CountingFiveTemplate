'use client'

import { Section } from './Section'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'
import type { TestimonialsProps } from '@/lib/assembly/extract-block-props'

export type { TestimonialsProps }

export function Testimonials({ variant, heading, testimonials }: TestimonialsProps) {
  if (!testimonials || testimonials.length === 0) return null

  return (
    <Section bg="surface" dataBlock="testimonials">
      {heading && (
        <header className="mb-10 text-center">
          <h2 className="t-h2 text-foreground">{heading}</h2>
        </header>
      )}

      {variant === 'carousel' ? (
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={heading ?? 'Customer testimonials'}
        >
          <CarouselLayout testimonials={testimonials} />
        </div>
      ) : (
        <GridLayout testimonials={testimonials} />
      )}
    </Section>
  )
}

type QuoteCardProps = {
  quote: string
  name: string
  title?: string
  company?: string
  rating?: number
}

/** First letters of the first two words of a name → "Jane Doe" → "JD". */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function QuoteCard({ quote, name, title, company, rating }: QuoteCardProps) {
  const subline = [title, company].filter(Boolean).join(', ')
  const stars = rating && rating > 0 ? Math.round(rating) : 0

  return (
    <figure className="u-card p-6 h-full flex flex-col">
      {stars > 0 && (
        <div
          className="mb-4 flex gap-0.5 text-base leading-none"
          style={{ color: 'var(--color-action)' }}
          aria-label={`${stars} out of 5 stars`}
        >
          {Array.from({ length: stars }, (_, i) => (
            <span key={i} aria-hidden="true">
              ★
            </span>
          ))}
        </div>
      )}
      <blockquote className="flex-1 t-body-lg text-foreground/85">
        <span
          aria-hidden="true"
          className="font-accent mr-1 align-[-0.35em] text-5xl leading-none"
          style={{ color: 'var(--color-action)' }}
        >
          &ldquo;
        </span>
        {quote}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--color-action) 16%, var(--color-near-white))',
            color: 'var(--color-primary)',
          }}
          aria-hidden="true"
        >
          {initials(name)}
        </span>
        <span className="min-w-0">
          <cite className="t-h4 not-italic text-foreground block truncate">{name}</cite>
          {subline && <span className="t-small text-foreground/60 block truncate">{subline}</span>}
        </span>
      </figcaption>
    </figure>
  )
}

function CarouselLayout({ testimonials }: { testimonials: TestimonialsProps['testimonials'] }) {
  return (
    <div className="relative px-12">
      <Carousel opts={{ loop: true }}>
        <CarouselContent aria-live="polite">
          {testimonials.map((t, i) => (
            <CarouselItem key={i} className="md:basis-1/2 lg:basis-2/3">
              <QuoteCard {...t} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  )
}

function GridLayout({ testimonials }: { testimonials: TestimonialsProps['testimonials'] }) {
  const colsClass = cn(
    'grid gap-6',
    testimonials.length === 2
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'
  )
  return (
    <div className={colsClass}>
      {testimonials.map((t, i) => (
        <QuoteCard key={i} {...t} />
      ))}
    </div>
  )
}
