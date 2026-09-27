/**
 * Generator notes that must never render on a live page (template 2026.09.6).
 *
 * The platform's page builder (onboarding lib/content/deliverable-builder.ts,
 * buildPageMarkdown) appends a human-review trailer to every PAGE file:
 *
 *   ---
 *   ## SEO & AIO Metadata
 *   **Answer Block:** / **E-E-A-T Signals:** / **Internal Links:** /
 *   **FAQ Block:** / **LLM Citation Note:** / (**Call to Action:** …)
 *   ---
 *   ## Structured Data — paste into `<head>`
 *   ```html <script type="application/ld+json">…</script> ```
 *
 * Pages trim it in parse-page-md.ts (and lift the JSON-LD out first). Posts
 * never did: a page relocated into content/posts/ rendered the whole trailer
 * (35 live posts). And a page whose SEO heading was edited away rendered its
 * Structured Data block (Accord /services, with the AI editor's dash scrub:
 * "Structured Data, paste into <head>").
 *
 * PARITY: the detection below mirrors onboarding
 * lib/content/strip-generator-notes.ts (SEO_TRAILER_RE, STRUCTURED_TRAILER_RE,
 * LABEL_LINE_RE, CTA_LINE_RE, bareLabelRunStart, stripGeneratorNotesFromBody)
 * so the platform's sweep/validators and the renderer agree on what a trailer
 * is. Change both sides together; the tests share the same real fixtures.
 *
 * Everything is anchored on the exact shapes the generator emits (a `---` rule
 * line, then the exact heading), so a reader-facing "## FAQ" section or a
 * sentence that mentions SEO is never cut.
 */

export const GENERATOR_NOTE_LABELS = [
  'Answer Block',
  'E-E-A-T Signals',
  'Internal Links',
  'FAQ Block',
  'LLM Citation Note',
] as const

// `---` rule line, optional blank lines, then the exact heading.
const SEO_TRAILER_RE =
  /(^|\n)[ \t]*-{3,}[ \t]*\n(?:[ \t]*\n)*[ \t]*##[ \t]+SEO[ \t]*&(?:amp;)?[ \t]*AIO[ \t]+Metadata[ \t]*(?=\n|$)/i
// "Structured Data — paste into `<head>`". The AI editor's dash scrub turns the
// em-dash into a comma, so any short separator is accepted.
const STRUCTURED_TRAILER_RE =
  /(^|\n)[ \t]*-{3,}[ \t]*\n(?:[ \t]*\n)*[ \t]*##[ \t]+Structured Data[ \t]*(?:—|–|-|,|:)?[ \t]*paste into `<head>`[ \t]*(?=\n|$)/i

const LABEL_ALT = GENERATOR_NOTE_LABELS.map((l) => l.replace(/[-]/g, '\\-')).join('|')
// A generator label on a line of its own: `**Internal Links:**`.
const LABEL_LINE_RE = new RegExp(`^[ \\t]*\\*\\*(${LABEL_ALT}):\\*\\*[ \\t]*$`, 'gm')
const CTA_LINE_RE = /^[ \t]*\*\*Call to Action:\*\*[ \t]+\[/m

function trailerStart(body: string, re: RegExp): number {
  const m = re.exec(body)
  if (!m) return -1
  // Point at the start of the `---` line (skip the captured leading newline).
  return m.index + m[1].length
}

function labelsIn(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(LABEL_LINE_RE)) {
    if (!out.includes(m[1])) out.push(m[1])
  }
  if (CTA_LINE_RE.test(text)) out.push('Call to Action')
  return out
}

// A heading-less run of generator labels at the very END of a body (the model
// echoing its metadata plan). Conservative: needs ≥2 distinct exact labels,
// and nothing structural (a heading or a block annotation) may follow the
// first one — a reader-facing section always starts with a heading.
function bareLabelRunStart(body: string): number {
  const matches = [...body.matchAll(LABEL_LINE_RE)]
  for (const m of matches) {
    const start = m.index ?? 0
    const tail = body.slice(start)
    if (/^[ \t]*#{1,6}[ \t]/m.test(tail) || tail.includes('<!-- block:')) continue
    if (labelsIn(tail).filter((l) => l !== 'Call to Action').length < 2) return -1
    // Take a directly preceding `---` rule with it.
    const before = body.slice(0, start)
    const rule = /\n[ \t]*-{3,}[ \t]*\n(?:[ \t]*\n)*$/.exec(before)
    return rule ? rule.index + 1 : start
  }
  return -1
}

/**
 * Index where a PAGE body's trailer starts — the "## SEO & AIO Metadata" rule
 * or, when that heading was edited away, an orphaned "## Structured Data …
 * paste into `<head>`" rule — or -1. Pages keep reader-facing bold labels, so
 * the heading-less label heuristic is not applied here.
 */
export function pageTrailerStart(body: string): number {
  const starts = [trailerStart(body, SEO_TRAILER_RE), trailerStart(body, STRUCTURED_TRAILER_RE)].filter((i) => i >= 0)
  return starts.length ? Math.min(...starts) : -1
}

/**
 * Cut every generator-notes section out of a reader-facing body (a post body,
 * or a page served as markdown). Idempotent. Everything from the earliest
 * trailer marker to the end is removed — the trailers always sit at the end.
 */
export function stripGeneratorNotesFromBody(body: string): string {
  const starts = [
    trailerStart(body, SEO_TRAILER_RE),
    trailerStart(body, STRUCTURED_TRAILER_RE),
    bareLabelRunStart(body),
  ].filter((i) => i >= 0)
  if (starts.length === 0) return body
  const kept = body.slice(0, Math.min(...starts)).replace(/\s+$/, '')
  return kept ? `${kept}\n` : ''
}

/**
 * Same, for a whole .md file: the frontmatter block is kept byte-for-byte and
 * only the body after it is stripped.
 */
export function stripGeneratorNotesFromMarkdown(content: string): string {
  if (content.startsWith('---\n')) {
    const close = content.indexOf('\n---', 4)
    if (close >= 0) {
      let bodyStart = close + 4
      while (bodyStart < content.length && content[bodyStart] !== '\n') bodyStart++
      if (content[bodyStart] === '\n') bodyStart++
      const body = content.slice(bodyStart)
      const stripped = stripGeneratorNotesFromBody(body)
      return stripped === body ? content : content.slice(0, bodyStart) + stripped
    }
  }
  return stripGeneratorNotesFromBody(content)
}
