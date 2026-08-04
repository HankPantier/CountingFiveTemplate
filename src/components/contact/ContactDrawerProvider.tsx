'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ContactDrawer, type ContactDrawerConfig } from './ContactDrawer'
import { ContactFab } from './ContactFab'

type DrawerView = 'call' | 'message'

type ContactDrawerContextValue = {
  open: boolean
  openDrawer: (view?: DrawerView) => void
  closeDrawer: () => void
}

const ContactDrawerContext = createContext<ContactDrawerContextValue | null>(null)

export function useContactDrawer(): ContactDrawerContextValue {
  const ctx = useContext(ContactDrawerContext)
  if (!ctx) throw new Error('useContactDrawer must be used within <ContactDrawerProvider>')
  return ctx
}

// Normalizes a link href/pathname to compare against the contact path. Absolute
// URLs (e.g. https://www.firm.com/contact) and root-relative (/contact) both match.
function hrefMatchesContact(href: string, contactPath: string): boolean {
  try {
    const url = new URL(href, window.location.origin)
    if (url.origin !== window.location.origin) return false
    return url.pathname.replace(/\/$/, '') === contactPath.replace(/\/$/, '')
  } catch {
    return false
  }
}

export function ContactDrawerProvider({
  config,
  contactPath = '/contact',
  children,
}: {
  config: ContactDrawerConfig
  contactPath?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  // Default to the message tab (the low-friction option).
  const [view, setView] = useState<DrawerView>('message')

  const openDrawer = useCallback((next: DrawerView = 'message') => {
    setView(next)
    setOpen(true)
  }, [])
  const closeDrawer = useCallback(() => setOpen(false), [])

  // Delegated interception: any link to the contact path opens the drawer
  // instead of navigating — covers the nav Contact link, header CTA, mobile
  // nav, footer, and every in-content CTA (cta-banner, calculator, etc.)
  // without editing each. Runs in the CAPTURE phase so preventDefault lands
  // before Next's <Link> click handler (which bails on defaultPrevented).
  // Anchors keep their href, so no-JS visitors and crawlers still reach the
  // /contact page. Skips modified clicks, new-tab, and opt-out (data-no-drawer).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download') || anchor.dataset.noDrawer !== undefined) return
      const href = anchor.getAttribute('href')
      if (!href || !hrefMatchesContact(href, contactPath)) return
      e.preventDefault()
      openDrawer('message')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [contactPath, openDrawer])

  const value = useMemo(() => ({ open, openDrawer, closeDrawer }), [open, openDrawer, closeDrawer])

  return (
    <ContactDrawerContext.Provider value={value}>
      {children}
      <ContactFab onOpen={() => openDrawer('message')} />
      <ContactDrawer open={open} view={view} onViewChange={setView} onOpenChange={setOpen} config={config} />
    </ContactDrawerContext.Provider>
  )
}
