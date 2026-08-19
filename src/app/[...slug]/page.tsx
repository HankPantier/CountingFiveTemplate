import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { listPageSlugs } from '@/lib/content/get-page'
import { pageSlugToSegments } from '@/lib/content/page-slug'
import {
  renderGeneratedPage,
  generatedPageMetadata,
} from '@/components/assembly/GeneratedMarkdownPage'

type Props = {
  params: Promise<{ slug: string[] }>
}

function slugToUrl(slug: string[]): string {
  return '/' + slug.join('/')
}

// Cache Components requires generateStaticParams to return at least one
// entry. Use a placeholder when the content directory only has home.md
// (the fresh-clone state, before any deliverable is unpacked); the page
// handler maps it to a 404 below.
const EMPTY_PLACEHOLDER = '__no_pages__'

export async function generateStaticParams() {
  const slugs = await listPageSlugs()
  // Each slug like "services" or "services--virtual-cfo" — convert to slug[]
  // form. We use double-dash as URL segment separator in filenames, but the
  // Next.js dynamic [...slug] expects an array of single-segment strings.
  // pageSlugToSegments returns null for a malformed filename (empty segment);
  // skip it so one bad content file can't fail the whole build — see its doc.
  const params: { slug: string[] }[] = []
  for (const filename of slugs) {
    const segments = pageSlugToSegments(filename)
    if (!segments) {
      console.warn(
        `[content] Skipping malformed page file "${filename}.md" — it produces an empty route segment and would break the build.`
      )
      continue
    }
    params.push({ slug: segments })
  }
  // Cache Components requires generateStaticParams to return at least one entry
  // (see EMPTY_PLACEHOLDER) — hold to that even if every file was malformed.
  return params.length > 0 ? params : [{ slug: [EMPTY_PLACEHOLDER] }]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug[0] === EMPTY_PLACEHOLDER) return { title: 'Not found' }
  const meta = await generatedPageMetadata(slugToUrl(slug), slug.join('/'))
  return meta ?? { title: 'Not found' }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  if (slug[0] === EMPTY_PLACEHOLDER) notFound()
  // Missing/malformed page → null → clean notFound(). Must NOT be a thrown
  // error: see getPageMarkdown's docstring for why a throw across the
  // 'use cache' boundary turns unknown-URL 404s into 500s.
  const rendered = await renderGeneratedPage(slugToUrl(slug))
  if (!rendered) notFound()
  return rendered
}
