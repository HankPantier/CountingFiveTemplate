import { describe, it, expect } from 'vitest'
import {
  extractContentSplitProps,
  extractChecklistSectionProps,
  extractCtaBannerProps,
  extractHeroSplitProps,
  extractHeroProps,
  resolveHeroCta,
  DEFAULT_HERO_CTA_LABEL,
  extractIntroTextProps,
  extractProcessStepsProps,
  isLongIntroBody,
  isStatFigure,
  extractServiceCardsProps,
  extractFeatureGridProps,
  extractContentCardsProps,
  extractTeamGridProps,
  extractTestimonialsProps,
  ctaBannerAnnotationVariant,
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

describe('layout variants (2026.09.9)', () => {
  const sec = (blockId: string, variant?: string): PageSection => ({ blockId, heading: 'H', content: '', position: 0, variant })
  it('list / featured pass straight through as the variant', () => {
    expect(extractServiceCardsProps(sec('service-cards', 'list')).variant).toBe('list')
    expect(extractFeatureGridProps(sec('feature-grid', 'list')).variant).toBe('list')
    expect(extractContentCardsProps(sec('content-cards', 'list')).variant).toBe('list')
    expect(extractTeamGridProps(sec('team-grid', 'list')).variant).toBe('list')
    expect(extractTestimonialsProps(sec('testimonials', 'featured')).variant).toBe('featured')
  })
  it('cta-banner <bg>-centered splits into the background + align', () => {
    expect(extractCtaBannerProps(sec('cta-banner', 'image-bg-centered'))).toMatchObject({ variant: 'image-bg', align: 'centered' })
    expect(extractCtaBannerProps(sec('cta-banner', 'color-bg-centered'))).toMatchObject({ variant: 'color-bg', align: 'centered' })
    expect(extractCtaBannerProps(sec('cta-banner', 'color-bg'))).not.toHaveProperty('align')
    expect(extractCtaBannerProps(sec('cta-banner'))).toMatchObject({ variant: 'color-bg' })
    expect(ctaBannerAnnotationVariant({ variant: 'image-bg', align: 'centered' })).toBe('image-bg-centered')
    expect(ctaBannerAnnotationVariant({ variant: 'image-bg' })).toBe('image-bg')
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
  const contact = { label: DEFAULT_HERO_CTA_LABEL, url: '/contact' }
  const site = { navCta: nav, contactUrl: '/contact' }

  it('prefers the page hero_cta_label + hero_cta_url', () => {
    const m = { ...home, hero_cta_label: 'Get a quote', hero_cta_url: '/quote', cta_text: 'X', cta_url: '/x' }
    expect(resolveHeroCta(m, site)).toEqual({ label: 'Get a quote', url: '/quote' })
  })

  it('falls back to the outline cta_text + cta_url, then nav.cta, then the site contact destination', () => {
    expect(resolveHeroCta({ ...home, cta_text: 'Talk to us', cta_url: '/talk' }, site)).toEqual({
      label: 'Talk to us',
      url: '/talk',
    })
    expect(resolveHeroCta(home, site)).toEqual(nav)
    expect(resolveHeroCta(home, { contactUrl: '/contact' })).toEqual(contact)
    expect(DEFAULT_HERO_CTA_LABEL).toBe('Schedule a consultation')
  })

  it('uses the nav Contact item url (Accord /locations, Berg /contact-us), and omits the CTA with no safe target', () => {
    expect(resolveHeroCta(home, { contactUrl: '/locations' })).toEqual({ label: DEFAULT_HERO_CTA_LABEL, url: '/locations' })
    expect(resolveHeroCta(home, { contactUrl: '/contact-us' })?.url).toBe('/contact-us')
    expect(resolveHeroCta(home, {})).toBeUndefined()
    expect(resolveHeroCta(home)).toBeUndefined()
  })

  it('ignores half-set pairs and a blank nav.cta', () => {
    expect(
      resolveHeroCta({ ...home, hero_cta_label: 'Only a label' }, { navCta: { label: ' ', url: '/x' }, contactUrl: '/contact' }),
    ).toEqual(contact)
  })

  it('omits a CTA that would link the page to itself (case / host / slash insensitive)', () => {
    const contactPage = { ...home, url: '/contact' }
    expect(resolveHeroCta(contactPage, { contactUrl: '/contact' })).toBeUndefined()
    expect(resolveHeroCta(contactPage, { navCta: { label: 'Contact', url: 'https://acme.com/Contact/' } })).toBeUndefined()
    expect(resolveHeroCta({ ...home, url: '/about' }, { contactUrl: '/contact' })).toEqual(contact)
  })

  it('is wired into both page-level heroes (no longer hard-coded undefined)', () => {
    expect(extractHeroProps(home, site).cta_primary).toEqual(nav)
    expect(extractHeroSplitProps(home, { contactUrl: '/contact' }).cta_primary).toEqual(contact)
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

describe('IntroText long centred bodies', () => {
  it('flags a centred body over ~600 chars (markdown stripped) as long', () => {
    expect(isLongIntroBody('Short intro.')).toBe(false)
    expect(isLongIntroBody('word '.repeat(130))).toBe(true)
    expect(isLongIntroBody(`[${'x'.repeat(590)}](https://example.com/${'y'.repeat(100)})`)).toBe(false)
  })
  it('only the centred variant gets long_body', () => {
    const long = 'word '.repeat(130)
    expect(extractIntroTextProps(section({ blockId: 'intro-text', content: long })).long_body).toBe(true)
    expect(
      extractIntroTextProps(section({ blockId: 'intro-text', variant: 'left-aligned', content: long })).long_body,
    ).toBe(false)
  })
})

describe('StatsBar figures', () => {
  it('true figures (digits, %, +, x, K/M/B, currency) are figures — however long; phrases are not', () => {
    for (const v of ['25+', '$1.2M', '$1,200,000+', '98%', '24/7', '10x', '~40', '1972', '500 K+', '€3.5B'])
      expect(isStatFigure(v), v).toBe(true)
    for (const v of ['', 'Trusted', 'Woodard Top 50 Client Accounting Services Award firm (2023)', 'Top 50', '3 CPAs', 'Since 1972'])
      expect(isStatFigure(v), v).toBe(false)
  })

  it('StatsBar sets each value by itself: a phrase does not demote the figures beside it', async () => {
    const { StatsBar } = await import('@/components/blocks/StatsBar')
    const { isValidElement } = await import('react')
    const el = StatsBar({
      variant: '3-up',
      stats: [
        { value: '25+', label: 'years' },
        { value: 'Woodard Top 50 award firm', label: '' },
      ],
    })
    const dds: Array<{ className?: string }> = []
    const walk = (n: unknown): void => {
      if (Array.isArray(n)) return n.forEach(walk)
      if (!isValidElement<{ children?: unknown; className?: string }>(n)) return
      if (n.type === 'dd') dds.push(n.props)
      walk(n.props.children)
    }
    walk(el)
    expect(dds.map((d) => d.className?.startsWith('t-display'))).toEqual([true, false])
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
