import { describe, expect, it } from 'vitest'
import { parseRedirectsCsv, redirectDestinationError } from './parse-redirects-csv'

describe('redirectDestinationError', () => {
  it.each(['/new', '/a/b?x=1', '/services/tax#top'])('accepts a same-site path %s', (to) => {
    expect(redirectDestinationError(to)).toBeNull()
  })
  it.each([
    ['https://evil.com', 'non-relative destination'],
    ['evil.com', 'non-relative destination'],
    ['//evil.com', 'protocol-relative destination'],
    ['//evil.com/path', 'protocol-relative destination'],
    ['/\\evil.com', 'protocol-relative destination'],
    ['/a\tb', 'control character in destination'],
    ['/a\u0000b', 'control character in destination'],
    ['/a\u007fb', 'control character in destination'],
  ])('rejects %j (%s)', (to, reason) => {
    expect(redirectDestinationError(to)).toBe(reason)
  })
})

describe('parseRedirectsCsv', () => {
  it('parses rows, skipping the header, comments and blank lines silently', () => {
    const raw = ['old_url,new_url', '# comment', '', '/old,/new', '"/a,b","/c,d"'].join('\n')
    expect(parseRedirectsCsv(raw)).toEqual({
      redirects: [
        { source: '/old', destination: '/new', permanent: true },
        { source: '/a,b', destination: '/c,d', permanent: true },
      ],
      skipped: [],
    })
  })
  it('skips unsafe destinations and reports why', () => {
    const raw = ['/x,https://evil.com', '/y,//evil.com', '/z,/\\evil.com', '/ok,/fine'].join('\n')
    const r = parseRedirectsCsv(raw)
    expect(r.redirects).toEqual([{ source: '/ok', destination: '/fine', permanent: true }])
    expect(r.skipped.map((s) => s.reason)).toEqual([
      'non-relative destination',
      'protocol-relative destination',
      'protocol-relative destination',
    ])
  })
  it('ignores rows missing a source or destination', () => {
    expect(parseRedirectsCsv('/only-source,\n,/only-dest').redirects).toEqual([])
  })
})
