import type { ReactNode } from 'react'

export function PageLayout({
  hero,
  children,
  sideNav,
}: {
  hero?: ReactNode
  children: ReactNode
  sideNav?: ReactNode
}) {
  // With a section side-nav, the full-bleed hero stays edge-to-edge and the
  // body content sits in a two-column grid beside the rail. Body blocks manage
  // their own inner max-width, so the grid only constrains the outer track.
  if (sideNav) {
    return (
      <main id="main-content" className="flex-1">
        {hero}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 grid gap-8 lg:gap-12 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <aside>{sideNav}</aside>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="flex-1">
      {hero}
      {children}
    </main>
  )
}
