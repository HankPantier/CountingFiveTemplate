import Link from 'next/link'
import { cn } from '@/lib/utils'
import { nodeContainsUrl } from '@/lib/nav/nav-tree'
import type { NavItem } from '@/lib/nav/types'
import { SideNavCollapse } from './SideNavCollapse'

/**
 * Section side-navigation shown on secondary/tertiary pages (see resolveSideNav).
 * Lists every secondary of the active primary as a bold header, with its
 * tertiary items as lighter, indented links. The active branch gets a left
 * accent bar. Server-rendered — the current URL is known from the route, so no
 * client-side pathname detection is needed. Mobile collapses via SideNavCollapse.
 */
export function SideNav({
  primary,
  currentUrl,
}: {
  primary: NavItem
  currentUrl: string
}) {
  const secondaries = primary.children ?? []

  const tree = (
    <ul className="space-y-3">
      {secondaries.map((secondary) => {
        const sectionActive = nodeContainsUrl(secondary, currentUrl)
        const isCurrent = currentUrl === secondary.url
        const tertiaries = secondary.children ?? []
        return (
          <li key={secondary.url}>
            <Link
              href={secondary.url}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'block border-l-2 pl-3 py-1 text-sm font-heading font-semibold uppercase tracking-wide transition-colors',
                sectionActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground hover:text-primary'
              )}
            >
              {secondary.label}
            </Link>
            {tertiaries.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {tertiaries.map((tertiary) => {
                  const tertiaryCurrent = currentUrl === tertiary.url
                  return (
                    <li key={tertiary.url}>
                      <Link
                        href={tertiary.url}
                        aria-current={tertiaryCurrent ? 'page' : undefined}
                        className={cn(
                          'block border-l-2 pl-6 py-1 text-sm font-body transition-colors',
                          tertiaryCurrent
                            ? 'border-primary text-primary font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {tertiary.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )

  return (
    <nav aria-label={`${primary.label} section`}>
      <div className="hidden md:block md:sticky md:top-20">{tree}</div>
      <div className="md:hidden">
        <SideNavCollapse label="In this section">{tree}</SideNavCollapse>
      </div>
    </nav>
  )
}
