'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Renderer for images inside ReactMarkdown body content. These are unoptimized
 * raw `<img>` with unknown dimensions, so we wrap them in a relative inline-block
 * span with a pulsing skeleton overlay and fade the image in once loaded. Wired
 * into the shared `MD_LINK_COMPONENTS` map so every markdown block gets it.
 */
export function MarkdownImage({ src, alt, className, ...rest }: ComponentPropsWithoutRef<'img'>) {
  const [loaded, setLoaded] = useState(false)

  if (!src) return null

  return (
    <span className="relative inline-block">
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 animate-pulse rounded bg-muted transition-opacity duration-500',
          loaded && 'opacity-0'
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...rest}
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        className={cn('transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', className)}
        ref={(img) => {
          if (img?.complete) setLoaded(true)
        }}
        onLoad={() => setLoaded(true)}
      />
    </span>
  )
}
