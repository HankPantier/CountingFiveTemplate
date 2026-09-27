import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPageMarkdown } from '@/lib/content/get-page'
import { parsePageMd } from '@/lib/assembly/parse-page-md'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { PageLayout } from '@/components/layout/PageLayout'
import { BlockRenderer } from '@/components/assembly/BlockRenderer'
import { SchemaScript } from '@/components/layout/SchemaScript'
import { Hero } from '@/components/blocks/Hero'
import { HeroSplit } from '@/components/blocks/HeroSplit'
import { PageHeader } from '@/components/blocks/PageHeader'
import {
  extractHeroProps,
  extractHeroSplitProps,
  extractPageHeaderProps,
  type HeroCtaSite,
} from '@/lib/assembly/extract-block-props'
import { getHeroCtaSite } from '@/lib/nav/hero-cta-site'

export async function generateMetadata(): Promise<Metadata> {
  const md = await getPageMarkdown('/')
  // home.md missing means the deliverable hasn't been unpacked yet — there's
  // no page to describe. notFound() keeps it a 404 rather than a crash.
  if (!md) notFound()
  const manifest = parsePageMd(md)
  return {
    title: manifest.meta_title || manifest.title,
    description: manifest.meta_description,
    alternates: { canonical: manifest.canonical_url || undefined },
    // OG + Twitter images come from /api/og/[[...slug]] which generates a
    // branded 1200×630 PNG from brand + frontmatter — no per-page PNG needed.
    openGraph: {
      title: manifest.meta_title || manifest.title,
      description: manifest.meta_description,
      url: manifest.canonical_url || undefined,
      type: 'website',
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: manifest.meta_title || manifest.title,
      description: manifest.meta_description,
      images: ['/api/og'],
    },
  }
}

function renderHeroBlock(manifest: Parameters<typeof extractHeroProps>[0], site: HeroCtaSite): ReactNode {
  switch (manifest.hero_block) {
    case 'hero':
      return <Hero {...extractHeroProps(manifest, site)} />
    case 'hero-split':
      return <HeroSplit {...extractHeroSplitProps(manifest, site)} />
    case 'page-header':
      return <PageHeader {...extractPageHeaderProps(manifest)} />
    default:
      // Unknown hero_block — fall back to PageHeader for safety
      return <PageHeader {...extractPageHeaderProps(manifest)} />
  }
}

export default async function HomePage() {
  const md = await getPageMarkdown('/')
  if (!md) notFound()
  const manifest = parsePageMd(md)
  const [brand, heroSite] = await Promise.all([getBrandConfig(), getHeroCtaSite()])

  return (
    <>
      <SchemaScript manifest={manifest} brand={brand} />
      <PageLayout hero={renderHeroBlock(manifest, heroSite)}>
        {manifest.sections.map((section, i) => (
          <BlockRenderer key={i} section={section} manifest={manifest} />
        ))}
      </PageLayout>
    </>
  )
}
