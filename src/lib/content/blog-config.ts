import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Per-client blog/insights section config (content/blog.json). Lets a firm name
 * the section (Resources / Insights / Blog / News) and choose its public path.
 *
 * This module is intentionally PURE — no `next/cache`, no framework imports — so
 * it can be imported from BOTH the app runtime (via the cached `get-blog-config`
 * wrapper) AND `next.config.ts`, which builds the path rewrite/redirect at config
 * load time and cannot safely pull in `'use cache'` code.
 *
 * `/resources` stays the internal canonical route; a custom `path` is remapped
 * to it by a rewrite in next.config. When blog.json is absent (every site today)
 * all fields fall back to the historical Resources defaults, so nothing changes.
 */

/** The canonical, internal blog route. A custom path rewrites to this. */
export const DEFAULT_BLOG_PATH = '/resources'
const DEFAULT_LABEL = 'Resources'
const DEFAULT_INTRO = 'Practical advice and seasonal updates from our team.'

export type BlogConfig = {
  /** Public base path, single clean segment with leading slash (e.g. /insights). */
  path: string
  /** Nav label + short name. */
  label: string
  /** Index-page H1. */
  title: string
  /** Index-page intro paragraph. */
  intro: string
}

/**
 * Coerce a raw path to a single-segment, root-relative path. Anything that isn't
 * a clean `/segment` ([A-Za-z0-9-]) — multi-segment, empty, traversal, etc. —
 * falls back to the canonical default so the rewrite/redirect can never target a
 * malformed or unsafe destination.
 */
export function normalizeBlogPath(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_BLOG_PATH
  const trimmed = raw.trim()
  if (!trimmed) return DEFAULT_BLOG_PATH
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const noTrailing = withSlash.replace(/\/+$/, '')
  if (!/^\/[A-Za-z0-9-]+$/.test(noTrailing)) return DEFAULT_BLOG_PATH
  return noTrailing
}

function cleanString(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  return t.length > 0 ? t : undefined
}

/** Resolve a parsed blog.json object (or anything) into a complete BlogConfig. */
export function resolveBlogConfig(raw: unknown): BlogConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const pathValue = normalizeBlogPath(obj.path)
  const label = cleanString(obj.label) ?? DEFAULT_LABEL
  const title = cleanString(obj.title) ?? label
  const intro = cleanString(obj.intro) ?? DEFAULT_INTRO
  return { path: pathValue, label, title, intro }
}

/**
 * Read content/blog.json from disk and resolve it. Never throws: a missing file
 * or malformed JSON yields the defaults (canonical /resources). Not cached here —
 * the app runtime uses the `getBlogConfig` wrapper, next.config calls this once.
 */
export async function readBlogConfigFile(cwd: string): Promise<BlogConfig> {
  const filePath = path.join(cwd, 'content', 'blog.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return resolveBlogConfig(JSON.parse(raw))
  } catch {
    return resolveBlogConfig({})
  }
}
