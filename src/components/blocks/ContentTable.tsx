import { Section } from './Section'
import type { ContentTableProps } from '@/lib/assembly/extract-block-props'

export type { ContentTableProps }

export function ContentTable({ heading, intro, headers, rows, caption }: ContentTableProps) {
  // Nothing parsed (and no intro to show): render nothing rather than an
  // empty heading shell.
  if (!rows?.length && !intro?.trim()) return null
  return (
    <Section dataBlock="content-table">
      {heading && (
        <header className="max-w-2xl mb-8">
          <h2
            className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
          >
            {heading}
          </h2>
          {intro && (
            <p className="mt-3 text-foreground/70 leading-relaxed">{intro}</p>
          )}
        </header>
      )}
      {!heading && intro && (
        <p className="mb-8 text-foreground/70 leading-relaxed">{intro}</p>
      )}

      {/* Horizontal scroll wrapper for mobile */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm border-collapse">
          {caption && (
            <caption className="caption-bottom mt-3 text-xs text-muted-foreground text-center">
              {caption}
            </caption>
          )}
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-heading font-semibold whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={ri % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-4 py-3 border-t border-border text-foreground/85"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
