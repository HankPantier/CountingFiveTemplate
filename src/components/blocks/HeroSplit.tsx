import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import type { HeroSplitProps } from '@/lib/assembly/extract-block-props'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'

export type { HeroSplitProps }

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
      <h1
        className="font-heading text-4xl md:text-5xl font-bold leading-tight text-foreground"
      >
        {headline}
      </h1>
      <p className="text-lg text-foreground/75 leading-relaxed max-w-prose">
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

  const imageColumn = (
    <div className="relative w-full aspect-[4/5] md:aspect-auto md:h-full min-h-[320px] rounded-lg overflow-hidden">
      {imgSrc ? (
        <Image
          src={imgSrc}
          alt={image_alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        // Placeholder when no image is provided
        <div className="absolute inset-0 bg-muted/40 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Image</span>
        </div>
      )}
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
