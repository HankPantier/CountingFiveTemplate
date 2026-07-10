import { Section } from './Section'
import { Image } from '@/components/ui/skeleton-image'
import Link from 'next/link'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import type { LogoBarProps } from '@/lib/assembly/extract-block-props'

export type { LogoBarProps }

export function LogoBar({ heading, logos }: LogoBarProps) {
  if (!logos || logos.length === 0) return null

  return (
    <Section fullBleed bg="surface" dataBlock="logo-bar">
      {heading && (
        <h2
          className="text-center text-sm font-heading font-semibold uppercase tracking-widest text-foreground/50 mb-8"
        >
          {heading}
        </h2>
      )}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {logos.map((logo, i) => {
          const logoImage = (
            <div className="relative h-12 w-auto min-w-[80px] max-w-[140px] grayscale hover:grayscale-0 transition-all duration-300 opacity-90 hover:opacity-100">
              {logo.src ? (
                <Image
                  src={resolveImageSrc(logo.src)!}
                  alt={logo.alt}
                  fill
                  className="object-contain"
                  sizes="140px"
                />
              ) : (
                <span className="text-xs text-muted-foreground">{logo.alt}</span>
              )}
            </div>
          )

          if (logo.url) {
            return (
              <Link
                key={i}
                href={logo.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={logo.alt}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {logoImage}
              </Link>
            )
          }
          return <div key={i}>{logoImage}</div>
        })}
      </div>
    </Section>
  )
}
