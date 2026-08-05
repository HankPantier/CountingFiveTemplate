import { Section } from './Section'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import { FramedMedia } from '@/components/ui/framed-media'
import type { ContentSplitProps } from '@/lib/assembly/extract-block-props'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'

export type { ContentSplitProps }

export function ContentSplit({ variant, heading, body, image, image_alt, cta }: ContentSplitProps) {
  const imgSrc = resolveImageSrc(image)
  return (
    <Section spacing="normal" dataBlock="content-split">
      <div
        className={cn(
          'grid gap-10 md:gap-16 md:grid-cols-2 items-center',
          variant === 'image-left' && 'md:[&>*:first-child]:order-2'
        )}
      >
        <div>
          {/* Ink & Clay accent rule above the heading */}
          <div className="h-0.5 w-10 mb-5" style={{ background: 'var(--color-action)' }} />
          <h2 className="t-h2 text-foreground">{heading}</h2>
          <div className="prose prose-neutral t-body-lg mt-4 max-w-prose text-foreground/85">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{body}</ReactMarkdown>
          </div>
          {cta && (
            <div className="mt-6">
              <Link
                href={cta.url}
                className="font-semibold border-b-2 pb-0.5 transition-opacity hover:opacity-70"
                style={{ borderColor: 'var(--color-action)' }}
              >
                {cta.label} →
              </Link>
            </div>
          )}
        </div>
        {imgSrc ? (
          <FramedMedia
            src={imgSrc}
            alt={image_alt}
            ratio="4/3"
            grade="duotone"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="relative aspect-[4/3] u-frame bg-muted">
            <div className="absolute inset-0 grid place-items-center text-muted-foreground t-small">
              Image: {image_alt || '(missing)'}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
