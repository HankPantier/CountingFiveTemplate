import chroma from 'chroma-js'

/**
 * Auto-corrected action colour for SMALL text (kickers, dates, badges).
 *
 * One action colour cannot clear 4.5:1 against both the page background and a
 * dark primary panel: for an action between them in luminance,
 * contrast(a, bg) × contrast(a, primary) = contrast(bg, primary), and a
 * navy-on-near-white site tops out near 3.2:1 on each. So theme.css ships two
 * derived text tokens, each corrected against the ONE surface it is used on:
 *   --color-action-text        vs the page background (palette.nearWhite)
 *   --color-action-on-primary  vs the AA-corrected primary (bg-primary)
 * Brand fills (buttons, rules, icons, large display accents) keep the raw
 * --color-action.
 *
 * Algorithm: move OKLCH lightness only, in 0.001 steps, away from the surface
 * (the side the colour already sits on first; the other side if that can't
 * reach the target). Hue is held; chroma is held unless the colour leaves the
 * sRGB gamut at the new lightness, in which case it is reduced to the largest
 * in-gamut chroma (binary search) — never clipped per channel, so the hue
 * doesn't drift. The first candidate whose emitted hex clears `minRatio` wins,
 * so the change is the smallest that passes. A colour that already passes is
 * returned EXACTLY as given (same string, same case) — untouched palettes emit
 * byte-identical values. Pure + deterministic; never throws.
 *
 * Byte parity: this is duplicated verbatim (logic) in the onboarding app's
 * lib/content/theme-css-generator.ts; theme.css.golden guards both.
 */

const L_STEP = 0.001
const CHROMA_SEARCH_STEPS = 24

function inGamutHex(l: number, c: number, h: number): string {
  const direct = chroma.oklch(l, c, h)
  if (!direct.clipped()) return direct.hex()
  let lo = 0
  let hi = c
  for (let i = 0; i < CHROMA_SEARCH_STEPS; i++) {
    const mid = (lo + hi) / 2
    if (chroma.oklch(l, mid, h).clipped()) hi = mid
    else lo = mid
  }
  return chroma.oklch(l, lo, h).hex()
}

export function ensureTextContrast(textHex: string, surfaceHex: string, minRatio = 4.5): string {
  try {
    if (chroma.contrast(textHex, surfaceHex) >= minRatio) return textHex
    const [l0, c0, h0] = chroma(textHex).oklch()
    const achromatic = isNaN(h0)
    const h = achromatic ? 0 : h0
    const c = achromatic ? 0 : c0
    const lighter = chroma(textHex).luminance() > chroma(surfaceHex).luminance()
    const directions = lighter ? [1, -1] : [-1, 1]
    for (const dir of directions) {
      for (let i = 1; ; i++) {
        const l = l0 + dir * i * L_STEP
        if (l < 0 || l > 1) break
        const candidate = inGamutHex(l, c, h)
        if (chroma.contrast(candidate, surfaceHex) >= minRatio) return candidate
      }
    }
    // Unreachable in either direction (a mid-grey surface): best extreme.
    const black = inGamutHex(0, 0, h)
    const white = inGamutHex(1, 0, h)
    return chroma.contrast(black, surfaceHex) >= chroma.contrast(white, surfaceHex) ? black : white
  } catch {
    return textHex
  }
}

export type ActionTextColors = {
  /** Small action text on the page background (light mode). */
  actionText: string
  /** Small action text on the AA-corrected primary surface. */
  actionOnPrimary: string
  /** Small action text on the dark-mode card/background surfaces (.dark). */
  darkActionText: string
}

/**
 * @param action     palette.action
 * @param background the rendered page background (palette.nearWhite)
 * @param primaryBg  the AA-corrected primary surface (bg-primary)
 * @param darkCard   the lighter of the two dark-mode neutral surfaces (card);
 *                   clearing it also clears the darker dark background.
 */
export function deriveActionTextColors(
  action: string,
  background: string,
  primaryBg: string,
  darkCard: string
): ActionTextColors {
  return {
    actionText: ensureTextContrast(action, background),
    actionOnPrimary: ensureTextContrast(action, primaryBg),
    darkActionText: ensureTextContrast(action, darkCard),
  }
}
