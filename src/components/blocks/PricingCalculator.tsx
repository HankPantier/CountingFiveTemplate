import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { getPricingCalculatorConfig } from '@/lib/content/get-pricing-calculator-config'
import { PricingCalculatorClient } from './PricingCalculatorClient'
import type { PricingCalculatorProps } from '@/lib/assembly/extract-block-props'

export type { PricingCalculatorProps }

/**
 * Pricing calculator block — config-driven (like Booking / ContactInfo). Reads
 * content/pricing-calculator.json at build time and renders the interactive
 * estimator. Renders nothing when no (or an empty) calculator config ships, so
 * a deliverable that includes the annotation but no JSON stays harmless.
 */
export async function PricingCalculator({ heading, intro }: PricingCalculatorProps) {
  const config = await getPricingCalculatorConfig()
  if (!config || config.serviceLines.length === 0) return null

  return (
    <Section dataBlock="pricing-calculator">
      {(heading || intro) && (
        <header className="max-w-2xl mx-auto text-center mb-8">
          {heading && (
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
              {heading}
            </h2>
          )}
          {intro && (
            <InlineProse text={intro} className="mt-3 text-foreground/70 leading-relaxed" />
          )}
        </header>
      )}
      <PricingCalculatorClient config={config} />
    </Section>
  )
}
