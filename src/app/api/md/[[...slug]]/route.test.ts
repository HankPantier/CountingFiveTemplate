import { describe, expect, it, vi } from 'vitest'

// Mock the page loader so the test doesn't depend on Next's runtime
// (`'use cache' + cacheLife` require Next compilation). The handler's job under
// test is: route slug → URL, strip annotations, set headers, 404 on miss.
vi.mock('@/lib/content/get-page', () => ({
  getPageMarkdown: vi.fn(async (url: string) => {
    if (url === '/') {
      return [
        '---',
        'title: Test Home',
        'canonical_url: https://example.com/',
        '---',
        '',
        '<!-- block: hero | variant: image -->',
        '## Welcome',
        '',
        'Body text here.',
        '',
      ].join('\n')
    }
    // New loader contract: a missing page is a cacheable null, NOT a thrown
    // ENOENT (throws across the 'use cache' boundary escalate 404s to 500s
    // under cacheComponents — see get-page.ts).
    // Real-shaped page file: body + the platform's review trailer.
    if (url === '/services') {
      return (await import('node:fs')).readFileSync(
        (await import('node:path')).join(
          process.cwd(),
          'src/lib/content/__fixtures__/leaked-generator-notes/accord-year-end-cheer.post.md'
        ),
        'utf8'
      )
    }
    if (url === '/explodes') {
      throw new Error('disk on fire') // non-ENOENT: genuine unexpected error
    }
    return null
  }),
}))

import { GET } from './route'

function call(slug?: string[]) {
  const path = slug ? `/api/md/${slug.join('/')}` : '/api/md'
  return GET(new Request(`http://localhost${path}`), {
    params: Promise.resolve(slug ? { slug } : {}),
  })
}

describe('GET /api/md/[[...slug]] — agent-facing markdown endpoint', () => {
  it('serves the home page when slug is undefined', async () => {
    const res = await call(undefined)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/markdown')
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=')

    const body = await res.text()
    // Frontmatter is preserved (agents want this metadata).
    expect(body.startsWith('---')).toBe(true)
    expect(body).toMatch(/^title:/m)
    // Block annotations are stripped (HTML noise for an agent reader).
    expect(body).not.toMatch(/<!--\s*block:/)
    // Actual prose content survived.
    expect(body).toContain('## ')
  })

  it('returns 404 for a slug that does not exist (loader returns null)', async () => {
    const res = await call(['nope', 'does-not-exist'])
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toContain('text/plain')
  })

  it('does not serve the SEO & AIO Metadata / Structured Data trailer', async () => {
    const res = await call(['services'])
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toMatch(/^meta_title:/m)
    expect(body).toContain('## Frequently Asked Questions About Year end cheer')
    expect(body.trimEnd().endsWith('a pile of receipts.')).toBe(true)
    for (const s of ['SEO & AIO Metadata', '**Answer Block:**', 'Structured Data', 'application/ld+json']) {
      expect(body).not.toContain(s)
    }
  })

  it('returns 404 when the loader throws an unexpected error', async () => {
    const res = await call(['explodes'])
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toContain('text/plain')
  })
})
