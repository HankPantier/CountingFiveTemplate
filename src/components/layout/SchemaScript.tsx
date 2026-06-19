import type { PageManifest } from '@/lib/assembly/parse-page-md'
import type { BrandJson } from '@/lib/brand/types'
import { siteConfig } from '../../../site.config'

// Serialize JSON-LD for embedding in a <script> tag. Escapes `<` to its
// unicode form so AI-generated content (FAQ answers, titles) can never break
// out of the script element with a literal `</script>`. Output is still valid
// JSON/JSON-LD.
function jsonLd(schema: Record<string, unknown>): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

function titleize(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// BreadcrumbList derived from the page's URL path. Home → … → current page.
// Returns null on the homepage (no breadcrumb trail to express).
function breadcrumbSchema(manifest: PageManifest, base: string): Record<string, unknown> | null {
  const path = manifest.url.replace(/^\/+|\/+$/g, '')
  if (!path) return null
  const segments = path.split('/')
  const crumbs = [{ name: 'Home', url: `${base}/` }]
  let acc = ''
  segments.forEach((seg, idx) => {
    acc += `/${seg}`
    const isLast = idx === segments.length - 1
    crumbs.push({ name: isLast ? manifest.title : titleize(seg), url: `${base}${acc}` })
  })
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}

// Build the JSON-LD graph for a page from its frontmatter — the single source
// of truth. Pure + exported so it can be unit-tested without rendering.
export function buildPageSchemas(
  manifest: PageManifest,
  brand: BrandJson,
  base: string
): Record<string, unknown>[] {
  const pageSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': manifest.schema_markup || 'WebPage',
    name: manifest.title,
    url: manifest.canonical_url,
    description: manifest.meta_description,
  }

  // The AIO direct answer doubles as the page's abstract so AI overviews have a
  // concise, citable summary in structured data (it also renders on-page).
  if (manifest.answer_block) pageSchema['abstract'] = manifest.answer_block

  if (manifest.schema_markup === 'LocalBusiness' && brand.contact.address) {
    pageSchema['address'] = {
      '@type': 'PostalAddress',
      streetAddress: brand.contact.address.street,
      addressLocality: brand.contact.address.city,
      addressRegion: brand.contact.address.state,
      postalCode: brand.contact.address.zip,
    }
    if (brand.contact.phone) pageSchema['telephone'] = brand.contact.phone
    if (brand.contact.email) pageSchema['email'] = brand.contact.email
  }

  const schemas: Record<string, unknown>[] = [pageSchema]

  if (manifest.faq_block?.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: manifest.faq_block.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    })
  }

  const crumbs = breadcrumbSchema(manifest, base)
  if (crumbs) schemas.push(crumbs)

  return schemas
}

export function SchemaScript({ manifest, brand }: { manifest: PageManifest; brand: BrandJson }) {
  const base = siteConfig.siteUrl.replace(/\/$/, '')
  const schemas = buildPageSchemas(manifest, brand, base)

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ))}
    </>
  )
}
