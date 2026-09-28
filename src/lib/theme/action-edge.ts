import chroma from 'chroma-js'
import type { BrandJson } from '@/lib/brand/types'
import { renderedPrimarySurface } from './surface-contrast'

/**
 * brand.json palette → `<html data-c5-action-edge="on">` (layout.tsx).
 *
 * The call-to-action button (Button variant "cta", raw --color-action fill)
 * also sits on primary bands — the CtaBanner at the foot of most pages. When
 * the raw action colour is under 3:1 against the rendered primary the button
 * shape dissolves into the band (Accord crimson on charcoal 1.50:1, Aurora
 * 2.08, Abramson 2.19, Pryor 2.64, Berg 2.91, Buss 2.93). With the attribute,
 * globals.css draws a 2px inner edge in --color-action-on-primary (≥ 4.5:1 on
 * primary by construction) around those buttons, so their boundary clears the
 * WCAG 1.4.11 3:1 non-text threshold. Fill and label are unchanged.
 *
 * Gated on the palette so every site whose raw action already clears 3:1 on
 * primary (Kinexus 3.14, bblcpa 5.32, the template default) emits nothing and
 * renders exactly as before (R1). Never throws: a malformed palette emits
 * nothing.
 */
export const ACTION_EDGE_ATTRIBUTE = 'data-c5-action-edge'

/** WCAG 1.4.11 non-text contrast. */
export const NON_TEXT_MIN_RATIO = 3

export function actionOnPrimaryRatio(palette: BrandJson['palette']): number {
  return chroma.contrast(palette.action, renderedPrimarySurface(palette))
}

export function actionEdgeAttributes(brand: Pick<BrandJson, 'palette'>): Record<string, string> {
  try {
    const palette = brand.palette
    if (!palette?.action || !palette.primary || !palette.nearWhite || !palette.nearBlack) return {}
    return actionOnPrimaryRatio(palette) < NON_TEXT_MIN_RATIO ? { [ACTION_EDGE_ATTRIBUTE]: 'on' } : {}
  } catch {
    return {}
  }
}
