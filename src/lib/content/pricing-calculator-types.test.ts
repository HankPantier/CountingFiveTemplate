import { describe, expect, it } from 'vitest'
import {
  computeEstimate,
  initialSelection,
  type PricingCalculatorConfig,
} from './pricing-calculator-types'

const config: PricingCalculatorConfig = {
  version: 1,
  currency: 'USD',
  billingPeriod: 'month',
  intro: '',
  implementationFee: { amount: 2000, label: 'Setup' },
  serviceLines: [
    { id: 'bk', label: 'Bookkeeping', baseRate: 200, enabledByDefault: true },
    { id: 'tax', label: 'Tax', baseRate: 300, enabledByDefault: false },
  ],
  sizeTiers: [
    { id: 'solo', label: 'Solo', multiplier: 1 },
    { id: 'small', label: 'Small', multiplier: 1.5 },
  ],
  complexityLevels: [
    { id: 'basic', label: 'Basic', multiplier: 1 },
    { id: 'complex', label: 'Complex', multiplier: 2 },
  ],
  addOns: [
    { id: 'flat1', label: 'Flat', type: 'flat', flatRate: 50 },
    { id: 'emp', label: 'Employees', type: 'per-unit', unitRate: 10, unitLabel: 'employee' },
  ],
  estimateBandPct: 10,
  disclaimer: '',
  cta: { label: 'Book', url: '/contact' },
}

describe('computeEstimate', () => {
  it('sums selected service rates, applies both multipliers, then add-ons', () => {
    const est = computeEstimate(config, {
      services: { bk: true, tax: true },
      sizeTierId: 'small',
      complexityId: 'complex',
      addOns: { flat1: 1, emp: 3 },
    })
    // (200+300) * 1.5 * 2 = 1500; + 50 flat + 10*3 = 1580
    expect(est.monthly).toBe(1580)
    expect(est.low).toBe(Math.round(1580 * 0.9))
    expect(est.high).toBe(Math.round(1580 * 1.1))
    expect(est.oneTime).toBe(2000)
  })

  it('is zero with no services selected', () => {
    const est = computeEstimate(config, {
      services: { bk: false, tax: false },
      sizeTierId: 'small',
      complexityId: 'complex',
      addOns: {},
    })
    expect(est.monthly).toBe(0)
  })

  it('initialSelection respects enabledByDefault and first options', () => {
    const sel = initialSelection(config)
    expect(sel.services).toEqual({ bk: true, tax: false })
    expect(sel.sizeTierId).toBe('solo')
    expect(sel.complexityId).toBe('basic')
  })
})
