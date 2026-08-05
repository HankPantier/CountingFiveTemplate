import Image from 'next/image'
import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import type { CtaBannerProps } from '@/lib/assembly/extract-block-props'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'

export type { CtaBannerProps }

export function CtaBanner({
  variant,
  heading,
  body,
  background_asset,
  cta_primary,
}: CtaBannerProps) {
  const bgSrc = variant === 'image-bg' ? resolveImageSrc(background_asset) : undefined

  return (
    <Section
      as="section"
      fullBleed
      bg="primary"
      spacing="spacious"
      className="relative overflow-hidden"
      dataBlock="cta-banner"
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
          {/* Directional brand scrim (primary → deep) — mirrors Hero's refined
              wash so the light copy holds AA contrast while reading on-brand. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                'linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 62%, #000) 0%, color-mix(in srgb, var(--color-near-black) 74%, transparent) 100%)',
            }}
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
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="md:max-w-2xl">
          <h2 className="t-h1 text-primary-foreground">{heading}</h2>
          {body && (
            <div className="prose prose-invert t-body-lg mt-4 max-w-none text-primary-foreground/80 prose-p:my-0 prose-a:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{body}</ReactMarkdown>
            </div>
          )}
        </div>
        {cta_primary && (
          <div className="shrink-0">
            <Button asChild size="lg" variant="cta">
              <Link href={cta_primary.url}>{cta_primary.label}</Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  )
}
