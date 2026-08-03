import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import { BLOCK_REGISTRY, KNOWN_BLOCK_IDS } from './block-registry'
import type { PageSection, PageManifest } from '@/lib/assembly/parse-page-md'

/**
 * Smoke tests for the block registry. Each entry is invoked with a minimal
 * but plausibly-shaped PageSection + PageManifest; we assert the extractor
 * doesn't throw and that the returned value is a React element (or null,
 * which some blocks return when their data is empty — also valid).
 *
 * This does NOT mount the React tree; we're catching regressions in the
 * extractors (which are pure-ish and run synchronously) and registry wiring,
 * not deep render bugs. Full render tests would require a browser env.
 */

// Section content shapes that each block's parser accepts (kept tiny but
// well-formed). Blocks not listed fall back to an empty content body.
const SECTION_CONTENT: Record<string, string> = {
  'feature-grid': '- Icon: **Title** — Description.',
  'service-cards': '### Service One\n\nA short description.',
  'team-grid': '### Jane Smith\n\n_Partner_\n\nA short bio.',
  'testimonials': '> A glowing review.\n> — Happy Client',
  'stats-bar': '- **42** Things done',
  'checklist-section': '- One\n- Two',
  'process-steps': '**Step 1 — Discover**\nDescription.',
  'industry-cards': '### Industry One\n\nDescription.',
  'logo-bar': '- ![Client](client.png)',
  'pricing': '### Tier One\n\n$99 / month\n\n- Benefit one',
  'content-cards': '### Card One\n\nExcerpt text.',
  'content-table': '| A | B |\n|---|---|\n| 1 | 2 |',
  'resource-list': '- [Guide](/resources/guide.pdf) — A short description.',
}

function makeSection(blockId: string): PageSection {
  return {
    blockId,
    heading: 'Smoke',
    content: SECTION_CONTENT[blockId] ?? '',
    position: 0,
  }
}

function makeManifest(): PageManifest {
  return {
    title: 'T',
    url: '/',
    meta_title: 'T',
    meta_description: 'D',
    target_keyword: '',
    canonical_url: '',
    schema_markup: 'WebPage',
    hero_block: 'page-header',
    sections: [],
    faq_block: [{ question: 'Q?', answer: 'A.' }],
  }
}

describe('BLOCK_REGISTRY', () => {
  it('covers every block id wired into the assembly pipeline', () => {
    // Sanity guard: the count should match what we ship. Update when adding
    // a new block — forces a deliberate registry update, not silent drift.
    expect(KNOWN_BLOCK_IDS.length).toBe(23)
    expect(KNOWN_BLOCK_IDS).toContain('booking')
    expect(KNOWN_BLOCK_IDS).toContain('resource-list')
    expect(KNOWN_BLOCK_IDS).toContain('pricing-calculator')
    expect(KNOWN_BLOCK_IDS).toContain('faq-accordion')
  })

  it.each(KNOWN_BLOCK_IDS)('renders %s without the extractor throwing', (id) => {
    const render = BLOCK_REGISTRY[id]
    expect(render).toBeTypeOf('function')
    const out = render(makeSection(id), makeManifest())
    // Some blocks return null when data is empty (e.g. Booking when no
    // provider configured); both null and a React element are valid here.
    if (out !== null) {
      expect(isValidElement(out)).toBe(true)
    }
  })
})
