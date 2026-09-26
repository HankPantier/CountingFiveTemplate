/**
 * The fonts a client site can load live (via the generated next/font module,
 * src/app/fonts.generated.ts). ⊇ the platform's CURATED_FONTS + the mono role.
 * `weights` = which of the role weights (400/500/700) the family ships;
 * `italic` = whether it ships an italic. Both are verified against next/font's
 * font-data.json by font-manifest.test.ts, and CI builds every entry once
 * (the `fonts` job). The platform keeps a byte-parity port
 * (onboarding lib/content/font-manifest.ts) checked against
 * docs/design/font-manifest.json.
 */
export type FontManifestEntry = {
  family: string
  importName: string
  weights: readonly string[]
  italic: boolean
}

export const ROLE_WEIGHTS = ['400', '500', '700'] as const
export const MONO_FAMILY = 'Geist Mono'
export const DEFAULT_TYPOGRAPHY = { headingFont: 'Public Sans', bodyFont: 'Public Sans', accentFont: 'Fraunces' } as const

const W3: readonly string[] = ROLE_WEIGHTS
const f = (family: string, weights: readonly string[], italic = true): FontManifestEntry => ({
  family,
  importName: family.replace(/ /g, '_'),
  weights,
  italic,
})

export const FONT_MANIFEST: readonly FontManifestEntry[] = [
  f('Bitter', W3),
  f('DM Sans', W3),
  f('DM Serif Display', ['400']),
  f('Fraunces', W3),
  f('Geist Mono', W3, false),
  f('IBM Plex Sans', W3),
  f('IBM Plex Serif', W3),
  f('Inter', W3),
  f('Karla', W3),
  f('Libre Caslon Text', ['400', '700']),
  f('Libre Franklin', W3),
  f('Lora', W3),
  f('Manrope', W3, false),
  f('Merriweather', W3),
  f('Nunito', W3),
  f('Nunito Sans', W3),
  f('Open Sans', W3),
  f('Playfair Display', W3),
  f('Plus Jakarta Sans', W3),
  f('Public Sans', W3),
  f('Source Sans 3', W3),
  f('Source Serif 4', W3),
]

export function fontManifestJson(): string {
  return JSON.stringify({ version: 1, defaults: DEFAULT_TYPOGRAPHY, mono: MONO_FAMILY, fonts: FONT_MANIFEST }, null, 2) + '\n'
}
