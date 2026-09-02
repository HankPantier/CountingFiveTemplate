'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { Image } from '@/components/ui/skeleton-image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CONTENT_TYPE_META, type PostContentType } from '@/lib/content/content-type-meta'
import {
  collectTags,
  filterPosts,
  presentContentTypes,
  type BrowsablePost,
  type PostFilters,
  type SortOrder,
} from '@/lib/content/filter-posts'

// Radix Select forbids an empty-string item value, so the "any tag" option uses
// a sentinel that maps back to null (no tag filter).
const ALL_TAGS = '__all__'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function chipClass(active: boolean): string {
  return cn(
    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    active
      ? 'border-transparent bg-primary text-primary-foreground'
      : 'border-input bg-background text-foreground/70 hover:text-foreground hover:border-foreground/30',
  )
}

export function ResourceBrowser({ posts, basePath }: { posts: BrowsablePost[]; basePath: string }) {
  const [search, setSearch] = useState('')
  const [contentType, setContentType] = useState<PostFilters['contentType']>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOrder>('newest')

  // Defer the search term so typing stays responsive while the (cheap, in-memory)
  // filter recomputes — the debounce the design calls for, without a timer.
  const deferredSearch = useDeferredValue(search)

  const types = useMemo(() => presentContentTypes(posts), [posts])
  const tags = useMemo(() => collectTags(posts), [posts])
  const visible = useMemo(
    () => filterPosts(posts, { search: deferredSearch, contentType, tag, sort }),
    [posts, deferredSearch, contentType, tag, sort],
  )

  // Always surface the content-type filter when there are posts — even an
  // all-one-type set shows "All · <type>", so the control is discoverable and
  // becomes richer as other types are added.
  const showTypeChips = types.length > 0
  const showTagFilter = tags.length > 0

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-xs">
          <label htmlFor="resource-search" className="sr-only">
            Search resources
          </label>
          <Input
            id="resource-search"
            type="search"
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showTagFilter && (
            <div className="w-48">
              <label htmlFor="resource-tag" className="sr-only">
                Filter by tag
              </label>
              <Select
                value={tag ?? ALL_TAGS}
                onValueChange={(v) => setTag(v === ALL_TAGS ? null : v)}
              >
                <SelectTrigger id="resource-tag">
                  <SelectValue placeholder="All topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TAGS}>All topics</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="inline-flex overflow-hidden rounded-full border border-input" role="group" aria-label="Sort order">
            {(['newest', 'oldest'] as SortOrder[]).map((order) => (
              <button
                key={order}
                type="button"
                aria-pressed={sort === order}
                onClick={() => setSort(order)}
                className={cn(
                  'px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  sort === order ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground/70 hover:text-foreground',
                )}
              >
                {order === 'newest' ? 'Newest' : 'Oldest'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showTypeChips && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={contentType === 'all'}
            onClick={() => setContentType('all')}
            className={chipClass(contentType === 'all')}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={contentType === t}
              onClick={() => setContentType(t)}
              className={chipClass(contentType === t)}
            >
              {CONTENT_TYPE_META[t].label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {visible.length === 0 ? (
          <p className="text-center text-foreground/60">
            No resources match your filters — try clearing the search or picking a different topic.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <li key={p.slug}>
                <ResourceCard post={p} basePath={basePath} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ResourceCard({ post, basePath }: { post: BrowsablePost; basePath: string }) {
  const meta = CONTENT_TYPE_META[post.contentType]
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {post.imageSrc && (
        <div className="relative w-full aspect-video bg-muted">
          <Image
            src={post.imageSrc}
            alt={post.imageAlt ?? post.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <CardContent className="flex-1 pt-5 pb-5">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className={cn('border-transparent', meta.badgeClass)}>
            {meta.label}
          </Badge>
        </div>
        {(post.date || post.author) && (
          <p className="text-xs text-muted-foreground mb-2">
            {post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
            {post.date && post.author && ' · '}
            {post.author && <span>{post.author}</span>}
          </p>
        )}
        <h2 className="font-heading text-lg font-semibold leading-snug">
          <Link
            href={`${basePath}/${post.slug}`}
            className="hover:text-primary focus-visible:outline-none focus-visible:underline"
          >
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{post.excerpt}</p>
        )}
      </CardContent>
    </Card>
  )
}
