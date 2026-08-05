import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { FramedMedia } from '@/components/ui/framed-media'
import type { HeroSplitProps } from '@/lib/assembly/extract-block-props'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'

export type { HeroSplitProps }

/**
 * Render a headline, promoting a single `*word*` span to the italic-serif
 * accent role in the action colour (the Ink & Clay signature). Falls back to
 * plain text when no marker is present.
 */
function renderHeadline(text: string): ReactNode {
  const m = text.match(/^([\s\S]*?)\*([^*]+)\*([\s\S]*)$/)
  if (!m) return text
  const [, before, accent, after] = m
  return (
    <>
      {before}
      <span className="font-accent" style={{ color: 'var(--color-action)' }}>
        {accent}
      </span>
      {after}
    </>
  )
}

export function HeroSplit({
  variant,
  headline,
  subheadline,
  cta_primary,
  cta_secondary,
  image,
  image_alt,
}: HeroSplitProps) {
  const imageFirst = variant === 'image-left'
  const imgSrc = resolveImageSrc(image)

  const textColumn = (
    <div className="flex flex-col justify-center gap-6">
      <h1 className="t-h1 text-foreground">{renderHeadline(headline)}</h1>
      <p className="t-body-lg max-w-prose text-foreground/70">
        {subheadline}
      </p>
      {(cta_primary || cta_secondary) && (
        <div className="flex flex-wrap gap-3 pt-2">
          {cta_primary && (
            <Button asChild size="lg" variant="cta">
              <Link href={cta_primary.url}>{cta_primary.label}</Link>
            </Button>
          )}
          {cta_secondary && (
            <Button asChild size="lg" variant="outline">
              <Link href={cta_secondary.url}>{cta_secondary.label}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )

  const imageColumn = imgSrc ? (
    <FramedMedia
      src={imgSrc}
      alt={image_alt}
      ratio="4/5"
      grade="duotone"
      priority
      sizes="(max-width: 768px) 100vw, 45vw"
    />
  ) : (
    <div className="relative aspect-[4/5] u-frame bg-muted/40">
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground t-small">
        Image
      </div>
    </div>
  )

  return (
    <Section as="header" bg="surface" dataBlock="hero-split">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center min-h-[480px]">
        {imageFirst ? (
          <>
            {imageColumn}
            {textColumn}
          </>
        ) : (
          <>
            {textColumn}
            {imageColumn}
          </>
        )}
      </div>
    </Section>
  )
}
