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
 * PARITY: the anchors below are byte-mirrored with onboarding
 * lib/content/strip-generator-notes.ts through
 * src/lib/content/__fixtures__/generator-trailer.template.json (copied from
 * the platform, never retyped). strip-generator-notes.parity.test.ts checks
 * GENERATOR_TRAILER_ANCHORS against the fixture and runs every vector, so the
 * platform's sweep/validators and this renderer agree on what a trailer is.
 *
 * Anchored on the exact generator shapes (a `---` rule line, then the exact,
 * case-sensitive heading), so a reader-facing "## FAQ" section or a sentence
 * that mentions SEO is never cut; CRLF files are handled.
 */

export const GENERATOR_NOTE_LABELS = [
  'Answer Block',
  'E-E-A-T Signals',
  'Internal Links',
  'FAQ Block',
  'LLM Citation Note',
] as const

// `---` rule line, optional blank lines, then the EXACT generator heading
// (case-sensitive; `&amp;` tolerated for HTML-escaped copies).
const SEO_TRAILER_RE = /(^|\r?\n)-{3,}[ \t]*\r?\n(?:[ \t]*\r?\n)*## SEO &(?:amp;)? AIO Metadata[ \t]*(?=\r?\n|$)/
// "## Structured Data — paste into `<head>`". The AI editor's dash scrub turned
// the em-dash into a comma on some pages, so the separator may vary.
const STRUCTURED_TRAILER_RE =
  /(^|\r?\n)-{3,}[ \t]*\r?\n(?:[ \t]*\r?\n)*## Structured Data ?(?:—|–|-|,|:)? ?paste into `<head>`[ \t]*(?=\r?\n|$)/

const LABEL_ALT = GENERATOR_NOTE_LABELS.map((l) => l.replace(/[-]/g, '\\-')).join('|')
// A generator label on a line of its own: `**Internal Links:**`.
const LABEL_LINE_RE = new RegExp(`^[ \\t]*\\*\\*(${LABEL_ALT}):\\*\\*[ \\t]*\\r?$`, 'gm')
const CTA_LINE_RE = /^[ \t]*\*\*Call to Action:\*\*[ \t]+\[/m

const TRAILER_HEADING_LINE_RE =
  /^## (?:SEO &(?:amp;)? AIO Metadata|Structured Data ?(?:—|–|-|,|:)? ?paste into `<head>`)[ \t]*\r?$/

const re = (r: RegExp) => ({ source: r.source, flags: r.flags })

/** The trailer anchors as plain data (compared against the parity fixture). */
export const GENERATOR_TRAILER_ANCHORS = {
  version: 1,
  labels: [...GENERATOR_NOTE_LABELS],
  seoTrailer: re(SEO_TRAILER_RE),
  structuredTrailer: re(STRUCTURED_TRAILER_RE),
  labelLine: re(LABEL_LINE_RE),
  ctaLine: re(CTA_LINE_RE),
  trailerHeadingLine: re(TRAILER_HEADING_LINE_RE),
}

export interface BodyStripResult {
  body: string
  /** Labels / section names that were removed, in document order, de-duped. */
  removed: string[]
  /** The exact text cut from the body ('' when nothing was cut). */
  removedText: string
  /**
   * Set when a trailer was found but NOT cut, because a heading other than the
   * two trailer headings follows it (real content appended after the trailer).
   * Nothing is removed and the body renders as-is.
   */
  warning?: string
}

// Headings in `text` other than the two trailer headings, ignoring fenced code.
function foreignHeadings(text: string): string[] {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n/)
    .filter((l) => /^#{1,6}[ \t]/.test(l) && !TRAILER_HEADING_LINE_RE.test(l))
    .map((l) => l.trim())
}

// Line ending of a file — CRLF when the file uses it, else LF.
function eolOf(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

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

// A heading-less run of generator labels at the END of a body (the model
// echoing its metadata plan, or an SEO trailer whose heading line alone was
// deleted). Needs ≥2 distinct exact labels, and nothing structural may sit
// between the first label and the end — or the Structured Data trailer, which
// is allowed to follow (the run is bounded by it).
function bareLabelRunStart(body: string): number {
  const structured = trailerStart(body, STRUCTURED_TRAILER_RE)
  const limit = structured >= 0 ? structured : body.length
  const matches = [...body.matchAll(LABEL_LINE_RE)]
  for (const m of matches) {
    const start = m.index ?? 0
    if (start >= limit) break
    const tail = body.slice(start, limit)
    if (/^[ \t]*#{1,6}[ \t]/m.test(tail) || tail.includes('<!-- block:')) continue
    if (labelsIn(tail).filter((l) => l !== 'Call to Action').length < 2) return -1
    // Take a directly preceding `---` rule with it.
    const before = body.slice(0, start)
    const rule = /\r?\n[ \t]*-{3,}[ \t]*\r?\n(?:[ \t]*\r?\n)*$/.exec(before)
    return rule ? rule.index + (before[rule.index] === '\r' ? 2 : 1) : start
  }
  return -1
}

/** Where the trailer begins in a reader-facing body (any anchor), or -1. */
export function findTrailerStart(body: string): number {
  const starts = [
    trailerStart(body, SEO_TRAILER_RE),
    trailerStart(body, STRUCTURED_TRAILER_RE),
    bareLabelRunStart(body),
  ].filter((i) => i >= 0)
  return starts.length ? Math.min(...starts) : -1
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
 * trailer marker to the end is removed — unless real content (another heading)
 * follows it, in which case nothing is cut (`warning` says why).
 */
export function stripGeneratorNotesFromBody(body: string): BodyStripResult {
  const cut = findTrailerStart(body)
  if (cut < 0) return { body, removed: [], removedText: '' }
  const removedText = body.slice(cut)
  const foreign = foreignHeadings(removedText)
  if (foreign.length > 0) {
    return {
      body,
      removed: [],
      removedText: '',
      warning: `Generator notes found but not removed: content follows them (${foreign.join(' | ')})`,
    }
  }
  const removed: string[] = []
  if (trailerStart(removedText, SEO_TRAILER_RE) >= 0) removed.push('SEO & AIO Metadata')
  removed.push(...labelsIn(removedText))
  if (trailerStart(removedText, STRUCTURED_TRAILER_RE) >= 0) removed.push('Structured Data')
  const kept = body.slice(0, cut).replace(/\s+$/, '')
  return { body: kept ? `${kept}${eolOf(body)}` : '', removed, removedText }
}

/**
 * Same, for a whole .md file: the frontmatter block is kept byte-for-byte and
 * only the body after it is stripped.
 */
export function stripGeneratorNotesFromMarkdown(content: string): string {
  const open = content.startsWith('---\r\n') ? 5 : content.startsWith('---\n') ? 4 : -1
  if (open > 0) {
    const close = content.indexOf('\n---', open - 1)
    if (close >= 0) {
      let bodyStart = close + 4
      while (bodyStart < content.length && content[bodyStart] !== '\n') bodyStart++
      if (content[bodyStart] === '\n') bodyStart++
      const body = content.slice(bodyStart)
      const stripped = stripGeneratorNotesFromBody(body).body
      return stripped === body ? content : content.slice(0, bodyStart) + stripped
    }
  }
  return stripGeneratorNotesFromBody(content).body
}
