import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Image } from '@/components/ui/skeleton-image'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistSectionProps } from '@/lib/assembly/extract-block-props'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'

export type { ChecklistSectionProps }

export function ChecklistSection({
  variant,
  heading,
  intro,
  items,
  image,
  image_alt,
  cta,
}: ChecklistSectionProps) {
  // 2-column layout when 5+ items in standalone mode
  const useDoubleCol = variant === 'standalone' && items.length >= 5
  const imgSrc = resolveImageSrc(image)

  const checklist = (
    <div>
      <h2
        className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {heading}
      </h2>
      {intro && (
        <InlineProse text={intro} className="mt-3 text-foreground/70 leading-relaxed" />
      )}
      <ul
        className={cn(
          'mt-6 space-y-3',
          useDoubleCol && 'sm:grid sm:grid-cols-2 sm:gap-x-8 sm:space-y-0 sm:gap-y-3'
        )}
      >
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: 'var(--color-action, theme(colors.cyan.500))' }}
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <InlineProse text={item} className="text-foreground/85 leading-snug" />
          </li>
        ))}
      </ul>
      {cta && (
        <div className="mt-8">
          <Button asChild>
            <Link href={cta.url}>{cta.label}</Link>
          </Button>
        </div>
      )}
    </div>
  )

  if (variant.startsWith('with-image')) {
    return (
      <Section dataBlock="checklist-section">
        <div
          className={cn(
            'grid gap-10 md:gap-16 md:grid-cols-2 items-center',
            variant === 'with-image-left' && 'md:[&>*:first-child]:order-2'
          )}
        >
          {checklist}
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={image_alt ?? heading}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                Image: {image_alt ?? '(missing)'}
              </div>
            )}
          </div>
        </div>
      </Section>
    )
  }

  // standalone
  return (
    <Section dataBlock="checklist-section">
      {checklist}
    </Section>
  )
}
