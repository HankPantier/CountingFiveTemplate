/**
 * Full-bleed photo / video backgrounds (2026.09.10): the image cta-banner and
 * the image / video / slider Hero. Both render the media at -z-20 and a scrim
 * at -z-10 inside a `bg-primary` section; without a stacking context of its
 * own the section's fill painted over both (every such banner / hero rendered
 * flat). MEDIA_SECTION_CLASS isolates the section so they paint above it.
 *
 * Scrim: the palette's ink — a primary-tinted near-black that generate-theme.ts
 * pins at 12% lightness for every brand; `--color-near-black` on themes that
 * predate the token (Slachta, TruCount) — at 86% (top-left) → 76%. The photo
 * shows through at 14–24% of its light, and near-white copy (the body at 80%
 * alpha) holds ≥ 5:1 even over a pure-white photo on every fleet palette
 * (e2e/cta-banner-image.spec.ts, e2e/hero-image.spec.ts).
 */
const SCRIM_INK = 'var(--color-ink, var(--color-near-black))'

export const MEDIA_SCRIM =
  `linear-gradient(160deg, color-mix(in srgb, ${SCRIM_INK} 86%, transparent) 0%, ` +
  `color-mix(in srgb, ${SCRIM_INK} 76%, transparent) 100%)`

/**
 * Section classes for a media background: `isolate` (the stacking context),
 * and the copy token pinned to near-white — the scrim is always dark, while a
 * light brand's primary-foreground is dark. A token re-scope, so client
 * override rules keep their specificity (as `.u-band-ink` does).
 */
export const MEDIA_SECTION_CLASS = 'isolate [--color-primary-foreground:var(--color-near-white)]'

/**
 * Small action-coloured text over the photo (the Hero eyebrow and headline
 * accent read `--color-action-text`): a light tint of the ink-corrected action
 * colour (35% action + 65% near-white). The raw action colour is only AA
 * against the solid ink; over a bright photo seen through the scrim it drops
 * to ~2.2:1 on mid-tone brand accents. Set on a CHILD of the section: the
 * unlayered `.bg-primary { --color-action-text }` rule (globals.css) outranks
 * a utility on the section itself.
 */
export const MEDIA_ACTION_TEXT_CLASS =
  '[--color-action-text:color-mix(in_srgb,var(--color-action-on-ink,var(--color-action))_35%,var(--color-near-white))]'
