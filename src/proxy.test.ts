import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'

function makeReq(path: string) {
  return new NextRequest(new URL(`http://localhost${path}`))
}

describe('proxy', () => {
  it('rewrites `/index.md` to the home markdown handler', () => {
    const res = proxy(makeReq('/index.md'))
    expect(res.headers.get('x-middleware-rewrite')).toBe('http://localhost/api/md')
  })

  it('rewrites `/services/virtual-cfo.md` to the slug handler', () => {
    const res = proxy(makeReq('/services/virtual-cfo.md'))
    expect(res.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost/api/md/services/virtual-cfo'
    )
  })

  it('adds a per-URL Link header advertising the .md alternate on HTML pages', () => {
    const res = proxy(makeReq('/services/virtual-cfo'))
    expect(res.headers.get('Link')).toBe(
      '</services/virtual-cfo.md>; rel="alternate"; type="text/markdown"'
    )
  })

  it('points the home page at `/index.md`', () => {
    const res = proxy(makeReq('/'))
    expect(res.headers.get('Link')).toBe(
      '</index.md>; rel="alternate"; type="text/markdown"'
    )
  })

  it('rewrites `/design-specimen?layouts=1` to the static layout specimen (only that value)', () => {
    expect(proxy(makeReq('/design-specimen?layouts=1')).headers.get('x-middleware-rewrite')).toBe('http://localhost/design-specimen/layouts')
    expect(proxy(makeReq('/design-specimen')).headers.get('x-middleware-rewrite')).toBeNull()
    expect(proxy(makeReq('/design-specimen?layouts=0')).headers.get('x-middleware-rewrite')).toBeNull()
    expect(proxy(makeReq('/about?layouts=1')).headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('rewrites `/.well-known/agent.json` to the agent-card handler', () => {
    const res = proxy(makeReq('/.well-known/agent.json'))
    expect(res.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost/api/agent-card'
    )
  })
})
