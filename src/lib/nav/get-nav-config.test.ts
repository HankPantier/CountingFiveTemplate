import { describe, expect, it } from 'vitest'
import { normalizeNav, relativizeSameHost } from './get-nav-config'
import type { NavJson } from './types'

describe('relativizeSameHost', () => {
  it('strips the site host (with or without www) to a root-relative path', () => {
    expect(relativizeSameHost('https://www.bblcpa.com/who-we-are', 'bblcpa.com')).toBe('/who-we-are')
    expect(relativizeSameHost('https://bblcpa.com/who-we-are/why-choose-bbl', 'bblcpa.com')).toBe(
      '/who-we-are/why-choose-bbl'
    )
  })
  it('maps the bare host root to /', () => {
    expect(relativizeSameHost('https://www.bblcpa.com/', 'bblcpa.com')).toBe('/')
  })
  it('leaves external hosts and relative urls untouched', () => {
    expect(relativizeSameHost('https://portal.other.com/login', 'bblcpa.com')).toBe(
      'https://portal.other.com/login'
    )
    expect(relativizeSameHost('/services', 'bblcpa.com')).toBe('/services')
  })
})

describe('normalizeNav', () => {
  it('relativizes same-host urls across primary, nested children, and the cta', () => {
    const nav: NavJson = {
      primary: [
        {
          label: 'Who We Are',
          url: 'https://www.bblcpa.com/who-we-are',
          children: [
            { label: 'Why Choose BBL', url: 'https://www.bblcpa.com/who-we-are/why-choose-bbl' },
            { label: 'Portal', url: 'https://portal.other.com/login' },
          ],
        },
        { label: 'Services', url: '/services' },
      ],
      cta: { label: 'Contact', url: 'https://www.bblcpa.com/contact' },
    }
    expect(normalizeNav(nav, 'bblcpa.com')).toEqual({
      primary: [
        {
          label: 'Who We Are',
          url: '/who-we-are',
          children: [
            { label: 'Why Choose BBL', url: '/who-we-are/why-choose-bbl' },
            { label: 'Portal', url: 'https://portal.other.com/login' },
          ],
        },
        { label: 'Services', url: '/services' },
      ],
      cta: { label: 'Contact', url: '/contact' },
    })
  })
})
