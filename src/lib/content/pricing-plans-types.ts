// ---------------------------------------------------------------------------
// Pricing plans config — MIRROR of the onboarding contract
// (types/pricing-plans.ts in counting-five-onboarding). Keep in sync; see that
// repo's docs/pricing-plans-contract.md.
// ---------------------------------------------------------------------------

export interface PlanFeature {
  id: string
  label: string
  included: boolean
}

export interface PlanTier {
  id: string
  name: string
  description?: string
  monthlyPrice: number
  annualPrice: number
  priceSuffix?: string
  isMostPopular: boolean
  features: PlanFeature[]
  cta: { label: string; url: string }
}

export type PlanAddOn =
  | { id: string; label: string; type: 'flat'; price: number; cadence: 'month' | 'year' | 'once'; description?: string }
  | { id: string; label: string; type: 'per-unit'; unitPrice: number; unitLabel: string; description?: string }

export interface PlanBilling {
  showToggle: boolean
  defaultCadence: 'monthly' | 'annual'
  annualDiscountPct: number
  monthlyLabel: string
  annualLabel: string
}

export interface PricingPlansConfig {
  version: 1
  currency: string
  intro: string
  billing: PlanBilling
  tiers: PlanTier[]
  sharedFeatures: { heading: string; items: string[] }
  addOns: PlanAddOn[]
  disclaimer: string
  cta: { label: string; url: string }
}

// Guards against a config file that exists (content/pricing-plans.json
// shipped) but has the wrong shape — e.g. missing tiers, or a field that
// isn't an array because it was hand-edited or came from a stale
// deliverable. /design-specimen renders this block from every client's own
// content at build time, so a malformed file must resolve to "render
// nothing", never throw and break every page on the site.
export function isValidPricingPlansConfig(
  config: PricingPlansConfig | null | undefined
): config is PricingPlansConfig {
  return (
    !!config &&
    Array.isArray(config.tiers) &&
    config.tiers.length > 0 &&
    Array.isArray(config.addOns) &&
    !!config.sharedFeatures &&
    Array.isArray(config.sharedFeatures.items)
  )
}
