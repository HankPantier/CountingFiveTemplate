import type { NextConfig } from 'next'
import { withBotId } from 'botid/next/config'
import nextBundleAnalyzer from '@next/bundle-analyzer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { siteConfig } from './site.config'
import { readBlogConfigFile, DEFAULT_BLOG_PATH } from './src/lib/content/blog-config'

const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/**
 * Build the Content-Security-Policy header value.
 *
 * Approach: `'unsafe-inline'` for scripts + an explicit third-party allowlist,
 * NOT nonces. Nonce-based CSP requires per-request rendering, which would
 * undo the static-prerender win from enabling Cache Components (Next's PPR
 * docs are explicit: nonces are incompatible with PPR because the static
 * shell ships before the nonce exists).
 *
 * What we DO get from this CSP:
 *   - frame-ancestors 'self' blocks clickjacking
 *   - object-src 'none' blocks legacy plugin abuse (Flash, etc.)
 *   - base-uri 'self' blocks <base href="..."> hijacks
 *   - form-action 'self' prevents form-action redirect attacks
 *   - upgrade-insecure-requests force-upgrades any stray http:// URLs
 *   - script-src/img-src/etc. allowlists reduce blast radius of any inline
 *     content that would otherwise load from arbitrary origins
 *
 * What it does NOT defend against: inline-script injection (because we
 * allow 'unsafe-inline'). Mitigated upstream by our markdown pipeline
 * sanitizing user content via react-markdown.
 */
function buildCsp(isDev: boolean): string {
  const extras = siteConfig.csp.extraOrigins
  const extra = extras.length > 0 ? ' ' + extras.join(' ') : ''

  const directives: Record<string, string> = {
    'default-src': "'self'",
    // 'unsafe-eval' is needed in dev because React uses eval to reconstruct
    // server-side error stacks. Not needed in production.
    'script-src': `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://*.googletagmanager.com https://*.google-analytics.com${extra}`,
    // Tailwind + Next inject inline styles; nonce-based isolation requires
    // per-request rendering (see above).
    'style-src': `'self' 'unsafe-inline'${extra}`,
    // next/font self-hosts Google Fonts under /_next/static, so 'self' is
    // enough — no fonts.gstatic.com needed.
    'font-src': "'self'",
    // Permissive img-src: content-asset images, OG images, certification
    // logos, and any markdown-embedded images may come from various origins.
    // data:/blob: covers next/image's placeholder/blur encodings.
    'img-src': `'self' data: blob: https:`,
    // GA/GTM measurement endpoints + same-origin /api/contact.
    'connect-src': `'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com${extra}`,
    // Google Maps embed iframe target (src/components/blocks/Map.tsx).
    'frame-src': `https://www.google.com https://*.google.com${extra}`,
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'self'",
    'upgrade-insecure-requests': '',
  }

  return Object.entries(directives)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join('; ')
}

async function readRedirectsCsv(): Promise<Array<{ source: string; destination: string; permanent: true }>> {
  const csvPath = path.join(process.cwd(), 'content', 'redirects.csv')
  let raw: string
  try {
    raw = await fs.readFile(csvPath, 'utf-8')
  } catch {
    // No file present — no redirects (e.g. before unpack).
    return []
  }

  const redirects: Array<{ source: string; destination: string; permanent: true }> = []
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    // Skip comment lines.
    if (line.startsWith('#')) continue
    // Skip the header row.
    if (line.startsWith('old_url,')) continue

    // Minimal CSV parsing: handle quoted fields that may contain commas.
    const cells = parseCsvLine(line)
    const [from, to] = cells
    if (!from || !to) continue
    // Destinations must be path-relative. A row like `/old,https://evil.com`
    // would otherwise ship as a 308 to an attacker-controlled URL.
    if (!to.startsWith('/')) {
      console.warn(`[next.config] Skipping redirect with non-relative destination: ${from} -> ${to}`)
      continue
    }
    redirects.push({ source: from, destination: to, permanent: true })
  }
  return redirects
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        out.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
  }
  out.push(cur)
  return out.map(c => c.trim())
}

const nextConfig: NextConfig = {
  // Next 16 unified caching model. Data fetches are excluded from
  // prerenders unless wrapped in `'use cache'`. The site's data loaders
  // (get-brand-config, get-nav-config, get-theme-vars, get-page) all
  // opt in, so pages stay statically renderable; only the per-request
  // <Analytics> island (which reads cookies()) is dynamic, gated by a
  // Suspense boundary in src/app/layout.tsx.
  cacheComponents: true,
  // Allow next/image to optimize author-supplied remote images (image: URLs in
  // content). CSP img-src already permits `https:` (see buildCsp above), so no
  // CSP change is needed. Local images live under public/content-assets/.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      // http sources are fetched server-side by the image optimizer and
      // re-served from our origin, so they don't cause browser mixed content.
      { protocol: 'http', hostname: '**' },
    ],
  },
  async redirects() {
    const r = await readRedirectsCsv()
    if (r.length > 0) {
      console.log(`[next.config] Loaded ${r.length} redirect(s) from content/redirects.csv`)
    }
    const blog = await readBlogConfigFile(process.cwd())
    // The blog section was renamed /insights → /resources; keep old URLs
    // working for any links indexed before the rename. Skip this when the client
    // has *chosen* /insights as its blog path (below) — otherwise /insights →
    // /resources → /insights would loop.
    if (blog.path !== '/insights') {
      r.push({ source: '/insights/:path*', destination: '/resources/:path*', permanent: true })
    }
    // Custom blog path: /resources is the internal canonical route; send its
    // public URLs to the configured path so there's a single indexable URL.
    // The inbound custom path is served by the rewrite() below.
    if (blog.path !== DEFAULT_BLOG_PATH) {
      r.push({ source: '/resources', destination: blog.path, permanent: true })
      r.push({ source: '/resources/:slug', destination: `${blog.path}/:slug`, permanent: true })
    }
    return r
  },
  async rewrites() {
    // Serve the configured blog path from the canonical /resources route without
    // a visible redirect. No-op when the client keeps the default path.
    const blog = await readBlogConfigFile(process.cwd())
    if (blog.path === DEFAULT_BLOG_PATH) return []
    return [
      { source: blog.path, destination: '/resources' },
      { source: `${blog.path}/:slug`, destination: '/resources/:slug' },
    ]
  },
  async headers() {
    const baseHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // Agent-discovery hints (RFC 8288): point well-known agent crawlers at the
      // llms.txt summary and the sitemap. Per-page `Link: rel=alternate;
      // type=text/markdown` for the .md companion is added by src/proxy.ts since
      // it varies by URL.
      { key: 'Link', value: '</llms.txt>; rel="describedby"; type="text/markdown"' },
      { key: 'Link', value: '</sitemap.xml>; rel="sitemap"' },
      { key: 'Link', value: '</feed.xml>; rel="alternate"; type="application/rss+xml"' },
    ]
    const mode = siteConfig.csp.mode
    if (mode !== 'off') {
      const value = buildCsp(process.env.NODE_ENV === 'development')
      const key =
        mode === 'report-only'
          ? 'Content-Security-Policy-Report-Only'
          : 'Content-Security-Policy'
      baseHeaders.push({ key, value })
    }
    return [{ source: '/:path*', headers: baseHeaders }]
  },
}

// withBotId injects same-origin proxy rewrites for the BotID challenge so
// ad-blockers / CSP don't weaken it. The challenge JS + fetch stay on our own
// origin, already covered by script-src 'self' / connect-src 'self' in
// buildCsp() above — no CSP change needed. It only adds rewrites, so the
// redirects()/headers() above are untouched.
//
// withBundleAnalyzer is a no-op unless ANALYZE=true; when on it emits an
// interactive bundle report (run `npm run analyze`).
export default withBundleAnalyzer(withBotId(nextConfig))
