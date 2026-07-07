import { describe, expect, it } from 'vitest'
import { buildBreadcrumbTrail, titleize } from './breadcrumbs'
import { findNavLabel } from './nav-tree'
import type { NavJson } from './types'

const nav: NavJson = {
  primary: [
    {
      label: 'Services',
      url: '/services',
      children: [
        {
          label: 'Outsourced Accounting',
          url: '/services/outsourced-accounting',
          children: [{ label: 'Payroll', url: '/services/outsourced-accounting/payroll' }],
        },
      ],
    },
    { label: 'Contact', url: '/contact' },
  ],
}

describe('titleize', () => {
  it('titlecases a hyphenated slug', () => {
    expect(titleize('virtual-cfo')).toBe('Virtual Cfo')
    expect(titleize('payroll')).toBe('Payroll')
  })
})

describe('findNavLabel', () => {
  it('finds an exact-match label at any depth', () => {
    expect(findNavLabel(nav, '/services')).toBe('Services')
    expect(findNavLabel(nav, '/services/outsourced-accounting')).toBe('Outsourced Accounting')
    expect(findNavLabel(nav, '/services/outsourced-accounting/payroll')).toBe('Payroll')
  })

  it('returns null when no node matches', () => {
    expect(findNavLabel(nav, '/nowhere')).toBeNull()
  })
})

describe('buildBreadcrumbTrail', () => {
  it('roots at the brand label and labels each segment from the nav', () => {
    expect(buildBreadcrumbTrail('/services/outsourced-accounting', nav, 'Korbey Lague')).toEqual([
      { label: 'Korbey Lague', url: '/' },
      { label: 'Services', url: '/services' },
      { label: 'Outsourced Accounting', url: '/services/outsourced-accounting' },
    ])
  })

  it('falls back to a titleized slug for pages not in the nav', () => {
    expect(buildBreadcrumbTrail('/services/virtual-cfo', nav, 'Korbey Lague')).toEqual([
      { label: 'Korbey Lague', url: '/' },
      { label: 'Services', url: '/services' },
      { label: 'Virtual Cfo', url: '/services/virtual-cfo' },
    ])
  })

  it('returns an empty trail for the home page', () => {
    expect(buildBreadcrumbTrail('/', nav, 'Korbey Lague')).toEqual([])
    expect(buildBreadcrumbTrail('', nav, 'Korbey Lague')).toEqual([])
  })
})
