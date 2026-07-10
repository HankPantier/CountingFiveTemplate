'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

const subscribe = () => () => {}

/**
 * Returns false during SSR and hydration, then true once mounted on the client.
 * Uses useSyncExternalStore rather than a setState-in-effect flag so the
 * hydration guard doesn't trigger a cascading render.
 */
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

/**
 * Sun/moon button that flips light↔dark. Reads `resolvedTheme` so it reflects
 * the OS setting on first visit (defaultTheme="system"), then persists the
 * explicit choice via next-themes. A mounted guard avoids a hydration mismatch,
 * since the server can't know which theme will resolve on the client.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const mounted = useMounted()
  const { resolvedTheme, setTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  const base = cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground',
    'transition-colors hover:bg-accent hover:text-accent-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
    className
  )

  // Placeholder keeps layout stable and prevents an icon flash pre-hydration.
  if (!mounted) {
    return <span className={base} aria-hidden="true" />
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={base}
      aria-label={label}
      title={label}
    >
      <span className="relative h-5 w-5">
        <Sun
          className={cn(
            'absolute inset-0 h-5 w-5 transition-all',
            isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
          )}
        />
        <Moon
          className={cn(
            'absolute inset-0 h-5 w-5 transition-all',
            isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'
          )}
        />
      </span>
    </button>
  )
}
