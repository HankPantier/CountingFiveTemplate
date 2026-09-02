import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listPostSlugs } from '@/lib/content/get-post'
import { listPageSlugs } from '@/lib/content/get-page'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { DEFAULT_BLOG_PATH } from '@/lib/content/blog-config'
import { BlogPost, blogPostMetadata } from '@/lib/content/blog-views'
import { renderGeneratedPage, generatedPageMetadata } from '@/components/assembly/GeneratedMarkdownPage'

type Props = {
  params: Promise<{ slug: string }>
}

const EMPTY_PLACEHOLDER = '__no_posts__'

// Cache Components requires generateStaticParams to return at least one entry.
// Default path: prerender the post slugs. Custom path: the blog moved away, so
// /resources/<slug> is a normal page — prerender the /resources sub-pages.
export async function generateStaticParams() {
  const blog = await getBlogConfig()
  if (blog.path === DEFAULT_BLOG_PATH) {
    const slugs = (await listPostSlugs()).filter((s) => s.trim() !== '')
    return slugs.length === 0 ? [{ slug: EMPTY_PLACEHOLDER }] : slugs.map((slug) => ({ slug }))
  }
  // Custom path: single-segment pages living directly under /resources.
  const pages = (await listPageSlugs())
    .filter((name) => name.startsWith('resources--') && name.split('--').length === 2)
    .map((name) => ({ slug: name.slice('resources--'.length) }))
  return pages.length === 0 ? [{ slug: EMPTY_PLACEHOLDER }] : pages
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug === EMPTY_PLACEHOLDER) return { title: 'Not found' }
  const blog = await getBlogConfig()
  if (blog.path !== DEFAULT_BLOG_PATH) {
    const pageMeta = await generatedPageMetadata(`/resources/${slug}`, `resources/${slug}`)
    return pageMeta ?? { title: 'Not found' }
  }
  try {
    const meta = await blogPostMetadata(slug)
    if (meta) return meta
    const pageMeta = await generatedPageMetadata(`/resources/${slug}`, `resources/${slug}`)
    return pageMeta ?? { title: 'Not found' }
  } catch {
    return { title: 'Not found' }
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  if (slug === EMPTY_PLACEHOLDER) notFound()
  const blog = await getBlogConfig()

  // Custom blog path → the blog is served elsewhere (catch-all). /resources/<slug>
  // is a normal page; don't treat the segment as a post slug.
  if (blog.path !== DEFAULT_BLOG_PATH) {
    const page = await renderGeneratedPage(`/resources/${slug}`)
    if (!page) notFound()
    return page
  }

  // Default path: post detail, falling back to a generated page (portal,
  // trackers, …) that lives under /resources/* when the slug isn't a post.
  const post = await BlogPost({ slug })
  if (post) return post
  const generated = await renderGeneratedPage(`/resources/${slug}`)
  if (generated) return generated
  notFound()
}
