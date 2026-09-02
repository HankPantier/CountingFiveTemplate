import { cacheLife } from 'next/cache'
import { readBlogConfigFile, type BlogConfig } from './blog-config'

export type { BlogConfig }

/**
 * Cached accessor for the blog section config (content/blog.json). Mirrors
 * get-nav-config's `'use cache'` + cacheLife('max') pattern so pages that read
 * it (the index, feed.xml, sitemap, llms.txt) stay statically prerenderable.
 * The pure read/normalize logic lives in blog-config.ts so next.config can reuse
 * it without importing framework cache code.
 */
export async function getBlogConfig(): Promise<BlogConfig> {
  'use cache'
  cacheLife('max')
  return readBlogConfigFile(process.cwd())
}
