import { describe, expect, it } from 'vitest'
import {
  asPostContentType,
  contentTypeLabel,
  isPostContentType,
  CONTENT_TYPE_ORDER,
} from './content-type-meta'

describe('content-type-meta', () => {
  it('recognises the four known types', () => {
    for (const t of ['blog', 'article', 'thought-leadership', 'case-study']) {
      expect(isPostContentType(t)).toBe(true)
    }
  })

  it('coerces unknown/missing values to blog', () => {
    expect(asPostContentType(undefined)).toBe('blog')
    expect(asPostContentType('newsletter')).toBe('blog')
    expect(asPostContentType(123)).toBe('blog')
    expect(asPostContentType('case-study')).toBe('case-study')
  })

  it('maps types to human labels', () => {
    expect(contentTypeLabel('case-study')).toBe('Case study')
    expect(contentTypeLabel('thought-leadership')).toBe('Thought leadership')
    expect(contentTypeLabel('nonsense')).toBe('Blog')
  })

  it('orders chips blog → article → thought-leadership → case-study', () => {
    expect(CONTENT_TYPE_ORDER).toEqual(['blog', 'article', 'thought-leadership', 'case-study'])
  })
})
