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

export type { TeamGridProps }

export function TeamGrid({ variant, heading, intro, members }: TeamGridProps) {
  const colsClass =
    variant === '4-col'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : variant === '2-col'
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <Section dataBlock="team-grid">
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
      <div className={cn('mt-12 grid gap-8', colsClass)}>
        {members.map((member, i) => (
          <article key={i} className="h-full" itemScope itemType="https://schema.org/Person">
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="relative aspect-[4/5] bg-muted shrink-0">
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
              <CardContent className="p-5 flex-1">
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
