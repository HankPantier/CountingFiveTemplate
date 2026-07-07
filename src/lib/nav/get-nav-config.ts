import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import { siteConfig } from '../../../site.config'
import type { NavItem, NavJson } from './types'

const bareHost = (u: string): string => {
  try {
    return new URL(u).host.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Rewrite an absolute url that points at this site's own host into a
 * root-relative path (`https://www.firm.com/who-we-are` → `/who-we-are`).
 * External urls and already-relative urls are returned untouched. Nav config
 * may carry either form; the rest of the nav layer (isUrlActive, findNavLabel,
 * breadcrumbs, side-nav) compares against the request pathname and therefore
 * requires root-relative urls — see the note in nav-tree.ts.
 */
export function relativizeSameHost(url: string, host: string): string {
  if (!/^https?:\/\//i.test(url)) return url
  try {
    const u = new URL(url)
    if (u.host.replace(/^www\./, '') !== host) return url
    const p = u.pathname.replace(/\/+$/, '')
    return p === '' ? '/' : p
  } catch {
    return url
  }
}

export function normalizeNav(nav: NavJson, host: string): NavJson {
  const norm = (item: NavItem): NavItem => ({
    ...item,
    url: relativizeSameHost(item.url, host),
    ...(item.children ? { children: item.children.map(norm) } : {}),
  })
  return {
    ...nav,
    primary: nav.primary.map(norm),
    ...(nav.cta ? { cta: { ...nav.cta, url: relativizeSameHost(nav.cta.url, host) } } : {}),
  }
}

export async function getNavConfig(): Promise<NavJson> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(process.cwd(), 'content', 'nav.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const nav = JSON.parse(raw) as NavJson
  return normalizeNav(nav, bareHost(siteConfig.siteUrl))
}
