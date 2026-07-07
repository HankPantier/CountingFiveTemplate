import type { NavJson } from './types'
import { findNavLabel } from './nav-tree'

export type Crumb = { label: string; url: string }

/** "virtual-cfo" -> "Virtual Cfo". Fallback label for pages not in the nav. */
export function titleize(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Build the breadcrumb trail for a page from its URL. Roots at `rootLabel`
 * (the site's short brand name) pointing at `/`, then one crumb per path
 * segment with its cumulative url. Each crumb's label comes from the matching
 * nav.json node, falling back to a titleized slug. Returns [] for the home
 * page (empty path) so callers can render nothing there.
 */
export function buildBreadcrumbTrail(url: string, nav: NavJson, rootLabel: string): Crumb[] {
  const path = url.replace(/^\/+|\/+$/g, '')
  if (!path) return []
  const crumbs: Crumb[] = [{ label: rootLabel, url: '/' }]
  let acc = ''
  for (const seg of path.split('/')) {
    acc += `/${seg}`
    crumbs.push({ label: findNavLabel(nav, acc) ?? titleize(seg), url: acc })
  }
  return crumbs
}
