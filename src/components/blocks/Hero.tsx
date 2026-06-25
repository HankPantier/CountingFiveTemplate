import Image from 'next/image'
import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import { HeroSlides } from './HeroSlides'

export type HeroProps = {
  variant: 'image' | 'video' | 'slider' | 'image-right' | 'image-left'
  image?: string
  image_alt?: string
  video?: string
  images?: string[]
  headline: string
  subheadline: string
  cta_primary?: { label: string; url: string }
  cta_secondary?: { label: string; url: string }
}

export function Hero({ variant, image, image_alt, video, images, headline, subheadline, cta_primary, cta_secondary }: HeroProps) {
  const bgSrc = resolveImageSrc(image)
  const videoSrc = variant === 'video' ? resolveImageSrc(video) : undefined
  const slideSrcs =
    variant === 'slider'
      ? (images ?? []).map((s) => resolveImageSrc(s)).filter((s): s is string => Boolean(s))
      : []

  // Resolve the background once. Video and slider fall back to the static image
  // when their own source is missing, so a mis-tagged variant never renders an
  // empty (un-scrimmed) hero.
  const hasBackground = Boolean(videoSrc) || slideSrcs.length > 0 || Boolean(bgSrc)

  return (
    <Section as="header" fullBleed bg="primary" className="relative overflow-hidden !py-0" dataBlock="hero">
      {videoSrc ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={bgSrc}
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        >
          <source src={videoSrc} />
        </video>
      ) : slideSrcs.length > 0 ? (
        <HeroSlides sources={slideSrcs} alt={image_alt ?? ''} />
      ) : bgSrc ? (
        <Image
          src={bgSrc}
          alt={image_alt ?? ''}
          fill
          priority
          sizes="100vw"
          className="object-cover -z-20"
        />
      ) : null}
      {hasBackground && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[color:var(--color-near-black)]/45"
        />
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
