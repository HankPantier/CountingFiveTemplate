import type { ReactNode } from 'react'
import type { PageSection, PageManifest } from '@/lib/assembly/parse-page-md'

import { ContentSplit } from '@/components/blocks/ContentSplit'
import { FeatureGrid } from '@/components/blocks/FeatureGrid'
import { CtaBanner } from '@/components/blocks/CtaBanner'
import { FaqAccordion } from '@/components/blocks/FaqAccordion'
import { IntroText } from '@/components/blocks/IntroText'
import { ServiceCards } from '@/components/blocks/ServiceCards'
import { TeamGrid } from '@/components/blocks/TeamGrid'
import { Testimonials } from '@/components/blocks/Testimonials'
import { StatsBar } from '@/components/blocks/StatsBar'
import { ContentProse } from '@/components/blocks/ContentProse'
import { ChecklistSection } from '@/components/blocks/ChecklistSection'
import { ProcessSteps } from '@/components/blocks/ProcessSteps'
import { IndustryCards } from '@/components/blocks/IndustryCards'
import { LogoBar } from '@/components/blocks/LogoBar'
import { Pricing } from '@/components/blocks/Pricing'
import { ContentCards } from '@/components/blocks/ContentCards'
import { Form } from '@/components/blocks/Form'
import { ContentTable } from '@/components/blocks/ContentTable'
import { ContactInfo } from '@/components/blocks/ContactInfo'
import { MapBlock } from '@/components/blocks/Map'
import { Booking } from '@/components/blocks/Booking'
import { ResourceList } from '@/components/blocks/ResourceList'
import { PricingCalculator } from '@/components/blocks/PricingCalculator'

import {
  extractContentSplitProps,
  extractFeatureGridProps,
  extractCtaBannerProps,
  extractFaqAccordionProps,
  extractIntroTextProps,
  extractServiceCardsProps,
  extractTeamGridProps,
  extractTestimonialsProps,
  extractStatsBarProps,
  extractContentProseProps,
  extractChecklistSectionProps,
  extractProcessStepsProps,
  extractIndustryCardsProps,
  extractLogoBarProps,
  extractPricingProps,
  extractContentCardsProps,
  extractFormProps,
  extractContentTableProps,
  extractBookingProps,
  extractResourceListProps,
  extractPricingCalculatorProps,
} from '@/lib/assembly/extract-block-props'

/**
 * Block registry — one entry per supported block id. Each render function
 * takes the parsed section + the page-level manifest (some blocks need the
 * manifest, most don't) and returns a server-rendered ReactNode.
 *
 * Replaces the prior switch-statement dispatch in BlockRenderer. Adding a
 * new block now means: import the component + extractor, then add a single
 * entry here.
 */
type BlockRender = (section: PageSection, manifest: PageManifest) => ReactNode

export const BLOCK_REGISTRY: Record<string, BlockRender> = {
  'content-split': (s) => <ContentSplit {...extractContentSplitProps(s)} />,
  'feature-grid': (s) => <FeatureGrid {...extractFeatureGridProps(s)} />,
  'cta-banner': (s) => <CtaBanner {...extractCtaBannerProps(s)} />,
  'faq-accordion': (s, m) => <FaqAccordion {...extractFaqAccordionProps(s, m)} />,
  'intro-text': (s) => <IntroText {...extractIntroTextProps(s)} />,
  'service-cards': (s) => <ServiceCards {...extractServiceCardsProps(s)} />,
  'team-grid': (s) => <TeamGrid {...extractTeamGridProps(s)} />,
  'testimonials': (s) => <Testimonials {...extractTestimonialsProps(s)} />,
  'stats-bar': (s) => <StatsBar {...extractStatsBarProps(s)} />,
  'content-prose': (s) => <ContentProse {...extractContentProseProps(s)} />,
  'checklist-section': (s) => <ChecklistSection {...extractChecklistSectionProps(s)} />,
  'process-steps': (s) => <ProcessSteps {...extractProcessStepsProps(s)} />,
  'industry-cards': (s) => <IndustryCards {...extractIndustryCardsProps(s)} />,
  'logo-bar': (s) => <LogoBar {...extractLogoBarProps(s)} />,
  'pricing': (s) => <Pricing {...extractPricingProps(s)} />,
  'content-cards': (s) => <ContentCards {...extractContentCardsProps(s)} />,
  'form': (s) => <Form {...extractFormProps(s)} />,
  'content-table': (s) => <ContentTable {...extractContentTableProps(s)} />,
  // Data-driven blocks read from content/brand.json — only need the heading.
  'contact-info': (s) => <ContactInfo heading={s.heading} />,
  'map': (s) => <MapBlock heading={s.heading} />,
  // Config-driven block — reads provider/url from site.config.ts.
  'booking': (s) => <Booking {...extractBookingProps(s)} />,
  'resource-list': (s) => <ResourceList {...extractResourceListProps(s)} />,
  // Config-driven — reads content/pricing-calculator.json.
  'pricing-calculator': (s) => <PricingCalculator {...extractPricingCalculatorProps(s)} />,
}

/** Sorted list of every supported block id (for tests + docs). */
export const KNOWN_BLOCK_IDS = Object.keys(BLOCK_REGISTRY).sort()
