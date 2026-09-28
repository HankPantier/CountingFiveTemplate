import { NextResponse, type NextRequest } from 'next/server'

/**
 * Agent-readiness proxy (formerly "middleware" before Next 16). Three jobs
 * (plus the design-specimen layouts rewrite, 4. below):
 *
 *   1. Rewrite `<page>.md` URLs to the internal markdown route handler at
 *      `/api/md/[[...slug]]`, so agents that request the raw markdown of a
 *      page get text/markdown without any client-side detection. The browser
 *      address stays exactly as requested (rewrite ≠ redirect).
 *
 *   2. Rewrite `/.well-known/agent.json` to the `/api/agent-card` route
 *      handler. We can't put the handler in `src/app/.well-known/` directly —
 *      Next has unreliable support for dot-prefixed app folders — so the
 *      proxy stands in.
 *
 *   3. For HTML page responses, advertise the `.md` companion via a per-URL
 *      `Link: rel=alternate; type=text/markdown` header. The static Link
 *      headers in `next.config.ts` (rel=describedby → /llms.txt, rel=sitemap,
 *      rel=alternate → /feed.xml) apply globally; this one varies per page.
 *
 * The matcher excludes Next internals, /api/*, and static asset extensions —
 * so robots.txt, sitemap.xml, llms.txt, images, fonts, etc. all flow through
 * untouched — with an explicit add-back for `/.well-known/agent.json` (which
 * the `.json` extension exclude would otherwise drop).
 */
/** Internal route behind /design-specimen?layouts=1 (the layout specimen). */
export const LAYOUT_SPECIMEN_PATH = '/design-specimen/layouts'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 4. `/design-specimen?layouts=1` → the static layout specimen (2026.09.9).
  //    A rewrite, not searchParams in the page, so /design-specimen itself
  //    stays static and byte-identical.
  if (pathname === '/design-specimen' && req.nextUrl.searchParams.get('layouts') === '1') {
    const url = req.nextUrl.clone()
    url.pathname = LAYOUT_SPECIMEN_PATH
    url.search = ''
    return NextResponse.rewrite(url)
  }

  if (pathname === '/.well-known/agent.json') {
    const url = req.nextUrl.clone()
    url.pathname = '/api/agent-card'
    return NextResponse.rewrite(url)
  }

  if (pathname.endsWith('.md')) {
    // `/index.md` → `/api/md`  (home)
    // `/services/virtual-cfo.md` → `/api/md/services/virtual-cfo`
    const stripped = pathname.slice(0, -3)
    const internalPath =
      stripped === '/index' || stripped === '/' || stripped === ''
        ? '/api/md'
        : `/api/md${stripped}`
    const url = req.nextUrl.clone()
    url.pathname = internalPath
    return NextResponse.rewrite(url)
  }

  const res = NextResponse.next()
  const mdUrl = pathname === '/' ? '/index.md' : `${pathname}.md`
  res.headers.append(
    'Link',
    `<${mdUrl}>; rel="alternate"; type="text/markdown"`
  )
  return res
}

export const config = {
  matcher: [
    // Skip Next internals (_next/), the existing /api/* routes, and any static
    // asset by extension. Everything else (HTML pages + .md URLs) flows in.
    '/((?!_next/|api/|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|css|js|map|txt|xml|json)$).*)',
    // Add-back for the agent card — the `.json` extension above would
    // otherwise drop it before the rewrite branch can act.
    '/.well-known/agent.json',
  ],
}
