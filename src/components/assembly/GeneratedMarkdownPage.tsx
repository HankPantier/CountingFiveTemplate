import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getPageMarkdown } from '@/lib/content/get-page'
import { parsePageMd } from '@/lib/assembly/parse-page-md'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getNavConfig } from '@/lib/nav/get-nav-config'
import { resolveSideNav } from '@/lib/nav/nav-tree'
import { buildBreadcrumbTrail } from '@/lib/nav/breadcrumbs'
import { SideNav } from '@/components/nav/SideNav'
import { Breadcrumb } from '@/components/blocks/Breadcrumb'
import { PageLayout } from '@/components/layout/PageLayout'
import { BlockRenderer } from '@/components/assembly/BlockRenderer'
import { SchemaScript } from '@/components/layout/SchemaScript'
import { Hero } from '@/components/blocks/Hero'
import { HeroSplit } from '@/components/blocks/HeroSplit'
import { PageHeader } from '@/components/blocks/PageHeader'
import { AnswerCallout } from '@/components/blocks/AnswerCallout'
import { RelatedLinks } from '@/components/blocks/RelatedLinks'
import { TrustSignals } from '@/components/blocks/TrustSignals'
import {
  extractHeroProps,
  extractHeroSplitProps,
  extractPageHeaderProps,
} from '@/lib/assembly/extract-block-props'

/**
 * Shared renderer for a generated content page (content/pages/*.md). Used by
 * the [...slug] catch-all AND as the fallback in /resources/[slug] — a client
 * deliverable may ship real pages under /resources/* (portal, trackers) that
 * would otherwise be shadowed by the more-specific post route.
 */

function renderHeroBlock(manifest: ReturnType<typeof parsePageMd>): ReactNode {
  switch (manifest.hero_block) {
    case 'hero':
      return <Hero {...extractHeroProps(manifest)} />
    case 'hero-split':
      return <HeroSplit {...extractHeroSplitProps(manifest)} />
    case 'page-header':
      return <PageHeader {...extractPageHeaderProps(manifest)} />
    default:
      // Unknown hero_block — fall back to PageHeader for safety
      return <PageHeader {...extractPageHeaderProps(manifest)} />
  }
}

// Null when the page doesn't exist or its frontmatter is malformed — callers
// translate that into notFound(). Never throws (see get-page.ts on why a
// throw across 'use cache' escalates 404s to 500s).
export async function renderGeneratedPage(url: string): Promise<ReactNode | null> {
  const md = await getPageMarkdown(url)
  if (!md) return null
  let manifest: ReturnType<typeof parsePageMd>
  try {
    manifest = parsePageMd(md)
  } catch (err) {
    console.error('[page] Failed to parse:', err)
    return null
  }
  const [brand, nav] = await Promise.all([getBrandConfig(), getNavConfig()])

  // Show the section side-nav only on secondary/tertiary pages of a primary
  // that has tertiary items (see resolveSideNav). Otherwise render full-width.
  const sidePrimary = resolveSideNav(nav, url)

  const rootLabel = brand.firm.shortName?.trim() || brand.firm.name
  const crumbs = buildBreadcrumbTrail(url, nav, rootLabel)

  return (
    <>
      <SchemaScript manifest={manifest} brand={brand} />
      <PageLayout
        hero={renderHeroBlock(manifest)}
        breadcrumb={<Breadcrumb crumbs={crumbs} />}
        sideNav={sidePrimary ? <SideNav primary={sidePrimary} currentUrl={url} /> : undefined}
      >
        <AnswerCallout answer={manifest.answer_block} />
        {manifest.sections.map((section, i) => (
          <BlockRenderer key={i} section={section} manifest={manifest} />
        ))}
        <RelatedLinks links={manifest.internal_links} />
        <TrustSignals signals={manifest.eeat_signals} />
      </PageLayout>
    </>
  )
}

export async function generatedPageMetadata(
  url: string,
  ogSlugPath: string
): Promise<Metadata | null> {
  const md = await getPageMarkdown(url)
  if (!md) return null
  try {
    const manifest = parsePageMd(md)
    const ogUrl = `/api/og/${ogSlugPath}`
    return {
      title: manifest.meta_title || manifest.title,
      description: manifest.meta_description,
      alternates: { canonical: manifest.canonical_url || undefined },
      // OG + Twitter images come from /api/og/[[...slug]] — branded per page,
      // generated from frontmatter, no per-page PNG required.
      openGraph: {
        title: manifest.meta_title || manifest.title,
        description: manifest.meta_description,
        url: manifest.canonical_url || undefined,
        type: 'website',
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: manifest.meta_title || manifest.title,
        description: manifest.meta_description,
        images: [ogUrl],
      },
    }
  } catch {
    return null
  }
}
