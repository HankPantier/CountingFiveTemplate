import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Section } from '@/components/blocks/Section'
import { Card, CardContent } from '@/components/ui/card'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { listPostsMeta } from '@/lib/content/get-post'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import { siteConfig } from '../../../site.config'

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandConfig()
  const title = `Resources | ${brand.firm.name}`
  const description = `Tax, advisory, and accounting resources from ${brand.firm.name}.`
  const canonical = `${siteConfig.siteUrl.replace(/\/$/, '')}/resources`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', images: [{ url: '/api/og', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/api/og'] },
  }
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default async function ResourcesIndex() {
  const posts = await listPostsMeta()

  return (
    <>
      <Section dataBlock="page-header" className="text-center">
        <h1 className="font-heading text-4xl md:text-5xl font-semibold text-foreground">Resources</h1>
        <p className="mt-3 max-w-2xl mx-auto text-foreground/70 leading-relaxed">
          Practical advice and seasonal updates from our team.
        </p>
      </Section>

      <Section>
        {posts.length === 0 ? (
          <p className="text-center text-foreground/60">
            No posts published yet — check back soon.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug}>
                <Card className="h-full flex flex-col overflow-hidden">
                  {p.frontmatter.image && (
                    <div className="relative w-full aspect-video bg-muted">
                      <Image
                        src={resolveImageSrc(p.frontmatter.image)!}
                        alt={p.frontmatter.image_alt ?? p.frontmatter.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <CardContent className="flex-1 pt-5 pb-5">
                    {(p.frontmatter.date || p.frontmatter.author) && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {p.frontmatter.date && (
                          <time dateTime={p.frontmatter.date}>{formatDate(p.frontmatter.date)}</time>
                        )}
                        {p.frontmatter.date && p.frontmatter.author && ' · '}
                        {p.frontmatter.author && <span>{p.frontmatter.author}</span>}
                      </p>
                    )}
                    <h2 className="font-heading text-lg font-semibold leading-snug">
                      <Link
                        href={`/resources/${p.slug}`}
                        className="hover:text-primary focus-visible:outline-none focus-visible:underline"
                      >
                        {p.frontmatter.title}
                      </Link>
                    </h2>
                    {p.frontmatter.excerpt && (
                      <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                        {p.frontmatter.excerpt}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}
