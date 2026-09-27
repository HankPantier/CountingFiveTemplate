import { getNavConfig } from './get-nav-config'
import { siteContactUrl } from './nav-tree'
import { listPageSlugs } from '../content/get-page'
import type { HeroCtaSite } from '../assembly/extract-block-props'

/**
 * The hero CTA's site context (nav.cta + the contact destination), read at
 * build time from content/nav.json and the content/pages listing — both
 * 'use cache' loaders, so every page shares one read.
 */
export async function getHeroCtaSite(): Promise<HeroCtaSite> {
  const [nav, slugs] = await Promise.all([getNavConfig(), listPageSlugs()])
  return { navCta: nav.cta, contactUrl: siteContactUrl(nav, slugs) }
}
