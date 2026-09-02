import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getPageMarkdown, listPageSlugs } from '@/lib/content/get-page'
import { listPostsMeta } from '@/lib/content/get-post'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { parsePageMd } from '@/lib/assembly/parse-page-md'
import { siteConfig } from '../../../site.config'

/**
 * `/llms.txt` — the AI-crawler index advertised by the agent card
 * (`/.well-known/agent.json`), the global Link headers, and `proxy.ts`.
 * Follows the llms.txt convention: an H1 firm name, a blockquote summary, then
 * link lists (title + one-line description) so an LLM can find the right page
 * without parsing HTML. Built from the same content source as `sitemap.ts`, so
 * it can never drift from what's actually published.
 */

type Entry = { title: string; url: string; desc: string }

async function pageEntry(baseUrl: string, url: string): Promise<Entry | null> {
  const md = await getPageMarkdown(url)
  if (!md) return null
  try {
    const m = parsePageMd(md)
    return {
      title: m.meta_title || m.title,
      url: `${baseUrl}${url}`,
      desc: (m.meta_description || '').replace(/\s+/g, ' ').trim(),
    }
  } catch {
    return null
  }
}

function line(e: Entry): string {
  return e.desc ? `- [${e.title}](${e.url}): ${e.desc}` : `- [${e.title}](${e.url})`
}

export async function GET(): Promise<Response> {
  const brand = await getBrandConfig()
  const baseUrl = siteConfig.siteUrl.replace(/\/$/, '')

  const [home, slugs, posts, blog] = await Promise.all([
    pageEntry(baseUrl, '/'),
    listPageSlugs(),
    listPostsMeta(),
    getBlogConfig(),
  ])

  const pageEntries = (
    await Promise.all(slugs.map(slug => pageEntry(baseUrl, `/${slug.replace(/--/g, '/')}`)))
  ).filter((e): e is Entry => e !== null)

  const out: string[] = [`# ${brand.firm.name}`]
  if (brand.firm.tagline) out.push('', `> ${brand.firm.tagline}`)

  const context: string[] = []
  if (brand.firm.foundingYear) context.push(`Established ${brand.firm.foundingYear}.`)
  const city = brand.contact.address?.city
  const state = brand.contact.address?.state
  if (city && state) context.push(`Based in ${city}, ${state}.`)
  if (context.length) out.push('', context.join(' '))

  if (home || pageEntries.length) {
    out.push('', '## Pages')
    if (home) out.push(line(home))
    for (const e of pageEntries) out.push(line(e))
  }

  if (posts.length) {
    out.push('', `## ${blog.label}`)
    for (const p of posts) {
      out.push(
        line({
          title: p.frontmatter.meta_title || p.frontmatter.title,
          url: `${baseUrl}${blog.path}/${p.slug}`,
          desc: (p.frontmatter.meta_description || p.frontmatter.excerpt || '')
            .replace(/\s+/g, ' ')
            .trim(),
        })
      )
    }
  }

  return new Response(out.join('\n') + '\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
