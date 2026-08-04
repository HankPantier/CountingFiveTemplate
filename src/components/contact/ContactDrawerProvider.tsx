'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ContactDrawer, type ContactDrawerConfig } from './ContactDrawer'
import { ContactFab } from './ContactFab'
import type { ContactContext } from '@/lib/forms/types'

type DrawerView = 'call' | 'message'

type ContactDrawerContextValue = {
  open: boolean
  context: ContactContext | null
  openDrawer: (view?: DrawerView, context?: ContactContext | null) => void
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
  // Optional recap (e.g. pricing-calculator selections) shown above the form
  // and attached to the email. Cleared when the drawer closes.
  const [context, setContext] = useState<ContactContext | null>(null)

  const openDrawer = useCallback((next: DrawerView = 'message', ctx: ContactContext | null = null) => {
    setView(next)
    setContext(ctx)
    setOpen(true)
  }, [])
  const closeDrawer = useCallback(() => setOpen(false), [])

  // Drop the recap once the drawer has fully closed so a later plain open
  // (nav/footer) never resurfaces a stale estimate.
  const handleOpenChange = useCallback((o: boolean) => {
    setOpen(o)
    if (!o) setContext(null)
  }, [])

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

  const value = useMemo(
    () => ({ open, context, openDrawer, closeDrawer }),
    [open, context, openDrawer, closeDrawer]
  )

  return (
    <ContactDrawerContext.Provider value={value}>
      {children}
      <ContactFab onOpen={() => openDrawer('message')} />
      <ContactDrawer
        open={open}
        view={view}
        context={context}
        onViewChange={setView}
        onOpenChange={handleOpenChange}
        config={config}
      />
    </ContactDrawerContext.Provider>
  )
}
