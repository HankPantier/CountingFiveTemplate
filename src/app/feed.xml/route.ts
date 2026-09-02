import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { listPostsMeta } from '@/lib/content/get-post'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { siteConfig } from '../../../site.config'

/**
 * RSS 2.0 feed for /resources. Reads cached frontmatter only (no body), so
 * lightweight even with many posts. Returns 200 with an empty `<channel>`
 * (no items) when no posts exist — RSS readers handle that gracefully.
 */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function rfc822(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  return Number.isNaN(d.getTime()) ? '' : d.toUTCString()
}

export async function GET(): Promise<Response> {
  const [brand, posts, blog] = await Promise.all([getBrandConfig(), listPostsMeta(), getBlogConfig()])
  const base = siteConfig.siteUrl.replace(/\/$/, '')
  const channelTitle = `${brand.firm.name} — ${blog.label}`
  const channelDesc = `Tax, advisory, and accounting resources from ${brand.firm.name}.`

  const items = posts
    .map((p) => {
      const url = p.frontmatter.canonical_url || `${base}${blog.path}/${p.slug}`
      const pubDate = rfc822(p.frontmatter.date || '')
      return [
        '    <item>',
        `      <title>${escapeXml(p.frontmatter.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        p.frontmatter.excerpt ? `      <description>${escapeXml(p.frontmatter.excerpt)}</description>` : '',
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
        p.frontmatter.author ? `      <author>${escapeXml(p.frontmatter.author)}</author>` : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(`${base}${blog.path}`)}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
