import { describe, expect, it } from 'vitest'
import {
  findActivePrimary,
  isUrlActive,
  nodeContainsUrl,
  comparablePath,
  orderedPrimaryNav,
  primaryHasTertiary,
  siteContactUrl,
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

describe('orderedPrimaryNav with a header cta', () => {
  const labels = (items: { label: string }[]) => items.map((i) => i.label)
  it('keeps Contact (pinned last) when there is no cta', () => {
    expect(labels(orderedPrimaryNav(nav.primary))).toEqual(['Services', 'About', 'Contact'])
  })
  it('drops the childless item the cta button replaces (same page, any url form)', () => {
    expect(labels(orderedPrimaryNav(nav.primary, { label: 'Schedule a consultation', url: '/contact' }))).toEqual([
      'Services',
      'About',
    ])
    expect(
      labels(orderedPrimaryNav(nav.primary, { label: 'Book', url: 'https://firm.com/Contact/?src=nav' })),
    ).toEqual(['Services', 'About'])
  })
  it('never drops an item with a dropdown, and ignores a blank cta', () => {
    expect(labels(orderedPrimaryNav(nav.primary, { label: 'About us', url: '/about' }))).toEqual([
      'Services',
      'About',
      'Contact',
    ])
    expect(labels(orderedPrimaryNav(nav.primary, { label: '', url: '/contact' }))).toEqual([
      'Services',
      'About',
      'Contact',
    ])
  })
})

describe('siteContactUrl — where the hero CTA may point', () => {
  it('prefers the nav Contact item url, at any depth (Accord → /locations)', () => {
    expect(siteContactUrl({ primary: [{ label: 'Contact', url: '/locations' }] }, [])).toBe('/locations')
    expect(
      siteContactUrl(
        { primary: [{ label: 'About', url: '/about', children: [{ label: 'Contact us', url: '/about/contact-us' }] }] },
        ['contact'],
      ),
    ).toBe('/about/contact-us')
  })
  it('falls back to /contact only when content/pages has it, else undefined', () => {
    expect(siteContactUrl({ primary: [{ label: 'About', url: '/about' }] }, ['about', 'contact'])).toBe('/contact')
    expect(siteContactUrl({ primary: [{ label: 'About', url: '/about' }] }, ['about'])).toBeUndefined()
  })
  it('skips a Contact item that has a dropdown', () => {
    expect(
      siteContactUrl({ primary: [{ label: 'Contact', url: '/contact', children: [{ label: 'Offices', url: '/offices' }] }] }, []),
    ).toBeUndefined()
  })
})

describe('comparablePath', () => {
  it('drops host, query, hash and trailing slashes and lower-cases', () => {
    expect(comparablePath('https://Firm.com/Contact/?x=1#f')).toBe('/contact')
    expect(comparablePath('')).toBe('/')
    expect(comparablePath('/')).toBe('/')
  })
})
