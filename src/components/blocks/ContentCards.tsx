import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Button } from '@/components/ui/button'
import { FramedMedia } from '@/components/ui/framed-media'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import type { ContentCardsProps } from '@/lib/assembly/extract-block-props'

function toISODate(input: string): string {
  const d = new Date(input)
  return isNaN(d.getTime()) ? input : d.toISOString().split('T')[0]
}

export type { ContentCardsProps }

export function ContentCards({ variant, heading, intro, cards, cta }: ContentCardsProps) {
  const colsClass =
    variant === '2-col'
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <Section dataBlock="content-cards">
      <header className="mx-auto max-w-2xl text-center">
        <h2 className="t-h2 text-foreground">{heading}</h2>
        {intro && (
          <InlineProse text={intro} className="t-body-lg mt-4 text-foreground/70" />
        )}
      </header>

      <div className={cn('mt-12 grid gap-6', colsClass)}>
        {cards.map((card, i) => (
          <article key={i} className="h-full">
            <div className="u-card u-card-interactive flex h-full flex-col overflow-hidden">
              {card.image && (
                <FramedMedia
                  src={resolveImageSrc(card.image)!}
                  alt={card.title}
                  ratio="16/9"
                  grade="duotone"
                  framed={false}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              )}

              <div className="flex flex-1 flex-col p-6">
                {card.date && (
                  <time dateTime={toISODate(card.date)} className="t-kicker mb-3 block">
                    {card.date}
                  </time>
                )}
                <h3 className="t-h4 text-foreground">{card.title}</h3>
                <div className="prose prose-sm prose-neutral t-small mt-2 max-w-none text-foreground/70 prose-p:my-0 prose-a:text-primary prose-a:underline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{card.excerpt}</ReactMarkdown>
                </div>
                {card.url && card.url !== '#' && (
                  <div className="mt-4">
                    <Button asChild variant="link" className="px-0 text-sm h-auto">
                      <Link href={card.url} aria-label={`Read more about ${card.title}`}>Read more &rarr;</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {cta && (
        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href={cta.url}>{cta.label}</Link>
          </Button>
        </div>
      )}
    </Section>
  )
}
