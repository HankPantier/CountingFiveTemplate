import type { PostContentType } from './content-type-meta'
import { asPostContentType, CONTENT_TYPE_ORDER } from './content-type-meta'

/**
 * Lightweight, serializable post shape the resources browser renders and
 * filters over. Built server-side from PostMeta (image src pre-resolved) so the
 * client component stays free of fs/next-image-resolution dependencies.
 */
export type BrowsablePost = {
  slug: string
  title: string
  excerpt: string
  date: string
  author?: string
  imageSrc?: string
  imageAlt?: string
  tags: string[]
  contentType: PostContentType
}

export type SortOrder = 'newest' | 'oldest'

export type PostFilters = {
  /** Free-text query matched against title + excerpt + tags (case-insensitive). */
  search: string
  /** A specific content type, or 'all'. */
  contentType: PostContentType | 'all'
  /** A specific tag (exact, case-insensitive), or null for any. */
  tag: string | null
  sort: SortOrder
}

export const DEFAULT_POST_FILTERS: PostFilters = {
  search: '',
  contentType: 'all',
  tag: null,
  sort: 'newest',
}

function matchesSearch(post: BrowsablePost, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (post.title.toLowerCase().includes(q)) return true
  if (post.excerpt.toLowerCase().includes(q)) return true
  return post.tags.some((t) => t.toLowerCase().includes(q))
}

/** Pure filter + sort. Never mutates the input array. */
export function filterPosts(posts: BrowsablePost[], filters: PostFilters): BrowsablePost[] {
  const tagNeedle = filters.tag?.toLowerCase() ?? null
  const filtered = posts.filter((post) => {
    if (filters.contentType !== 'all' && post.contentType !== filters.contentType) return false
    if (tagNeedle && !post.tags.some((t) => t.toLowerCase() === tagNeedle)) return false
    if (!matchesSearch(post, filters.search)) return false
    return true
  })
  const sorted = [...filtered].sort((a, b) => {
    const cmp = (b.date || '').localeCompare(a.date || '')
    return filters.sort === 'newest' ? cmp : -cmp
  })
  return sorted
}

/**
 * Content types actually present in the post set, in canonical presentation
 * order — so the browser only renders filter chips that would match something.
 */
export function presentContentTypes(posts: BrowsablePost[]): PostContentType[] {
  const present = new Set(posts.map((p) => asPostContentType(p.contentType)))
  return CONTENT_TYPE_ORDER.filter((t) => present.has(t))
}

/** Unique tags across the post set, sorted alphabetically (case-insensitive). */
export function collectTags(posts: BrowsablePost[]): string[] {
  const seen = new Map<string, string>()
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = tag.toLowerCase()
      if (!seen.has(key)) seen.set(key, tag)
    }
  }
  return [...seen.values()].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
}
