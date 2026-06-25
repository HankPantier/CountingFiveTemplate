'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Crossfading background images for the `slider` hero variant. Pure
 * opacity transitions over stacked <Image>s — no carousel library. Honors
 * prefers-reduced-motion (stays on the first slide) and degrades to a single
 * static image when given fewer than two sources. The first slide is
 * `priority` so the LCP image still preloads.
 */
export function HeroSlides({ sources, alt }: { sources: string[]; alt: string }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (sources.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(
      () => setActive((a) => (a + 1) % sources.length),
      6000
    )
    return () => clearInterval(id)
  }, [sources.length])

  return (
    <div className="absolute inset-0 -z-20" aria-hidden="true">
      {sources.map((src, i) => (
        <Image
          key={src + i}
          src={src}
          alt={i === 0 ? alt : ''}
          fill
          priority={i === 0}
          sizes="100vw"
          className={cn(
            'object-cover transition-opacity duration-1000 ease-in-out',
            i === active ? 'opacity-100' : 'opacity-0'
          )}
        />
      ))}
    </div>
  )
}
