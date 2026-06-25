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
      bg={variant === 'image-bg' ? 'none' : 'primary'}
      className="relative overflow-hidden"
      dataBlock="cta-banner"
    >
      {bgSrc && (
        <>
          <Image
            src={bgSrc}
            alt=""
            fill
            sizes="100vw"
            className="object-cover -z-20"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[color:var(--color-primary-hex)]/85"
          />
        </>
      )}
      <div className={`relative text-center max-w-2xl mx-auto${variant === 'image-bg' ? ' text-white' : ''}`}>
        <h2
          className="font-heading text-3xl md:text-4xl font-bold"
        >
          {heading}
        </h2>
        {body && (
          <div className="prose prose-invert mt-4 max-w-none text-lg opacity-90 leading-relaxed prose-p:my-0 prose-a:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{body}</ReactMarkdown>
          </div>
        )}
        {cta_primary && (
          <div className="mt-8">
            <Button asChild size="lg" variant="cta">
              <Link href={cta_primary.url}>{cta_primary.label}</Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  )
}
