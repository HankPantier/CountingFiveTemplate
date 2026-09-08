import { Section } from './Section'
import { InlineProse } from './InlineProse'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_LINK_COMPONENTS } from '@/lib/markdown-components'
import { cn } from '@/lib/utils'
import type { ProcessStepsProps } from '@/lib/assembly/extract-block-props'

export type { ProcessStepsProps }

export function ProcessSteps({ variant, heading, intro, steps, cta }: ProcessStepsProps) {
  if (variant === 'horizontal') {
    return (
      <Section dataBlock="process-steps">
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

        {/* Connector line sits behind the step bubbles */}
        <div className="relative mt-12">
          <div
            className="hidden md:block absolute top-6 left-0 right-0 h-px"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary,theme(colors.blue.700)) 20%, transparent)' }}
            aria-hidden="true"
          />
          <ol
            role="list"
            className={cn(
              'grid gap-8',
              steps.length === 3 && 'md:grid-cols-3',
              steps.length === 4 && 'md:grid-cols-4',
              steps.length === 5 && 'md:grid-cols-5',
              steps.length > 5 && 'md:grid-cols-3 lg:grid-cols-5',
            )}
          >
            {steps.map(step => (
              <li key={step.number} className="flex flex-col items-center text-center gap-4">
                <div
                  className="u-numeral relative z-10 flex items-center justify-center w-12 h-12 rounded-full text-primary-foreground font-heading font-bold text-lg shrink-0"
                  style={{
                    backgroundColor: 'var(--color-primary, theme(colors.blue.700))',
                  }}
                >
                  {step.number}
                </div>
                <div>
                  <h3
                    className="font-heading font-semibold text-foreground"
                  >
                    {step.title}
                  </h3>
                  {step.description && (
                    <div className="prose prose-sm prose-neutral mt-1 max-w-none text-foreground/70 leading-relaxed prose-p:my-0 prose-a:text-primary prose-a:underline">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{step.description}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {cta && (
          <div className="mt-10 text-center">
            <Button asChild>
              <Link href={cta.url}>{cta.label}</Link>
            </Button>
          </div>
        )}
      </Section>
    )
  }

  // vertical
  return (
    <Section dataBlock="process-steps">
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

      <ol className="mt-10 space-y-6" role="list">
        {steps.map(step => (
          <li key={step.number} className="flex gap-6 items-start">
            <div
              className="u-numeral flex items-center justify-center w-14 h-14 rounded-xl text-primary-foreground font-heading font-bold text-xl shrink-0"
              style={{
                backgroundColor: 'var(--color-primary, theme(colors.blue.700))',
              }}
              aria-hidden="true"
            >
              {step.number}
            </div>
            <div className="pt-1">
              <h3
                className="font-heading text-xl font-semibold text-foreground"
              >
                {step.title}
              </h3>
              {step.description && (
                <div className="prose prose-neutral mt-1 max-w-none text-foreground/70 leading-relaxed prose-p:my-0 prose-a:text-primary prose-a:underline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_LINK_COMPONENTS}>{step.description}</ReactMarkdown>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {cta && (
        <div className="mt-10">
          <Button asChild>
            <Link href={cta.url}>{cta.label}</Link>
          </Button>
        </div>
      )}
    </Section>
  )
}
