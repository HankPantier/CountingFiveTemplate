import chroma from 'chroma-js'
import { renderedHex } from './action-text-contrast'

/**
 * Surface helpers shared by scripts/generate-theme.ts (which writes theme.css)
 * and the runtime (src/lib/theme/action-edge.ts, which needs the colour the
 * primary surface actually renders). Moved here verbatim from the generator in
 * 2026.09.7 so both sides compute the same surface; theme.css output is
 * unchanged.
 */

/**
 * Helper: Pick foreground color (near-white or near-black) with WCAG contrast ratio >= 4.5
 */
export function pickForeground(
  bgHex: string,
  nearWhiteHex: string,
  nearBlackHex: string
): string {
  try {
    const cw = chroma.contrast(bgHex, nearWhiteHex)
    const cb = chroma.contrast(bgHex, nearBlackHex)
    if (cw >= 4.5) return nearWhiteHex
    if (cb >= 4.5) return nearBlackHex
    return cw >= cb ? nearWhiteHex : nearBlackHex
  } catch {
    return nearWhiteHex
  }
}

/**
 * Helper: Override the HSL lightness of a color. `targetL` is 0–100.
 * Preserves the original hue and saturation. Uses chroma's `.set('hsl.l', ...)`
 * to avoid the bare-array constructor which defaults to RGB.
 */
export function setLightness(hex: string, targetL: number): string {
  try {
    return chroma(hex).set('hsl.l', targetL / 100).hex()
  } catch {
    return hex
  }
}

/**
 * Helper: Nudge a surface (background) color's lightness until it reaches the
 * WCAG contrast `minRatio` against the given foreground, preserving hue +
 * saturation. Darkens when the foreground is the lighter of the pair, lightens
 * otherwise — so it always converges (contrast grows without bound toward the
 * opposite extreme). A no-op when the pair already passes.
 *
 * Why: client brand palettes are externally driven and a borderline surface
 * (e.g. a mid-gray `secondary`) can ship just under AA. This auto-corrects the
 * shipped surface by an imperceptible amount instead of failing the audit.
 */
export function ensureContrast(bgHex: string, fgHex: string, minRatio = 4.5): string {
  try {
    if (chroma.contrast(bgHex, fgHex) >= minRatio) return bgHex
    const darkenBg = chroma(fgHex).luminance() > chroma(bgHex).luminance()
    const startL = Math.round(chroma(bgHex).get('hsl.l') * 100)
    for (let l = startL; l >= 0 && l <= 100; darkenBg ? l-- : l++) {
      const candidate = setLightness(bgHex, l)
      if (chroma.contrast(candidate, fgHex) >= minRatio) return candidate
    }
    return setLightness(bgHex, darkenBg ? 0 : 100)
  } catch {
    return bgHex
  }
}

/**
 * The colour `--color-primary` renders as, exactly as generate-theme.ts emits
 * it: the AA-corrected primary surface (against its picked foreground), written
 * as hsl() rounded to whole percents.
 */
export function renderedPrimarySurface(palette: { primary: string; nearWhite: string; nearBlack: string }): string {
  const fg = pickForeground(palette.primary, palette.nearWhite, palette.nearBlack)
  return renderedHex(ensureContrast(palette.primary, fg))
}
