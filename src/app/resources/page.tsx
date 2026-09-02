import type { Metadata } from 'next'
import { Section } from '@/components/blocks/Section'
import { ResourceBrowser } from '@/components/blocks/ResourceBrowser'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { listPostsMeta } from '@/lib/content/get-post'
import { asPostContentType } from '@/lib/content/content-type-meta'
import type { BrowsablePost } from '@/lib/content/filter-posts'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import { siteConfig } from '../../../site.config'

export async function generateMetadata(): Promise<Metadata> {
  const [brand, blog] = await Promise.all([getBrandConfig(), getBlogConfig()])
  const title = `${blog.title} | ${brand.firm.name}`
  const description = `Tax, advisory, and accounting resources from ${brand.firm.name}.`
  const canonical = `${siteConfig.siteUrl.replace(/\/$/, '')}${blog.path}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', images: [{ url: '/api/og', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/api/og'] },
  }
}

export default async function ResourcesIndex() {
  const [blog, posts] = await Promise.all([getBlogConfig(), listPostsMeta()])

  const browsable: BrowsablePost[] = posts.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    excerpt: p.frontmatter.excerpt ?? '',
    date: p.frontmatter.date ?? '',
    author: p.frontmatter.author,
    imageSrc: resolveImageSrc(p.frontmatter.image),
    imageAlt: p.frontmatter.image_alt,
    tags: p.frontmatter.tags ?? [],
    contentType: asPostContentType(p.frontmatter.content_type),
  }))

  return (
    <>
      <Section dataBlock="page-header" className="text-center">
        <h1 className="font-heading text-4xl md:text-5xl font-semibold text-foreground">{blog.title}</h1>
        <p className="mt-3 max-w-2xl mx-auto text-foreground/70 leading-relaxed">{blog.intro}</p>
      </Section>

      <Section>
        {browsable.length === 0 ? (
          <p className="text-center text-foreground/60">No posts published yet — check back soon.</p>
        ) : (
          <ResourceBrowser posts={browsable} basePath={blog.path} />
        )}
      </Section>
    </>
  )
}
