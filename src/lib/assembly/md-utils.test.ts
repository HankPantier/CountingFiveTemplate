import { describe, it, expect } from 'vitest'
import {
  splitHeadingFromBody,
  extractTrailingCta,
  parseIconTitleDescriptionList,
  parseStatsList,
  parseStepsList,
  parseFaqList,
  parseH3CardList,
  parseTeamMembers,
  parseTestimonials,
  parsePricingTiers,
  parseMarkdownTable,
  parseSimpleBulletList,
  parseLogoList,
  parseContentCardList,
  splitOnSidebarMarker,
  extractLeadingImage,
  stepsFromTitleChunks,
} from './md-utils'

// ---------------------------------------------------------------------------
// splitHeadingFromBody
// ---------------------------------------------------------------------------
describe('splitHeadingFromBody', () => {
  it('splits an h2 heading from the body', () => {
    const input = '## What We Do\n\nWe do accounting work.'
    expect(splitHeadingFromBody(input)).toEqual({
      heading: 'What We Do',
      body: 'We do accounting work.',
    })
  })

  it('splits an h1 heading from the body', () => {
    const input = '# Our Services\n\nWe offer tax planning.'
    expect(splitHeadingFromBody(input)).toEqual({
      heading: 'Our Services',
      body: 'We offer tax planning.',
    })
  })

  it('returns empty heading when there is no heading', () => {
    const input = 'Just paragraph text with no heading.'
    const result = splitHeadingFromBody(input)
    expect(result.heading).toBe('')
    expect(result.body).toBe('Just paragraph text with no heading.')
  })

  it('returns empty body when heading is the only content', () => {
    const result = splitHeadingFromBody('## Just a Heading')
    expect(result.heading).toBe('Just a Heading')
    expect(result.body).toBe('')
  })

  it('trims whitespace from heading and body', () => {
    const input = '## Trimmed Heading  \n\n  Body with leading spaces.  '
    const result = splitHeadingFromBody(input)
    expect(result.heading).toBe('Trimmed Heading')
    expect(result.body).toBe('Body with leading spaces.')
  })

  it('handles empty string without throwing', () => {
    const result = splitHeadingFromBody('')
    expect(result.heading).toBe('')
    expect(result.body).toBe('')
  })
})

// ---------------------------------------------------------------------------
// extractTrailingCta
// ---------------------------------------------------------------------------
describe('extractTrailingCta', () => {
  it('extracts a trailing CTA link from body', () => {
    const body = 'We handle all your tax needs.\n\n[Get Started](/contact)'
    const result = extractTrailingCta(body)
    expect(result.cta).toEqual({ label: 'Get Started', url: '/contact' })
    expect(result.body).toBe('We handle all your tax needs.')
  })

  it('returns undefined cta when no trailing link exists', () => {
    const body = 'We handle all your tax needs.'
    const result = extractTrailingCta(body)
    expect(result.cta).toBeUndefined()
    expect(result.body).toBe('We handle all your tax needs.')
  })

  it('only pops the LAST link when it is truly trailing', () => {
    const body = 'See [our team](/team) for more.\n\n[Schedule a Call](/schedule)'
    const result = extractTrailingCta(body)
    expect(result.cta).toEqual({ label: 'Schedule a Call', url: '/schedule' })
    expect(result.body).toContain('[our team](/team)')
  })

  it('handles absolute URL in trailing CTA', () => {
    const body = 'Learn more.\n\n[Visit Us](https://example.com/about)'
    const result = extractTrailingCta(body)
    expect(result.cta).toEqual({ label: 'Visit Us', url: 'https://example.com/about' })
  })

  it('handles empty body without throwing', () => {
    const result = extractTrailingCta('')
    expect(result.cta).toBeUndefined()
    expect(result.body).toBe('')
  })

  it('does not pop a mid-body link that is not the last thing in body', () => {
    const body = '[Some link](/foo)\n\nMore body text here.'
    const result = extractTrailingCta(body)
    expect(result.cta).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// parseIconTitleDescriptionList
// ---------------------------------------------------------------------------
describe('parseIconTitleDescriptionList', () => {
  it('parses standard em-dash (—) separated icon list', () => {
    const body = `- Shield: **Data Security** — We protect all client data.\n- Clock: **Timeliness** — Returns filed on time.`
    const result = parseIconTitleDescriptionList(body)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ icon: 'Shield', title: 'Data Security', description: 'We protect all client data.' })
    expect(result[1]).toEqual({ icon: 'Clock', title: 'Timeliness', description: 'Returns filed on time.' })
  })

  it('accepts en-dash (–) as separator', () => {
    const body = '- Star: **Quality** – Top-rated service.'
    const result = parseIconTitleDescriptionList(body)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Quality')
    expect(result[0].description).toBe('Top-rated service.')
  })

  it('accepts double-hyphen (--) as separator', () => {
    const body = '- Check: **Accuracy** -- We verify every number.'
    const result = parseIconTitleDescriptionList(body)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Accuracy')
    expect(result[0].description).toBe('We verify every number.')
  })

  it('skips non-list lines without crashing', () => {
    const body = `- Shield: **Security** — Protected.\nThis is a paragraph line.\n- Clock: **Time** — Punctual.`
    const result = parseIconTitleDescriptionList(body)
    expect(result).toHaveLength(2)
  })

  it('handles fallback pattern (bold title, no icon prefix)', () => {
    const body = '- **Expertise** — 30 years in the field.'
    const result = parseIconTitleDescriptionList(body)
    expect(result).toHaveLength(1)
    expect(result[0].icon).toBe('CheckCircle')
    expect(result[0].title).toBe('Expertise')
    expect(result[0].description).toBe('30 years in the field.')
  })

  it('returns empty array for empty input', () => {
    expect(parseIconTitleDescriptionList('')).toEqual([])
  })

  it('handles asterisk bullets (*) as well as dash bullets', () => {
    const body = '* Globe: **Global** — Worldwide clients.'
    const result = parseIconTitleDescriptionList(body)
    expect(result).toHaveLength(1)
    expect(result[0].icon).toBe('Globe')
  })

  it('reads an icon: line under an H3 chunk heading', () => {
    const body = `### Healthcare Professionals\nicon: Stethoscope\n\nPractice owners face billing complexity.\n\n### Contractors\n\nJob costing and bonding requirements.`
    const result = parseIconTitleDescriptionList(body)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      icon: 'Stethoscope',
      title: 'Healthcare Professionals',
      description: 'Practice owners face billing complexity.',
    })
    // No icon: line → CheckCircle default, body untouched
    expect(result[1].icon).toBe('CheckCircle')
    expect(result[1].description).toBe('Job costing and bonding requirements.')
  })

  it('reads an icon: line under a bold-paragraph chunk title', () => {
    const body = `**Family Businesses**\nicon: Building2\nSuccession and gifting strategy.`
    const result = parseIconTitleDescriptionList(body)
    expect(result).toHaveLength(1)
    expect(result[0].icon).toBe('Building2')
    expect(result[0].description).toBe('Succession and gifting strategy.')
  })

  it('ignores an icon: line that is not the first line of a chunk', () => {
    const body = `### Title\nProse first.\nicon: Hammer\nMore prose.`
    const result = parseIconTitleDescriptionList(body)
    expect(result[0].icon).toBe('CheckCircle')
    expect(result[0].description).toContain('icon: Hammer')
  })
})

// ---------------------------------------------------------------------------
// parseStatsList
// ---------------------------------------------------------------------------
describe('parseStatsList', () => {
  it('parses list format stats', () => {
    const body = `- 25+ years in business\n- 400+ clients served\n- 3 CPAs on staff`
    const result = parseStatsList(body)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ value: '25+', label: 'years in business' })
    expect(result[1]).toEqual({ value: '400+', label: 'clients served' })
    expect(result[2]).toEqual({ value: '3', label: 'CPAs on staff' })
  })

  it('parses inline middle-dot delimited format', () => {
    const body = '25+ years · 400+ clients · 3 CPAs on staff'
    const result = parseStatsList(body)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ value: '25+', label: 'years' })
    expect(result[1]).toEqual({ value: '400+', label: 'clients' })
  })

  it('parses inline pipe-delimited format with alphanumeric unit suffixes', () => {
    const body = '$2M managed | 98% retention | 15 staff'
    const result = parseStatsList(body)
    expect(result).toHaveLength(3)
    expect(result[0].value).toBe('$2M')
    expect(result[0].label).toBe('managed')
    expect(result[1].value).toBe('98%')
    expect(result[2].value).toBe('15')
  })

  it('parses inline bullet-point delimited format', () => {
    const body = '100+ clients • 20 years • 5 offices'
    const result = parseStatsList(body)
    expect(result).toHaveLength(3)
    expect(result[0].value).toBe('100+')
  })

  it('returns empty array for empty string', () => {
    expect(parseStatsList('')).toEqual([])
  })

  it('returns single item for single list line', () => {
    const body = '- 50+ awards won'
    const result = parseStatsList(body)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ value: '50+', label: 'awards won' })
  })

  it('handles stat with no label', () => {
    const body = '- 2024'
    const result = parseStatsList(body)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('2024')
    expect(result[0].label).toBe('')
  })
})

// ---------------------------------------------------------------------------
// parseStepsList
// ---------------------------------------------------------------------------
describe('parseStepsList', () => {
  it('parses numbered steps with inline bold title and em-dash description', () => {
    const body = `1. **Discovery** — We learn about your business.\n2. **Planning** — We create a strategy.\n3. **Execution** — We file your returns.`
    const result = parseStepsList(body)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ number: '01', title: 'Discovery', description: 'We learn about your business.' })
    expect(result[1]).toEqual({ number: '02', title: 'Planning', description: 'We create a strategy.' })
    expect(result[2]).toEqual({ number: '03', title: 'Execution', description: 'We file your returns.' })
  })

  it('parses unordered steps with bold titles', () => {
    const body = `- **Step One** — First thing we do.\n- **Step Two** — Second thing we do.`
    const result = parseStepsList(body)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Step One')
    expect(result[0].number).toBe('01')
  })

  it('parses numbered steps with continuation lines as description', () => {
    const body = `1. **Onboarding**\n   We gather all the information we need.\n2. **Review**\n   We check everything carefully.`
    const result = parseStepsList(body)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Onboarding')
    expect(result[0].description).toContain('We gather')
  })

  it('returns empty array for empty input', () => {
    expect(parseStepsList('')).toEqual([])
  })

  it('handles single step', () => {
    const body = '1. **Only Step** — Just one thing.'
    const result = parseStepsList(body)
    expect(result).toHaveLength(1)
    expect(result[0].number).toBe('01')
  })

  it('pads step numbers to two digits', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `${i + 1}. **Step ${i + 1}** — Description.`).join('\n')
    const result = parseStepsList(lines)
    expect(result[9].number).toBe('10')
  })
})

// ---------------------------------------------------------------------------
// parseFaqList
// ---------------------------------------------------------------------------
describe('parseFaqList', () => {
  it('parses standard FAQ pairs', () => {
    const body = `**Q: What services do you offer?**\nA: We offer tax preparation and planning.\n\n**Q: How much do you charge?**\nA: Fees start at $500 per year.`
    const result = parseFaqList(body)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      question: 'What services do you offer?',
      answer: 'We offer tax preparation and planning.',
    })
    expect(result[1]).toEqual({
      question: 'How much do you charge?',
      answer: 'Fees start at $500 per year.',
    })
  })

  it('returns empty array for empty input', () => {
    expect(parseFaqList('')).toEqual([])
  })

  it('returns empty array if bold Q: format is absent', () => {
    const body = 'Q: No bold formatting here.\nA: So it should not parse.'
    expect(parseFaqList(body)).toEqual([])
  })

  it('parses single FAQ pair', () => {
    const body = '**Q: Can I deduct home office expenses?**\nA: Yes, if you meet the requirements.'
    const result = parseFaqList(body)
    expect(result).toHaveLength(1)
    expect(result[0].question).toBe('Can I deduct home office expenses?')
  })

  it('handles multi-line answers', () => {
    const body = `**Q: What documents do I need?**\nA: You will need W-2 forms,\n1099s, and receipts for deductions.`
    const result = parseFaqList(body)
    expect(result).toHaveLength(1)
    expect(result[0].answer).toContain('W-2 forms')
  })
})

// ---------------------------------------------------------------------------
// parseH3CardList
// ---------------------------------------------------------------------------
describe('parseH3CardList', () => {
  it('parses H3-delimited cards with leading H3 heading', () => {
    const body = `### Tax Planning\nWe help you plan for the future.\n\n### Bookkeeping\nWe keep your books clean.`
    const result = parseH3CardList(body)
    expect(result.cards).toHaveLength(2)
    expect(result.cards[0].title).toBe('Tax Planning')
    expect(result.cards[0].description).toBe('We help you plan for the future.')
    expect(result.cards[1].title).toBe('Bookkeeping')
    expect(result.intro).toBeUndefined()
  })

  it('extracts intro text before first H3', () => {
    const body = `Our main services include the following:\n\n### Tax Filing\nAnnual preparation.`
    const result = parseH3CardList(body)
    expect(result.intro).toBe('Our main services include the following:')
    expect(result.cards).toHaveLength(1)
  })

  it('pops trailing CTA link as card url', () => {
    const body = `### Estate Planning\nComplex planning for families.\n[Learn More](/estate-planning)`
    const result = parseH3CardList(body)
    expect(result.cards[0].url).toBe('/estate-planning')
    expect(result.cards[0].description).not.toContain('[Learn More]')
  })

  it('returns undefined intro when body starts with H3', () => {
    const body = `### Service One\nDescription one.`
    const result = parseH3CardList(body)
    expect(result.intro).toBeUndefined()
  })

  it('returns empty cards array for empty input', () => {
    const result = parseH3CardList('')
    expect(result.cards).toEqual([])
  })

  it('handles card with empty body after title', () => {
    const body = `### Empty Card\n`
    const result = parseH3CardList(body)
    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].title).toBe('Empty Card')
  })

  it('pops an icon: line as card icon', () => {
    const body = `### Cash Flow Forecasting\nicon: TrendingUp\nKnow what's coming before it arrives.`
    const result = parseH3CardList(body)
    expect(result.cards[0].icon).toBe('TrendingUp')
    expect(result.cards[0].description).toBe("Know what's coming before it arrives.")
  })

  it('handles icon: alongside photo: and trailing CTA', () => {
    const body = `### Estate Planning\nicon: Scale\nphoto: estate.jpg\nComplex planning for families.\n[Learn More](/estate-planning)`
    const result = parseH3CardList(body)
    expect(result.cards[0].icon).toBe('Scale')
    expect(result.cards[0].image).toBe('estate.jpg')
    expect(result.cards[0].url).toBe('/estate-planning')
    expect(result.cards[0].description).toBe('Complex planning for families.')
  })

  it('leaves icon undefined when absent', () => {
    const body = `### Plain Card\nNo icon here.`
    const result = parseH3CardList(body)
    expect(result.cards[0].icon).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// parseTeamMembers
// ---------------------------------------------------------------------------
describe('parseTeamMembers', () => {
  it('parses team member with credentials, title, photo, and bio', () => {
    const body = `### Ron Lague, PFS\nManaging Partner · 40 years experience\nphoto: ron-lague.jpg\nRon has been the senior partner since 1985.`
    const result = parseTeamMembers(body)
    expect(result.members).toHaveLength(1)
    const m = result.members[0]
    expect(m.name).toBe('Ron Lague')
    expect(m.credentials).toBe('PFS')
    expect(m.title).toBe('Managing Partner · 40 years experience')
    expect(m.photo).toBe('ron-lague.jpg')
    expect(m.photo_alt).toBe('Photo of Ron Lague')
    expect(m.bio).toContain('senior partner')
  })

  it('parses member without credentials', () => {
    const body = `### Jane Smith\nSenior Accountant\nJane has 15 years of experience.`
    const result = parseTeamMembers(body)
    expect(result.members[0].name).toBe('Jane Smith')
    expect(result.members[0].credentials).toBeUndefined()
  })

  it('parses multiple members with leading H3 heading', () => {
    const body = `### Alice, CPA\nPartner\nAlice leads tax.\n\n### Bob, CFP\nAdvisor\nBob manages wealth.`
    const result = parseTeamMembers(body)
    expect(result.members).toHaveLength(2)
    expect(result.members[0].name).toBe('Alice')
    expect(result.members[1].name).toBe('Bob')
    expect(result.intro).toBeUndefined()
  })

  it('extracts intro before first H3', () => {
    const body = `Meet our experienced team:\n\n### Carol, EA\nTax Specialist\nCarol handles IRS matters.`
    const result = parseTeamMembers(body)
    expect(result.intro).toBe('Meet our experienced team:')
  })

  it('handles member with no photo (photo and photo_alt are undefined)', () => {
    const body = `### Dave\nAssociate\nDave joined in 2020.`
    const result = parseTeamMembers(body)
    expect(result.members[0].photo).toBeUndefined()
    expect(result.members[0].photo_alt).toBeUndefined()
  })

  it('returns empty members array for empty input', () => {
    const result = parseTeamMembers('')
    expect(result.members).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// parseTestimonials
// ---------------------------------------------------------------------------
describe('parseTestimonials', () => {
  it('parses two-line blockquote testimonials with "at Company"', () => {
    const body = `> "They saved us thousands on taxes."\n> — Mary Johnson, Owner at Acme Corp`
    const result = parseTestimonials(body)
    expect(result).toHaveLength(1)
    expect(result[0].quote).toBe('They saved us thousands on taxes.')
    expect(result[0].name).toBe('Mary Johnson')
    expect(result[0].title).toBe('Owner')
    expect(result[0].company).toBe('Acme Corp')
  })

  it('parses multiple testimonials separated by blank lines', () => {
    const body = [
      '> "Great service every year."',
      '> — Tom Harris, CFO at TechStart',
      '',
      '> "Very professional team."',
      '> — Lisa Park, Director at BuildCo',
    ].join('\n')
    const result = parseTestimonials(body)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Tom Harris')
    expect(result[1].name).toBe('Lisa Park')
  })

  it('parses attribution with comma-separated parts (no "at")', () => {
    const body = `> "Excellent work."\n> — John Doe, CEO, BigCompany`
    const result = parseTestimonials(body)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('John Doe')
    expect(result[0].company).toBe('BigCompany')
  })

  it('returns empty array when no blockquote lines found', () => {
    expect(parseTestimonials('Just regular text.')).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(parseTestimonials('')).toEqual([])
  })

  it('skips stanzas with no attribution line', () => {
    const body = `> "A quote with no attribution."\n> More quote text.`
    const result = parseTestimonials(body)
    expect(result).toHaveLength(0)
  })

  it('handles multi-line quotes joined with space', () => {
    const body = [
      '> "This is a very long testimonial',
      '> that spans multiple lines."',
      '> — Alice Wong, Partner at LawFirm',
    ].join('\n')
    const result = parseTestimonials(body)
    expect(result).toHaveLength(1)
    expect(result[0].quote).toContain('very long testimonial')
  })
})

// ---------------------------------------------------------------------------
// parsePricingTiers
// ---------------------------------------------------------------------------
describe('parsePricingTiers', () => {
  it('parses basic pricing tiers with price period and features, handling leading H3', () => {
    const body = [
      '### Starter',
      '$500/month',
      'Basic tax filing for individuals.',
      '- One state return',
      '- Email support',
      '[Get Started](/contact)',
      '',
      '### Professional',
      '$1,200/month',
      'Full-service accounting.',
      '- Unlimited states',
      '- Phone support',
      '[Get Started](/contact)',
    ].join('\n')
    const result = parsePricingTiers(body)
    expect(result.tiers).toHaveLength(2)
    expect(result.tiers[0].name).toBe('Starter')
    expect(result.tiers[0].price).toBe('$500')
    expect(result.tiers[0].price_period).toBe('/month')
    expect(result.tiers[0].features).toHaveLength(2)
    expect(result.tiers[0].features[0]).toBe('One state return')
    expect(result.tiers[0].highlighted).toBeUndefined()
    expect(result.intro).toBeUndefined()
  })

  it('detects highlighted tier via **Most popular** marker', () => {
    const body = [
      '### Growth',
      '$800/month',
      '**Most popular** — Best for growing businesses.',
      '- Feature A',
      '[Choose Growth](/contact)',
    ].join('\n')
    const result = parsePricingTiers(body)
    expect(result.tiers[0].highlighted).toBe(true)
    expect(result.tiers[0].description).not.toContain('Most popular')
  })

  it('detects highlighted tier via **Recommended** marker', () => {
    const body = [
      '### Premium',
      '$2,000/month',
      '**Recommended** for enterprises.',
      '- Enterprise feature',
      '[Contact Sales](/contact)',
    ].join('\n')
    const result = parsePricingTiers(body)
    expect(result.tiers[0].highlighted).toBe(true)
  })

  it('extracts intro text before first H3', () => {
    const body = `Choose the plan that fits your needs.\n\n### Basic\n$100/month\nSimple plan.\n[Start](/contact)`
    const result = parsePricingTiers(body)
    expect(result.intro).toBe('Choose the plan that fits your needs.')
  })

  it('uses default CTA when no link is present in tier', () => {
    const body = `### Solo\n$200/month\nFor individuals.`
    const result = parsePricingTiers(body)
    expect(result.tiers[0].cta).toEqual({ label: 'Get started', url: '/contact' })
  })

  it('returns empty tiers for empty input', () => {
    const result = parsePricingTiers('')
    expect(result.tiers).toEqual([])
  })

  it('handles flat price with no period', () => {
    const body = `### One-time\n$5,000\nComplete audit support.\n[Start](/contact)`
    const result = parsePricingTiers(body)
    expect(result.tiers[0].price).toBe('$5,000')
    expect(result.tiers[0].price_period).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// parseMarkdownTable
// ---------------------------------------------------------------------------
describe('parseMarkdownTable', () => {
  it('parses a standard GFM table', () => {
    const body = [
      '| Service | Price | Turnaround |',
      '|---------|-------|------------|',
      '| Tax Return | $500 | 2 weeks |',
      '| Bookkeeping | $300/mo | Ongoing |',
    ].join('\n')
    const result = parseMarkdownTable(body)
    expect(result).not.toBeNull()
    expect(result!.headers).toEqual(['Service', 'Price', 'Turnaround'])
    expect(result!.rows).toHaveLength(2)
    expect(result!.rows[0]).toEqual(['Tax Return', '$500', '2 weeks'])
  })

  it('extracts intro text before the table', () => {
    const body = [
      'Our pricing overview:',
      '',
      '| Plan | Cost |',
      '|------|------|',
      '| Basic | $100 |',
    ].join('\n')
    const result = parseMarkdownTable(body)
    expect(result!.intro).toBe('Our pricing overview:')
  })

  it('extracts caption text after the table', () => {
    const body = [
      '| Plan | Cost |',
      '|------|------|',
      '| Basic | $100 |',
      '',
      '*Prices subject to change.*',
    ].join('\n')
    const result = parseMarkdownTable(body)
    expect(result!.caption).toBe('*Prices subject to change.*')
  })

  it('returns null when no table is found', () => {
    expect(parseMarkdownTable('No table here.')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(parseMarkdownTable('')).toBeNull()
  })

  it('handles single-row table', () => {
    const body = ['| Name |', '|------|', '| Alice |'].join('\n')
    const result = parseMarkdownTable(body)
    expect(result).not.toBeNull()
    expect(result!.rows).toHaveLength(1)
    expect(result!.rows[0]).toEqual(['Alice'])
  })
})

// ---------------------------------------------------------------------------
// parseSimpleBulletList
// ---------------------------------------------------------------------------
describe('parseSimpleBulletList', () => {
  it('parses a plain bullet list with no intro', () => {
    const body = `- Tax preparation\n- Bookkeeping\n- Payroll processing`
    const result = parseSimpleBulletList(body)
    expect(result.items).toEqual(['Tax preparation', 'Bookkeeping', 'Payroll processing'])
    expect(result.intro).toBeUndefined()
  })

  it('extracts intro before the list', () => {
    const body = `We offer the following services:\n\n- Tax preparation\n- Bookkeeping`
    const result = parseSimpleBulletList(body)
    expect(result.intro).toBe('We offer the following services:')
    expect(result.items).toHaveLength(2)
  })

  it('returns empty items and body as intro when no list present', () => {
    const body = 'Just some text with no bullets.'
    const result = parseSimpleBulletList(body)
    expect(result.items).toEqual([])
    expect(result.intro).toBe('Just some text with no bullets.')
  })

  it('handles single bullet item', () => {
    const result = parseSimpleBulletList('- Only one item')
    expect(result.items).toEqual(['Only one item'])
  })

  it('handles empty input', () => {
    const result = parseSimpleBulletList('')
    expect(result.items).toEqual([])
    expect(result.intro).toBeUndefined()
  })

  it('supports asterisk bullets (*)', () => {
    const result = parseSimpleBulletList('* Item one\n* Item two')
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toBe('Item one')
  })
})

// ---------------------------------------------------------------------------
// parseLogoList
// ---------------------------------------------------------------------------
describe('parseLogoList', () => {
  it('parses basic logo list entries', () => {
    const body = `- aicpa-logo.png: AICPA\n- quickbooks-logo.png: QuickBooks`
    const result = parseLogoList(body)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ src: 'aicpa-logo.png', alt: 'AICPA', url: undefined })
    expect(result[1]).toEqual({ src: 'quickbooks-logo.png', alt: 'QuickBooks', url: undefined })
  })

  it('parses logo entries with optional URL in square brackets', () => {
    const body = '- aicpa-logo.png: AICPA Member [https://aicpa.org]'
    const result = parseLogoList(body)
    expect(result).toHaveLength(1)
    expect(result[0].src).toBe('aicpa-logo.png')
    expect(result[0].alt).toBe('AICPA Member')
    expect(result[0].url).toBe('https://aicpa.org')
  })

  it('returns empty array for empty input', () => {
    expect(parseLogoList('')).toEqual([])
  })

  it('handles single logo entry', () => {
    const result = parseLogoList('- logo.svg: Company Logo')
    expect(result).toHaveLength(1)
    expect(result[0].src).toBe('logo.svg')
    expect(result[0].alt).toBe('Company Logo')
  })

  it('skips non-list lines', () => {
    const body = `Some intro text.\n- logo.png: Logo Alt\nAnother paragraph.`
    const result = parseLogoList(body)
    expect(result).toHaveLength(1)
  })

  it('handles entry with no colon separator (treats as alt-only, empty src)', () => {
    const body = '- Just some text without colon separator'
    const result = parseLogoList(body)
    expect(result).toHaveLength(1)
    expect(result[0].src).toBe('')
    expect(result[0].alt).toBe('Just some text without colon separator')
  })
})

// ---------------------------------------------------------------------------
// parseContentCardList
// ---------------------------------------------------------------------------
describe('parseContentCardList', () => {
  it('parses content cards with date and image metadata', () => {
    const body = [
      '### Tax Planning Tips for 2024',
      '2024-03-15 · article-hero.jpg',
      'Learn how to minimize your tax burden this year.',
      '[Read More](/blog/tax-planning-2024)',
    ].join('\n')
    const result = parseContentCardList(body)
    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].title).toBe('Tax Planning Tips for 2024')
    expect(result.cards[0].date).toBe('2024-03-15')
    expect(result.cards[0].image).toBe('article-hero.jpg')
    expect(result.cards[0].excerpt).toBe('Learn how to minimize your tax burden this year.')
    expect(result.cards[0].url).toBe('/blog/tax-planning-2024')
  })

  it('parses cards without a metadata line', () => {
    const body = [
      '### Simple Post',
      'Just an excerpt here.',
      '[Read](/blog/simple)',
    ].join('\n')
    const result = parseContentCardList(body)
    expect(result.cards[0].date).toBeUndefined()
    expect(result.cards[0].image).toBeUndefined()
    expect(result.cards[0].excerpt).toBe('Just an excerpt here.')
  })

  it('extracts intro text before first H3', () => {
    const body = `Our latest articles:\n\n### First Post\nSome content.\n[Read](/first)`
    const result = parseContentCardList(body)
    expect(result.intro).toBe('Our latest articles:')
  })

  it('returns empty cards array for empty input', () => {
    const result = parseContentCardList('')
    expect(result.cards).toEqual([])
  })

  it('uses # as url when card has no CTA link', () => {
    const body = '### No Link Card\nJust an excerpt with no link.'
    const result = parseContentCardList(body)
    expect(result.cards[0].url).toBe('#')
  })

  it('parses multiple cards with leading H3 heading', () => {
    const body = [
      '### Post One',
      '2024-01-01',
      'Excerpt one.',
      '[Read](/one)',
      '',
      '### Post Two',
      '2024-02-01',
      'Excerpt two.',
      '[Read](/two)',
    ].join('\n')
    const result = parseContentCardList(body)
    expect(result.cards).toHaveLength(2)
    expect(result.cards[0].title).toBe('Post One')
    expect(result.cards[1].title).toBe('Post Two')
    expect(result.intro).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// splitOnSidebarMarker
// ---------------------------------------------------------------------------
describe('splitOnSidebarMarker', () => {
  it('splits body at sidebar: marker', () => {
    const body = `Main content here.\n\nsidebar:\n\nContact us: 555-1234`
    const result = splitOnSidebarMarker(body)
    expect(result.intro).toBe('Main content here.')
    expect(result.sidebar).toContain('Contact us: 555-1234')
  })

  it('is case-insensitive for the marker', () => {
    const body = `Main text.\n\nSIDEBAR:\n\nSidebar content.`
    const result = splitOnSidebarMarker(body)
    expect(result.intro).toBe('Main text.')
    expect(result.sidebar).toBe('Sidebar content.')
  })

  it('returns entire body as intro when no marker found', () => {
    const body = 'Just some body text with no sidebar marker.'
    const result = splitOnSidebarMarker(body)
    expect(result.intro).toBe('Just some body text with no sidebar marker.')
    expect(result.sidebar).toBeUndefined()
  })

  it('returns undefined sidebar when marker has no content after it', () => {
    const body = `Main content.\n\nsidebar:`
    const result = splitOnSidebarMarker(body)
    expect(result.intro).toBe('Main content.')
    expect(result.sidebar).toBeUndefined()
  })

  it('handles marker with surrounding horizontal whitespace', () => {
    const body = `Body.\n\n  sidebar:  \n\nSidebar stuff.`
    const result = splitOnSidebarMarker(body)
    expect(result.intro).toBe('Body.')
    expect(result.sidebar).toBe('Sidebar stuff.')
  })

  it('handles empty input without throwing', () => {
    const result = splitOnSidebarMarker('')
    expect(result.intro).toBe('')
    expect(result.sidebar).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// parseH3CardList image capture
// ---------------------------------------------------------------------------
describe('parseH3CardList image capture', () => {
  it('captures a leading markdown image per card', () => {
    const body = '### Tax Prep\n![Tax desk](tax.jpg)\nYear-round planning.\n\n### Audit\nAssurance work.'
    const { cards } = parseH3CardList(body)
    expect(cards[0].image).toBe('tax.jpg')
    expect(cards[0].description).toBe('Year-round planning.')
    expect(cards[1].image).toBeUndefined()
  })

  it('captures a `photo:` line per card', () => {
    const body = '### Payroll\nphoto: payroll.jpg\nOn-time every cycle.'
    const { cards } = parseH3CardList(body)
    expect(cards[0].image).toBe('payroll.jpg')
    expect(cards[0].description).toBe('On-time every cycle.')
  })
})

// ---------------------------------------------------------------------------
// extractLeadingImage
// ---------------------------------------------------------------------------
describe('extractLeadingImage', () => {
  it('returns body unchanged when there is no image', () => {
    const r = extractLeadingImage('Just some prose.\n\nMore prose.')
    expect(r.src).toBeUndefined()
    expect(r.alt).toBeUndefined()
    expect(r.body).toBe('Just some prose.\n\nMore prose.')
  })

  it('pulls a leading image and strips it from the body', () => {
    const r = extractLeadingImage('![Our team](team-photo.jpg)\n\nWhen you call us…')
    expect(r.src).toBe('team-photo.jpg')
    expect(r.alt).toBe('Our team')
    expect(r.body).toBe('When you call us…')
  })

  it('captures a URL src and empty alt', () => {
    const r = extractLeadingImage('![](https://cdn.example.com/x.png)\n\nBody')
    expect(r.src).toBe('https://cdn.example.com/x.png')
    expect(r.alt).toBeUndefined()
    expect(r.body).toBe('Body')
  })

  it('extracts an image that is not on the first line and collapses the gap', () => {
    const r = extractLeadingImage('Intro line.\n\n![alt](pic.png)\n\nTail.')
    expect(r.src).toBe('pic.png')
    expect(r.body).toBe('Intro line.\n\nTail.')
  })

  it('ignores a plain link (not an image)', () => {
    const r = extractLeadingImage('[Label](/url)\n\nBody')
    expect(r.src).toBeUndefined()
    expect(r.body).toBe('[Label](/url)\n\nBody')
  })

  it('leaves an image embedded inside a prose sentence untouched', () => {
    const r = extractLeadingImage('See our ![workflow](diagram.png) in action.\n\nMore.')
    expect(r.src).toBeUndefined()
    expect(r.body).toBe('See our ![workflow](diagram.png) in action.\n\nMore.')
  })
})

describe('WS-D parser fixes', () => {
  it('parseStepsList accepts ### Title + paragraph steps', () => {
    const steps = parseStepsList('### Pull your file\nWe request a transcript.\n\n### Build a plan\nWe meet.\nThen decide.')
    expect(steps).toEqual([
      { number: '01', title: 'Pull your file', description: 'We request a transcript.' },
      { number: '02', title: 'Build a plan', description: 'We meet. Then decide.' },
    ])
  })

  it('stepsFromTitleChunks strips "Step 2 —" / "3." prefixes', () => {
    expect(
      stepsFromTitleChunks([
        { title: 'Step 1 — Call us', body: 'a' },
        { title: '2. Meet', body: '' },
      ]).map((s) => s.title),
    ).toEqual(['Call us', 'Meet'])
  })

  it('parseIconTitleDescriptionList reads Icon: **Title:** desc (Slachta)', () => {
    expect(
      parseIconTitleDescriptionList(
        '- Calculator: **Outsourced Accounting:** Accurate, reliable bookkeeping.\n- Briefcase: **Payroll Services**: Timely payroll.',
      ),
    ).toEqual([
      { icon: 'Calculator', title: 'Outsourced Accounting', description: 'Accurate, reliable bookkeeping.' },
      { icon: 'Briefcase', title: 'Payroll Services', description: 'Timely payroll.' },
    ])
  })

  it('parseIconTitleDescriptionList reads unbolded Icon: Title: desc', () => {
    expect(parseIconTitleDescriptionList('- ChartLine: Tax Services: Strategic planning.')).toEqual([
      { icon: 'ChartLine', title: 'Tax Services', description: 'Strategic planning.' },
    ])
  })

  it('still reads the dash form unchanged', () => {
    expect(parseIconTitleDescriptionList('- Calculator: **Tax** — Year-round.')).toEqual([
      { icon: 'Calculator', title: 'Tax', description: 'Year-round.' },
    ])
  })
})

describe('parseIconTitleDescriptionList edge cases (WS-D fix round 1)', () => {
  it('accepts a spaced single hyphen as the separator', () => {
    expect(parseIconTitleDescriptionList('- Calculator: **Tax** - Year-round planning.')).toEqual([
      { icon: 'Calculator', title: 'Tax', description: 'Year-round planning.' },
    ])
    // an in-word hyphen is not a separator
    expect(parseIconTitleDescriptionList('- **Year-end close**')[0].title).toBe('Year-end close')
  })
  it('only treats a KNOWN icon name as the icon prefix', () => {
    expect(parseIconTitleDescriptionList('- Bookkeeping: Monthly close: Reconciled every month.')).toEqual([
      { icon: 'CheckCircle', title: 'Bookkeeping', description: 'Monthly close: Reconciled every month.' },
    ])
    expect(parseIconTitleDescriptionList('- Bookkeeping: **Monthly close:** Reconciled.')).toEqual([
      { icon: 'CheckCircle', title: 'Bookkeeping', description: 'Monthly close: Reconciled.' },
    ])
  })
  it('reads a plain or bold "Title: description" with no icon', () => {
    expect(parseIconTitleDescriptionList('- **Payroll:** Timely payroll.\n- Advisory: Guidance.')).toEqual([
      { icon: 'CheckCircle', title: 'Payroll', description: 'Timely payroll.' },
      { icon: 'CheckCircle', title: 'Advisory', description: 'Guidance.' },
    ])
  })
})
