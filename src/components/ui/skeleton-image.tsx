'use client'

import NextImage, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Drop-in replacement for `next/image` that shows a pulsing skeleton while the
 * image loads and fades it out once painted. Designed for `fill` usages inside a
 * `relative` container (every call site is one) — the skeleton is an absolute
 * sibling that fills the same box.
 *
 * The `ref` callback catches images that are already cached/complete before
 * hydration, which never fire `onLoad` again. `next/image` forwards `ref` to the
 * underlying `<img>`. The pulse itself is collapsed for reduced-motion users by
 * the global rule in globals.css.
 */
export function Image({ className, onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 animate-pulse bg-muted transition-opacity duration-500',
          loaded && 'opacity-0'
        )}
      />
      <NextImage
        {...props}
        className={className}
        ref={(img) => {
          if (img?.complete) setLoaded(true)
        }}
        onLoad={(e) => {
          setLoaded(true)
          onLoad?.(e)
        }}
      />
    </>
  )
}
