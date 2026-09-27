import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Content lookups for specs that must run on ANY site's content (template and
 * client repos alike), instead of assuming the template's demo pages.
 */
const PAGES_DIR = path.resolve(__dirname, '..', 'content', 'pages')

/** content/pages/<name>.md → its URL (home → /, a--b → /a/b). */
export function pageUrl(name: string): string {
  return name === 'home' ? '/' : '/' + name.replace(/--/g, '/')
}

/**
 * URL of the page that carries the contact form (`<!-- block: form … -->`), or
 * null when the site has none. Home first (the template demo carries it
 * there), then the contact page, then any other page in name order.
 */
export function contactFormPageUrl(): string | null {
  if (!existsSync(PAGES_DIR)) return null
  const names = readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  for (const name of names) {
    const md = readFileSync(path.join(PAGES_DIR, `${name}.md`), 'utf-8')
    if (/<!--\s*block:\s*form\b/.test(md)) return pageUrl(name)
  }
  return null
}

function rank(name: string): number {
  if (name === 'home') return 0
  if (name === 'contact' || name === 'contact-us') return 1
  return 2
}
