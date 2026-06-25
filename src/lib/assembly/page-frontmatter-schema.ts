import { z } from 'zod'

/**
 * Zod schema for page-markdown frontmatter.
 *
 * Mirrors the *shape* the existing parser tolerates (so it doesn't reject any
 * deliverable that builds today), but validates types — catching cases the old
 * `String(fm.x ?? '')` casts silently swallowed (e.g. `faq_block: "broken"`
 * being silently dropped, leaving the FAQ accordion + JSON-LD empty).
 *
 * Missing fields fall back to safe defaults (matches current behavior).
 * Type mismatches throw a clear `ZodError` that callers turn into a build-time
 * failure via `scripts/validate-deliverable.ts` or a runtime `notFound()` via
 * the page route handlers (defense in depth).
 */

const FaqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
})

const InternalLinkSchema = z.object({
  url: z.string(),
  anchor_text: z.string(),
  reason: z.string(),
})

// YAML parses an empty value (`meta_description:`) as null, which plain
// z.string().default() rejects — .default() only covers undefined. Real
// deliverables ship empty fields, so null must coerce like missing.
const str = (def: string) => z.preprocess((v) => v ?? def, z.string())
const optStr = z.preprocess((v) => v ?? undefined, z.string().optional())

export const PageFrontmatterSchema = z
  .object({
    title: str(''),
    url: str('/'),
    meta_title: str(''),
    meta_description: str(''),
    target_keyword: str(''),
    canonical_url: str(''),
    schema_markup: str('WebPage'),

    // Phase I emits `hero:` (newer) but older deliverables used `hero_block:`.
    // The parser falls back from one to the other — both stay optional here
    // and the resolved value is computed in parsePageMd.
    hero: optStr,
    hero_block: optStr,
    hero_variant: optStr,
    hero_image: optStr,
    hero_image_alt: optStr,
    hero_subhead: optStr,
    hero_headline: optStr,
    // hero_variant: 'video' streams hero_video as a muted-loop background;
    // 'slider' crossfades hero_images. Both fall back to the static hero_image.
    hero_video: optStr,
    hero_images: z.array(z.string()).optional(),

    answer_block: optStr,
    eeat_signals: z.array(z.string()).optional(),
    internal_links: z.array(InternalLinkSchema).optional(),
    faq_block: z.array(FaqItemSchema).optional(),
    llm_citation_note: optStr,
  })
  // Pass through unknown fields without erroring — deliverables sometimes carry
  // extra review-only metadata we don't render but shouldn't reject.
  .passthrough()

export type PageFrontmatter = z.infer<typeof PageFrontmatterSchema>
