import { describe, it, expect } from 'vitest'
import {
  extractContentSplitProps,
  extractChecklistSectionProps,
  extractCtaBannerProps,
  extractHeroSplitProps,
  extractHeroProps,
  resolveHeroCta,
  DEFAULT_HERO_CTA,
  extractProcessStepsProps,
} from './extract-block-props'
import { parsePageMd, type PageSection, type PageManifest } from './parse-page-md'

function section(partial: Partial<PageSection>): PageSection {
  return {
    blockId: 'content-split',
    heading: 'Heading',
    content: '',
    position: 0,
    ...partial,
  }
}

describe('extractContentSplitProps', () => {
  it('takes the body image and strips it from the prose', () => {
    const s = section({
      variant: 'image-right',
      content: '![Our team](team.jpg)\n\nProse body here.',
    })
    const props = extractContentSplitProps(s)
    expect(props.image).toBe('team.jpg')
    expect(props.image_alt).toBe('Our team')
    expect(props.body).toBe('Prose body here.')
  })

  it('falls back to the | image: attribute and the heading for alt', () => {
    const s = section({ heading: 'Built on Trust', image: 'attr.jpg', content: 'Body.' })
    const props = extractContentSplitProps(s)
    expect(props.image).toBe('attr.jpg')
    expect(props.image_alt).toBe('Built on Trust')
  })

  it('prefers the annotation alt over the heading', () => {
    const s = section({
      heading: 'Built on Trust',
      image: 'attr.jpg',
      alt: 'Accountant reviewing documents with a client',
      content: 'Body.',
    })
    expect(extractContentSplitProps(s).image_alt).toBe(
      'Accountant reviewing documents with a client'
    )
  })

  it('accepts a URL as the body image', () => {
    const s = section({ content: '![alt](https://cdn.x/p.png)\n\nBody.' })
    const props = extractContentSplitProps(s)
    expect(props.image).toBe('https://cdn.x/p.png')
  })
})

describe('annotation alt parsing (parsePageMd)', () => {
  it('captures alt between image and query and keeps heading/body intact', () => {
    const md = [
      '---',
      'title: T',
      'url: /x',
      '---',
      '',
      '<!-- block: content-split | variant: image-right | image: a.jpg | alt: "Team at work in the office" | query: "office team" -->',
      '## Our Approach',
      '',
      'Body prose.',
    ].join('\n')
    const manifest = parsePageMd(md)
    expect(manifest.sections).toHaveLength(1)
    const s = manifest.sections[0]
    expect(s.image).toBe('a.jpg')
    expect(s.alt).toBe('Team at work in the office')
    expect(s.query).toBe('office team')
    expect(s.heading).toBe('Our Approach')
    expect(extractChecklistSectionProps({ ...s, blockId: 'checklist-section' }).image_alt).toBe(
      'Team at work in the office'
    )
  })

  it('still parses annotations without alt (back-compat)', () => {
    const md = [
      '---',
      'title: T',
      'url: /x',
      '---',
      '',
      '<!-- block: content-split | variant: image-left | image: b.jpg | query: "subject" -->',
      '## H',
      '',
      'Body.',
    ].join('\n')
    const s = parsePageMd(md).sections[0]
    expect(s.image).toBe('b.jpg')
    expect(s.alt).toBeUndefined()
    expect(s.query).toBe('subject')
  })
})

describe('extractChecklistSectionProps', () => {
  it('pulls the body image, leaving bullets intact', () => {
    const s = section({
      blockId: 'checklist-section',
      variant: 'with-image',
      heading: 'Why us',
      content: '![Office](office.jpg)\n\n- Fast\n- Friendly',
    })
    const props = extractChecklistSectionProps(s)
    expect(props.image).toBe('office.jpg')
    expect(props.image_alt).toBe('Office')
    expect(props.items).toEqual(['Fast', 'Friendly'])
  })
})

describe('extractCtaBannerProps', () => {
  it('uses the body image as the background asset', () => {
    const s = section({
      blockId: 'cta-banner',
      variant: 'image-bg',
      heading: 'Ready?',
      content: '![](bg.jpg)\n\nLet us talk.',
    })
    const props = extractCtaBannerProps(s)
    expect(props.background_asset).toBe('bg.jpg')
    expect(props.body).toBe('Let us talk.')
  })
})

describe('extractHeroSplitProps', () => {
  it('uses hero_image_alt when present, else the headline', () => {
    const base = {
      title: 'Acme | Tagline',
      hero_variant: 'image-right',
      hero_image: 'h.jpg',
      meta_description: 'desc',
    } as unknown as PageManifest
    expect(extractHeroSplitProps({ ...base, hero_image_alt: 'A photo' }).image_alt).toBe('A photo')
    expect(extractHeroSplitProps(base).image_alt).toBe('Acme')
  })
})

describe('hero CTA (resolveHeroCta)', () => {
  const home = { title: 'Acme', url: '/', meta_description: 'd' } as unknown as PageManifest
  const nav = { label: 'Book a call', url: '/book' }

  it('prefers the page hero_cta_label + hero_cta_url', () => {
    const m = { ...home, hero_cta_label: 'Get a quote', hero_cta_url: '/quote', cta_text: 'X', cta_url: '/x' }
    expect(resolveHeroCta(m, nav)).toEqual({ label: 'Get a quote', url: '/quote' })
  })

  it('falls back to the outline cta_text + cta_url, then nav.cta, then /contact', () => {
    expect(resolveHeroCta({ ...home, cta_text: 'Talk to us', cta_url: '/talk' }, nav)).toEqual({
      label: 'Talk to us',
      url: '/talk',
    })
    expect(resolveHeroCta(home, nav)).toEqual(nav)
    expect(resolveHeroCta(home)).toEqual(DEFAULT_HERO_CTA)
    expect(DEFAULT_HERO_CTA).toEqual({ label: 'Schedule a consultation', url: '/contact' })
  })

  it('ignores half-set pairs and blank nav.cta', () => {
    expect(resolveHeroCta({ ...home, hero_cta_label: 'Only a label' }, { label: ' ', url: '/x' })).toEqual(
      DEFAULT_HERO_CTA
    )
  })

  it('omits a CTA that would link the page to itself', () => {
    const contact = { ...home, url: '/contact' }
    expect(resolveHeroCta(contact)).toBeUndefined()
    expect(resolveHeroCta(contact, { label: 'Contact', url: 'https://acme.com/contact/' })).toBeUndefined()
    expect(resolveHeroCta({ ...home, url: '/about' })).toEqual(DEFAULT_HERO_CTA)
  })

  it('is wired into both page-level heroes (no longer hard-coded undefined)', () => {
    expect(extractHeroProps(home, nav).cta_primary).toEqual(nav)
    expect(extractHeroSplitProps(home).cta_primary).toEqual(DEFAULT_HERO_CTA)
    expect(extractHeroSplitProps(home).cta_secondary).toBeUndefined()
  })

  it('parses hero_cta_* and cta_* from frontmatter', () => {
    const md = `---
title: T
url: /x
hero: hero
hero_cta_label: "Start here"
hero_cta_url: /start
cta_text: Other
cta_url: /other
---
`
    const m = parsePageMd(md)
    expect(m.hero_cta_label).toBe('Start here')
    expect(m.cta_url).toBe('/other')
    expect(extractHeroProps(m).cta_primary).toEqual({ label: 'Start here', url: '/start' })
  })
})

describe('extractProcessStepsProps ### steps', () => {
  it('keeps an intro above the first ### step and ignores bullets inside a step', () => {
    const p = extractProcessStepsProps(
      section({
        blockId: 'process-steps',
        content: 'How it works.\n\n### Call\nWe listen.\n- a detail\n\n### Plan\nWe plan.\n\n[Start](/contact)',
      }),
    )
    expect(p.intro).toBe('How it works.')
    expect(p.steps.map((s) => s.title)).toEqual(['Call', 'Plan'])
    expect(p.cta).toEqual({ label: 'Start', url: '/contact' })
  })
})
