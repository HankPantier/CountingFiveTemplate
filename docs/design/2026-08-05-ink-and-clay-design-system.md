# Ink & Clay — Design-System Floor Overhaul

**Status:** approved (brainstorm 2026-08-05) · **Repos:** `counting-five-client-template` (source), `bblcpa` (first rollout), `counting-five-onboarding` (kit + pipeline)

## Context

Client sites are spun up by cloning this template, adding content, and running a Claude Design
"restyle-only" pass that emits `content/design-overrides.css`. The result reads as *"template with a
color pass"* — competent but generic. Root cause (confirmed by a block audit): the **defaults are
weak**, not the CSS. Hero is centered text on a flat 45% scrim; cards are uniform-shadow boxes with raw
`object-cover` images; every `Section` has identical padding; there is no type scale; and the
`--c5-space-*` / `--color-complementary` / opacity tokens are defined but unused. Pure CSS overrides on
fixed generic markup can't reach layout, imagery, spacing rhythm, or type — which is where "designed"
lives.

**Decision:** raise the template floor once so every client starts refined and the Claude Design pass
sits on good bones. The chosen craft language is **"Ink & Clay"** (direction C from the brainstorm).

## The design language: Ink & Clay

A **token-driven composition system**, not a fixed palette. Its moves map to each client's existing
tokens, so it re-skins to any firm's brand.

Signature moves:
1. **Statement hero** — a large, flush-left grotesk headline with **one emphasized word** set in an
   *italic serif accent* colored with `--color-action`; a small-caps kicker (`--color-action`); primary
   CTA + underlined text link. Optional framed/graded image to the side (not a full-bleed scrim).
2. **Light → ink → light rhythm** — sections alternate a light canvas with a deep **ink band**
   (`--color-primary`) that carries indexes (industries/services) using small-caps labels + numeric
   markers in `--color-action`. Color is used *with intent*, not on every section.
3. **Framed, graded imagery** — images sit in consistent rounded frames with a subtle brand-tinted
   border/shadow; an optional **duotone grade** in `--color-primary`→`--color-action` so stock stops
   looking like stock.
4. **Indexed hairline structure** — small-caps labels, tabular numeric markers (`01 / 02 / 03`),
   hairline dividers borrowed from the accounting domain.
5. **Type as hero** — a real type scale, tight display tracking, grotesk + italic-serif accent role.

Token mapping (client-agnostic → per client):
| Language element | Token |
|---|---|
| ink band, deep sections | `--color-primary` |
| accent word, kickers, numeric markers, CTA | `--color-action` |
| secondary accents, badges | `--color-complementary` |
| frame borders / grade | `color-mix` of `--color-primary` |
| surfaces | `--color-background`, `--color-card`, `--color-near-white` |

## Foundation systems (build first — everything depends on these)

All in `src/styles/theme.css` (generated) + `src/app/globals.css` (static) + `src/app/layout.tsx` (fonts).

1. **Type scale tokens.** Add a formal scale as CSS vars consumed by blocks (replaces scattered
   `text-3xl md:text-4xl`): `--type-display`, `--type-h1..h4`, `--type-body-lg/body/small/caption`, each
   with size/line-height/tracking. Headings get tighter tracking (`-0.02em` display). Expose as Tailwind
   `@theme` utilities where practical. Update `scripts/generate-theme.ts` (onboarding's
   `design-md-builder`/`design-json-builder` mirror) to emit them from `design.json`.
2. **Accent-font role.** Introduce an **italic serif accent** font role (`--font-accent`) for the
   emphasized hero word + section eyebrows, loaded via `next/font` in `layout.tsx` alongside the client's
   heading/body fonts. Default accent = **Fraunces** italic. Type-pairing catalog
   (`lib/content/type-pairing-catalog.ts` in onboarding) gains an `accentFont` per pairing.
3. **Spacing rhythm.** Give `src/components/blocks/Section.tsx` a `spacing?: 'compact' | 'normal' |
   'spacious'` prop wired to the `--c5-space-*` tokens (compact `py-10/14`, normal `py-14/20`, spacious
   `py-20/32`). Default `normal`. Blocks stop hardcoding section padding.
4. **Imagery treatment.** New `src/components/ui/framed-media.tsx` wrapping the existing
   `skeleton-image.tsx`: consistent aspect-ratio options, rounded frame, brand-tinted border + `--shadow`
   depth, and an optional `grade="duotone"` (CSS `mix-blend` + `--color-primary`/`--color-action` layer).
   Hero, ContentSplit, and all card blocks route images through it.
5. **Elevation & motion tokens.** Add `--overlay-soft/medium`, `--duration-base: 200ms`, and a card
   depth system (`--shadow-card` at rest → `--shadow-card-hover` + `translateY(-2px)` on hover) as shared
   utilities; retire hardcoded `rgba()` shadows and `/45`,`/85` opacities.

## Block changes (identity blocks)

Each is **backward-compatible** (existing `variant` defaults unchanged) and **token-driven**. Files in
`src/components/blocks/`.

- **Hero** — new `variant: 'statement'` (the signature): light canvas, display grotesk headline with an
  italic-serif accent word (first `*word*` in the headline markdown, or an explicit `accent_word`
  frontmatter field), small-caps kicker, framed side image via `FramedMedia`. Refine existing
  image/video variants: replace flat 45% scrim with a directional `--color-primary` gradient scrim.
- **New "index band" capability** — add a `theme?: 'light' | 'ink'` prop to the section-style blocks
  (`IndustryCards`, `ServiceCards`, `FeatureGrid`, `StatsBar`): `ink` renders the deep
  `--color-primary` band with small-caps labels + `--color-action` numeric markers + hairline dividers.
- **Cards** (`ServiceCards`, `FeatureGrid`, `IndustryCards`, `ContentCards`, `TeamGrid`) — shared depth +
  hover-lift; images through `FramedMedia`; icon treatment variants (`icon-square` bordered, `icon-ghost`)
  driven by `--color-action`; `--color-complementary` put to work on badges.
- **ContentSplit / HeroSplit** — framed/graded imagery, a text-side anchor rule, `spacious` rhythm.
- **CtaBanner** — ink gradient + optional asymmetry, tightened CTA hierarchy.
- **Testimonials** — `with-avatar` variant (rounded photo + name/company + optional rating in
  `--color-action`).
- **StatsBar** — tabular numerals, small-caps labels, hairline separators, optional icons.
- **PageHeader** — ink band with a small-caps breadcrumb + accent rule.
- **Buttons** (`src/components/ui/button.tsx`) — `secondary` (primary-tint) and `tertiary`
  (action-outline) variants so non-hero CTAs carry less weight.

## Claude Design kit rework (so Design *uses* this)

The kit must advertise the new language + variants, and raise ambition from "recolor" to "compose."

- **`scripts/export-design-brief.ts`** (template) — extend `BLOCK_CATALOG` with the new variants
  (`hero:statement`, section `theme:ink`, card icon/hover variants, `testimonials:with-avatar`) and
  their token contracts; `design-system.md` documents the type scale, `--font-accent`, spacing rhythm,
  the light→ink rhythm, and `FramedMedia`. `START-HERE.md` gains an **"Ink & Clay" art-direction brief**:
  restyle-only still, but explicitly invite the statement hero, the ink-band rhythm, the italic-serif
  accent word, and duotone imagery — with a "don't ship a flat recolor" instruction.
- **Onboarding pipeline** (`counting-five-onboarding`) — `lib/content/design-md-builder.ts` documents
  the language in `design.md`; `suggest-design-tokens.ts` + the page/outline generators **select the new
  variants by default** where appropriate (home hero → `statement`; industries/services → an `ink` band;
  testimonials → `with-avatar`) so new clients ship refined without manual variant-setting.
  `type-pairing-catalog.ts` adds the `accentFont` field.

## Rollout & verification

1. **Template (source of truth):** implement foundation → hero → sections/cards → remaining blocks →
   buttons. After each wave: `npx tsc --noEmit`, `npm run build`, `npm test`. Validate visually by
   running `npm run dev` and capturing Playwright full-page screenshots of home + a service + an
   industries page.
2. **BBLCPA:** sync the changed components/theme/layout from the template (the same file set), set the
   home hero to `statement` + an industries `ink` band in the page frontmatter, and **remove/trim the old
   `content/design-overrides.css`** (the floor now does the work; keep only genuinely client-specific
   tweaks). Re-render via Playwright against BBL dev to confirm the light→ink→light language.
3. **Kit:** regenerate BBL's `design-kit/` and eyeball that `blocks.md`/`START-HERE.md` describe the new
   variants.
4. **Then** propagate to other client clones (korbey, etc.) via the same component sync.

Work happens on `feat/ink-and-clay-design-system` branches in each repo; nothing pushed to default
branches without explicit approval.

## Non-goals / guardrails

- No new runtime dependencies beyond one `next/font` accent family.
- Every change stays token-driven — no hardcoded hex in components; per-client theming and the Claude
  Design override layer must keep working.
- Backward compatibility: existing pages that don't opt into new variants render as before (only the
  refined defaults — imagery framing, type scale, spacing, card depth — apply automatically).
