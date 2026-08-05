import { Section } from './Section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import type { IntroTextProps } from '@/lib/assembly/extract-block-props'

export type { IntroTextProps }

/**
 * Promote a single `*word*` span in the heading to the italic-serif accent
 * role in the action colour (the Ink & Clay signature). Plain text otherwise.
 */
function renderHeading(text: string): ReactNode {
  const m = text.match(/^([\s\S]*?)\*([^*]+)\*([\s\S]*)$/)
  if (!m) return text
  const [, before, accent, after] = m
  return (
    <>
      {before}
      <span className="font-accent" style={{ color: 'var(--color-action)' }}>
        {accent}
      </span>
      {after}
    </>
  )
}

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
          <h2 className={cn(isCentered ? 't-display' : 't-h2', 'text-foreground')}>
            {renderHeading(heading)}
          </h2>
        )}
        <div className="prose prose-neutral mt-6 max-w-none t-body-lg text-foreground/70">
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
