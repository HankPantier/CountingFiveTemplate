import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { BookingEmbed } from './BookingEmbed'
import { siteConfig } from '../../../site.config'
import type { BookingProps } from '@/lib/assembly/extract-block-props'

export type { BookingProps }

/**
 * Booking block — embeds the client's booking provider (default: Calendly).
 *
 * Wiring:
 *   site.config.ts → booking: { provider: 'calendly', url: 'https://calendly.com/firm/30min' }
 *   plus csp.extraOrigins: ['https://*.calendly.com']  (for the 'calendly' provider)
 *
 * Renders nothing when booking.provider === 'none' or url is blank, so a
 * fresh-clone deliverable that includes a `<!-- block: booking -->` annotation
 * stays harmless until the client is wired up.
 */
export function Booking({ heading, intro }: BookingProps) {
  const { provider, url } = siteConfig.booking
  if (provider === 'none' || !url) return null

  return (
    <Section dataBlock="booking">
      {(heading || intro) && (
        <header className="max-w-2xl mx-auto text-center mb-8">
          {heading && (
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
              {heading}
            </h2>
          )}
          {intro && (
            <InlineProse
              text={intro}
              className="mt-3 text-foreground/70 leading-relaxed"
            />
          )}
        </header>
      )}

      <BookingEmbed provider={provider} url={url} />
    </Section>
  )
}
