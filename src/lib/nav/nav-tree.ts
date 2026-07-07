import type { NavItem, NavJson } from './types'

/** True when `pathname` is exactly `target` or sits beneath it (e.g. /about + /about/our-team). */
export function isUrlActive(pathname: string, target: string): boolean {
  if (target === '/') return pathname === '/'
  return pathname === target || pathname.startsWith(target + '/')
}

/**
 * True when `url` matches this item or any of its descendants (exact or beneath).
 * Subtree membership — not just a prefix on `item.url` — so it still resolves when
 * a child's URL isn't nested under its menu parent's URL (e.g. a "/services"
 * primary whose child pages live at "/what-we-do/*").
 */
export function nodeContainsUrl(item: NavItem, url: string): boolean {
  if (isUrlActive(url, item.url)) return true
  return (item.children ?? []).some((child) => nodeContainsUrl(child, url))
}

/** The top-level (primary) nav item whose subtree contains `url`, or null. */
export function findActivePrimary(nav: NavJson, url: string): NavItem | null {
  for (const item of nav.primary) {
    if (nodeContainsUrl(item, url)) return item
  }
  return null
}

/** True when a primary has any tertiary items (a secondary that itself has children). */
export function primaryHasTertiary(item: NavItem): boolean {
  return (item.children ?? []).some((child) => (child.children?.length ?? 0) > 0)
}

/**
 * Resolve the side-nav context for a page. Returns the active primary only when
 * the page sits *beneath* a primary (a secondary or tertiary page — not the
 * primary landing) AND that primary actually has tertiary items. Otherwise null,
 * meaning: render full-width with no side-nav.
 */
export function resolveSideNav(nav: NavJson, url: string): NavItem | null {
  const primary = findActivePrimary(nav, url)
  if (!primary) return null
  if (url === primary.url) return null // primary landing → no side-nav
  if (!primaryHasTertiary(primary)) return null // only two levels → no side-nav
  return primary
}
