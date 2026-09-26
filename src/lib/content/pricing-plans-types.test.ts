import { describe, expect, it } from 'vitest'
import { isValidPricingPlansConfig, type PricingPlansConfig } from './pricing-plans-types'

const config: PricingPlansConfig = {
  version: 1,
  currency: 'USD',
  intro: '',
  billing: {
    showToggle: true,
    defaultCadence: 'monthly',
    annualDiscountPct: 15,
    monthlyLabel: 'Monthly',
    annualLabel: 'Annual',
  },
  tiers: [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 300,
      annualPrice: 3000,
      isMostPopular: false,
      features: [{ id: 'bk', label: 'Bookkeeping', included: true }],
      cta: { label: 'Get started', url: '/contact' },
    },
  ],
  sharedFeatures: { heading: 'All plans include', items: ['Email support'] },
  addOns: [{ id: 'flat1', label: 'Flat', type: 'flat', price: 50, cadence: 'month' }],
  disclaimer: '',
  cta: { label: 'Book', url: '/contact' },
}

describe('isValidPricingPlansConfig', () => {
  it('accepts a well-formed config', () => {
    expect(isValidPricingPlansConfig(config)).toBe(true)
  })
  it('rejects null/undefined', () => {
    expect(isValidPricingPlansConfig(null)).toBe(false)
    expect(isValidPricingPlansConfig(undefined)).toBe(false)
  })
  it('rejects a config missing tiers (wrong-shape JSON)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tiers: _tiers, ...rest } = config
    expect(isValidPricingPlansConfig(rest as unknown as PricingPlansConfig)).toBe(false)
  })
  it('rejects an empty tiers array', () => {
    expect(isValidPricingPlansConfig({ ...config, tiers: [] })).toBe(false)
  })
  it('rejects when a required array field is not an array', () => {
    expect(
      isValidPricingPlansConfig({ ...config, addOns: undefined as unknown as PricingPlansConfig['addOns'] })
    ).toBe(false)
  })
  it('rejects when sharedFeatures or its items array is missing', () => {
    expect(
      isValidPricingPlansConfig({ ...config, sharedFeatures: undefined as unknown as PricingPlansConfig['sharedFeatures'] })
    ).toBe(false)
    expect(
      isValidPricingPlansConfig({
        ...config,
        sharedFeatures: { heading: 'x', items: undefined as unknown as string[] },
      })
    ).toBe(false)
  })
})
