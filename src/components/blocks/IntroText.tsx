import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import type { IntroTextProps } from '@/lib/assembly/extract-block-props'

export type { IntroTextProps }

export function IntroText({ variant, heading, body, cta }: IntroTextProps) {
  const isCentered = variant !== 'left-aligned'

  return (
    <Section dataBlock="intro-text">
      <div
        className={cn(
          'mx-auto',
          isCentered
            ? 'max-w-2xl text-center'
            : 'max-w-3xl text-left'
        )}
      >
        {heading && (
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
            {heading}
          </h2>
        )}
        <div className="prose prose-neutral mt-4 max-w-none text-foreground/80 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{body}</ReactMarkdown>
        </div>
        {cta && (
          <div className={cn('mt-6', isCentered && 'flex justify-center')}>
            <Button asChild variant="link" className="px-0">
              <Link href={cta.url}>{cta.label} &rarr;</Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  )
}
