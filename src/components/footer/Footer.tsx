import Link from 'next/link'
import Image from 'next/image'
import { Separator } from '@/components/ui/separator'
import { SocialIcon } from './SocialIcon'
import { FooterCookiePrefsLink } from './FooterCookiePrefsLink'
import { Phone, Mail, MapPin } from 'lucide-react'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getNavConfig } from '@/lib/nav/get-nav-config'
import { siteConfig } from '../../../site.config'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'

export async function Footer() {
  // 'use cache' makes the footer's render eligible for prerendering under
  // cacheComponents: true. new Date() below is otherwise treated as
  // per-request data and would force the whole page dynamic.
  'use cache'
  const brand = await getBrandConfig()
  const nav = await getNavConfig()
  const year = new Date().getFullYear()

  return (
    <footer data-component="footer" className="bg-footer text-footer-foreground mt-16">
      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-1 space-y-3">
          <Link href="/" className="inline-flex items-center" aria-label={`${brand.firm.name} home`}>
            {brand.logo.footer ? (
              <Image
                src={resolveImageSrc(brand.logo.footer)!}
                alt={brand.logo.alt}
                width={160}
                height={32}
                className="h-8 w-auto"
              />
            ) : brand.logo.primary ? (
              <Image
                src={resolveImageSrc(brand.logo.primary)!}
                alt={brand.logo.alt}
                width={160}
                height={32}
                className="h-8 w-auto invert opacity-90"
              />
            ) : (
              <span className="font-semibold text-lg">{brand.firm.name}</span>
            )}
          </Link>
          {brand.firm.tagline && (
            <p className="text-sm text-footer-foreground/90">{brand.firm.tagline}</p>
          )}
          {brand.social.length > 0 && (
            <div className="flex gap-3 pt-2">
              {brand.social.map(s => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.platform}>
                  <SocialIcon platform={s.platform} className="h-5 w-5 opacity-80 hover:opacity-100" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Nav columns — flatten the top-level nav items into one column each */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-6">
          {nav.primary.slice(0, 3).map(item => (
            <div key={item.url}>
              <Link href={item.url} className="text-sm font-semibold hover:underline">
                {item.label}
              </Link>
              {item.children?.length ? (
                <ul className="mt-3 space-y-2">
                  {item.children.map(c => (
                    <li key={c.url}>
                      <Link href={c.url} className="text-sm text-footer-foreground/90 hover:text-footer-foreground">
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="space-y-2 text-sm text-footer-foreground/90">
          {brand.contact.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <address className="not-italic leading-relaxed">
                {brand.contact.address.street}<br />
                {brand.contact.address.line2 && (
                  <>{brand.contact.address.line2}<br /></>
                )}
                {brand.contact.address.city}, {brand.contact.address.state} {brand.contact.address.zip}
              </address>
            </div>
          )}
          {brand.contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href={`tel:${brand.contact.phone}`} className="hover:underline">
                {brand.contact.phone}
              </a>
            </div>
          )}
          {brand.contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${brand.contact.email}`} className="hover:underline">
                {brand.contact.email}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Certifications */}
      {brand.certifications.length > 0 && (
        <>
          <Separator className="bg-footer-foreground/10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {brand.certifications.map(c => (
              c.url ? (
                <a key={c.alt} href={c.url} target="_blank" rel="noopener noreferrer">
                  {c.src ? (
                    <Image
                      src={c.src}
                      alt={c.alt}
                      width={96}
                      height={48}
                      className="h-10 w-auto opacity-70 hover:opacity-100"
                    />
                  ) : (
                    <span className="text-xs text-footer-foreground/90">{c.alt}</span>
                  )}
                </a>
              ) : (
                c.src ? (
                  <Image
                    key={c.alt}
                    src={c.src}
                    alt={c.alt}
                    width={96}
                    height={48}
                    className="h-10 w-auto opacity-70"
                  />
                ) : (
                  <span key={c.alt} className="text-xs text-footer-foreground/90">{c.alt}</span>
                )
              )
            ))}
          </div>
        </>
      )}

      {/* Legal bar */}
      <Separator className="bg-footer-foreground/10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-footer-foreground/90">
        <span>© {year} {brand.firm.name}. All rights reserved.</span>
        <ul className="flex gap-4">
          {siteConfig.legalLinks.map(l => (
            <li key={l.url}>
              <Link href={l.url} className="hover:text-footer-foreground">{l.label}</Link>
            </li>
          ))}
          <li>
            <FooterCookiePrefsLink />
          </li>
        </ul>
      </div>
    </footer>
  )
}
