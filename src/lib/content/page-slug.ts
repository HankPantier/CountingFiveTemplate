// Pure filename → route-segment helper for the dynamic [...slug] page route.
// Kept free of next/* imports so it stays unit-testable (get-page.ts pulls in
// next/cache via 'use cache').

/**
 * Convert a content/pages filename (sans .md) into `[...slug]` route segments,
 * or null when the filename is malformed. Filenames encode `/` as `--`, so a
 * healthy name splits into non-empty segments (services--virtual-cfo →
 * ["services","virtual-cfo"]). A name that splits into an EMPTY segment — from
 * a doubled `--`/`----`, or a leading/trailing `--` — yields a degenerate route
 * Next cannot statically generate. Left unchecked, one such file (e.g. a page
 * whose URL kept its scheme+host, `https-----www-…--who-we-are--x`) fails the
 * ENTIRE `next build`. generateStaticParams skips these so a single bad file
 * 404s instead of taking the whole site down.
 */
export function pageSlugToSegments(slug: string): string[] | null {
  const segments = slug.split('--')
  if (segments.some((s) => s === '')) return null
  return segments
}
