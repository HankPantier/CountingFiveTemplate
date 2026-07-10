import type { Metadata } from 'next'
import { Image } from '@/components/ui/skeleton-image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Section } from '@/components/blocks/Section'
import { Button } from '@/components/ui/button'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getPost, listPostSlugs, relatedPosts } from '@/lib/content/get-post'
import { siteConfig } from '../../../../site.config'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import {
  renderGeneratedPage,
  generatedPageMetadata,
} from '@/components/assembly/GeneratedMarkdownPage'

type Props = {
  params: Promise<{ slug: string }>
}

const EMPTY_PLACEHOLDER = '__no_posts__'

// Cache Components requires generateStaticParams to return at least one entry,
// matching the [...slug] pattern. The page handler maps the placeholder to 404.
export async function generateStaticParams() {
  const slugs = await listPostSlugs()
  return slugs.length === 0 ? [{ slug: EMPTY_PLACEHOLDER }] : slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug === EMPTY_PLACEHOLDER) return { title: 'Not found' }
  try {
    const post = await getPost(slug)
    if (!post) {
      // Not a post — the deliverable may ship a real page at /resources/<slug>
      // (client portal, refund tracker, …) that this route shadows.
      const pageMeta = await generatedPageMetadata(`/resources/${slug}`, `resources/${slug}`)
      return pageMeta ?? { title: 'Not found' }
    }
    const url = post.frontmatter.canonical_url || `${siteConfig.siteUrl.replace(/\/$/, '')}/resources/${post.slug}`
    const ogUrl = `/api/og/resources/${post.slug}`
    const description = post.frontmatter.meta_description || post.frontmatter.excerpt
    return {
      title: post.frontmatter.meta_title || post.frontmatter.title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: post.frontmatter.title,
        description,
        url,
        type: 'article',
        publishedTime: post.frontmatter.date || undefined,
        authors: post.frontmatter.author ? [post.frontmatter.author] : undefined,
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.frontmatter.title,
        description,
        images: [ogUrl],
      },
    }
  } catch {
    return { title: 'Not found' }
  }
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  if (slug === EMPTY_PLACEHOLDER) notFound()

  // Missing post → null → clean notFound(). A throw across getPost's
  // 'use cache' boundary would escalate to a 500 under cacheComponents —
  // see getPageMarkdown in get-page.ts for the rationale.
  const post = await getPost(slug)
  if (!post) {
    // This dynamic route out-specifies the [...slug] catch-all, so generated
    // pages living under /resources/* (portal, trackers) would 404 without
    // this fallback. Posts win when both exist.
    const generated = await renderGeneratedPage(`/resources/${slug}`)
    if (generated) return generated
    notFound()
  }

  const [brand, related] = await Promise.all([
    getBrandConfig(),
    relatedPosts(post.slug, post.frontmatter.tags),
  ])
  const canonical =
    post.frontmatter.canonical_url ||
    `${siteConfig.siteUrl.replace(/\/$/, '')}/resources/${post.slug}`

  // BlogPosting JSON-LD — built from validated frontmatter only, never raw
  // user input, so the same dangerouslySetInnerHTML pattern as
  // src/components/layout/SchemaScript.tsx is safe here. schema_markup lets
  // the onboarding draft generator promote a post to Article/FAQPage;
  // answer_block doubles as the AIO-friendly abstract.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': post.frontmatter.schema_markup || 'BlogPosting',
    headline: post.frontmatter.title,
    description: post.frontmatter.meta_description || post.frontmatter.excerpt || undefined,
    abstract: post.frontmatter.answer_block || undefined,
    datePublished: post.frontmatter.date || undefined,
    author: post.frontmatter.author
      ? { '@type': 'Person', name: post.frontmatter.author }
      : { '@type': 'Organization', name: brand.firm.name },
    publisher: { '@type': 'Organization', name: brand.firm.name },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    image: resolveImageSrc(post.frontmatter.image),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Section dataBlock="page-header" className="max-w-3xl mx-auto">
        <Link href="/resources" className="text-sm text-foreground/60 hover:text-primary">
          ← Back to Resources
        </Link>
        {post.frontmatter.date && (
          <time
            dateTime={post.frontmatter.date}
            className="mt-6 block text-sm text-muted-foreground"
          >
            {formatDate(post.frontmatter.date)}
          </time>
        )}
        <h1 className="mt-2 font-heading text-3xl md:text-4xl font-semibold text-foreground leading-tight">
          {post.frontmatter.title}
        </h1>
        {post.frontmatter.author && (
          <p className="mt-3 text-foreground/70">By {post.frontmatter.author}</p>
        )}
        {post.frontmatter.excerpt && (
          <p className="mt-4 text-lg text-foreground/75 leading-relaxed">
            {post.frontmatter.excerpt}
          </p>
        )}
      </Section>

      {post.frontmatter.image && (
        <Section className="max-w-4xl mx-auto !pt-0">
          <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
            <Image
              src={resolveImageSrc(post.frontmatter.image)!}
              alt={post.frontmatter.image_alt ?? post.frontmatter.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
          </div>
        </Section>
      )}

      <Section className="max-w-3xl mx-auto">
        <article
          className="prose prose-neutral max-w-none prose-headings:font-heading prose-a:text-primary prose-a:underline"
          itemScope
          itemType="https://schema.org/BlogPosting"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>
            {post.body}
          </ReactMarkdown>
        </article>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <Button asChild variant="outline">
            <Link href="/resources">More resources →</Link>
          </Button>
        </div>
      </Section>

      {related.length > 0 && (
        <Section className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl font-semibold text-foreground text-center">
            Related reading
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug} className="rounded-lg border border-border bg-card overflow-hidden">
                {p.frontmatter.image && (
                  <div className="relative w-full aspect-video bg-muted">
                    <Image
                      src={resolveImageSrc(p.frontmatter.image)!}
                      alt={p.frontmatter.image_alt ?? p.frontmatter.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-heading text-base font-semibold leading-snug">
                    <Link
                      href={`/resources/${p.slug}`}
                      className="hover:text-primary focus-visible:outline-none focus-visible:underline"
                    >
                      {p.frontmatter.title}
                    </Link>
                  </h3>
                  {p.frontmatter.excerpt && (
                    <p className="mt-2 text-sm text-foreground/70 leading-relaxed line-clamp-3">
                      {p.frontmatter.excerpt}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}
