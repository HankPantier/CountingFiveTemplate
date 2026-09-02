import type { ComponentPropsWithoutRef } from 'react'
import { MarkdownImage } from '@/components/ui/markdown-image'

/**
 * Shared component overrides for ReactMarkdown across all body-rendering blocks.
 * Anchors get target=_blank + rel=noopener noreferrer when href is absolute
 * (http/https), plus an sr-only "opens in new tab" hint. Internal links
 * (starting with /) render as normal anchors. Body images render through
 * MarkdownImage, which adds a skeleton placeholder while they load.
 * Tables are wrapped in a .prose-table-wrap scroll container so wide tables
 * scroll horizontally on small screens inside a rounded frame (styled in globals.css).
 */
export const MD_LINK_COMPONENTS = {
  img: MarkdownImage,
  table: ({ children, ...rest }: ComponentPropsWithoutRef<'table'>) => (
    <div className="prose-table-wrap">
      <table {...rest}>{children}</table>
    </div>
  ),
  a: ({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) => {
    const external = href?.startsWith('http://') || href?.startsWith('https://')
    return (
      <a
        {...rest}
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
        {external && <span className="sr-only"> (opens in new tab)</span>}
      </a>
    )
  },
}
