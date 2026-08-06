'use client'

import { useSyncExternalStore } from 'react'
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import { ConsentBanner } from './ConsentBanner'

type Consent = 'accepted' | 'declined' | 'unset'

// Tiny external store over the consent cookie. useSyncExternalStore gives us
// the hydration-safe "server renders the pre-read state, client re-renders
// with the real cookie after mount" behavior without setState-in-effect.
let listeners: ReadonlyArray<() => void> = []

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

/** Called by the banner after it writes a new consent cookie. */
function emitConsentChange(): void {
  for (const l of listeners) l()
}

function readConsentCookie(): Consent {
  const m = document.cookie.match(/(?:^|; )analytics-consent=([^;]*)/)
  if (m?.[1] === 'accepted') return 'accepted'
  if (m?.[1] === 'declined') return 'declined'
  return 'unset'
}

// Server render + hydration: the browser cookie isn't readable yet.
function getServerSnapshot(): Consent | null {
  return null
}

/**
 * Analytics — orchestrates analytics scripts + the consent banner.
 *
 * Reads the analytics IDs from env (NEXT_PUBLIC_GA4_ID, NEXT_PUBLIC_GTM_ID)
 * and the visitor's consent state from the `analytics-consent` cookie — read
 * CLIENT-SIDE via document.cookie, deliberately NOT via next/headers
 * cookies() in a server component:
 *
 * Server-side cookies() in the root layout is the third leg of an upstream
 * Next bug (vercel/next.js#86251, unfixed in stable 16.x as of 2026-06):
 * cacheComponents + notFound() for an unlisted dynamic param + a
 * Suspense-wrapped cookies() read in the root layout escalates every
 * unknown-URL 404 into a 500. Keeping the layout free of request APIs also
 * makes every page fully prerenderable — no per-request island at all.
 *
 * SSR/flash behavior: until the client-side cookie read runs (state null),
 * the banner is rendered HIDDEN (inline display:none). This keeps its markup
 * in the plain SSR HTML — which scripts/export-design-brief.ts captures with
 * a regex and cannot execute JS for — while consented visitors never see a
 * flash. After the read: 'unset' ALWAYS reveals it (every undecided visitor
 * sees the banner even with no analytics configured — it's the right-to-consent
 * prompt and the reopen target for the footer "Cookie preferences" button),
 * 'accepted' swaps in GA/GTM (or nothing when no ID is set), 'declined' renders
 * nothing.
 *
 * When both GA4 and GTM IDs are set, GTM wins (it can load GA4 itself, so
 * loading both is double-counting).
 */
export function Analytics() {
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID ?? ''
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID ?? ''

  // null = before the client-side cookie read (SSR + first paint).
  const consent = useSyncExternalStore<Consent | null>(
    subscribe,
    readConsentCookie,
    getServerSnapshot
  )

  if (consent === 'accepted') {
    if (gtmId) return <GoogleTagManager gtmId={gtmId} />
    if (ga4Id) return <GoogleAnalytics gaId={ga4Id} />
    return null
  }
  if (consent === 'declined') return null

  // Pre-read (null) → hidden but present in SSR markup. 'unset' → always
  // visible: shown to every undecided visitor regardless of analytics config.
  // Accept still only loads GA/GTM when an ID is set (the accepted branch
  // above returns null otherwise).
  const reveal = consent === 'unset'
  return <ConsentBanner hidden={!reveal} onDecision={emitConsentChange} />
}
