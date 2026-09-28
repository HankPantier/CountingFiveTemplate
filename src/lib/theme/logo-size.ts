import type { DesignJson } from './types'

/**
 * design.json `logo.size` → `<html data-c5-logo-size="large">` (layout.tsx).
 *
 * The header and footer logos render at a fixed 32px height (`h-8`). That is
 * small for stacked or two-line lockups (Stephen P. Pryor CPA). `"large"`
 * raises it — 40px on phones, 44px from the md breakpoint in the header, 40px
 * in the footer — through src/styles/logo-size.css, every rule of which is
 * gated on the attribute.
 *
 * Absent / `"standard"` / anything unrecognised emits nothing, so every site
 * that has not opted in renders exactly as before (R1).
 *
 * Deliberately NOT a Design Studio style axis: a concept rewrites the whole
 * `style` object (absent axis = default), so an axis would reset an operator's
 * size on every concept apply, and the Studio critic never scores the logo.
 * `logo` is a sibling key the Studio's design.json merge carries through
 * untouched. The platform sets it from the Theme Studio Controls.
 */
export const LOGO_SIZES = ['standard', 'large'] as const
export type LogoSize = (typeof LOGO_SIZES)[number]

export const LOGO_SIZE_ATTRIBUTE = 'data-c5-logo-size'

export function logoSizeAttributes(design: Pick<DesignJson, 'logo'> | null | undefined): Record<string, string> {
  const logo: unknown = design?.logo
  if (!logo || typeof logo !== 'object' || Array.isArray(logo)) return {}
  return (logo as { size?: unknown }).size === 'large' ? { [LOGO_SIZE_ATTRIBUTE]: 'large' } : {}
}
