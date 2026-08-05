/**
 * parse-page-md.ts
 * Stage 1 of the assembly pipeline: parse frontmatter + split sections.
 * Returns a fully typed PageManifest.
 */

import matter from 'gray-matter'
import { PageFrontmatterSchema } from './page-frontmatter-schema'

export type PageSection = {
  blockId: string
  variant?: string
  image?: string
  /** Model-written literal description of the block's image, for alt text. */
  alt?: string
  /**
   * Pexels search query Phase I emitted alongside this block's image, when
   * the image filename was stock-sourced. Not used by the Phase II renderer
   * (the image is already downloaded into public/content-assets/), but
   * preserved so consumers can introspect or surface it if needed.
   */
  query?: string
  /** Ink & Clay section theme. 'ink' renders the block on the deep primary
   * band (the light→ink→light rhythm); default/undefined = light canvas. */
  theme?: string
  heading: string
  content: string   // raw markdown body below the heading (excluding heading line)
  position: number
}

export type InternalLink = { url: string; anchor_text: string; reason: string }
export type FaqItem = { question: string; answer: string }

export type PageManifest = {
  // From frontmatter
  title: string
  url: string
  meta_title: string
  meta_description: string
  target_keyword: string
  secondary_keywords?: string[]
  canonical_url: string
  schema_markup: string
  hero_block: string        // 'hero' | 'hero-split' | 'page-header'
  hero_variant?: string
  hero_image?: string
  hero_image_alt?: string
  hero_subhead?: string     // Benefit-led hero copy; falls back to meta_description in consumers
  hero_headline?: string    // Marketing H1; falls back to the page title in consumers
  hero_eyebrow?: string     // Small-caps kicker above a statement-variant hero headline
  hero_video?: string       // Background video source for hero_variant: 'video'
  hero_images?: string[]    // Crossfade slides for hero_variant: 'slider'
  // Optional structured data (passed through)
  answer_block?: string
  eeat_signals?: string[]
  internal_links?: InternalLink[]
  faq_block?: FaqItem[]
  llm_citation_note?: string
  /**
   * JSON-LD graph extracted from the Phase I "## Structured Data" trailer, when
   * present. Richer than the frontmatter-derived schema; SchemaScript renders it
   * in place of its own builder. Undefined for deliverables that predate it.
   */
  json_ld?: Record<string, unknown>[]
  // Body
  sections: PageSection[]
}

/**
 * The Phase I deliverable .md files append a human-review metadata trailer
 * after the assembleable content — answer block, E-E-A-T signals, internal
 * links, FAQ dump, JSON-LD code block. It starts with a horizontal rule
 * followed by an "## SEO & AIO Metadata" heading. The trailer is intended
 * for the .docx + Word review pass, NOT for rendering on the site, so we
 * trim it before section parsing. Otherwise the last block annotation in
 * the body greedily captures everything down to end-of-file.
 */
const ASSEMBLY_END_MARKER = /\n---\n##\s+SEO\s*&(?:amp;)?\s*AIO Metadata\b/i

function trimMetadataTrailer(body: string): string {
  const m = body.match(ASSEMBLY_END_MARKER)
  return m && m.index !== undefined ? body.slice(0, m.index) : body
}

/**
 * Extract the JSON-LD graph Phase I emits in the "## Structured Data" trailer
 * (a fenced ```html block of <script type="application/ld+json"> elements).
 * That builder produces richer schema than this repo can from frontmatter alone
 * (multi-location AccountingService, sitemap-accurate breadcrumbs), so we render
 * it verbatim when present and fall back to the frontmatter builder otherwise.
 *
 * Security: we never inject the raw HTML from the deliverable. Each block is
 * JSON.parsed to a plain object here, then re-serialized through the same
 * `<`-escaping path SchemaScript uses for frontmatter-built schema. A block that
 * fails to parse is skipped, not rendered. `\/` in the emitted text is valid
 * JSON (the builder escapes `</script` as `<\/script`), so JSON.parse restores
 * the original object directly.
 */
const LD_JSON_SCRIPT = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

function extractEmittedJsonLd(rawContent: string): Record<string, unknown>[] | undefined {
  const out: Record<string, unknown>[] = []
  let m: RegExpExecArray | null
  LD_JSON_SCRIPT.lastIndex = 0
  while ((m = LD_JSON_SCRIPT.exec(rawContent)) !== null) {
    try {
      const obj = JSON.parse(m[1].trim())
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        out.push(obj as Record<string, unknown>)
      }
    } catch {
      // Unparseable block — skip; renderer falls back to frontmatter schema if
      // nothing here parses.
    }
  }
  return out.length ? out : undefined
}

/**
 * Defensive unwrap for malformed deliverables whose page body is the raw
 * content-generation envelope — a JSON object `{ "content": "...markdown...",
 * "metadata": {...} }` — instead of the assembleable block markdown. This
 * happens when a generation step stored the model's JSON response verbatim as
 * `content_markdown` upstream (observed in older Phase I zips). Left as-is, the
 * body carries no `<!-- block: -->` annotations, so the page renders with an
 * empty content area. Detect that envelope and substitute its `.content`
 * string so the real blocks render. No-op for well-formed bodies.
 */
function unwrapJsonEnvelope(body: string): string {
  const trimmed = body.trim()
  // Tolerate an optional ```json … ``` code fence around the envelope.
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/)
  const candidate = fenced ? fenced[1].trim() : trimmed
  if (!candidate.startsWith('{')) return body
  try {
    const obj = JSON.parse(candidate)
    if (obj && typeof obj.content === 'string' && obj.content.includes('<!-- block:')) {
      return obj.content
    }
  } catch {
    // Not valid JSON — leave the body untouched for normal parsing.
  }
  return body
}

export function parsePageMd(markdown: string): PageManifest {
  const parsed = matter(markdown)
  // Validate the frontmatter shape via Zod. Throws on type mismatches (e.g.
  // `faq_block: "broken"` instead of an array) so the validate-deliverable
  // script can fail CI before a malformed deliverable ships. Missing fields
  // fall back to safe defaults — old deliverables keep building.
  const fm = PageFrontmatterSchema.parse(parsed.data)
  const body = unwrapJsonEnvelope(trimMetadataTrailer(parsed.content))
  // Extract from the full content — the JSON-LD lives in the trailer that
  // trimMetadataTrailer strips off `body`.
  const json_ld = extractEmittedJsonLd(parsed.content)

  /**
   * Splits on the canonical annotation pattern:
   *   <!-- block: <id> | variant: <v> | image: <f> | alt: "<a>" | query: "<q>" -->
   * immediately followed by a ## heading.
   * Variant, image, alt, and query are all optional (in that order).
   *
   * `alt` is the model-written image description used as alt text.
   * `query` is the Pexels search query Phase I emitted alongside the image.
   * Captured here so it's surfaced on PageSection, but the renderer doesn't
   * use it — the image is already downloaded into public/content-assets/
   * by the time the deliverable lands.
   */
  const SECTION_PATTERN =
    /<!-- block: ([a-z-]+)(?:\s*\|\s*variant:\s*([a-z0-9-]+))?(?:\s*\|\s*image:\s*([^\s|>]+))?(?:\s*\|\s*alt:\s*"([^"]*)")?(?:\s*\|\s*query:\s*"([^"]+)")?(?:\s*\|\s*theme:\s*([a-z]+))?\s*-->\s*\n##\s+(.+?)\n([\s\S]*?)(?=\n<!-- block:|$)/g

  const sections: PageSection[] = []
  let m: RegExpExecArray | null
  let i = 0

  while ((m = SECTION_PATTERN.exec(body)) !== null) {
    sections.push({
      blockId: m[1],
      variant: m[2] || undefined,
      image: m[3] || undefined,
      alt: m[4] || undefined,
      query: m[5] || undefined,
      theme: m[6] || undefined,
      heading: m[7].trim(),
      content: m[8].trim(),
      position: i++,
    })
  }

  /**
   * Drop duplicate FAQ sections.
   *
   * The Phase I content generator sometimes emits an "## Frequently Asked
   * Questions" section in the body (typically annotated as content-prose),
   * even though the deliverable-builder always auto-appends a structured
   * faq-accordion block from the page's faq_block metadata. Result: two
   * FAQ sections render back-to-back with substantially identical Q&A.
   *
   * When both exist, the auto-appended faq-accordion is canonical — it has
   * the structured data behind the FAQPage JSON-LD and the proper
   * accordion UI. The body-prose version is the stray duplicate, so drop it.
   *
   * Conservative: only drops non-faq-accordion sections whose heading
   * starts with "Frequently Asked Questions" or "FAQ" AND only when an
   * faq-accordion block exists on the page. A page that legitimately
   * uses ONLY a prose FAQ keeps its content.
   */
  const hasFaqAccordion = sections.some(s => s.blockId === 'faq-accordion')
  const filteredSections = hasFaqAccordion
    ? sections.filter(
        s =>
          s.blockId === 'faq-accordion' ||
          !/^(?:Frequently Asked Questions|FAQ)\b/i.test(s.heading)
      )
    : sections

  /**
   * De-duplicate the hero headline against the lead section. When the hero
   * promotes the page's first content heading into its H1 (hero_headline
   * derived from the lead block upstream), rendering that same heading again
   * on the first section reads as a stutter. Blank the lead heading so its body
   * still renders — block components render the <h2> only when heading is set.
   */
  const heroHeadline = fm.hero_headline?.trim()
  if (heroHeadline && filteredSections.length > 0) {
    const lead = filteredSections[0]
    if (lead.heading.trim().toLowerCase() === heroHeadline.toLowerCase()) {
      filteredSections[0] = { ...lead, heading: '' }
    }
  }

  return {
    title: fm.title,
    url: fm.url,
    meta_title: fm.meta_title,
    meta_description: fm.meta_description,
    target_keyword: fm.target_keyword,
    secondary_keywords: fm.secondary_keywords,
    canonical_url: fm.canonical_url,
    schema_markup: fm.schema_markup,
    hero_block: fm.hero ?? fm.hero_block ?? 'page-header',
    hero_variant: fm.hero_variant,
    hero_image: fm.hero_image,
    hero_image_alt: fm.hero_image_alt,
    hero_subhead: fm.hero_subhead?.trim() || undefined,
    hero_headline: fm.hero_headline?.trim() || undefined,
    hero_eyebrow: fm.hero_eyebrow?.trim() || undefined,
    hero_video: fm.hero_video?.trim() || undefined,
    hero_images: fm.hero_images?.length ? fm.hero_images : undefined,
    answer_block: fm.answer_block,
    eeat_signals: fm.eeat_signals,
    internal_links: fm.internal_links,
    faq_block: fm.faq_block,
    llm_citation_note: fm.llm_citation_note,
    json_ld,
    sections: filteredSections,
  }
}
