import type { MetadataRoute } from 'next'
import { cacheLife } from 'next/cache'
import { listPageSlugs } from '@/lib/content/get-page'
import { listPostsMeta } from '@/lib/content/get-post'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { siteConfig } from '../../site.config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Sitemap is build-time data; without 'use cache' the new Date() calls
  // below would make it per-request dynamic under cacheComponents: true.
  'use cache'
  cacheLife('max')
  const baseUrl = siteConfig.siteUrl.replace(/\/$/, '')
  const [slugs, posts, blog] = await Promise.all([listPageSlugs(), listPostsMeta(), getBlogConfig()])

  // listPageSlugs already excludes 'home' (it's served from app/page.tsx).
  // Each remaining slug is one URL segment with '--' as path separator.
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    ...slugs.map(slug => ({
      url: `${baseUrl}/${slug.replace(/--/g, '/')}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  // Only surface the blog index + posts when at least one post exists —
  // otherwise the index is a no-content empty state and search engines should
  // ignore it.
  if (posts.length > 0) {
    entries.push({
      url: `${baseUrl}${blog.path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
    for (const p of posts) {
      const parsed = p.frontmatter.date
        ? new Date(p.frontmatter.date + 'T00:00:00Z')
        : new Date()
      entries.push({
        url: `${baseUrl}${blog.path}/${p.slug}`,
        lastModified: Number.isNaN(parsed.getTime()) ? new Date() : parsed,
        changeFrequency: 'monthly',
        priority: 0.5,
      })
    }
  }

  return entries
}
