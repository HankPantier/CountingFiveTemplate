import { getPageMarkdown, listPageSlugs } from '@/lib/content/get-page'
import { parsePageMd } from '@/lib/assembly/parse-page-md'
import type { SpecimenPage } from './pick-instances'

/**
 * The client's pages for /design-specimen: home first, then every other page
 * in slug order. Built only from the 'use cache' loaders (getPageMarkdown /
 * listPageSlugs), so the specimen prerenders like every other page. Malformed
 * pages are skipped (the real route 404s them too).
 */
export async function loadSpecimenPages(): Promise<SpecimenPage[]> {
  const slugs = [...(await listPageSlugs())].sort()
  const urls = ['/', ...slugs.map((s) => `/${s.replace(/--/g, '/')}`)]
  const pages: SpecimenPage[] = []
  for (const url of urls) {
    const md = await getPageMarkdown(url)
    if (!md) continue
    try {
      pages.push({ url, manifest: parsePageMd(md) })
    } catch {
      // Malformed page — skipped, same as the catch-all route's notFound().
    }
  }
  return pages
}
