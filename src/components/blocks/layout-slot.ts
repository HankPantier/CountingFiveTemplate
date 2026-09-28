/**
 * Layout variants (2026.09.9) render the SAME markup as their block's default
 * variant, plus `data-layout` on the section root and pixel-neutral
 * `data-c5-slot` hooks (items · item · media · body; cta-banner: content ·
 * copy · actions): stable handles for Design Studio scoped CSS and the tests.
 * src/styles/block-layouts.css restructures from the markup alone, so the
 * site-wide layout presets (html[data-c5-layout-*], which reach
 * default-variant sections with no hooks) share its rules.
 *
 * Returns undefined — no attribute — unless the section has a layout, so every
 * existing variant's markup is byte-identical to 2026.09.8 (R1).
 */
export function layoutSlot(layout: string | undefined, name: string): string | undefined {
  return layout ? name : undefined
}
