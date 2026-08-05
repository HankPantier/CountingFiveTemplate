import { Image } from '@/components/ui/skeleton-image'
import { Section } from './Section'
import { Button } from '@/components/ui/button'
import { FramedMedia } from '@/components/ui/framed-media'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import { HeroSlides } from './HeroSlides'

export type HeroProps = {
  variant: 'image' | 'video' | 'slider' | 'image-right' | 'image-left' | 'statement'
  image?: string
  image_alt?: string
  video?: string
  images?: string[]
  headline: string
  subheadline: string
  /** Optional small-caps kicker above the statement headline. */
  eyebrow?: string
  cta_primary?: { label: string; url: string }
  cta_secondary?: { label: string; url: string }
}

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

export function Hero({
  variant,
  image,
  image_alt,
  video,
  images,
  headline,
  subheadline,
  eyebrow,
  cta_primary,
  cta_secondary,
}: HeroProps) {
  const bgSrc = resolveImageSrc(image)

  // ---- Statement variant: light canvas, editorial type, framed side image ----
  if (variant === 'statement') {
    return (
      <Section as="header" spacing="spacious" dataBlock="hero" className="relative">
        <div className={bgSrc ? 'grid gap-10 lg:gap-14 md:grid-cols-[1.15fr_0.85fr] items-center' : 'max-w-4xl'}>
          <div>
            {eyebrow && <div className="t-kicker mb-5">{eyebrow}</div>}
            <h1 className="t-display max-w-[18ch] text-foreground">{renderHeadline(headline)}</h1>
            {subheadline && (
              <p className="t-body-lg mt-6 max-w-[46ch] text-foreground/70">{subheadline}</p>
            )}
            {(cta_primary || cta_secondary) && (
              <div className="mt-9 flex flex-wrap items-center gap-5">
                {cta_primary && (
                  <Button asChild size="lg" variant="cta">
                    <Link href={cta_primary.url}>{cta_primary.label}</Link>
                  </Button>
                )}
                {cta_secondary && (
                  <Link
                    href={cta_secondary.url}
                    className="font-semibold border-b-2 pb-0.5 transition-opacity hover:opacity-70"
                    style={{ borderColor: 'var(--color-action)' }}
                  >
                    {cta_secondary.label} →
                  </Link>
                )}
              </div>
            )}
          </div>
          {bgSrc && (
            <FramedMedia
              src={bgSrc}
              alt={image_alt ?? ''}
              ratio="4/5"
              grade="duotone"
              priority
              sizes="(max-width: 768px) 100vw, 42vw"
            />
          )}
        </div>
      </Section>
    )
  }

  // ---- Full-bleed media variants (image / video / slider) ----
  const videoSrc = variant === 'video' ? resolveImageSrc(video) : undefined
  const slideSrcs =
    variant === 'slider'
      ? (images ?? []).map((s) => resolveImageSrc(s)).filter((s): s is string => Boolean(s))
      : []
  const hasBackground = Boolean(videoSrc) || slideSrcs.length > 0 || Boolean(bgSrc)

  return (
    <Section as="header" fullBleed spacing="none" bg="primary" className="relative overflow-hidden" dataBlock="hero">
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
        <Image src={bgSrc} alt={image_alt ?? ''} fill priority sizes="100vw" className="object-cover -z-20" />
      ) : null}
      {hasBackground && (
        // Directional brand scrim (primary → deep) instead of a flat black wash —
        // keeps AA contrast for the white headline while reading on-brand.
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 62%, #000) 0%, color-mix(in srgb, var(--color-near-black) 74%, transparent) 100%)',
          }}
        />
      )}
      <div className="relative max-w-3xl mx-auto py-24 md:py-36 text-center">
        {eyebrow && <div className="t-kicker mb-5 justify-center">{eyebrow}</div>}
        <h1 className="t-display">{renderHeadline(headline)}</h1>
        <p className="t-body-lg mt-6 text-primary-foreground/85">{subheadline}</p>
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
