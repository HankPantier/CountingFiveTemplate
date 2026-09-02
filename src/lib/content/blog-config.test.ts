import { describe, expect, it } from 'vitest'
import { normalizeBlogPath, resolveBlogConfig, DEFAULT_BLOG_PATH } from './blog-config'

describe('normalizeBlogPath', () => {
  it('defaults when absent, empty, or non-string', () => {
    expect(normalizeBlogPath(undefined)).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('   ')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath(42)).toBe(DEFAULT_BLOG_PATH)
  })

  it('adds a leading slash and strips a trailing slash', () => {
    expect(normalizeBlogPath('insights')).toBe('/insights')
    expect(normalizeBlogPath('/insights/')).toBe('/insights')
    expect(normalizeBlogPath('  blog  ')).toBe('/blog')
  })

  it('rejects multi-segment, traversal, or unsafe paths (falls back to default)', () => {
    expect(normalizeBlogPath('/a/b')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('../etc')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('/insights?x=1')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('/in sights')).toBe(DEFAULT_BLOG_PATH)
  })
})

describe('resolveBlogConfig', () => {
  it('returns Resources defaults for an empty/absent config', () => {
    expect(resolveBlogConfig({})).toEqual({
      path: '/resources',
      label: 'Resources',
      title: 'Resources',
      intro: 'Practical advice and seasonal updates from our team.',
    })
    expect(resolveBlogConfig(null).label).toBe('Resources')
  })

  it('applies overrides and defaults title to label when title omitted', () => {
    const cfg = resolveBlogConfig({ path: '/insights', label: 'Insights', intro: 'Ideas.' })
    expect(cfg.path).toBe('/insights')
    expect(cfg.label).toBe('Insights')
    expect(cfg.title).toBe('Insights')
    expect(cfg.intro).toBe('Ideas.')
  })

  it('keeps an explicit title distinct from the label', () => {
    const cfg = resolveBlogConfig({ label: 'News', title: 'Latest News & Updates' })
    expect(cfg.label).toBe('News')
    expect(cfg.title).toBe('Latest News & Updates')
  })
})
