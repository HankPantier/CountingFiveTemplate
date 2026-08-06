'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

type ConsentBannerProps = {
  /**
   * Render with inline display:none. Used by <Analytics> for the SSR /
   * pre-cookie-read state so the markup is present in plain SSR HTML (the
   * design-brief script captures it by regex) without flashing at visitors
   * who already decided. Inline style (not a class) so it can't lose a
   * specificity fight with the layout classes below.
   */
  hidden?: boolean
  onDecision: (value: 'accepted' | 'declined') => void
}

/**
 * ConsentBanner — sticky bottom card with Accept / Decline.
 *
 * Outer element is <aside data-component="cookie-consent"> so the
 * design-brief script's chrome-capture regex picks it up the same way
 * it captures navbar + footer. Slots are exposed via data-slot so
 * design-overrides.css can target precisely without inspecting our
 * internals.
 *
 * On Accept/Decline we write the consent cookie and report the decision up
 * to <Analytics>, which swaps this banner for the GA/GTM script (accept) or
 * nothing (decline) — pure client state, no server round-trip needed.
 */
export function ConsentBanner({ hidden = false, onDecision }: ConsentBannerProps) {
  const setConsent = (value: 'accepted' | 'declined') => {
    document.cookie = `analytics-consent=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
    onDecision(value)
  }

  // Auto-accept on scroll: scrolling a full viewport past the hero is treated
  // as implied consent (a common pattern for US audiences). Gated on !hidden so
  // it never fires during SSR / the pre-cookie-read state or after a decision —
  // once a decision is recorded <Analytics> unmounts this banner, and the
  // cleanup below detaches the listener. Passive listener for scroll perf. A
  // fast scroll may call setConsent repeatedly before unmount; that's
  // idempotent (same cookie write). Pages shorter than one viewport can never
  // cross the threshold, so they simply wait for an explicit click.
  useEffect(() => {
    if (hidden) return
    const onScroll = () => {
      if (window.scrollY > window.innerHeight) setConsent('accepted')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden])

  return (
    <aside
      data-component="cookie-consent"
      style={hidden ? { display: 'none' } : undefined}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[calc(100%-2rem)] bg-background border border-border rounded-lg shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
    >
      <p data-slot="message" className="text-sm text-foreground">
        We use cookies to understand how visitors use our site.{' '}
        <Link href="/privacy-policy" className="underline">
          Learn more
        </Link>
        .
      </p>
      <div className="flex gap-2 shrink-0">
        <Button
          data-slot="decline"
          variant="ghost"
          size="sm"
          onClick={() => setConsent('declined')}
        >
          Decline
        </Button>
        <Button
          data-slot="accept"
          size="sm"
          onClick={() => setConsent('accepted')}
        >
          Accept
        </Button>
      </div>
    </aside>
  )
}
