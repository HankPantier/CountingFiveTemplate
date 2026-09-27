import chroma from 'chroma-js'

/**
 * Auto-corrected action colour for SMALL text (kickers, dates, badges).
 *
 * One action colour cannot clear 4.5:1 against both the page background and a
 * dark primary panel: for an action between them in luminance,
 * contrast(a, bg) × contrast(a, primary) = contrast(bg, primary), and a
 * navy-on-near-white site tops out near 3.2:1 on each. So theme.css ships a
 * text variant per surface family, each corrected against the colours that
 * surface actually RENDERS (theme.css emits surfaces as hsl() rounded to whole
 * percents — see toHslTokens — so the rendered colour, not the palette hex, is
 * what the text must clear):
 *   --color-action-text / -text-canvas  canvas: background, muted (flat cards), card
 *   --color-action-text-tint            the 10% / 15% action-tint badges on a card
 *   --color-action-on-primary           bg-primary sections / cards
 *   --color-action-on-ink               Section bg="ink"
 *   .dark: -text / -text-canvas / -text-tint re-derived on the dark neutrals.
 * Brand fills (buttons, rules, icons, large display accents) keep the raw
 * --color-action.
 *
 * Algorithm: move OKLCH lightness only, in 0.001 steps, away from the surfaces
 * (the side the colour already sits on first; the other side if that can't
 * reach the target). Hue is held; chroma is held unless the colour leaves the
 * sRGB gamut at the new lightness, in which case it is reduced to the largest
 * in-gamut chroma (binary search) — never clipped per channel, so the hue
 * doesn't drift. The first candidate whose emitted hex clears `minRatio` on
 * EVERY surface wins. A colour that already passes is returned EXACTLY as
 * given (same string, same case). Pure + deterministic; never throws.
 *
 * Byte parity: duplicated (logic) in the onboarding app's
 * lib/content/theme-css-generator.ts; theme.css.golden and the shared
 * palette→token table (__fixtures__/action-text-table.json) guard both.
 */

const L_STEP = 0.001
const CHROMA_SEARCH_STEPS = 24

/** Hex → HSL space-separated token ("220 75% 50%"), exactly as theme.css emits it. */
export function toHslTokens(hex: string, fallback = '220 10% 50%'): string {
  try {
    const [h, s, l] = chroma(hex).hsl()
    if (isNaN(h)) {
      // Achromatic color (grayscale) — use hue=0, keep saturation/lightness
      return `0 0% ${(l * 100).toFixed(0)}%`
    }
    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  } catch {
    return fallback
  }
}

/** "h s% l%" (optionally wrapped in hsl()) → the 8-bit hex a browser paints. */
export function hslTokensToHex(tokens: string): string {
  const m = tokens.match(/(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%/)
  if (!m) throw new Error(`not an hsl token: ${tokens}`)
  return chroma.hsl(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100).hex()
}

/** The colour a surface emitted as hsl(toHslTokens(hex)) actually renders. */
export function renderedHex(hex: string): string {
  return hslTokensToHex(toHslTokens(hex))
}

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

function minContrast(text: string, surfaces: string[]): number {
  return Math.min(...surfaces.map((s) => chroma.contrast(text, s)))
}

export function ensureTextContrast(textHex: string, surface: string | string[], minRatio = 4.5): string {
  try {
    const surfaces = Array.isArray(surface) ? surface : [surface]
    if (minContrast(textHex, surfaces) >= minRatio) return textHex
    const [l0, c0, h0] = chroma(textHex).oklch()
    const achromatic = isNaN(h0)
    const h = achromatic ? 0 : h0
    const c = achromatic ? 0 : c0
    const lighter = chroma(textHex).luminance() > chroma(surfaces[0]).luminance()
    const directions = lighter ? [1, -1] : [-1, 1]
    for (const dir of directions) {
      for (let i = 1; ; i++) {
        const l = l0 + dir * i * L_STEP
        if (l < 0 || l > 1) break
        const candidate = inGamutHex(l, c, h)
        if (minContrast(candidate, surfaces) >= minRatio) return candidate
      }
    }
    // Unreachable in either direction (mid-grey surfaces): best extreme.
    const black = inGamutHex(0, 0, h)
    const white = inGamutHex(1, 0, h)
    return minContrast(black, surfaces) >= minContrast(white, surfaces) ? black : white
  } catch {
    return textHex
  }
}

/** Action at `alpha` composited over `under` (how bg-[action]/10 paints). */
function tintOver(under: string, action: string, alpha: number): string {
  return chroma.mix(under, action, alpha, 'rgb').hex()
}

const TINT_ALPHAS = [0.1, 0.15]

/** RENDERED light-mode surfaces (hex of what the browser paints). */
export type LightSurfaces = { background: string; muted: string; card: string; primary: string; ink: string }
/** RENDERED .dark neutral surfaces. */
export type DarkSurfaces = { background: string; muted: string; card: string }

export type LightActionTextTokens = { actionText: string; actionTextTint: string; actionOnPrimary: string; actionOnInk: string }
export type DarkActionTextTokens = { actionText: string; actionTextTint: string }

export function deriveLightActionTextTokens(action: string, s: LightSurfaces): LightActionTextTokens {
  return {
    actionText: ensureTextContrast(action, [s.background, s.muted, s.card]),
    actionTextTint: ensureTextContrast(action, TINT_ALPHAS.map((a) => tintOver(s.card, action, a))),
    actionOnPrimary: ensureTextContrast(action, s.primary),
    actionOnInk: ensureTextContrast(action, s.ink),
  }
}

export function deriveDarkActionTextTokens(action: string, s: DarkSurfaces): DarkActionTextTokens {
  return {
    actionText: ensureTextContrast(action, [s.background, s.muted, s.card]),
    actionTextTint: ensureTextContrast(action, TINT_ALPHAS.map((a) => tintOver(s.card, action, a))),
  }
}
