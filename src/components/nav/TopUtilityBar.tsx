'use client'

import { Phone, UserRound } from 'lucide-react'
import { useClientCenter } from '@/components/client-center/ClientCenterProvider'

// A slim, dark utility bar above the main nav — a distinct surface (footer
// tokens: dark in both light and dark mode) that draws the eye to the two
// highest-intent actions, Client Center and the phone number, without crowding
// the primary navigation. Scrolls away with the page; the NavBar below stays
// sticky. Hidden entirely when there's neither a portal nor a phone number.
export function TopUtilityBar({ phone }: { phone?: string }) {
  const clientCenter = useClientCenter()
  const tel = phone?.replace(/[^\d+]/g, '')
  if (!clientCenter.enabled && !phone) return null

  return (
    <div className="w-full bg-footer text-footer-foreground">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-end gap-6 px-4 text-sm sm:px-6 lg:px-8">
        {clientCenter.enabled && (
          <button
            type="button"
            onClick={clientCenter.openModal}
            className="inline-flex items-center gap-2 font-medium transition-opacity hover:opacity-80"
          >
            <UserRound className="h-4 w-4" aria-hidden />
            {clientCenter.label}
          </button>
        )}
        {phone && (
          <a
            href={`tel:${tel}`}
            className="inline-flex items-center gap-2 font-medium transition-opacity hover:opacity-80"
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span>{phone}</span>
          </a>
        )}
      </div>
    </div>
  )
}
