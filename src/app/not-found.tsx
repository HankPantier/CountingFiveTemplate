import Link from 'next/link'
import { Section } from '@/components/blocks/Section'
import { Button } from '@/components/ui/button'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { getNavConfig } from '@/lib/nav/get-nav-config'

export const metadata = {
  title: 'Page not found',
  description: 'The page you were looking for could not be found.',
}

/**
 * Branded 404. Layout's `<NavBar>` + `<Footer>` already wrap this, so the page
 * just needs a friendly body — title, brief copy, link home, and the firm's
 * primary nav rendered as a "where to go next" list (saves the visitor from
 * scrolling back up to the menu).
 */
export default async function NotFound() {
  const [brand, nav] = await Promise.all([getBrandConfig(), getNavConfig()])

  return (
    <Section as="div" dataBlock="not-found" className="max-w-2xl mx-auto text-center">
      <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="mt-3 font-heading text-4xl md:text-5xl font-semibold text-foreground">
        We can&rsquo;t find that page
      </h1>
      <p className="mt-4 text-foreground/75 leading-relaxed">
        The link may be out of date, or the page might have moved. Here are a few
        places you might be looking for:
      </p>

      <ul className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
        <li>
          <Link
            href="/"
            className="block rounded-md border border-border bg-card px-4 py-3 text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Home
          </Link>
        </li>
        {nav.primary.slice(0, 5).map((item) => (
          <li key={item.url}>
            <Link
              href={item.url}
              className="block rounded-md border border-border bg-card px-4 py-3 text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <Button asChild size="lg">
          <Link href="/">Back to {brand.firm.name}</Link>
        </Button>
      </div>
    </Section>
  )
}
