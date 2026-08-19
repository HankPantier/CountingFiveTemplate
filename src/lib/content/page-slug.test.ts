import { describe, expect, it } from 'vitest'
import { pageSlugToSegments } from './page-slug'

describe('pageSlugToSegments', () => {
  it('maps a single-segment page to a one-element slug array', () => {
    expect(pageSlugToSegments('services')).toEqual(['services'])
  })

  it('splits a nested page on the -- separator', () => {
    expect(pageSlugToSegments('services--virtual-cfo')).toEqual(['services', 'virtual-cfo'])
    expect(pageSlugToSegments('resources--quick-reads--tax-tips')).toEqual([
      'resources',
      'quick-reads',
      'tax-tips',
    ])
  })

  it('rejects a filename that kept its scheme+host (the build-breaking case)', () => {
    // https://www.example.com/who-we-are/amy slugified with slashes → '--',
    // producing empty interior segments. This once failed an entire next build.
    expect(pageSlugToSegments('https-----www-example-com--who-we-are--amy')).toBeNull()
  })

  it('rejects leading, trailing, and doubled separators (all yield empty segments)', () => {
    expect(pageSlugToSegments('--services')).toBeNull()
    expect(pageSlugToSegments('services--')).toBeNull()
    expect(pageSlugToSegments('a----b')).toBeNull()
  })
})
