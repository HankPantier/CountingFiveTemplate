import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { getPricingPlansConfig } from '@/lib/content/get-pricing-plans-config'
import { PricingPlansClient } from './PricingPlansClient'
import type { PricingPlansProps } from '@/lib/assembly/extract-block-props'

export type { PricingPlansProps }

/**
 * Pricing plans block — config-driven (like PricingCalculator). Reads
 * content/pricing-plans.json at build time and renders the static tier cards
 * with a monthly/annual toggle, "all plans include" list, and add-ons. Renders
 * nothing when no (or an empty) plans config ships, so a deliverable that
 * includes the annotation but no JSON stays harmless.
 */
export async function PricingPlans({ heading, intro }: PricingPlansProps) {
  const config = await getPricingPlansConfig()
  if (!config || config.tiers.length === 0) return null

  return (
    <Section dataBlock="pricing-plans">
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
      <PricingPlansClient config={config} />
    </Section>
  )
}
