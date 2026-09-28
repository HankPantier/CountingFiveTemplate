/**
 * Advisory annotation lint for scripts/validate-deliverable.ts (2026.09.9):
 * block ids, variants and the hero pair checked against the block catalog
 * contract. WARNINGS only — the page schema stays lenient and the renderer
 * already falls back (unknown block → skipped, unknown variant → default,
 * unknown hero_variant → full-bleed image hero).
 */
import { BLOCK_CATALOG, type BlockId } from './block-catalog'

type Spec = { placement: string; variants: readonly { value: string }[] }
const spec = (id: string): Spec | undefined => (BLOCK_CATALOG as Record<string, Spec>)[id]
const values = (s: Spec) => s.variants.map((v) => v.value)

// Loose on purpose: sees annotations the strict section pattern would skip.
const ANNOTATION = /<!--\s*block:\s*([a-z0-9-]+)(?:\s*\|\s*variant:\s*([^|\s>]+))?/g

export function lintBlockAnnotations(body: string, frontmatter: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const m of body.matchAll(ANNOTATION)) {
    const [, id, variant] = m
    const s = spec(id)
    if (!s) {
      out.push(`unknown block "${id}" (not in the block catalog; the page will skip it)`)
      continue
    }
    if (s.placement === 'frontmatter') {
      out.push(`"${id}" is a page opener (frontmatter hero:), not an inline block; the page will skip it`)
      continue
    }
    if (variant !== undefined) {
      const known = values(s)
      if (!known.length) out.push(`block "${id}" takes no variant (got "${variant}")`)
      else if (!known.includes(variant)) out.push(`block "${id}": unknown variant "${variant}" (known: ${known.join(', ')}); renders the default`)
    }
  }

  const heroRaw = frontmatter.hero ?? frontmatter.hero_block
  const hero = typeof heroRaw === 'string' ? heroRaw : undefined
  const heroVariant = typeof frontmatter.hero_variant === 'string' ? frontmatter.hero_variant : undefined
  const heroSpec = hero ? spec(hero) : undefined
  if (hero && heroSpec?.placement !== 'frontmatter') {
    out.push(`hero "${hero}" is not a page opener (hero | hero-split | page-header); renders the page header`)
  } else if (heroVariant !== undefined) {
    const opener = (hero ?? 'page-header') as BlockId
    const known = values(spec(opener)!)
    if (!known.length) out.push(`hero_variant "${heroVariant}" is ignored by ${hero ? `"${opener}"` : 'the default page header (no hero: set)'}`)
    else if (!known.includes(heroVariant)) out.push(`${opener}: unknown hero_variant "${heroVariant}" (known: ${known.join(', ')})`)
  }
  return out
}
