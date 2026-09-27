import type { BrandJson } from './types'

/**
 * brand.json `logo.tone` → `<html data-c5-logo-tone="light">` (layout.tsx).
 *
 * A white/light logo (Berg: white wordmark on transparent) is invisible on the
 * light header and, because the footer inverts the primary logo, on the dark
 * footer too. The rules keyed on this attribute live in globals.css ("Light
 * logos"). Only an explicit `tone: "light"` WITH a logo image emits anything,
 * so every site whose logo is dark, unset or a text wordmark is unchanged (R1).
 *
 * The platform's logo preflight (onboarding lib/content/logo-preflight.ts,
 * `applyLogoTone`) writes the flag on a first deploy when the uploaded logo is
 * mostly light; an operator can set it by hand in brand.json on a live site.
 */
export const LOGO_TONE_ATTRIBUTE = 'data-c5-logo-tone'

export function logoToneAttributes(brand: Pick<BrandJson, 'logo'>): Record<string, string> {
  const logo = brand.logo
  if (!logo || logo.tone !== 'light' || !logo.primary) return {}
  return { [LOGO_TONE_ATTRIBUTE]: 'light' }
}
