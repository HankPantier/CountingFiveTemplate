'use client'

import { MessageCircle } from 'lucide-react'

// Persistent floating "Contact" button pinned to the right edge, available on
// every page. Uses brand tokens so it themes per client.
export function ContactFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Contact us"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-action,theme(colors.cyan.500))] px-5 py-3 font-heading text-sm font-semibold text-[color:var(--color-action-foreground,#fff)] shadow-[var(--shadow-lg)] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Contact</span>
    </button>
  )
}
