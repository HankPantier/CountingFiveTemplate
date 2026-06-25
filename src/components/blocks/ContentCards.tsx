import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
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
      <header className="max-w-2xl">
        <h2
          className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
        >
          {heading}
        </h2>
        {intro && (
          <InlineProse text={intro} className="mt-3 text-foreground/70 leading-relaxed" />
        )}
      </header>

      <div className={cn('mt-10 grid gap-6', colsClass)}>
        {cards.map((card, i) => (
          <article key={i} className="h-full">
            <Card
              className="h-full flex flex-col overflow-hidden shadow-card"
            >
              {/* Image */}
              {card.image && (
                <div className="relative w-full aspect-video overflow-hidden">
                  <Image
                    src={resolveImageSrc(card.image)!}
                    alt={card.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}

              <CardContent className="flex-1 pt-5 pb-3">
                {card.date && (
                  <time dateTime={toISODate(card.date)} className="text-xs text-muted-foreground mb-2 block">
                    {card.date}
                  </time>
                )}
                <h3
                  className="font-heading text-lg font-semibold text-foreground mb-2 leading-snug"
                >
                  {card.title}
                </h3>
                <div className="prose prose-sm prose-neutral max-w-none text-foreground/70 leading-relaxed prose-p:my-0 prose-a:text-primary prose-a:underline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{card.excerpt}</ReactMarkdown>
                </div>
              </CardContent>

              {card.url && card.url !== '#' && (
                <CardFooter className="pt-0 pb-4">
                  <Button asChild variant="link" className="px-0 text-sm h-auto">
                    <Link href={card.url} aria-label={`Read more about ${card.title}`}>Read more &rarr;</Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
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
