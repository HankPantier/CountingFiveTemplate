import type { Metadata } from 'next'
import './globals.css'
// Fonts come from a GENERATED next/font module (scripts/generate-fonts.ts,
// from design.json typography). The default file loads exactly the fonts this
// layout used to hardcode, so untouched sites render unchanged.
import { fontAliases, fontVariables } from './fonts.generated'
import { NavBar } from '@/components/nav/NavBar'
import { TopUtilityBar } from '@/components/nav/TopUtilityBar'
import { Footer } from '@/components/footer/Footer'
import { Analytics } from '@/components/analytics/Analytics'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ContactDrawerProvider } from '@/components/contact/ContactDrawerProvider'
import { ClientCenterProvider } from '@/components/client-center/ClientCenterProvider'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getNavConfig } from '@/lib/nav/get-nav-config'
import { getClientCenterConfig } from '@/lib/client-center/get-client-center-config'
import { getDesignConfig } from '@/lib/theme/get-theme-vars'
import { capabilitiesMetaContent } from '@/lib/theme/template-marker'
import { styleAxisAttributes } from '@/lib/theme/style-axes'
import { siteConfig } from '../../site.config'

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
    // Design Studio capability handshake (see src/lib/theme/template-marker.ts).
    // Pages don't set `other`, so every page inherits it.
    other: { 'c5-capabilities': capabilitiesMetaContent() },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [brand, nav, clientCenter, design] = await Promise.all([
    getBrandConfig(),
    getNavConfig(),
    getClientCenterConfig(),
    getDesignConfig(),
  ])

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
      className={fontVariables}
      // Opt-in Revaltus-corporate treatments from design.json. Absent/default
      // values ('sans' / 'standard') are inert — the globals.css rules only key
      // off 'serif' / 'mono' — so untouched sites render exactly as before.
      data-headline={design.headlineStyle ?? 'sans'}
      data-eyebrow={design.eyebrowStyle ?? 'standard'}
      // Design Studio style axes (design.json "style"). Only NON-default values
      // emit an attribute, so untouched sites match no style-axes.css rule.
      {...styleAxisAttributes(design.style)}
      style={fontAliases}
      // next-themes sets the theme class on <html> before hydration, so the
      // server/client class attributes intentionally differ on first paint.
      suppressHydrationWarning
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
        <ThemeProvider>
          <ContactDrawerProvider
            config={{
              firmName: brand.firm.name,
              phone: brand.contact.phone,
              email: brand.contact.email,
              booking: siteConfig.booking,
            }}
          >
           <ClientCenterProvider config={clientCenter}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-background focus:text-foreground focus:rounded-md focus:px-4 focus:py-2 focus:shadow-lg focus:outline focus:outline-2 focus:outline-cyan-500"
            >
              Skip to main content
            </a>
            <TopUtilityBar phone={brand.contact.phone} />
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
           </ClientCenterProvider>
          </ContactDrawerProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
