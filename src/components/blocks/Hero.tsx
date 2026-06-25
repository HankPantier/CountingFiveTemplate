import Image from 'next/image'
import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'

export type HeroProps = {
  variant: 'image' | 'video' | 'slider' | 'image-right' | 'image-left'
  image?: string
  image_alt?: string
  headline: string
  subheadline: string
  cta_primary?: { label: string; url: string }
  cta_secondary?: { label: string; url: string }
}

export function Hero({ image, image_alt, headline, subheadline, cta_primary, cta_secondary }: HeroProps) {
  // For M3, all hero variants render the image variant.
  // Slider/video come in M4.
  const bgSrc = resolveImageSrc(image)

  return (
    <Section as="header" fullBleed bg="primary" className="relative overflow-hidden !py-0" dataBlock="hero">
      {bgSrc && (
        <>
          <Image
            src={bgSrc}
            alt={image_alt ?? ''}
            fill
            priority
            sizes="100vw"
            className="object-cover -z-20"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[color:var(--color-near-black)]/45"
          />
        </>
      )}
      <div className="relative max-w-3xl mx-auto py-20 md:py-32 text-center">
        <h1
          className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
        >
          {headline}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 leading-relaxed">
          {subheadline}
        </p>
        {(cta_primary || cta_secondary) && (
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
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
    </Section>
  )
}
