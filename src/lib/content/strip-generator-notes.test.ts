import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parsePageMd } from '../assembly/parse-page-md'
import {
  pageTrailerStart,
  stripGeneratorNotesFromBody,
  stripGeneratorNotesFromMarkdown,
} from './strip-generator-notes'

vi.mock('next/cache', () => ({ cacheLife: () => {} }))

// Real files from a client repo (Accord Advisors, 2026-09-27), byte-identical to
// the platform's fixtures (onboarding lib/content/__fixtures__/leaked-generator-notes/).
const FIX = path.join(__dirname, '__fixtures__', 'leaked-generator-notes')
const POST = readFileSync(path.join(FIX, 'accord-year-end-cheer.post.md'), 'utf8')
const ORPHAN_PAGE = readFileSync(path.join(FIX, 'accord-services.orphan-structured.page.md'), 'utf8')

const TRAILER_BITS = [
  'SEO & AIO Metadata',
  '**Answer Block:**',
  '**E-E-A-T Signals:**',
  '**Internal Links:**',
  '**FAQ Block:**',
  '**LLM Citation Note:**',
  'Structured Data',
  'application/ld+json',
]

function frontmatterOf(s: string): string {
  return s.slice(0, s.indexOf('\n---\n', 4) + 5)
}

describe('stripGeneratorNotesFromMarkdown — real leaked post (a page moved into content/posts)', () => {
  const out = stripGeneratorNotesFromMarkdown(POST)

  it('cuts both trailers and every label', () => {
    for (const s of TRAILER_BITS) expect(out).not.toContain(s)
  })

  it('keeps the reader-facing body, incl. the on-page FAQ, and the frontmatter byte-for-byte', () => {
    expect(out).toContain('<!-- block: faq-accordion -->')
    expect(out).toContain('**Q: What does year end accounting cleanup include?**')
    expect(out.trimEnd().endsWith('head into the new year with a plan instead of a pile of receipts.')).toBe(true)
    expect(out.endsWith('\n')).toBe(true)
    expect(frontmatterOf(out)).toBe(frontmatterOf(POST))
  })

  it('is idempotent', () => {
    expect(stripGeneratorNotesFromMarkdown(out)).toBe(out)
  })
})

describe('stripGeneratorNotesFromBody — negatives (reader content survives)', () => {
  it("a post's own \"## FAQ\" section survives", () => {
    const body = [
      'Intro paragraph.',
      '',
      '## FAQ',
      '',
      '**Q: Do you file extensions?**',
      'A: Yes, every spring.',
      '',
      '---',
      '',
      '## Related links',
      '',
      '- [Tax planning](/services/tax)',
      '',
    ].join('\n')
    expect(stripGeneratorNotesFromBody(body)).toBe(body)
  })

  it('a single bold label in prose, or a heading that merely mentions SEO, is not a trailer', () => {
    const body = 'We build **Internal Links:**\n\nbetween pages.\n\n## SEO & AIO Metadata explained\n\nText.\n'
    expect(stripGeneratorNotesFromBody(body)).toBe(body)
  })

  it('cuts a heading-less label run at the very end (the model echoing its plan)', () => {
    const body = 'Real prose.\n\n---\n\n**Answer Block:**\nx\n\n**Internal Links:**\n- a → /b — c\n'
    expect(stripGeneratorNotesFromBody(body)).toBe('Real prose.\n')
  })
})

describe('parsePageMd — orphaned Structured Data heading (Accord /services)', () => {
  it('detects the dash-scrubbed "Structured Data, paste into <head>" rule', () => {
    expect(ORPHAN_PAGE).toContain('## Structured Data, paste into `<head>`')
    expect(pageTrailerStart(ORPHAN_PAGE)).toBeGreaterThan(0)
  })

  const page = parsePageMd(ORPHAN_PAGE)

  it('keeps the trailer out of every section', () => {
    const last = page.sections[page.sections.length - 1]
    expect(last.blockId).toBe('cta-banner')
    for (const s of page.sections) {
      expect(s.content).not.toContain('Structured Data')
      expect(s.content).not.toContain('application/ld+json')
      expect(s.content).not.toContain('```')
    }
  })

  it('still extracts the JSON-LD', () => {
    expect(page.json_ld).toEqual([expect.objectContaining({ '@type': 'Organization', name: 'Accord Advisors' })])
  })

  it('a normal page (SEO heading present) is trimmed exactly as before', () => {
    const withSeo = ORPHAN_PAGE.replace('---\n## Structured Data,', '---\n## SEO & AIO Metadata\n\n**Answer Block:**\nx\n\n---\n## Structured Data —')
    const p = parsePageMd(withSeo)
    expect(p.sections.map((s) => s.blockId)).toEqual(page.sections.map((s) => s.blockId))
    expect(p.sections[p.sections.length - 1].content).toBe(page.sections[page.sections.length - 1].content)
    expect(p.json_ld).toHaveLength(1)
  })
})

describe('getPost — post bodies never carry the trailer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the post body without the SEO / Structured Data trailer', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'c5-post-'))
    mkdirSync(path.join(dir, 'content', 'posts'), { recursive: true })
    writeFileSync(path.join(dir, 'content', 'posts', 'year-end-cheer.md'), POST)
    vi.spyOn(process, 'cwd').mockReturnValue(dir)
    const { getPost } = await import('./get-post')
    const post = await getPost('year-end-cheer')
    expect(post).not.toBeNull()
    for (const s of TRAILER_BITS) expect(post!.body).not.toContain(s)
    expect(post!.body).toContain('## Frequently Asked Questions About Year end cheer')
  })
})
