/**
 * extract-block-props.ts
 * Stage 2 of the assembly pipeline: typed prop extraction for each block type.
 * For M3.B we implement extractors for the 5 blocks landing in M3.F:
 *   Hero (page-level, from manifest), ContentSplit, FeatureGrid, CtaBanner, FaqAccordion.
 */

import type { PageSection, PageManifest } from './parse-page-md'
import {
  extractTrailingCta,
  extractLeadingImage,
  parseIconTitleDescriptionList,
  parseFaqList,
  parseH3CardList,
  parseTeamMembers,
  parseStatsList,
  parseStepsList,
  parseTestimonials,
  parseSimpleBulletList,
  parseLogoList,
  parsePricingTiers,
  parseContentCardList,
  splitOnSidebarMarker,
  parseMarkdownTable,
} from './md-utils'
import type { PricingTier } from './md-utils'

export type { PricingTier }

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export type HeroProps = {
  variant: 'image' | 'video' | 'slider' | 'image-right' | 'image-left'
  image?: string
  image_alt?: string
  video?: string
  images?: string[]
  headline: string
  subheadline: string
  cta_primary?: { label: string; url: string }
}

/**
 * Hero is page-level: sourced from frontmatter.
 * Prefer hero_subhead (benefit-led, written for on-page); fall back to
 * meta_description for older deliverables that predate the dedicated field.
 */
export function extractHeroProps(manifest: PageManifest): HeroProps {
  return {
    variant: (manifest.hero_variant as HeroProps['variant']) ?? 'image',
    image: manifest.hero_image,
    image_alt: manifest.hero_image_alt,
    video: manifest.hero_video,
    images: manifest.hero_images,
    headline: heroHeadline(manifest),
    subheadline: manifest.hero_subhead ?? manifest.meta_description,
    cta_primary: undefined,
  }
}

/**
 * Resolve the hero H1. Prefer the marketing headline the deliverable promotes
 * (hero_headline); fall back to the page title minus the firm suffix. The
 * fallback alone renders weak generic H1s on nav-titled pages ("Home",
 * "Contact"), so hero_headline is the intended source.
 */
export function heroHeadline(manifest: PageManifest): string {
  return manifest.hero_headline?.trim() || manifest.title.split(' | ')[0].trim()
}

// ---------------------------------------------------------------------------
// ContentSplit
// ---------------------------------------------------------------------------

export type ContentSplitProps = {
  variant: 'image-right' | 'image-left'
  heading: string
  body: string  // raw markdown
  image: string
  image_alt: string
  cta?: { label: string; url: string }
}

export function extractContentSplitProps(section: PageSection): ContentSplitProps {
  const img = extractLeadingImage(section.content)
  const { body, cta } = extractTrailingCta(img.body)
  const image = img.src ?? section.image ?? ''
  return {
    variant: (section.variant as 'image-right' | 'image-left') ?? 'image-right',
    heading: section.heading,
    body,
    image,
    image_alt: img.alt ?? section.alt ?? section.heading,
    cta,
  }
}

// ---------------------------------------------------------------------------
// FeatureGrid
// ---------------------------------------------------------------------------

export type FeatureGridProps = {
  variant: '3-col' | '4-col'
  heading: string
  intro?: string
  items: Array<{ icon: string; title: string; description: string }>
}

export function extractFeatureGridProps(section: PageSection): FeatureGridProps {
  const items = parseIconTitleDescriptionList(section.content)

  // Detect optional intro paragraph before the first list item.
  const lines = section.content.split('\n')
  const firstListIdx = lines.findIndex(l => /^\s*[-*]\s+/.test(l))
  const intro =
    firstListIdx > 0
      ? lines.slice(0, firstListIdx).join('\n').trim() || undefined
      : undefined

  return {
    variant: (section.variant as '3-col' | '4-col') ?? '3-col',
    heading: section.heading,
    intro,
    items,
  }
}

// ---------------------------------------------------------------------------
// CtaBanner
// ---------------------------------------------------------------------------

export type CtaBannerProps = {
  variant: 'color-bg' | 'image-bg'
  heading: string
  body?: string
  background_asset?: string
  cta_primary?: { label: string; url: string }
}

export function extractCtaBannerProps(section: PageSection): CtaBannerProps {
  const img = extractLeadingImage(section.content)
  const { body, cta } = extractTrailingCta(img.body)
  return {
    variant: (section.variant as 'color-bg' | 'image-bg') ?? 'color-bg',
    heading: section.heading,
    body: body.trim() || undefined,
    background_asset: img.src ?? section.image,
    cta_primary: cta,
  }
}

// ---------------------------------------------------------------------------
// FaqAccordion
// ---------------------------------------------------------------------------

export type FaqAccordionProps = {
  heading: string
  items: Array<{ question: string; answer: string }>
}

/**
 * Prefer the structured manifest.faq_block (richer source) if present;
 * otherwise parse Q&A pairs from the section body.
 */
export function extractFaqAccordionProps(
  section: PageSection,
  manifest: PageManifest
): FaqAccordionProps {
  const items =
    manifest.faq_block && manifest.faq_block.length > 0
      ? manifest.faq_block
      : parseFaqList(section.content)
  return {
    heading: section.heading,
    items,
  }
}

// ---------------------------------------------------------------------------
// IntroText
// ---------------------------------------------------------------------------

export type IntroTextProps = {
  variant: 'centered' | 'left-aligned'
  heading: string
  body: string  // raw markdown — render via react-markdown
  cta?: { label: string; url: string }
}

export function extractIntroTextProps(section: PageSection): IntroTextProps {
  const { body, cta } = extractTrailingCta(section.content)
  return {
    variant: (section.variant as IntroTextProps['variant']) ?? 'centered',
    heading: section.heading,
    body,
    cta,
  }
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------

export type PageHeaderProps = {
  headline: string
  subheadline?: string
  breadcrumb?: Array<{ label: string; url: string }>
}

/**
 * PageHeader is page-level — sourced from the manifest, not a section.
 * Breadcrumb is left empty here; M5 admin nav editor populates it later.
 */
export function extractPageHeaderProps(manifest: PageManifest): PageHeaderProps {
  return {
    headline: manifest.title.split(' | ')[0].trim(),
    subheadline: manifest.hero_subhead ?? manifest.meta_description ?? undefined,
    breadcrumb: [],
  }
}

// ---------------------------------------------------------------------------
// ServiceCards
// ---------------------------------------------------------------------------

export type ServiceCardsProps = {
  variant: '2-col' | '3-col'
  heading: string
  intro?: string
  cards: Array<{
    title: string
    description: string
    url?: string
    image?: string
    icon?: string
  }>
}

export function extractServiceCardsProps(section: PageSection): ServiceCardsProps {
  const { intro, cards } = parseH3CardList(section.content)
  return {
    variant: (section.variant as ServiceCardsProps['variant']) ?? '3-col',
    heading: section.heading,
    intro,
    cards,
  }
}

// ---------------------------------------------------------------------------
// TeamGrid
// ---------------------------------------------------------------------------

export type TeamGridProps = {
  variant: '2-col' | '3-col' | '4-col'
  heading: string
  intro?: string
  members: Array<{
    name: string
    title?: string
    credentials?: string
    bio?: string
    photo?: string
    photo_alt?: string
  }>
}

export function extractTeamGridProps(section: PageSection): TeamGridProps {
  const { intro, members } = parseTeamMembers(section.content)
  return {
    variant: (section.variant as TeamGridProps['variant']) ?? '3-col',
    heading: section.heading,
    intro,
    members,
  }
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export type TestimonialsProps = {
  variant: 'carousel' | 'grid'
  heading?: string
  testimonials: Array<{
    quote: string
    name: string
    title?: string
    company?: string
    rating?: number
  }>
}

export function extractTestimonialsProps(section: PageSection): TestimonialsProps {
  const items = parseTestimonials(section.content)
  return {
    variant: (section.variant as TestimonialsProps['variant']) ?? 'grid',
    heading: section.heading || undefined,
    testimonials: items,
  }
}

// ---------------------------------------------------------------------------
// StatsBar
// ---------------------------------------------------------------------------

export type StatsBarProps = {
  variant: '3-up' | '4-up'
  heading?: string
  stats: Array<{ value: string; label: string }>
}

export function extractStatsBarProps(section: PageSection): StatsBarProps {
  // parseStatsList handles both list and inline dot-delimited formats
  const stats = parseStatsList(section.content)
  return {
    variant: (section.variant as StatsBarProps['variant']) ?? '3-up',
    heading: section.heading || undefined,
    stats,
  }
}

// ---------------------------------------------------------------------------
// ContentProse
// ---------------------------------------------------------------------------

export type ContentProseProps = {
  heading?: string
  body: string  // raw markdown
}

export function extractContentProseProps(section: PageSection): ContentProseProps {
  return {
    heading: section.heading.trim() || undefined,
    body: section.content,
  }
}

// ---------------------------------------------------------------------------
// ChecklistSection
// ---------------------------------------------------------------------------

export type ChecklistSectionProps = {
  variant: 'with-image' | 'standalone'
  heading: string
  intro?: string
  items: string[]
  image?: string
  image_alt?: string
  cta?: { label: string; url: string }
}

export function extractChecklistSectionProps(section: PageSection): ChecklistSectionProps {
  const img = extractLeadingImage(section.content)
  const { body, cta } = extractTrailingCta(img.body)
  const { intro, items } = parseSimpleBulletList(body)
  const image = img.src ?? section.image
  return {
    variant: (section.variant as ChecklistSectionProps['variant']) ?? 'standalone',
    heading: section.heading,
    intro,
    items,
    image,
    image_alt: image ? (img.alt ?? section.alt ?? section.heading) : undefined,
    cta,
  }
}

// ---------------------------------------------------------------------------
// ProcessSteps
// ---------------------------------------------------------------------------

export type ProcessStepsProps = {
  variant: 'horizontal' | 'vertical'
  heading: string
  intro?: string
  steps: Array<{ number: string; title: string; description: string }>
  cta?: { label: string; url: string }
}

export function extractProcessStepsProps(section: PageSection): ProcessStepsProps {
  const { body, cta } = extractTrailingCta(section.content)

  // Detect intro: all text before the first numbered/bullet list item
  const lines = body.split('\n')
  const firstStepIdx = lines.findIndex(l => /^\s*\d+\.\s+/.test(l) || /^\s*[-*]\s+/.test(l))
  const intro =
    firstStepIdx > 0
      ? lines.slice(0, firstStepIdx).join('\n').trim() || undefined
      : undefined

  const stepsBody = firstStepIdx >= 0 ? lines.slice(firstStepIdx).join('\n') : body
  const steps = parseStepsList(stepsBody)

  return {
    variant: (section.variant as ProcessStepsProps['variant']) ?? 'vertical',
    heading: section.heading,
    intro,
    steps,
    cta,
  }
}

// ---------------------------------------------------------------------------
// IndustryCards
// ---------------------------------------------------------------------------

export type IndustryCardsProps = {
  variant: '3-col' | '4-col'
  heading: string
  intro?: string
  industries: Array<{ icon: string; title: string; description: string; url?: string }>
}

export function extractIndustryCardsProps(section: PageSection): IndustryCardsProps {
  const { body } = extractTrailingCta(section.content)

  // Detect optional intro before list
  const lines = body.split('\n')
  const firstListIdx = lines.findIndex(l => /^\s*[-*]\s+/.test(l))
  const intro =
    firstListIdx > 0
      ? lines.slice(0, firstListIdx).join('\n').trim() || undefined
      : undefined

  const listBody = firstListIdx >= 0 ? lines.slice(firstListIdx).join('\n') : body
  const rawItems = parseIconTitleDescriptionList(listBody)
  const industries = rawItems.map(item => ({
    icon: item.icon,
    title: item.title,
    description: item.description,
    url: undefined as string | undefined,
  }))

  return {
    variant: (section.variant as IndustryCardsProps['variant']) ?? '3-col',
    heading: section.heading,
    intro,
    industries,
  }
}

// ---------------------------------------------------------------------------
// LogoBar
// ---------------------------------------------------------------------------

export type LogoBarProps = {
  heading?: string
  logos: Array<{ src: string; alt: string; url?: string }>
}

export function extractLogoBarProps(section: PageSection): LogoBarProps {
  const logos = parseLogoList(section.content)
  return {
    heading: section.heading.trim() || undefined,
    logos,
  }
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export type PricingProps = {
  variant: '2-tier' | '3-tier' | '4-tier'
  heading: string
  intro?: string
  tiers: PricingTier[]
  disclaimer?: string
}

export function extractPricingProps(section: PageSection): PricingProps {
  const { intro, tiers, disclaimer } = parsePricingTiers(section.content)
  return {
    variant: (section.variant as PricingProps['variant']) ?? '3-tier',
    heading: section.heading,
    intro,
    tiers,
    disclaimer,
  }
}

// ---------------------------------------------------------------------------
// HeroSplit
// ---------------------------------------------------------------------------

export type HeroSplitProps = {
  variant: 'image-right' | 'image-left'
  headline: string
  subheadline: string
  cta_primary?: { label: string; url: string }
  cta_secondary?: { label: string; url: string }
  image: string
  image_alt: string
}

/**
 * HeroSplit is page-level — sourced from the manifest, same pattern as Hero
 * and PageHeader. M4.D wires it into PageLayout via manifest.hero_block.
 */
export function extractHeroSplitProps(manifest: PageManifest): HeroSplitProps {
  const headline = heroHeadline(manifest)
  return {
    variant: (manifest.hero_variant as HeroSplitProps['variant']) ?? 'image-right',
    headline,
    subheadline: manifest.hero_subhead ?? manifest.meta_description,
    cta_primary: undefined,
    cta_secondary: undefined,
    image: manifest.hero_image ?? '',
    image_alt: manifest.hero_image_alt ?? headline,
  }
}

// ---------------------------------------------------------------------------
// ContentCards
// ---------------------------------------------------------------------------

export type ContentCardsProps = {
  variant: '3-col' | '2-col'
  heading: string
  intro?: string
  cards: Array<{ title: string; excerpt: string; url: string; image?: string; date?: string }>
  cta?: { label: string; url: string }
}

export function extractContentCardsProps(section: PageSection): ContentCardsProps {
  const { intro, cards, trailingCta } = parseContentCardList(section.content)
  return {
    variant: (section.variant as ContentCardsProps['variant']) ?? '3-col',
    heading: section.heading,
    intro,
    cards,
    cta: trailingCta,
  }
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

import type { FieldDef } from '../forms/types'
import { parseCustomFields } from '../forms/parse-custom-fields'

export type FormProps = {
  variant: 'contact' | 'quote' | 'newsletter' | 'custom'
  heading: string
  intro?: string
  sidebar_content?: string  // raw markdown
  success_message?: string
  /**
   * Field definitions for the `custom` variant. Parsed from the markdown
   * list in the section body. Undefined for built-in variants, which use
   * a hardcoded field set in Form.tsx.
   */
  customFields?: FieldDef[]
}

export function extractFormProps(section: PageSection): FormProps {
  const variant = (section.variant as FormProps['variant']) ?? 'contact'
  const { intro, sidebar } = splitOnSidebarMarker(section.content)
  return {
    variant,
    heading: section.heading,
    intro: intro || undefined,
    sidebar_content: sidebar,
    success_message: undefined,
    customFields: variant === 'custom' ? parseCustomFields(section.content) : undefined,
  }
}

// ---------------------------------------------------------------------------
// ContentTable
// ---------------------------------------------------------------------------

export type ContentTableProps = {
  heading?: string
  intro?: string
  headers: string[]
  rows: string[][]
  caption?: string
}

export function extractContentTableProps(section: PageSection): ContentTableProps {
  const parsed = parseMarkdownTable(section.content)
  return {
    heading: section.heading.trim() || undefined,
    intro: parsed?.intro,
    headers: parsed?.headers ?? [],
    rows: parsed?.rows ?? [],
    caption: parsed?.caption,
  }
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export type BookingProps = {
  heading?: string
  intro?: string
}

/**
 * Booking pulls the URL + provider from site.config.ts, not the page markdown.
 * The section only carries an optional heading + intro to render above the
 * embed; the body of the section (if any) is ignored.
 */
export function extractBookingProps(section: PageSection): BookingProps {
  return {
    heading: section.heading.trim() || undefined,
    intro: section.content.trim() || undefined,
  }
}

// ---------------------------------------------------------------------------
// ResourceList (lead magnet)
// ---------------------------------------------------------------------------

export type ResourceListProps = {
  heading: string
  intro?: string
  resources: Array<{ title: string; url: string; description: string }>
}

/**
 * Parses a section body whose bullets follow the convention:
 *   - [Title](/resources/file.pdf) — Short description
 *
 * Any non-bullet prose that precedes the first bullet is used as `intro`.
 */
export function extractResourceListProps(section: PageSection): ResourceListProps {
  const resources: ResourceListProps['resources'] = []
  const introLines: string[] = []
  const lineRe = /^\s*-\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*[—–-]\s*(.+))?$/

  for (const line of section.content.split('\n')) {
    const m = line.match(lineRe)
    if (m) {
      resources.push({
        title: m[1].trim(),
        url: m[2].trim(),
        description: (m[3] ?? '').trim(),
      })
    } else if (resources.length === 0 && line.trim()) {
      introLines.push(line)
    }
  }

  return {
    heading: section.heading,
    intro: introLines.join('\n').trim() || undefined,
    resources,
  }
}
