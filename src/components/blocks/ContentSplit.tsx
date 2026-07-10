import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Image } from '@/components/ui/skeleton-image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import type { ContentSplitProps } from '@/lib/assembly/extract-block-props'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'

export type { ContentSplitProps }

export function ContentSplit({ variant, heading, body, image, image_alt, cta }: ContentSplitProps) {
  const imgSrc = resolveImageSrc(image)
  return (
    <Section dataBlock="content-split">
      <div
        className={cn(
          'grid gap-10 md:gap-16 md:grid-cols-2 items-center',
          variant === 'image-left' && 'md:[&>*:first-child]:order-2'
        )}
      >
        <div>
          <h2
            className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
          >
            {heading}
          </h2>
          <div className="prose prose-neutral mt-4 max-w-none text-foreground/85 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{body}</ReactMarkdown>
          </div>
          {cta && (
            <div className="mt-6">
              <Button asChild variant="link" className="px-0">
                <Link href={cta.url}>{cta.label} &rarr;</Link>
              </Button>
            </div>
          )}
        </div>
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={image_alt}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
              Image: {image_alt || '(missing)'}
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}
