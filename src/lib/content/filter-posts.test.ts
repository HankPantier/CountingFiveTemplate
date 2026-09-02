import { describe, expect, it } from 'vitest'
import {
  filterPosts,
  presentContentTypes,
  collectTags,
  DEFAULT_POST_FILTERS,
  type BrowsablePost,
  type PostFilters,
} from './filter-posts'

const posts: BrowsablePost[] = [
  { slug: 'a', title: 'Year-end tax tips', excerpt: 'Save before December', date: '2026-01-10', tags: ['Tax', 'Small Business'], contentType: 'blog' },
  { slug: 'b', title: 'Choosing an entity', excerpt: 'LLC vs S-corp', date: '2026-03-01', tags: ['Entity'], contentType: 'article' },
  { slug: 'c', title: 'How we saved a client 40%', excerpt: 'A real story', date: '2026-02-15', tags: ['Tax'], contentType: 'case-study' },
]

const filters = (over: Partial<PostFilters>): PostFilters => ({ ...DEFAULT_POST_FILTERS, ...over })

describe('filterPosts', () => {
  it('returns all posts newest-first by default', () => {
    const out = filterPosts(posts, DEFAULT_POST_FILTERS)
    expect(out.map((p) => p.slug)).toEqual(['b', 'c', 'a'])
  })

  it('sorts oldest-first when requested', () => {
    const out = filterPosts(posts, filters({ sort: 'oldest' }))
    expect(out.map((p) => p.slug)).toEqual(['a', 'c', 'b'])
  })

  it('filters by content type', () => {
    const out = filterPosts(posts, filters({ contentType: 'case-study' }))
    expect(out.map((p) => p.slug)).toEqual(['c'])
  })

  it('filters by tag case-insensitively (exact tag match)', () => {
    const out = filterPosts(posts, filters({ tag: 'tax' }))
    expect(out.map((p) => p.slug).sort()).toEqual(['a', 'c'])
  })

  it('searches across title, excerpt, and tags', () => {
    expect(filterPosts(posts, filters({ search: 'entity' })).map((p) => p.slug)).toEqual(['b'])
    expect(filterPosts(posts, filters({ search: 'december' })).map((p) => p.slug)).toEqual(['a'])
    expect(filterPosts(posts, filters({ search: 'small business' })).map((p) => p.slug)).toEqual(['a'])
  })

  it('combines filters (type + search)', () => {
    const out = filterPosts(posts, filters({ contentType: 'blog', search: 'tax' }))
    expect(out.map((p) => p.slug)).toEqual(['a'])
  })

  it('does not mutate the input array', () => {
    const before = posts.map((p) => p.slug)
    filterPosts(posts, filters({ sort: 'oldest' }))
    expect(posts.map((p) => p.slug)).toEqual(before)
  })
})

describe('presentContentTypes', () => {
  it('returns only present types, in canonical order', () => {
    expect(presentContentTypes(posts)).toEqual(['blog', 'article', 'case-study'])
    expect(presentContentTypes([posts[0]])).toEqual(['blog'])
  })
})

describe('collectTags', () => {
  it('returns unique tags sorted alphabetically, first-seen casing', () => {
    expect(collectTags(posts)).toEqual(['Entity', 'Small Business', 'Tax'])
  })
})
