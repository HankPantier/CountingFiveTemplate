import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { DEFAULT_BLOG_PATH } from '@/lib/content/blog-config'
import { BlogIndex, blogIndexMetadata } from '@/lib/content/blog-views'
import { renderGeneratedPage, generatedPageMetadata } from '@/components/assembly/GeneratedMarkdownPage'

// This physical route owns /resources. It renders the blog index only when the
// blog path IS /resources (the default). When a client moves the blog to a
// custom path (content/blog.json), /resources is freed for a real page — so we
// render content/pages/resources.md here instead, or 404 if there's none.

export async function generateMetadata(): Promise<Metadata> {
  const blog = await getBlogConfig()
  if (blog.path === DEFAULT_BLOG_PATH) return blogIndexMetadata()
  const meta = await generatedPageMetadata('/resources', 'resources')
  return meta ?? { title: 'Not found' }
}

export default async function ResourcesIndex() {
  const blog = await getBlogConfig()
  if (blog.path === DEFAULT_BLOG_PATH) return <BlogIndex />
  const rendered = await renderGeneratedPage('/resources')
  if (!rendered) notFound()
  return rendered
}
