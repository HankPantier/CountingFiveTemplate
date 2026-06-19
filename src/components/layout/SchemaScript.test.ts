import { describe, expect, it } from 'vitest'
import { buildPageSchemas } from './SchemaScript'
import type { PageManifest } from '@/lib/assembly/parse-page-md'
import type { BrandJson } from '@/lib/brand/types'

const BASE = 'https://www.example.com'

function manifest(overrides: Partial<PageManifest> = {}): PageManifest {
  return {
    url: '/services',
    title: 'Services',
    meta_title: 'Services',
    meta_description: 'What we offer.',
    target_keyword: 'services',
    canonical_url: 'https://www.example.com/services',
    schema_markup: 'WebPage',
    hero_block: 'page-header',
    sections: [],
    ...overrides,
  }
}

function brand(overrides: Partial<BrandJson> = {}): BrandJson {
  return {
    firm: { name: 'Example Firm' },
    contact: {},
    palette: {
      primary: '#000',
      secondary: '#111',
      complementary: '#222',
      action: '#333',
      nearBlack: '#000',
      nearWhite: '#fff',
    },
    social: [],
    certifications: [],
    logo: { primary: 'logo.png', alt: 'Example Firm' },
    ...overrides,
  }
}

function byType(schemas: Record<string, unknown>[], type: string) {
  return schemas.find(s => s['@type'] === type)
}

describe('buildPageSchemas', () => {
  it('emits answer_block as the page abstract', () => {
    const schemas = buildPageSchemas(
      manifest({ answer_block: 'We file taxes year-round, not just in April.' }),
      brand(),
      BASE
    )
    expect(byType(schemas, 'WebPage')?.abstract).toBe(
      'We file taxes year-round, not just in April.'
    )
  })

  it('omits abstract when there is no answer_block', () => {
    const schemas = buildPageSchemas(manifest(), brand(), BASE)
    expect(byType(schemas, 'WebPage')).not.toHaveProperty('abstract')
  })

  it('emits FAQPage from faq_block', () => {
    const schemas = buildPageSchemas(
      manifest({ faq_block: [{ question: 'Q1?', answer: 'A1.' }] }),
      brand(),
      BASE
    )
    const faq = byType(schemas, 'FAQPage') as { mainEntity?: Array<Record<string, unknown>> }
    expect(faq?.mainEntity?.[0]).toMatchObject({
      '@type': 'Question',
      name: 'Q1?',
      acceptedAnswer: { '@type': 'Answer', text: 'A1.' },
    })
  })

  it('adds postal address for LocalBusiness pages', () => {
    const schemas = buildPageSchemas(
      manifest({ schema_markup: 'LocalBusiness' }),
      brand({
        contact: {
          address: { street: '1 Main St', city: 'Town', state: 'MA', zip: '01879' },
          phone: '978-555-0100',
          email: 'hi@example.com',
        },
      }),
      BASE
    )
    const biz = byType(schemas, 'LocalBusiness') as Record<string, unknown>
    expect(biz?.address).toMatchObject({ '@type': 'PostalAddress', addressLocality: 'Town' })
    expect(biz?.telephone).toBe('978-555-0100')
  })

  it('includes a BreadcrumbList for non-home pages', () => {
    const schemas = buildPageSchemas(manifest({ url: '/services' }), brand(), BASE)
    expect(byType(schemas, 'BreadcrumbList')).toBeTruthy()
  })
})
