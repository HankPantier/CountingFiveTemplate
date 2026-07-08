'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * Client wrapper around next-themes. Drives light/dark via a `.dark` class on
 * <html> (see scripts/generate-theme.ts). Defaults to the visitor's OS setting
 * and remembers an explicit choice in localStorage. `disableTransitionOnChange`
 * suppresses the NavBar's `transition-colors` flash while the palette swaps.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
