import Image from 'next/image'
import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import type { CtaBannerProps } from '@/lib/assembly/extract-block-props'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import { layoutSlot } from './layout-slot'

export type { CtaBannerProps }

/** Section classes for the image banner (see the Section call below). */
const IMAGE_SECTION_CLASS =
  'relative overflow-hidden isolate [--color-primary-foreground:var(--color-near-white)]'

/** Scrim over the banner photo: the palette's ink (a deep primary-tinted
 * near-black, lightness 12% whatever the brand — generate-theme.ts; near-black
 * on themes that predate the token), translucent so the photo shows through:
 * ~14% of its light at the top-left where the copy starts, ~30% at the
 * bottom-right. Being palette-independent in lightness, near-white copy holds
 * ≥4.5:1 even over a pure-white photo (e2e/cta-banner-image.spec.ts). */
const SCRIM_INK = 'var(--color-ink, var(--color-near-black))'
const IMAGE_SCRIM =
  `linear-gradient(160deg, color-mix(in srgb, ${SCRIM_INK} 86%, transparent) 0%, ` +
  `color-mix(in srgb, ${SCRIM_INK} 70%, transparent) 100%)`

export function CtaBanner({
  variant,
  align,
  heading,
  body,
  background_asset,
  cta_primary,
}: CtaBannerProps) {
  const bgSrc = variant === 'image-bg' ? resolveImageSrc(background_asset) : undefined
  // `<bg>-centered` (2026.09.9): the same markup + data-layout + slot hooks; the
  // stacked, centred composition comes from src/styles/block-layouts.css
  // (shared with the site-wide ctaBanner preset).
  const layout = align === 'centered' ? `${variant}-centered` : undefined

  return (
    <Section
      as="section"
      fullBleed
      bg="primary"
      spacing="spacious"
      // image-bg: `isolate` gives the section its own stacking context, so the
      // photo (-z-20) and scrim (-z-10) paint ABOVE the section's bg-primary
      // fill instead of behind it (before 2026.09.10 every image banner rendered
      // as flat colour). The text token is pinned to near-white because the
      // scrim is always dark, whatever the brand's primary-foreground is.
      // color-bg keeps its exact pre-2026.09.10 markup (R1).
      className={bgSrc ? IMAGE_SECTION_CLASS : 'relative overflow-hidden'}
      dataBlock="cta-banner"
      dataLayout={layout}
    >
      {bgSrc ? (
        <>
          <Image
            src={bgSrc}
            alt=""
            fill
            sizes="100vw"
            className="object-cover -z-20"
          />
          {/* Primary-tinted dark (ink) scrim, deepest at the top-left where
              the copy starts — see IMAGE_SCRIM. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{ background: IMAGE_SCRIM }}
          />
        </>
      ) : (
        // Subtle brand gradient for the flat colour-bg variant.
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(160deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 80%, black))',
          }}
        />
      )}
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6" data-c5-slot={layoutSlot(layout, 'content')}>
        <div className="md:max-w-2xl" data-c5-slot={layoutSlot(layout, 'copy')}>
          <h2 className="t-h1 text-primary-foreground">{heading}</h2>
          {body && (
            <div className="prose prose-invert t-body-lg mt-4 max-w-none text-primary-foreground/80 prose-p:my-0 prose-a:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{body}</ReactMarkdown>
            </div>
          )}
        </div>
        {cta_primary && (
          <div className="shrink-0" data-c5-slot={layoutSlot(layout, 'actions')}>
            <Button asChild size="lg" variant="cta">
              <Link href={cta_primary.url}>{cta_primary.label}</Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  )
}
