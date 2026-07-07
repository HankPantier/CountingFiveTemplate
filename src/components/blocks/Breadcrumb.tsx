import Link from 'next/link'
import type { Crumb } from '@/lib/nav/breadcrumbs'

/**
 * Minimal-inline breadcrumb trail rendered below the hero on internal pages.
 * The last crumb is the current page: highlighted and non-clickable. Renders
 * nothing when there is no trail to show (home page / single crumb).
 */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length < 2) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={crumb.url} className="flex items-center gap-x-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-muted-foreground/50">
                  ›
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="font-medium text-primary">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.url}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
