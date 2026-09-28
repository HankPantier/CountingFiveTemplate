import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Card, CardContent } from '@/components/ui/card'
import { Image } from '@/components/ui/skeleton-image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import type { TeamGridProps } from '@/lib/assembly/extract-block-props'
import { layoutSlot } from './layout-slot'

export type { TeamGridProps }

export function TeamGrid({ variant, heading, intro, members }: TeamGridProps) {
  // Nothing parsed (and no intro to show): render nothing rather than an
  // empty heading shell.
  if (!members?.length && !intro?.trim()) return null
  const colsClass =
    variant === '4-col'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : variant === '2-col'
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'
  // 'list' (2026.09.9): default markup + data-layout + slot hooks; the rows come
  // from src/styles/block-layouts.css (shared with the site-wide team preset).
  const layout = variant === 'list' ? 'list' : undefined

  return (
    <Section dataBlock="team-grid" dataLayout={layout}>
      <header className="max-w-2xl mx-auto text-center">
        <h2
          className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
        >
          {heading}
        </h2>
        {intro && (
          <InlineProse text={intro} className="mt-3 text-foreground/70 leading-relaxed" />
        )}
      </header>
      <div className={cn('mt-12 grid gap-8', colsClass)} data-c5-slot={layoutSlot(layout, 'items')}>
        {members.map((member, i) => (
          <article key={i} className="h-full" itemScope itemType="https://schema.org/Person" data-c5-slot={layoutSlot(layout, 'item')}>
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="relative aspect-[4/5] bg-muted shrink-0" data-c5-slot={layoutSlot(layout, 'media')}>
                {member.photo ? (
                  <Image
                    src={resolveImageSrc(member.photo)!}
                    alt={member.photo_alt ?? `Photo of ${member.name}`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                    {member.name}
                  </div>
                )}
              </div>
              <CardContent className="p-5 flex-1" data-c5-slot={layoutSlot(layout, 'body')}>
                <h3
                  className="font-heading font-semibold text-lg text-foreground"
                  itemProp="name"
                >
                  {member.name}
                  {member.credentials && (
                    <span className="font-normal text-foreground/60">, {member.credentials}</span>
                  )}
                </h3>
                {member.title && (
                  <p className="mt-0.5 text-sm text-foreground/60" itemProp="jobTitle">{member.title}</p>
                )}
                {member.bio && (
                  <div className="prose prose-sm prose-neutral mt-3 max-w-none text-foreground/75 leading-relaxed prose-p:my-0 prose-a:text-primary prose-a:underline" itemProp="description">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{member.bio}</ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          </article>
        ))}
      </div>
    </Section>
  )
}
