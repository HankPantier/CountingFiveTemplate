import { describe, expect, it } from 'vitest'
import {
  computeEstimate,
  initialSelection,
  type PricingCalculatorConfig,
  type PricingSelection,
} from './pricing-calculator-types'

const config: PricingCalculatorConfig = {
  version: 1,
  currency: 'USD',
  billingPeriod: 'month',
  intro: '',
  implementationFee: { amount: 2000, label: 'Setup' },
  serviceLines: [
    {
      id: 'bk',
      label: 'Bookkeeping',
      baseRate: 200,
      enabledByDefault: true,
      options: [
        { id: 'freq', label: 'Frequency', kind: 'select', choices: [ { id: 'monthly', label: 'Monthly', addMonthly: 0 }, { id: 'weekly', label: 'Weekly', addMonthly: 80 } ] },
        { id: 'inc', label: 'Include', kind: 'multi', choices: [ { id: 'a', label: 'A', addMonthly: 25 }, { id: 'b', label: 'B', addMonthly: 40 } ] },
      ],
    },
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

const base: PricingSelection = {
  services: { bk: true, tax: true },
  serviceOptions: {},
  sizeTierId: 'small',
  complexityId: 'complex',
  addOns: { flat1: 1, emp: 3 },
}

describe('computeEstimate', () => {
  it('sums service rates + per-service options, applies multipliers, then add-ons', () => {
    const est = computeEstimate(config, {
      ...base,
      serviceOptions: { bk: { freq: ['weekly'], inc: ['a', 'b'] } },
    })
    // bk: 200 + 80 + 25 + 40 = 345; tax: 300 → 645 × 1.5 × 2 = 1935; + 50 + 30 = 2015
    expect(est.monthly).toBe(2015)
    expect(est.low).toBe(Math.round(2015 * 0.9))
    expect(est.high).toBe(Math.round(2015 * 1.1))
    expect(est.oneTime).toBe(2000)
  })

  it('ignores options for services that are off', () => {
    const est = computeEstimate(config, {
      ...base,
      services: { bk: false, tax: false },
      serviceOptions: { bk: { freq: ['weekly'] } },
      addOns: {},
    })
    expect(est.monthly).toBe(0)
  })

  it('initialSelection defaults services, first select-option, and empty multi', () => {
    const sel = initialSelection(config)
    expect(sel.services).toEqual({ bk: true, tax: false })
    expect(sel.serviceOptions.bk).toEqual({ freq: ['monthly'], inc: [] })
    expect(sel.sizeTierId).toBe('solo')
    expect(sel.complexityId).toBe('basic')
  })
})
