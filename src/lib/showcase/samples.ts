/**
 * Synthetic-but-realistic block content shared by the dev-only /showcase and
 * the production /design-specimen fallback (a block the client's pages never
 * use is shown with this sample instead).
 */
import type { FaqItem, PageManifest, PageSection } from '@/lib/assembly/parse-page-md'
import { BLOCK_CATALOG, BLOCK_IDS } from '@/lib/assembly/block-catalog'

export const SAMPLE_CONTENT: Record<string, string> = {
  'feature-grid': [
    '- Calculator: **Tax Strategy & Compliance** — Year-round planning, not just season-end filing.',
    '- Briefcase: **Advisory & Virtual CFO** — Financial oversight on a fractional basis.',
    '- ChartLine: **Audit & Assurance** — For nonprofits, foundations, and closely held companies.',
  ].join('\n'),
  'service-cards': [
    '### Bookkeeping',
    '',
    'Monthly cleanup, reconciliations, and management reports — done by people you can call.',
    '',
    '### Tax Preparation',
    '',
    'Federal, state, and local filings for individuals, partnerships, and S-corps.',
    '',
    '### CFO Advisory',
    '',
    'Fractional CFO services for growing businesses — forecasting, KPIs, board-ready reports.',
  ].join('\n'),
  'industry-cards': [
    '### Professional Services',
    '',
    'Law firms, consultancies, and creative agencies.',
    '',
    '### Healthcare & Dental',
    '',
    'Private practices, group practices, and clinics.',
    '',
    '### Nonprofits',
    '',
    'Foundations, 501(c)(3)s, and member organizations.',
  ].join('\n'),
  'team-grid': [
    '### Alex Rivera',
    '',
    '_Managing Partner_',
    '',
    'Placeholder bio — years of practice experience. Specializes in succession planning and complex partnerships.',
    '',
    '### Jordan Blake',
    '',
    '_Partner_',
    '',
    'Placeholder bio — strategy, multistate filings, and trust + estate work.',
  ].join('\n'),
  'testimonials': [
    '> "Placeholder testimonial — describe the result the client experienced in their own words."',
    '> — Client name, Title, Company',
    '',
    '> "Another placeholder testimonial — a second example quote."',
    '> — Client name, Title, Company',
  ].join('\n'),
  'stats-bar': [
    '- **50+** years serving the region',
    '- **200+** active business clients',
    '- **$2B+** in payroll processed annually',
  ].join('\n'),
  'checklist-section': [
    '- Year-round tax planning, not just year-end scrambles',
    '- Quarterly check-ins so you never miss a deadline',
    '- One partner per client — never bounced between associates',
    '- Plain-English explanations of what changed and why',
  ].join('\n'),
  'process-steps': [
    '**Step 1 — Discovery** Conversation about your business, goals, and current setup. No commitment.',
    '',
    '**Step 2 — Engagement** Custom scope of work, fixed fees, and a clear timeline.',
    '',
    '**Step 3 — Onboarding** Document collection, software access, and your dedicated partner introduction.',
  ].join('\n'),
  'logo-bar': [
    '- ![Client 1](placeholder.png)',
    '- ![Client 2](placeholder.png)',
    '- ![Client 3](placeholder.png)',
  ].join('\n'),
  'pricing': [
    '### Starter',
    '',
    '$300 / month',
    '',
    '- Monthly bookkeeping',
    '- Quarterly check-in',
    '- Email support',
    '',
    '### Growth',
    '',
    '$750 / month',
    '',
    '- Everything in Starter',
    '- Monthly P&L review',
    '- Phone + email support',
    '- Tax planning meeting',
  ].join('\n'),
  'content-cards': [
    '### When to hire a CFO',
    '',
    'Signs your business has outgrown a bookkeeper and needs strategic financial leadership.',
    '',
    '### Year-end tax tips for S-corps',
    '',
    'A short list of moves to make before December 31 to lower your liability.',
  ].join('\n'),
  'content-table': [
    '| Service | Starter | Growth | Enterprise |',
    '|---|---|---|---|',
    '| Bookkeeping | ✓ | ✓ | ✓ |',
    '| Tax prep | — | ✓ | ✓ |',
    '| CFO advisory | — | — | ✓ |',
  ].join('\n'),
  'resource-list': [
    '- [Year-End Tax Checklist](/resources/year-end-checklist.pdf) — A printable checklist of documents you\'ll need for filing.',
    '- [Quarterly Compliance Calendar](/resources/compliance-calendar.pdf) — All your filing deadlines on one page.',
  ].join('\n'),
  'intro-text': 'A short, centered paragraph that sets up the rest of the page. Usually one or two sentences explaining the firm\'s positioning.',
  'content-prose': 'Free-form prose for longer-form sections. Supports **markdown** including [links](/contact), lists, and quotes.',
  'cta-banner': 'A short call to action — usually a single sentence + a button URL underneath.',
  'faq-accordion': '',
}

export const SAMPLE_FAQ: FaqItem[] = [
  { question: 'Do you serve clients outside the local area?', answer: 'Yes — we work with clients regionally and beyond.' },
  { question: 'Do you offer fixed-fee engagements?', answer: 'For most recurring work, yes. We scope every engagement up front.' },
]

export function makeSampleSection(blockId: string): PageSection {
  return {
    blockId,
    heading: blockId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    content: SAMPLE_CONTENT[blockId] ?? '',
    position: 0,
  }
}

export function makeSampleManifest(url = '/showcase', title = 'Showcase'): PageManifest {
  return {
    title,
    url,
    meta_title: title,
    meta_description: '',
    target_keyword: '',
    canonical_url: '',
    schema_markup: 'WebPage',
    hero_block: 'page-header',
    sections: [],
    faq_block: SAMPLE_FAQ,
  }
}

export function makeSampleHeroManifest(kind: 'hero' | 'hero-split' | 'page-header'): PageManifest {
  return {
    ...makeSampleManifest('/design-specimen', 'Sample page'),
    hero_block: kind,
    hero_variant: kind === 'hero' ? 'statement' : kind === 'hero-split' ? 'image-right' : undefined,
    hero_headline: 'Three generations of CPAs who actually *answer*.',
    hero_eyebrow: 'Sample · Since 1972',
    hero_subhead: 'Boutique tax, advisory, and audit for closely held businesses.',
  }
}

// ---------------------------------------------------------------------------
// Layout specimen (/design-specimen?layouts=1, 2026.09.9)
// ---------------------------------------------------------------------------


/**
 * Richer sample bodies for the layout cells: images, icons and links, so every
 * slot of a layout variant is exercised (the default specimen keeps using
 * SAMPLE_CONTENT, unchanged). Images are the template's own content-assets.
 */
export const LAYOUT_SAMPLE_CONTENT: Record<string, string> = {
  'service-cards': [
    '### Bookkeeping',
    '',
    '![Bookkeeping](hero-office.png)',
    '',
    'Monthly cleanup, reconciliations, and management reports — done by people you can call.',
    '',
    '[Bookkeeping](/services/bookkeeping)',
    '',
    '### Tax Preparation',
    '',
    'icon: Calculator',
    '',
    'Federal, state, and local filings for individuals, partnerships, and S-corps.',
    '',
    '[Tax preparation](/services/tax)',
    '',
    '### CFO Advisory',
    '',
    'icon: ChartLine',
    '',
    'Fractional CFO services for growing businesses — forecasting, KPIs, board-ready reports.',
  ].join('\n'),
  'content-cards': [
    '### When to hire a CFO',
    'photo: hero-office.png',
    '',
    'Signs your business has outgrown a bookkeeper and needs strategic financial leadership.',
    '',
    '[Read](/resources/when-to-hire-a-cfo)',
    '',
    '### Year-end tax tips for S-corps',
    '',
    'A short list of moves to make before December 31 to lower your liability.',
    '',
    '[Read](/resources/year-end-tax-tips)',
  ].join('\n'),
  'team-grid': [
    '### Alex Rivera, CPA, PFS',
    '',
    'Managing Partner',
    '',
    'photo: team-photo.png',
    '',
    'Twenty years advising closely held companies. Specializes in succession planning and complex partnerships.',
    '',
    '### Jordan Blake, CPA',
    '',
    'Partner',
    '',
    'Strategy, multistate filings, and trust and estate work for families and their businesses.',
  ].join('\n'),
  testimonials: [
    '> "They turned our year-end scramble into a calm, planned process — and found savings we had missed for years."',
    '> — Dana Whitfield, Owner, Whitfield Dental',
    '',
    '> "Fast answers, plain English, no surprises on the invoice."',
    '> — Sam Ortiz, CFO, Ortiz Logistics',
    '',
    '> "Our partner knows our business as well as we do."',
    '> — Priya Nair, Founder, Nair Studio',
  ].join('\n'),
  'cta-banner': [
    '![](hero-office.png)',
    '',
    'Book a 20-minute call with a partner. No obligation, no sales script.',
    '',
    '[Schedule a consultation](/contact)',
  ].join('\n'),
}

export type LayoutSpecimenCell = {
  /** `<block>:<variant>` plus `:<theme>` for a themed cell. */
  key: string
  blockId: string
  variant: string
  theme?: string
  section: PageSection
}

/**
 * Every block × layout variant from the catalog (`layout: true`), plus the same
 * layout on each theme the block accepts (list × ink). Derived from the
 * catalog, so a new layout variant appears here without a code change.
 */
export function layoutSpecimenCells(): LayoutSpecimenCell[] {
  const cells: LayoutSpecimenCell[] = []
  for (const blockId of BLOCK_IDS) {
    const spec = BLOCK_CATALOG[blockId]
    for (const v of spec.variants as readonly { value: string; layout?: true }[]) {
      if (!v.layout) continue
      for (const theme of [undefined, ...spec.themes]) {
        const base = makeSampleSection(blockId)
        cells.push({
          key: [blockId, v.value, theme].filter(Boolean).join(':'),
          blockId,
          variant: v.value,
          theme,
          section: {
            ...base,
            content: LAYOUT_SAMPLE_CONTENT[blockId] ?? base.content,
            variant: v.value,
            ...(theme ? { theme } : {}),
          },
        })
      }
    }
  }
  return cells
}
