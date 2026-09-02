import type { Metadata } from 'next'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Image } from '@/components/ui/skeleton-image'
import { Section } from '@/components/blocks/Section'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResourceBrowser } from '@/components/blocks/ResourceBrowser'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { getPost, listPostsMeta, relatedPosts } from '@/lib/content/get-post'
import { asPostContentType, CONTENT_TYPE_META } from '@/lib/content/content-type-meta'
import type { BrowsablePost } from '@/lib/content/filter-posts'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import { siteConfig } from '../../../site.config'

// ---------------------------------------------------------------------------
// Shared blog renderers. The blog lives at the configured path (content/blog.json
// → default /resources). When the path is the default, the physical
// app/resources routes render these; when it's custom (e.g. /insights), the
// catch-all app/[...slug] route renders them and /resources is freed up for a
// real page. Keeping the JSX here means both entry points stay identical.
// ---------------------------------------------------------------------------

function formatDate(iso: string, month: 'short' | 'long' = 'short'): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month, day: 'numeric', timeZone: 'UTC' })
}

export async function blogIndexMetadata(): Promise<Metadata> {
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

export async function BlogIndex() {
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

export async function blogPostMetadata(slug: string): Promise<Metadata | null> {
  const post = await getPost(slug)
  if (!post) return null
  const blog = await getBlogConfig()
  const url = post.frontmatter.canonical_url || `${siteConfig.siteUrl.replace(/\/$/, '')}${blog.path}/${post.slug}`
  const ogUrl = `/api/og/resources/${post.slug}`
  const description = post.frontmatter.meta_description || post.frontmatter.excerpt
  const keywords = Array.from(
    new Set(
      [post.frontmatter.target_keyword, ...(post.frontmatter.secondary_keywords ?? [])]
        .map((k) => (k ?? '').trim())
        .filter(Boolean)
    )
  )
  return {
    title: post.frontmatter.meta_title || post.frontmatter.title,
    description,
    keywords: keywords.length ? keywords : undefined,
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
    twitter: { card: 'summary_large_image', title: post.frontmatter.title, description, images: [ogUrl] },
  }
}

/** Render a blog post detail, or return null when `slug` is not a post. */
export async function BlogPost({ slug }: { slug: string }) {
  const post = await getPost(slug)
  if (!post) return null

  const [brand, related, blog] = await Promise.all([
    getBrandConfig(),
    relatedPosts(post.slug, post.frontmatter.tags),
    getBlogConfig(),
  ])
  const typeMeta = CONTENT_TYPE_META[asPostContentType(post.frontmatter.content_type)]
  const canonical =
    post.frontmatter.canonical_url || `${siteConfig.siteUrl.replace(/\/$/, '')}${blog.path}/${post.slug}`

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Section dataBlock="page-header" className="max-w-3xl mx-auto">
        <Link href={blog.path} className="text-sm text-foreground/60 hover:text-primary">
          ← Back to {blog.label}
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <Badge variant="outline" className={cn('border-transparent', typeMeta.badgeClass)}>
            {typeMeta.label}
          </Badge>
          {post.frontmatter.date && (
            <time dateTime={post.frontmatter.date} className="text-sm text-muted-foreground">
              {formatDate(post.frontmatter.date, 'long')}
            </time>
          )}
        </div>
        <h1 className="mt-2 font-heading text-3xl md:text-4xl font-semibold text-foreground leading-tight">
          {post.frontmatter.title}
        </h1>
        {post.frontmatter.author && <p className="mt-3 text-foreground/70">By {post.frontmatter.author}</p>}
        {post.frontmatter.excerpt && (
          <p className="mt-4 text-lg text-foreground/75 leading-relaxed">{post.frontmatter.excerpt}</p>
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
            <Link href={blog.path}>More {blog.label.toLowerCase()} →</Link>
          </Button>
        </div>
      </Section>

      {related.length > 0 && (
        <Section className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl font-semibold text-foreground text-center">Related reading</h2>
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
                      href={`${blog.path}/${p.slug}`}
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
