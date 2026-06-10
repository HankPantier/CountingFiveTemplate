import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Public_Sans } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/footer/Footer'
import { Analytics } from '@/components/analytics/Analytics'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getNavConfig } from '@/lib/nav/get-nav-config'
import { siteConfig } from '../../site.config'

// Placeholder fonts — generate-theme.ts will rewrite these per client in a
// future iteration. For now, hardcode Public Sans (matches design.json default).
// Loaded once and aliased to both heading + body CSS variables so theme.css
// (which references --font-{heading,body}-loaded) keeps working without a
// second next/font instance for the same family.
const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-heading-loaded',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandConfig()
  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title: {
      default: brand.firm.name,
      template: `%s | ${brand.firm.name}`,
    },
    description:
      brand.firm.tagline ?? `${brand.firm.name} — accounting & advisory services`,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [brand, nav] = await Promise.all([getBrandConfig(), getNavConfig()])

  // Site-wide Organization JSON-LD. Page-level WebPage / LocalBusiness /
  // FAQPage / BlogPosting are emitted by SchemaScript + the post page; this
  // adds the firm-as-entity record once per request so the same Organization
  // node is available everywhere. Sources are all from brand.json — never raw
  // user input — so the JSON.stringify embed pattern is safe (see also
  // SchemaScript.tsx for the same approach).
  const orgSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.firm.name,
    url: siteConfig.siteUrl,
    description: brand.firm.tagline,
    foundingDate: brand.firm.foundingYear,
    logo: brand.logo.primary
      ? new URL(`/content-assets/${brand.logo.primary}`, siteConfig.siteUrl).toString()
      : undefined,
    sameAs: brand.social.map((s) => s.url).filter(Boolean),
    contactPoint: brand.contact.phone
      ? {
          '@type': 'ContactPoint',
          telephone: brand.contact.phone,
          email: brand.contact.email,
          contactType: 'customer service',
        }
      : undefined,
    address: brand.contact.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: brand.contact.address.street,
          addressLocality: brand.contact.address.city,
          addressRegion: brand.contact.address.state,
          postalCode: brand.contact.address.zip,
        }
      : undefined,
  }

  // WebSite entity, linked to the Organization as publisher. No SearchAction —
  // the template ships no on-site search endpoint, and advertising one Google
  // can't fulfill would be misleading.
  const websiteSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand.firm.name,
    url: siteConfig.siteUrl,
    publisher: { '@type': 'Organization', name: brand.firm.name },
  }

  // Escape `<` so embedded values can never break out of the <script> element.
  const jsonLd = (s: Record<string, unknown>) => JSON.stringify(s).replace(/</g, '\\u003c')

  return (
    <html
      lang="en"
      className={publicSans.variable}
      style={{ '--font-body-loaded': 'var(--font-heading-loaded)' } as CSSProperties}
    >
      <body
        className="min-h-screen flex flex-col antialiased bg-background text-foreground"
        // Surface the firm's contact email as a body data-attribute so the
        // client-side Form component's mailto fallback can read it without
        // needing brand data plumbed through BlockRenderer as a prop. Empty
        // string when no email is configured — the fallback just opens a
        // blank "to:" mailto, which is still slightly better than nothing.
        data-contact-email={brand.contact.email ?? ''}
        data-firm-name={brand.firm.name}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-background focus:text-foreground focus:rounded-md focus:px-4 focus:py-2 focus:shadow-lg focus:outline focus:outline-2 focus:outline-cyan-500"
        >
          Skip to main content
        </a>
        <NavBar brand={brand} nav={nav} />
        {children}
        <Footer />
        {/* <Analytics> is a client component that reads consent from
            document.cookie — deliberately NOT a server cookies() island.
            Keeping the layout free of request APIs makes every page fully
            prerenderable AND avoids vercel/next.js#86251 (cookies() in the
            root layout turns unknown-URL 404s into 500s under
            cacheComponents). See Analytics.tsx for the full rationale. */}
        <Analytics />
      </body>
    </html>
  )
}
