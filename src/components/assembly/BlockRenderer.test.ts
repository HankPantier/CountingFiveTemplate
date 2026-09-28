import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidElement } from 'react'
import { BlockRenderer } from './BlockRenderer'
import { ContentProse } from '@/components/blocks/ContentProse'
import type { PageManifest, PageSection } from '@/lib/assembly/parse-page-md'

const section: PageSection = { blockId: 'page-header', heading: 'Our commitment', content: 'We protect your data.', position: 0 }
const manifest = {
  title: 'T', url: '/', meta_title: 'T', meta_description: 'D', target_keyword: '', canonical_url: '',
  schema_markup: 'WebPage', hero_block: 'page-header', sections: [], faq_block: [],
} as PageManifest

afterEach(() => vi.unstubAllEnvs())

describe('BlockRenderer — an annotation the registry does not render', () => {
  it('falls back to prose on a production build (never the debug placeholder)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const el = BlockRenderer({ section, manifest })
    expect(isValidElement(el) && el.type).toBe(ContentProse)
  })
  it('shows the debug placeholder in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const el = BlockRenderer({ section, manifest })
    expect(isValidElement(el) && el.type).not.toBe(ContentProse)
  })
})
