/**
 * Presentation metadata for the four long-form content types the onboarding
 * pipeline produces. Mirrors the value set in the onboarding repo's
 * lib/content/content-types.ts. Kept template-side so the resources browser can
 * label + badge posts by type without depending on the onboarding app.
 */

export type PostContentType = 'blog' | 'article' | 'thought-leadership' | 'case-study'

export const DEFAULT_POST_CONTENT_TYPE: PostContentType = 'blog'

export type ContentTypeMeta = {
  value: PostContentType
  /** Human label for chips + badges. */
  label: string
  /** Badge classes (brand tokens) — distinct, low-tint fill per type. */
  badgeClass: string
}

export const CONTENT_TYPE_META: Record<PostContentType, ContentTypeMeta> = {
  blog: {
    value: 'blog',
    label: 'Blog',
    badgeClass: 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]',
  },
  article: {
    value: 'article',
    label: 'Article',
    badgeClass: 'bg-[color:var(--color-action)]/10 text-[color:var(--color-action)]',
  },
  'thought-leadership': {
    value: 'thought-leadership',
    label: 'Thought leadership',
    badgeClass: 'bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]',
  },
  'case-study': {
    value: 'case-study',
    label: 'Case study',
    badgeClass: 'bg-[color:var(--color-action)]/15 text-[color:var(--color-action)]',
  },
}

/** Presentation order for filter chips. */
export const CONTENT_TYPE_ORDER: PostContentType[] = [
  'blog',
  'article',
  'thought-leadership',
  'case-study',
]

export function isPostContentType(value: unknown): value is PostContentType {
  return typeof value === 'string' && value in CONTENT_TYPE_META
}

/** Coerce any stored/incoming value to a known type, defaulting to blog. */
export function asPostContentType(value: unknown): PostContentType {
  return isPostContentType(value) ? value : DEFAULT_POST_CONTENT_TYPE
}

export function contentTypeLabel(value: unknown): string {
  return CONTENT_TYPE_META[asPostContentType(value)].label
}
