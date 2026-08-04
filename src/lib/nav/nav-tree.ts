import type { NavItem, NavJson } from './types'

/**
 * True when a nav item points at the site home. The logo is the sole home
 * link, so any explicit "Home" entry is filtered out of the primary nav.
 * Matches a root-relative '/', an empty url, an absolute root URL
 * (https://firm.com or .../), or an item literally labelled "Home".
 */
export function isHomeNavItem(item: NavItem): boolean {
  const url = (item.url ?? '').trim()
  if (item.label.trim().toLowerCase() === 'home') return true
  if (url === '' || url === '/') return true
  return /^https?:\/\/[^/]+\/?$/i.test(url)
}

/**
 * True when a nav item is the Contact entry — labelled "Contact"/"Contact Us"
 * or pointing at a "/contact" path (root-relative or absolute). Contact is
 * always pinned to the end (rightmost) of the primary nav.
 */
export function isContactNavItem(item: NavItem): boolean {
  if (item.label.trim().toLowerCase().startsWith('contact')) return true
  return /\/contact\/?$/i.test((item.url ?? '').trim())
}

/**
 * The primary nav as rendered: drop the home item (the logo is the sole home
 * link) and pin the Contact item last so it's always rightmost, regardless of
 * the order in nav.json. Order is otherwise preserved (stable).
 */
export function orderedPrimaryNav(items: NavItem[]): NavItem[] {
  const visible = items.filter((item) => !isHomeNavItem(item))
  const contact = visible.filter(isContactNavItem)
  const rest = visible.filter((item) => !isContactNavItem(item))
  return [...rest, ...contact]
}

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

/**
 * Label of the nav node whose `url` exactly matches `url`, searching the full
 * tree (any depth), or null. Used to give breadcrumb crumbs friendly menu
 * labels instead of titleized slugs. Nav urls are already root-relative here
 * (getNavConfig normalizes them), so an exact string match is sufficient.
 */
export function findNavLabel(nav: NavJson, url: string): string | null {
  const search = (items: NavItem[]): string | null => {
    for (const item of items) {
      if (item.url === url) return item.label
      const nested = search(item.children ?? [])
      if (nested) return nested
    }
    return null
  }
  return search(nav.primary)
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
