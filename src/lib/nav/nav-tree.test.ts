import { describe, expect, it } from 'vitest'
import {
  findActivePrimary,
  isUrlActive,
  nodeContainsUrl,
  primaryHasTertiary,
  resolveSideNav,
} from './nav-tree'
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
          children: [
            { label: 'Payroll', url: '/services/outsourced-accounting/payroll' },
            { label: 'Tax', url: '/services/outsourced-accounting/tax' },
          ],
        },
        { label: 'Personal Income Tax', url: '/services/personal-income-tax' },
      ],
    },
    {
      label: 'About',
      url: '/about',
      children: [{ label: 'Our Team', url: '/about/our-team' }],
    },
    { label: 'Contact', url: '/contact' },
  ],
}

describe('isUrlActive', () => {
  it('matches exact and descendant paths, but not siblings', () => {
    expect(isUrlActive('/services', '/services')).toBe(true)
    expect(isUrlActive('/services/outsourced-accounting', '/services')).toBe(true)
    expect(isUrlActive('/services-old', '/services')).toBe(false)
    expect(isUrlActive('/about', '/')).toBe(false)
    expect(isUrlActive('/', '/')).toBe(true)
  })
})

describe('findActivePrimary', () => {
  it('finds the primary whose branch contains the url', () => {
    expect(findActivePrimary(nav, '/services/outsourced-accounting/payroll')?.label).toBe('Services')
    expect(findActivePrimary(nav, '/about/our-team')?.label).toBe('About')
    expect(findActivePrimary(nav, '/nowhere')).toBeNull()
  })

  it('matches by subtree membership even when child URLs are not nested under the primary URL', () => {
    // Mirrors the bblcpa shape: a "/services" primary whose child pages live at "/what-we-do/*".
    const flat: NavJson = {
      primary: [
        {
          label: 'Services',
          url: '/services',
          children: [
            {
              label: 'Outsourced Accounting',
              url: '/what-we-do/outsourced-accounting',
              children: [{ label: 'Payroll', url: '/what-we-do/payroll' }],
            },
          ],
        },
      ],
    }
    expect(findActivePrimary(flat, '/what-we-do/payroll')?.label).toBe('Services')
    expect(nodeContainsUrl(flat.primary[0].children![0], '/what-we-do/payroll')).toBe(true)
    expect(resolveSideNav(flat, '/what-we-do/payroll')?.label).toBe('Services')
    expect(resolveSideNav(flat, '/services')).toBeNull() // primary landing
  })
})

describe('primaryHasTertiary', () => {
  it('is true only when a secondary has children', () => {
    expect(primaryHasTertiary(nav.primary[0])).toBe(true) // Services
    expect(primaryHasTertiary(nav.primary[1])).toBe(false) // About (2 levels)
    expect(primaryHasTertiary(nav.primary[2])).toBe(false) // Contact (no children)
  })
})

describe('resolveSideNav', () => {
  it('shows on secondary and tertiary pages of a tertiary-bearing primary', () => {
    expect(resolveSideNav(nav, '/services/outsourced-accounting')?.label).toBe('Services')
    expect(resolveSideNav(nav, '/services/outsourced-accounting/payroll')?.label).toBe('Services')
    // A childless secondary still shows the rail (its sibling has tertiary)
    expect(resolveSideNav(nav, '/services/personal-income-tax')?.label).toBe('Services')
  })

  it('hides on the primary landing page', () => {
    expect(resolveSideNav(nav, '/services')).toBeNull()
  })

  it('hides for a primary with only two levels', () => {
    expect(resolveSideNav(nav, '/about/our-team')).toBeNull()
  })

  it('hides for an unknown page', () => {
    expect(resolveSideNav(nav, '/nowhere')).toBeNull()
  })
})
