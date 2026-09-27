/**
 * md-utils.ts
 * Markdown parsing helpers for the block assembly pipeline.
 * All functions are pure and never throw.
 */

import { isIconName } from './icon-names'

/**
 * Promote standalone bold lines to H3 headings.
 *
 * Phase I's content generator commonly emits list-of-items sections using
 * "**Title**\nbody" instead of "### Title\nbody" — fine for prose rendering
 * via ReactMarkdown, but it leaves the H3-based section parsers
 * (parseH3CardList, parseTeamMembers, parsePricingTiers, parseContentCardList,
 * and the bold-paragraph fallback in parseTitleBodyChunks) seeing zero items.
 *
 * This helper rewrites lines that are ENTIRELY a `**Bold Title**` (modulo
 * trailing whitespace) into `### Bold Title`. It does NOT touch inline bold
 * inside paragraphs like "Some text **emphasis** here" — the `^...$` anchors
 * with /gm flag scope the match to whole lines.
 */
export function normalizeBoldHeadingsToH3(body: string): string {
  return body.replace(/^\*\*([^*\n][^*\n]*[^*\n\s])\*\*\s*$/gm, '### $1')
}

/**
 * Split a body into intro + title/body chunks. Recognizes both H3 (`### Title`)
 * and standalone bold-line (`**Title**`) chunk delimiters. Returns:
 *   { intro: text before first heading, chunks: [{ title, body }, ...] }
 * If no headings at all, intro is undefined and chunks is empty.
 *
 * Used by the H3-based parsers below to avoid five copies of the
 * find-first-heading/split-into-chunks dance, and by extractors that need
 * a title+body breakdown without icon-bullet semantics (e.g. industry-cards
 * when Claude emits bold-paragraph format instead of icon bullets).
 */
export function parseTitleBodyChunks(body: string): {
  intro?: string
  chunks: Array<{ title: string; body: string }>
} {
  const normalized = normalizeBoldHeadingsToH3(body)
  const headingMatch = normalized.match(/(?:^|\n)### /)
  if (!headingMatch) return { intro: normalized.trim() || undefined, chunks: [] }

  const firstIdx = headingMatch.index! + (headingMatch[0].startsWith('\n') ? 1 : 0)
  const intro = firstIdx > 0 ? normalized.slice(0, firstIdx).trim() || undefined : undefined
  const raw = normalized.slice(firstIdx)
  const sections = raw.split(/(?=^###\s)/m).filter(c => c.trim().startsWith('###'))
  const chunks = sections.map(chunk => {
    const lines = chunk.trim().split('\n')
    const title = lines[0].replace(/^###\s+/, '').trim()
    const body = lines.slice(1).join('\n').trim()
    return { title, body }
  })
  return { intro, chunks }
}

/**
 * Split a markdown body into its first heading (H1 or H2) and the body below it.
 * Heading text excludes the leading "## " or "# ".
 * If no heading is found, returns { heading: '', body: markdown }.
 */
export function splitHeadingFromBody(markdown: string): { heading: string; body: string } {
  const match = markdown.match(/^#{1,2}\s+(.+?)(?:\n|$)([\s\S]*)/)
  if (!match) return { heading: '', body: markdown.trim() }
  return { heading: match[1].trim(), body: match[2].trim() }
}

/**
 * If the body ends with a markdown link on its own line ("[Label](url)"), pop
 * it off as a CTA. Returns { body, cta }. cta is undefined if no trailing link.
 */
export function extractTrailingCta(body: string): {
  body: string
  cta?: { label: string; url: string }
} {
  const ctaMatch = body.match(/\[([^\]]+)\]\(([^)]+)\)\s*$/)
  if (!ctaMatch) return { body }
  return {
    body: body.slice(0, ctaMatch.index).trimEnd(),
    cta: { label: ctaMatch[1], url: ctaMatch[2] },
  }
}

/**
 * Pull the first standalone Markdown image (`![alt](src)`) out of a body and
 * return it alongside the body with that image removed (so it doesn't also
 * render inside the prose). `src` may be a local filename or a full URL —
 * resolution is the caller's job via resolveImageSrc(). Never throws.
 */
export function extractLeadingImage(body: string): {
  src?: string
  alt?: string
  body: string
} {
  // ![alt](src) — src stops at whitespace or ')'; an optional "title" is ignored.
  // Anchored to whole lines so an image embedded inside a prose sentence is not extracted.
  const re = /^[ \t]*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)[ \t]*$/m
  const m = body.match(re)
  if (!m || m.index === undefined) return { body }
  const alt = m[1].trim() || undefined
  const src = m[2].trim()
  const cleaned = (body.slice(0, m.index) + body.slice(m.index + m[0].length))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { src, alt, body: cleaned }
}

/**
 * Parse a list where each line is "- Icon: **Title** — Description".
 * Also accepts en-dash (–) or double-hyphen (--) as the separator.
 * Skips lines that don't match the pattern.
 */
export function parseIconTitleDescriptionList(
  body: string
): Array<{ icon: string; title: string; description: string }> {
  const bulletItems = body
    .split('\n')
    .filter(line => /^\s*[-*]\s+/.test(line))
    .map(line => {
      const cleaned = line.replace(/^\s*[-*]\s+/, '')
      // Primary pattern: IconName: **Title** [—|–|--| - ] Description
      const match = cleaned.match(
        /^(\w+):\s+\*\*(.+?)\*\*\s*(?:—|–|--|-(?=\s))\s*(.+)$/
      )
      if (match) {
        return { icon: match[1], title: match[2].trim(), description: match[3].trim() }
      }
      // Icon with a colon (not a dash) after the title, bold or not:
      //   Calculator: **Outsourced Accounting:** Accurate books…
      //   Calculator: **Outsourced Accounting**: Accurate books…
      //   Calculator: Outsourced Accounting: Accurate books…
      // (Slachta's feature-grid rendered "Calculator: Outsourced Accounting: …"
      // as the card title.) The leading word counts as an icon only when it IS
      // one (isIconName) — "Bookkeeping: Monthly close: …" is Title: description.
      const boldColon = cleaned.match(/^(\w+):\s+\*\*(.+?):?\*\*:?\s*(.*)$/)
      if (boldColon && isIconName(boldColon[1])) {
        return { icon: boldColon[1], title: boldColon[2].trim(), description: boldColon[3].trim() }
      }
      const plainColon = cleaned.match(/^([A-Z][A-Za-z0-9]*):\s+([^:*]+?):\s+(.+)$/)
      if (plainColon && isIconName(plainColon[1])) {
        return { icon: plainColon[1], title: plainColon[2].trim(), description: plainColon[3].trim() }
      }
      // Fallback: no icon — treat as **Title** [—|–|--] Description or plain text
      const fallback = cleaned.match(/^(?:\*\*(.+?)\*\*\s*(?:—|–|--|-(?=\s))\s*(.+)|(.+)(?:—|–|--)(.+))$/)
      if (fallback) {
        if (fallback[1]) {
          return { icon: 'CheckCircle', title: fallback[1].trim(), description: fallback[2].trim() }
        }
        return { icon: 'CheckCircle', title: fallback[3].trim(), description: fallback[4].trim() }
      }
      // "Title: description" (bold or not) with no icon word in front.
      const titleColon = cleaned.match(/^\*{0,2}([^:*]{2,80}?)(?::\*\*|\*\*:|:)\s+(.+)$/)
      if (titleColon) {
        return { icon: 'CheckCircle', title: titleColon[1].trim(), description: titleColon[2].replace(/\*\*/g, '').trim() }
      }
      return { icon: 'CheckCircle', title: cleaned.replace(/\*\*/g, '').trim(), description: '' }
    })

  if (bulletItems.length > 0) return bulletItems

  // Fallback: Phase I content generator commonly emits feature/industry lists
  // as "**Title**\nDescription" paragraphs instead of icon-bullets. Pick those
  // up via parseTitleBodyChunks so the blocks aren't empty. A chunk may pick
  // its icon with an `icon: Name` line directly under the heading (mirrors the
  // `photo:`/`query:` convention in content-cards); otherwise CheckCircle.
  const { chunks } = parseTitleBodyChunks(body)
  return chunks.map(({ title, body: chunkBody }) => {
    const { icon, body: description } = extractIconLine(chunkBody)
    return {
      icon: icon ?? 'CheckCircle',
      title: title.trim(),
      description: description.trim(),
    }
  })
}

/**
 * Pull an `icon: PascalName` line off the start of a chunk body (the first
 * non-empty line only — an "icon:" deeper in prose is left alone). Returns
 * the icon name and the body with that line removed. Pure, never throws.
 */
export function extractIconLine(body: string): { icon?: string; body: string } {
  const lines = body.split('\n')
  const firstIdx = lines.findIndex(l => l.trim() !== '')
  if (firstIdx === -1) return { body }
  const m = lines[firstIdx].match(/^icon:\s*([A-Za-z][A-Za-z0-9]*)\s*$/)
  if (!m) return { body }
  const rest = [...lines.slice(0, firstIdx), ...lines.slice(firstIdx + 1)]
    .join('\n')
    .replace(/^\n+/, '')
  return { icon: m[1], body: rest }
}

/**
 * Parse a stats line like:
 *   25+ years · 400+ clients · 3 CPAs on staff
 * or a list:
 *   - 25+ years
 *   - 400+ clients
 * Returns Array<{ value: string; label: string }>.
 * Value is the leading number/figure ("25+"), label is the rest.
 */
export function parseStatsList(body: string): Array<{ value: string; label: string }> {
  // Try list format first
  const listLines = body.split('\n').filter(l => /^\s*[-*]\s+/.test(l))
  if (listLines.length > 0) {
    return listLines.map(line => {
      const text = line.replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, '').trim()
      const m = text.match(/^(\$?[\d.,]+[\d.,KMBkmb%xX+]*)\s*(.+)?$/)
      if (m) return { value: m[1].trim(), label: (m[2] ?? '').trim() }
      return { value: text, label: '' }
    })
  }

  // Try dot/middle-dot delimited inline format: "25+ years · 400+ clients"
  const separators = /\s*[·•|]\s*/
  const parts = body.split(separators).map(s => s.trim()).filter(Boolean)
  if (parts.length > 1) {
    return parts.map(part => {
      const m = part.match(/^(\$?[\d.,]+[\d.,KMBkmb%xX+]*)\s*(.+)?$/)
      if (m) return { value: m[1].trim(), label: (m[2] ?? '').trim() }
      return { value: part, label: '' }
    })
  }

  return []
}

/**
 * Parse a numbered or unordered list of steps.
 * Each item becomes: { number: '01', title: 'First Step', description: 'Body...' }
 * Title comes from the first line of the item, description from any subsequent lines.
 */
export function parseStepsList(
  body: string
): Array<{ number: string; title: string; description: string }> {
  // Match numbered items (1. ...) or bullets (- ...) as step starters
  const itemPattern = /^(?:(\d+)\.\s+|[-*]\s+)(.+)/
  const lines = body.split('\n')

  const items: Array<{ number: string; title: string; descLines: string[] }> = []
  let current: { number: string; title: string; descLines: string[] } | null = null

  for (const line of lines) {
    const m = line.match(itemPattern)
    if (m) {
      if (current) items.push(current)
      const rawTitle = m[2].trim()
      // Extract title and optional inline description from "**Title** — Description"
      const inlineMatch = rawTitle.match(/^\*\*(.+?)\*\*\s*(?:—|–|--)\s*(.+)$/)
      if (inlineMatch) {
        current = {
          number: m[1] ?? String(items.length + 1),
          title: inlineMatch[1].trim(),
          descLines: [inlineMatch[2].trim()],
        }
      } else {
        current = {
          number: m[1] ?? String(items.length + 1),
          title: rawTitle.replace(/\*\*/g, '').trim(),
          descLines: [],
        }
      }
    } else if (current && line.trim()) {
      current.descLines.push(line.trim())
    }
  }
  if (current) items.push(current)

  // Fallback: Phase I content-generator commonly emits steps as standalone
  // bold-paragraph items ("**Step 1 — Submit Your Inquiry**\nbody...")
  // rather than numbered/bullet lists. If the primary pass found zero
  // items, walk the body again treating bold-only lines as step starters.
  // Same robustness pattern as parseTeamMembers / parseH3CardList /
  // parseIconTitleDescriptionList for the bold-paragraph format.
  if (items.length === 0) {
    const BOLD_LINE = /^\*\*([^*\n]+)\*\*\s*$/
    let boldCurrent: { number: string; title: string; descLines: string[] } | null = null
    for (const line of lines) {
      const trimmed = line.trim()
      const bm = trimmed.match(BOLD_LINE)
      if (bm) {
        if (boldCurrent) items.push(boldCurrent)
        const rawTitle = bm[1].trim()
        // Strip a leading "Step N — " / "Step N: " prefix if present, keep
        // the substantive title. Auto-numbering happens in the final pass.
        const stripped = rawTitle.replace(/^Step\s+\d+\s*[—–\-:]\s*/i, '').trim()
        boldCurrent = {
          number: String(items.length + 1),
          title: stripped || rawTitle,
          descLines: [],
        }
      } else if (boldCurrent && trimmed) {
        boldCurrent.descLines.push(trimmed)
      }
    }
    if (boldCurrent) items.push(boldCurrent)
  }

  // Fallback: `### Title` + paragraph steps (the page generator's other
  // format — e.g. Kinexus "What happens after you contact us" rendered only
  // its heading because nothing here matched).
  if (items.length === 0) return stepsFromTitleChunks(parseTitleBodyChunks(body).chunks)

  return items.map((item, i) => ({
    number: String(i + 1).padStart(2, '0'),
    title: item.title,
    description: item.descLines.join(' ').trim(),
  }))
}

/**
 * Map `### Title` / `**Title**` chunks (parseTitleBodyChunks) to numbered steps.
 * Strips a leading "Step 2 —" / "2." from the title; the body's lines are
 * joined into one description.
 */
export function stepsFromTitleChunks(
  chunks: Array<{ title: string; body: string }>
): Array<{ number: string; title: string; description: string }> {
  return chunks
    .map(({ title, body }) => ({
      title: title.replace(/^(?:Step\s+)?\d+\s*[.:—–-]\s*/i, '').trim() || title.trim(),
      description: body.split('\n').map(l => l.trim()).filter(Boolean).join(' '),
    }))
    .filter(step => step.title)
    .map((step, i) => ({ number: String(i + 1).padStart(2, '0'), ...step }))
}

/**
 * Parse FAQ markdown of the format:
 *   **Q: question?**
 *   A: answer text
 * Returns Array<{ question: string; answer: string }>.
 */
export function parseFaqList(body: string): Array<{ question: string; answer: string }> {
  const results: Array<{ question: string; answer: string }> = []
  // Match pairs of **Q: ...** followed by A: ...
  const pattern = /\*\*Q:\s*(.+?)\*\*\s*\nA:\s*([\s\S]+?)(?=\n\*\*Q:|$)/g
  let m: RegExpExecArray | null
  while ((m = pattern.exec(body)) !== null) {
    results.push({
      question: m[1].trim(),
      answer: m[2].trim(),
    })
  }
  return results
}

/**
 * Parse a body where each card is an H3 section:
 *
 *   ### Card Title
 *   Paragraph(s) of description...
 *   [Optional CTA](/url)
 *
 * Returns intro (text before first ###) + typed cards.
 * All functions are pure and never throw.
 */
export function parseH3CardList(body: string): {
  intro?: string
  cards: Array<{
    title: string
    description: string
    url?: string
    image?: string
    icon?: string
  }>
} {
  const { intro, chunks } = parseTitleBodyChunks(body)
  const cards = chunks.map(({ title, body: rawRest }) => {
    // A card image may be a leading markdown image or a `photo:` line.
    let image: string | undefined
    let rest = rawRest
    const leading = extractLeadingImage(rest)
    if (leading.src) {
      image = leading.src
      rest = leading.body
    } else {
      const photoMatch = rest.match(/^\s*photo:\s*(\S+)\s*$/im)
      if (photoMatch) {
        image = photoMatch[1].trim()
        rest = rest.replace(photoMatch[0], '').trim()
      }
    }
    // Optional `icon: Name` line — same syntax feature-grid chunks use.
    // Lowercase-only marker (no /i) so prose like "Icon: a symbol of trust"
    // on its own line can't be swallowed as metadata.
    let icon: string | undefined
    const iconMatch = rest.match(/^\s*icon:\s*([A-Za-z][A-Za-z0-9]*)\s*$/m)
    if (iconMatch) {
      icon = iconMatch[1]
      rest = rest.replace(iconMatch[0], '').trim()
    }
    // Pop trailing link as card url
    const ctaMatch = rest.match(/\[([^\]]+)\]\(([^)]+)\)\s*$/)
    if (ctaMatch) {
      return {
        title,
        description: rest.slice(0, ctaMatch.index).trimEnd(),
        url: ctaMatch[2],
        image,
        icon,
      }
    }
    return { title, description: rest, image, icon }
  })
  return { intro, cards }
}

/**
 * Parse team member sections written as:
 *
 *   ### Ron Lague, PFS
 *   Managing Partner · 40 years experience
 *   photo: ron-lague.jpg
 *   Ron has been the senior partner since 1985.
 *
 * Returns intro (text before first ###) + typed members.
 * - Credentials come from the comma-separated suffix of the H3 name line.
 * - Title line may contain a · separator (title · subtitle merged as title).
 * - photo: line (if present) is the photo filename.
 * - Remaining lines form the bio paragraph.
 * All functions are pure and never throw.
 */
export function parseTeamMembers(body: string): {
  intro?: string
  members: Array<{
    name: string
    title?: string
    credentials?: string
    bio?: string
    photo?: string
    photo_alt?: string
  }>
} {
  const { intro, chunks } = parseTitleBodyChunks(body)

  const members = chunks.map(({ title: nameLine, body: chunkBody }) => {
    // Title line shape: "Name, Credential1, Credential2, …"
    // Split on FIRST comma so multi-credential entries
    // ("Ron Lague, CPA, PFS") become name="Ron Lague", credentials="CPA, PFS".
    const commaIdx = nameLine.indexOf(',')
    const name = commaIdx > 0 ? nameLine.slice(0, commaIdx).trim() : nameLine
    const credentials = commaIdx > 0 ? nameLine.slice(commaIdx + 1).trim() : undefined

    const lines = chunkBody.split('\n').map(l => l.trim()).filter(Boolean)

    let photo: string | undefined
    const nonPhotoLines: string[] = []
    for (const line of lines) {
      if (line.startsWith('photo:')) {
        photo = line.replace(/^photo:\s*/, '').trim()
      } else {
        nonPhotoLines.push(line)
      }
    }

    // Heuristic: when there's a single non-photo content line, it's the bio,
    // not a job title. When there are 2+, the first SHORT line (under ~60
    // chars, no terminal punctuation) is a job title and the rest is bio.
    // This keeps the Phase I bold-paragraph format (no explicit title line)
    // working without misclassifying the bio as the title.
    let titleLine: string | undefined
    let bioLines: string[]
    if (nonPhotoLines.length >= 2) {
      const first = nonPhotoLines[0]
      const looksLikeTitle = first.length < 60 && !/[.!?]$/.test(first)
      if (looksLikeTitle) {
        titleLine = first.replace(/\*\*/g, '').trim()
        bioLines = nonPhotoLines.slice(1)
      } else {
        bioLines = nonPhotoLines
      }
    } else {
      bioLines = nonPhotoLines
    }

    return {
      name,
      credentials: credentials || undefined,
      title: titleLine || undefined,
      photo: photo || undefined,
      photo_alt: photo ? `Photo of ${name}` : undefined,
      bio: bioLines.join(' ').trim() || undefined,
    }
  })

  return { intro, members }
}

/**
 * Parse a body where each item is "- text" (plain bullet, no icon prefix).
 * Returns intro (all text before the first list line) and items (stripped list text).
 * Never throws.
 */
export function parseSimpleBulletList(body: string): { intro?: string; items: string[] } {
  const lines = body.split('\n')
  const firstListIdx = lines.findIndex(l => /^\s*[-*]\s+/.test(l))

  if (firstListIdx < 0) return { intro: body.trim() || undefined, items: [] }

  const intro = lines
    .slice(0, firstListIdx)
    .join('\n')
    .trim() || undefined

  const items = lines
    .slice(firstListIdx)
    .filter(l => /^\s*[-*]\s+/.test(l))
    .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean)

  return { intro, items }
}

/**
 * Parse a logo-bar list where each line is "- <filename>: <alt>".
 * Optionally a URL may be appended as "[url]" at the end.
 * Example:  "- aicpa-logo.png: AICPA [https://aicpa.org]"
 * Never throws.
 */
export function parseLogoList(
  body: string
): Array<{ src: string; alt: string; url?: string }> {
  return body
    .split('\n')
    .filter(line => /^\s*[-*]\s+/.test(line))
    .map(line => {
      const cleaned = line.replace(/^\s*[-*]\s+/, '').trim()
      // Optional trailing URL in square brackets: "alt [https://...]"
      const urlMatch = cleaned.match(/\[([^\]]+)\]\s*$/)
      const withoutUrl = urlMatch ? cleaned.slice(0, urlMatch.index).trim() : cleaned
      const url = urlMatch ? urlMatch[1] : undefined

      // Split on first ": " to get filename and alt
      const colonIdx = withoutUrl.indexOf(': ')
      if (colonIdx < 0) {
        // No colon — treat entire string as alt with no src
        return { src: '', alt: withoutUrl.trim(), url }
      }
      const src = withoutUrl.slice(0, colonIdx).trim()
      const alt = withoutUrl.slice(colonIdx + 2).trim()
      return { src, alt, url }
    })
    .filter(entry => entry.src || entry.alt) // discard completely empty lines
}

// ---------------------------------------------------------------------------
// Pricing tier types (exported so extract-block-props.ts can import)
// ---------------------------------------------------------------------------

export type PricingTier = {
  name: string
  price: string
  price_period?: string
  description: string
  features: string[]
  cta: { label: string; url: string }
  highlighted?: boolean
}

/**
 * Parse pricing tiers from a body split into H3 sections.
 * Also extracts optional intro (text before first ###) and disclaimer (text
 * after the last tier's CTA link on its own line).
 * Never throws.
 */
export function parsePricingTiers(body: string): {
  intro?: string
  tiers: PricingTier[]
  disclaimer?: string
} {
  // Normalize **Tier**\nprice\n... → ### Tier\nprice\n... so Phase I content
  // that uses bold-line tier headings parses correctly.
  const normalized = normalizeBoldHeadingsToH3(body)
  const h3Match = normalized.match(/(?:^|\n)### /)
  const firstH3 = h3Match
    ? h3Match.index! + (h3Match[0].startsWith('\n') ? 1 : 0)
    : -1
  const intro =
    firstH3 > 0 ? normalized.slice(0, firstH3).trim() || undefined : undefined

  const raw = firstH3 >= 0 ? normalized.slice(firstH3) : normalized
  const chunks = raw.split(/(?=^###\s)/m).filter(c => c.trim().startsWith('###'))

  // After the last tier there may be a disclaimer paragraph (no ### prefix)
  // We detect it by looking at the trailing text after the last chunk's CTA.
  // The disclaimer is captured per-tier below and set only when no CTA follows.
  let disclaimer: string | undefined

  const tiers: PricingTier[] = chunks.map(chunk => {
    const lines = chunk.trim().split('\n').map(l => l.trim())
    const name = lines[0].replace(/^###\s+/, '').trim()

    // Line 1: price, possibly "$300/month"
    let price = ''
    let price_period: string | undefined
    if (lines[1]) {
      const slashIdx = lines[1].indexOf('/')
      if (slashIdx > 0) {
        price = lines[1].slice(0, slashIdx).trim()
        price_period = '/' + lines[1].slice(slashIdx + 1).trim()
      } else {
        price = lines[1].trim()
      }
    }

    // Remaining lines: description paragraph(s), feature list, CTA
    const rest = lines.slice(2).join('\n').trim()

    // Detect trailing CTA link
    const ctaMatch = rest.match(/\[([^\]]+)\]\(([^)]+)\)\s*$/)
    const withoutCta = ctaMatch ? rest.slice(0, ctaMatch.index).trimEnd() : rest
    const cta: { label: string; url: string } = ctaMatch
      ? { label: ctaMatch[1], url: ctaMatch[2] }
      : { label: 'Get started', url: '/contact' }

    // Separate feature list (lines starting with "- ")
    const restLines = withoutCta.split('\n')
    const firstFeatureIdx = restLines.findIndex(l => /^\s*[-*]\s+/.test(l))

    const descLines =
      firstFeatureIdx >= 0 ? restLines.slice(0, firstFeatureIdx) : restLines
    const featureLines =
      firstFeatureIdx >= 0 ? restLines.slice(firstFeatureIdx) : []

    let description = descLines.join('\n').trim()
    const features = featureLines
      .filter(l => /^\s*[-*]\s+/.test(l))
      .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean)

    // Detect highlighted tier: description contains **Most popular** or **Recommended**
    const highlightMatch = description.match(/\*\*(Most popular|Recommended)\*\*\s*(?:—|–|--)?\s*/i)
    const highlighted = !!highlightMatch
    if (highlighted) {
      description = description.replace(/\*\*(Most popular|Recommended)\*\*\s*(?:—|–|--)?\s*/i, '').trim()
    }

    return {
      name,
      price,
      price_period,
      description,
      features,
      cta,
      highlighted: highlighted || undefined,
    }
  })

  // Look for disclaimer: text in the body after the very last CTA link that
  // sits outside any ### block. We look in the raw body after the last chunk.
  if (chunks.length > 0) {
    const lastChunk = chunks[chunks.length - 1]
    const lastChunkEnd = raw.lastIndexOf(lastChunk) + lastChunk.length
    const trailing = raw.slice(lastChunkEnd).trim()
    if (trailing && !trailing.startsWith('###')) {
      disclaimer = trailing
    }
  }

  return { intro, tiers, disclaimer }
}

/**
 * Like parseH3CardList but supports an optional metadata line right after
 * the H3 heading in the format "YYYY-MM-DD · filename.jpg" (date and image
 * both optional, separated by · / ・ / em-dash / long dash).
 * The intro is text before the first ###.
 * The trailing CTA is the LAST standalone [label](url) line in the body that
 * is NOT immediately after a ### heading.
 * Never throws.
 */
export function parseContentCardList(body: string): {
  intro?: string
  cards: Array<{ title: string; excerpt: string; url: string; image?: string; date?: string }>
  trailingCta?: { label: string; url: string }
} {
  const normalized = normalizeBoldHeadingsToH3(body)
  const h3Match = normalized.match(/(?:^|\n)### /)
  const firstH3 = h3Match
    ? h3Match.index! + (h3Match[0].startsWith('\n') ? 1 : 0)
    : -1
  const intro =
    firstH3 > 0 ? normalized.slice(0, firstH3).trim() || undefined : undefined

  const raw = firstH3 >= 0 ? normalized.slice(firstH3) : normalized
  const chunks = raw.split(/(?=^###\s)/m).filter(c => c.trim().startsWith('###'))

  // Detect a standalone trailing CTA: a [label](url) line that appears after
  // the last chunk ends (i.e. in the body after the last H3 section).
  // We find it by checking if the last line of the body (after all chunks) is a link.
  let trailingCta: { label: string; url: string } | undefined
  if (chunks.length > 0) {
    const lastChunk = chunks[chunks.length - 1]
    const afterLastChunk = raw.slice(raw.lastIndexOf(lastChunk) + lastChunk.length).trim()
    const ctaMatch = afterLastChunk.match(/^\[([^\]]+)\]\(([^)]+)\)\s*$/)
    if (ctaMatch) {
      trailingCta = { label: ctaMatch[1], url: ctaMatch[2] }
    }
  }

  const cards = chunks.map(chunk => {
    const lines = chunk.trim().split('\n')
    const title = lines[0].replace(/^###\s+/, '').trim()
    const rest = lines.slice(1)

    let image: string | undefined
    let date: string | undefined
    let startIdx = 0

    // Header lines after the title — accept any combination of:
    //   photo: filename.jpg          (Pexels-resolved or uploaded image)
    //   query: subject only          (Pexels search query — consumed, not stored;
    //                                 the image is already downloaded by builder)
    //   date: YYYY-MM-DD             (publication date)
    //   YYYY-MM-DD · filename.jpg    (legacy single-line meta form, still supported)
    // Iterate up to 3 lines greedily until we hit non-metadata prose.
    while (startIdx < Math.min(rest.length, 3)) {
      const candidate = rest[startIdx]?.trim() ?? ''
      if (!candidate) { startIdx++; continue }

      const photoMatch = candidate.match(/^photo:\s*(\S+)\s*$/i)
      const queryMatch = candidate.match(/^query:\s*.+$/i)
      const dateMatch = candidate.match(/^date:\s*(\d{4}-\d{2}-\d{2})\s*$/i)
      const legacyMatch = candidate.match(
        /^(\d{4}-\d{2}-\d{2})?\s*[·・—–]?\s*([A-Za-z0-9_\-]+\.(jpg|jpeg|png|webp|gif|svg))?$/i
      )

      if (photoMatch) {
        image = photoMatch[1].trim()
        startIdx++
      } else if (queryMatch) {
        // Consume the line but don't store — Phase II doesn't need the query.
        startIdx++
      } else if (dateMatch) {
        date = dateMatch[1]
        startIdx++
      } else if (
        legacyMatch &&
        (legacyMatch[1] || legacyMatch[2]) &&
        !candidate.startsWith('[')
      ) {
        date = legacyMatch[1] || date
        image = legacyMatch[2] || image
        startIdx++
      } else {
        break
      }
    }

    const remaining = rest.slice(startIdx).join('\n').trim()

    // Pop trailing link as card url
    const ctaMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)\s*$/)
    const url = ctaMatch ? ctaMatch[2] : '#'
    const excerpt = ctaMatch
      ? remaining.slice(0, ctaMatch.index).trimEnd()
      : remaining

    return { title, excerpt, url, image, date }
  })

  return { intro, cards, trailingCta }
}

/**
 * Splits body at a "sidebar:" marker line (case-insensitive).
 * Returns { intro, sidebar }. Both are trimmed.
 * If no marker is found, the entire body is returned as intro.
 * Never throws.
 */
export function splitOnSidebarMarker(body: string): { intro: string; sidebar?: string } {
  // Match a line that is exactly "sidebar:" (case-insensitive, optional whitespace)
  const markerMatch = body.match(/^[ \t]*sidebar:[ \t]*$/im)
  if (!markerMatch || markerMatch.index === undefined) {
    return { intro: body.trim() }
  }
  const intro = body.slice(0, markerMatch.index).trim()
  const sidebar = body.slice(markerMatch.index + markerMatch[0].length).trim() || undefined
  return { intro, sidebar }
}

/**
 * Parses a standard GFM markdown table from body.
 * Intro is text BEFORE the table; caption is text AFTER the table.
 * The separator row (|---|...) is detected to find table boundaries.
 * Returns null if no table is found. Never throws.
 */
export function parseMarkdownTable(body: string): {
  intro?: string
  headers: string[]
  rows: string[][]
  caption?: string
} | null {
  const lines = body.split('\n')

  // Find the separator row (|---|---|...) — that's row index [1] of the table
  const sepIdx = lines.findIndex(l =>
    /^\|[\s|:-]+\|/.test(l.trim()) && l.includes('-')
  )
  if (sepIdx < 1) return null

  // Header row is the line immediately before the separator
  const headerLine = lines[sepIdx - 1]
  if (!headerLine || !headerLine.trim().startsWith('|')) return null

  const parseRow = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim())

  const headers = parseRow(headerLine)

  // Collect data rows after the separator
  const rows: string[][] = []
  let endIdx = sepIdx + 1
  while (endIdx < lines.length && lines[endIdx].trim().startsWith('|')) {
    rows.push(parseRow(lines[endIdx]))
    endIdx++
  }

  // intro: text before the header row
  const tableStart = sepIdx - 1
  const intro = lines.slice(0, tableStart).join('\n').trim() || undefined

  // caption: text after the last table row
  const caption = lines.slice(endIdx).join('\n').trim() || undefined

  return { intro, headers, rows, caption }
}

/**
 * Parse testimonials written as blockquote pairs:
 *
 *   > "Quote text here."
 *   > — Name, Title at Company
 *
 * or single-line inline:
 *
 *   > "Quote" — Name, Title, Company
 *
 * Stanzas are separated by blank lines.
 * Returns typed testimonial objects. Never throws.
 */
export function parseTestimonials(body: string): Array<{
  quote: string
  name: string
  title?: string
  company?: string
}> {
  // Split into stanzas (blank-line separated groups)
  const stanzas = body.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)

  return stanzas
    .map(stanza => {
      const bqLines = stanza.split('\n').filter(l => l.startsWith('> '))
      if (bqLines.length === 0) return null

      // Attribution line: last line starting with "> —" or "> --"
      const attrIdx = bqLines.findLastIndex(l =>
        /^>\s*(—|--|-)/.test(l)
      )
      if (attrIdx < 0) return null

      const attrLine = bqLines[attrIdx].replace(/^>\s*(—|--|-)?\s*/, '').trim()
      const quoteLines = bqLines.slice(0, attrIdx).map(l =>
        l.replace(/^>\s*/, '').replace(/^"|"$/g, '').trim()
      )
      const quote = quoteLines.join(' ').trim()

      // Parse: "Name, Title at Company" or "Name, Title, Company"
      const atCompanyMatch = attrLine.match(/^(.+?)\s+at\s+(.+)$/)
      let nameWithTitle = attrLine
      let company: string | undefined

      if (atCompanyMatch) {
        nameWithTitle = atCompanyMatch[1].trim()
        company = atCompanyMatch[2].trim()
      } else {
        // Fallback: last comma-separated segment is company
        const parts = attrLine.split(',').map(p => p.trim())
        if (parts.length >= 3) {
          company = parts.pop()
          nameWithTitle = parts.join(', ')
        }
      }

      // Split name from title at first comma
      const nameComma = nameWithTitle.indexOf(',')
      const name = nameComma > 0 ? nameWithTitle.slice(0, nameComma).trim() : nameWithTitle.trim()
      const title = nameComma > 0 ? nameWithTitle.slice(nameComma + 1).trim() : undefined

      if (!quote || !name) return null
      return { quote, name, title: title || undefined, company }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)
}
