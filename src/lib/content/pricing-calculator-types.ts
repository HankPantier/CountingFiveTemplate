// ---------------------------------------------------------------------------
// Pricing calculator config — MIRROR of the onboarding contract
// (types/pricing-calculator.ts in counting-five-onboarding). Keep in sync; see
// that repo's docs/pricing-calculator-contract.md.
// ---------------------------------------------------------------------------

export interface PricingServiceLine {
  id: string
  label: string
  baseRate: number
  enabledByDefault: boolean
  description?: string
}

export interface PricingMultiplierOption {
  id: string
  label: string
  multiplier: number
}

export type PricingAddOn =
  | { id: string; label: string; type: 'flat'; flatRate: number; description?: string }
  | { id: string; label: string; type: 'per-unit'; unitRate: number; unitLabel: string; description?: string }

export interface PricingImplementationFee {
  amount: number
  label: string
  weeks?: string
}

export interface PricingCalculatorConfig {
  version: 1
  currency: string
  billingPeriod: 'month' | 'year'
  intro: string
  implementationFee: PricingImplementationFee | null
  serviceLines: PricingServiceLine[]
  sizeTiers: PricingMultiplierOption[]
  complexityLevels: PricingMultiplierOption[]
  addOns: PricingAddOn[]
  estimateBandPct: number
  disclaimer: string
  cta: { label: string; url: string }
}

// The visitor's current selections.
export interface PricingSelection {
  services: Record<string, boolean>
  sizeTierId: string | null
  complexityId: string | null
  // Flat add-ons: boolean. Per-unit add-ons: the quantity.
  addOns: Record<string, number>
}

export interface PricingEstimate {
  monthly: number
  low: number
  high: number
  oneTime: number
}

// Pure, deterministic. Same math the contract documents; used by the client
// component and unit-tested independently.
export function computeEstimate(
  config: PricingCalculatorConfig,
  selection: PricingSelection
): PricingEstimate {
  const base = config.serviceLines.reduce(
    (sum, line) => (selection.services[line.id] ? sum + line.baseRate : sum),
    0
  )
  const sizeMult = config.sizeTiers.find(t => t.id === selection.sizeTierId)?.multiplier ?? 1
  const compMult = config.complexityLevels.find(c => c.id === selection.complexityId)?.multiplier ?? 1
  const scaled = base * sizeMult * compMult

  const addOnTotal = config.addOns.reduce((sum, addOn) => {
    const value = selection.addOns[addOn.id] ?? 0
    if (addOn.type === 'flat') return value ? sum + addOn.flatRate : sum
    return sum + addOn.unitRate * value
  }, 0)

  const monthly = Math.round(scaled + addOnTotal)
  const band = Math.max(0, Math.min(50, config.estimateBandPct)) / 100
  return {
    monthly,
    low: Math.round(monthly * (1 - band)),
    high: Math.round(monthly * (1 + band)),
    oneTime: config.implementationFee?.amount ?? 0,
  }
}

// Default selections when the calculator first loads.
export function initialSelection(config: PricingCalculatorConfig): PricingSelection {
  const services: Record<string, boolean> = {}
  for (const line of config.serviceLines) services[line.id] = line.enabledByDefault
  const addOns: Record<string, number> = {}
  for (const a of config.addOns) addOns[a.id] = 0
  return {
    services,
    sizeTierId: config.sizeTiers[0]?.id ?? null,
    complexityId: config.complexityLevels[0]?.id ?? null,
    addOns,
  }
}
