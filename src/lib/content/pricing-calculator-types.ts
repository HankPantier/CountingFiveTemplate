// ---------------------------------------------------------------------------
// Pricing calculator config — MIRROR of the onboarding contract
// (types/pricing-calculator.ts in counting-five-onboarding). Keep in sync; see
// that repo's docs/pricing-calculator-contract.md.
// ---------------------------------------------------------------------------
import type { ContactContext } from '@/lib/forms/types'

// A per-service option revealed when the service is expanded (accordion).
// Each selected choice adds its `addMonthly` to that service's monthly total.
export interface ServiceOptionChoice {
  id: string
  label: string
  addMonthly: number
}

export type ServiceOptionGroup =
  | { id: string; label: string; kind: 'select'; choices: ServiceOptionChoice[] } // single-choice (radios)
  | { id: string; label: string; kind: 'multi'; choices: ServiceOptionChoice[] } //  multi-choice (checkboxes)

export interface PricingServiceLine {
  id: string
  label: string
  baseRate: number
  enabledByDefault: boolean
  description?: string
  // Optional per-service options shown when the service is toggled on.
  options?: ServiceOptionGroup[]
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
  // serviceId → (groupId → selected choice ids). Single-choice groups hold ≤1.
  serviceOptions: Record<string, Record<string, string[]>>
  // Continuous business-size position in [0, 1]. 0 = first tier, 1 = last tier;
  // the multiplier interpolates between adjacent tiers so the slider glides.
  sizePos: number
  complexityId: string | null
  // Flat add-ons: 0/1. Per-unit add-ons: the quantity.
  addOns: Record<string, number>
}

// Linear-interpolate the size multiplier across the configured tiers (the tiers
// act as anchors). A continuous `pos` in [0, 1] maps across tier[0]..tier[N-1].
export function interpolateSizeMultiplier(
  tiers: PricingMultiplierOption[],
  pos: number
): number {
  if (tiers.length === 0) return 1
  if (tiers.length === 1) return tiers[0].multiplier
  const clamped = Math.max(0, Math.min(1, pos))
  const scaled = clamped * (tiers.length - 1)
  const lo = Math.floor(scaled)
  const hi = Math.ceil(scaled)
  const frac = scaled - lo
  return tiers[lo].multiplier + (tiers[hi].multiplier - tiers[lo].multiplier) * frac
}

// Nearest tier index for `pos` — used to label the current band.
export function nearestSizeTierIndex(tiers: PricingMultiplierOption[], pos: number): number {
  if (tiers.length <= 1) return 0
  return Math.round(Math.max(0, Math.min(1, pos)) * (tiers.length - 1))
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
  const base = config.serviceLines.reduce((sum, line) => {
    if (!selection.services[line.id]) return sum
    let lineTotal = line.baseRate
    const chosen = selection.serviceOptions[line.id] ?? {}
    for (const group of line.options ?? []) {
      const selected = chosen[group.id] ?? []
      for (const choice of group.choices) {
        if (selected.includes(choice.id)) lineTotal += choice.addMonthly
      }
    }
    return sum + lineTotal
  }, 0)

  const sizeMult = interpolateSizeMultiplier(config.sizeTiers, selection.sizePos)
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

// Build the read-only recap carried into the contact drawer + firm email when
// a visitor clicks the calculator CTA. Pure (money formatting is injected) so
// it's unit-testable. Returns null when no service is selected — nothing to say.
export function buildContactContext(
  config: PricingCalculatorConfig,
  selection: PricingSelection,
  estimate: PricingEstimate,
  fmt: (n: number) => string
): ContactContext | null {
  const period = config.billingPeriod === 'year' ? 'yr' : 'mo'

  const serviceParts: string[] = []
  for (const line of config.serviceLines) {
    if (!selection.services[line.id]) continue
    const chosen = selection.serviceOptions[line.id] ?? {}
    const optLabels: string[] = []
    for (const group of line.options ?? []) {
      const selectedIds = chosen[group.id] ?? []
      for (const choice of group.choices) {
        if (selectedIds.includes(choice.id) && choice.addMonthly > 0) optLabels.push(choice.label)
      }
    }
    serviceParts.push(optLabels.length ? `${line.label} (${optLabels.join(', ')})` : line.label)
  }
  if (serviceParts.length === 0) return null

  const lines: ContactContext['lines'] = [{ label: 'Services', value: serviceParts.join('; ') }]

  const sizeTier = config.sizeTiers[nearestSizeTierIndex(config.sizeTiers, selection.sizePos)]
  if (sizeTier) lines.push({ label: 'Business size', value: sizeTier.label })

  const complexity = config.complexityLevels.find(c => c.id === selection.complexityId)
  if (complexity) lines.push({ label: 'Complexity', value: complexity.label })

  const addOnParts: string[] = []
  for (const addOn of config.addOns) {
    const qty = selection.addOns[addOn.id] ?? 0
    if (!qty) continue
    addOnParts.push(addOn.type === 'per-unit' ? `${addOn.label} ×${qty}` : addOn.label)
  }
  if (addOnParts.length) lines.push({ label: 'Add-ons', value: addOnParts.join(', ') })

  lines.push({ label: 'Estimated cost', value: `~${fmt(estimate.low)}–${fmt(estimate.high)}/${period}` })
  if (config.implementationFee) {
    lines.push({ label: 'One-time setup', value: fmt(config.implementationFee.amount) })
  }

  return { title: 'Your estimate', lines }
}

// Default selections when the calculator first loads.
export function initialSelection(config: PricingCalculatorConfig): PricingSelection {
  const services: Record<string, boolean> = {}
  const serviceOptions: Record<string, Record<string, string[]>> = {}
  for (const line of config.serviceLines) {
    services[line.id] = line.enabledByDefault
    const groups: Record<string, string[]> = {}
    for (const group of line.options ?? []) {
      // Single-choice groups default to their first choice; multi start empty.
      groups[group.id] = group.kind === 'select' && group.choices[0] ? [group.choices[0].id] : []
    }
    serviceOptions[line.id] = groups
  }
  const addOns: Record<string, number> = {}
  for (const a of config.addOns) addOns[a.id] = 0
  return {
    services,
    serviceOptions,
    sizePos: 0,
    complexityId: config.complexityLevels[0]?.id ?? null,
    addOns,
  }
}
