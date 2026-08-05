import { Section } from './Section'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { PageHeaderProps } from '@/lib/assembly/extract-block-props'

export type { PageHeaderProps }

/**
 * Promote a single `*word*` span in the headline to the italic-serif accent
 * role in the action colour (the Ink & Clay signature). Plain text otherwise.
 */
function renderHeadline(text: string): ReactNode {
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

export function PageHeader({ headline, subheadline, breadcrumb }: PageHeaderProps) {
  // Kicker label: the breadcrumb's parent crumb if present, else a static rule.
  const kicker =
    breadcrumb && breadcrumb.length > 1
      ? breadcrumb[breadcrumb.length - 2].label
      : '—'

  return (
    <Section as="header" fullBleed bg="primary" spacing="spacious" dataBlock="page-header">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 t-small text-primary-foreground/60">
            {breadcrumb.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                {i < breadcrumb.length - 1 ? (
                  <Link
                    href={crumb.url}
                    className="hover:text-primary-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-primary-foreground/90">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="t-kicker mb-4">{kicker}</div>

      <h1 className="t-display max-w-[20ch] text-primary-foreground">
        {renderHeadline(headline)}
      </h1>

      <div
        aria-hidden="true"
        className="mt-6 h-0.5 w-10"
        style={{ background: 'var(--color-action)' }}
      />

      {subheadline && (
        <p className="mt-6 t-body-lg max-w-2xl text-primary-foreground/80">{subheadline}</p>
      )}
    </Section>
  )
}
