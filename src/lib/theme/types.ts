import type { StyleAxes } from './style-axes'

export type Roundness = 'sharp' | 'soft' | 'pill'
export type Density = 'tight' | 'balanced' | 'airy'
export type VisualFeel = 'classic' | 'modern' | 'editorial'

export type DesignJson = {
  typography: {
    headingFont: string
    bodyFont: string
    /** Italic-serif accent role (Ink & Clay). Absent in older design.json files
     * → the generated fonts module uses the default (Fraunces). */
    accentFont?: string
    googleFontsUrl: string
  }
  roundness: Roundness
  density: Density
  visualFeel: VisualFeel
  /** Opt-in Revaltus-corporate treatments; absent = current look. headlineStyle
   * and eyebrowStyle drive <html data-headline> / <html data-eyebrow> in
   * layout.tsx; darkSections gates the ink section rhythm at use-site. */
  headlineStyle?: 'sans' | 'serif'
  eyebrowStyle?: 'standard' | 'mono'
  darkSections?: boolean
  /** Design Studio style axes (T2). Absent / 'default' = today's look; see
   * src/lib/theme/style-axes.ts. layout.tsx maps it to <html data-c5-*>. */
  style?: StyleAxes
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
  radius: {
    none: string
    sm: string
    md: string
    lg: string
    pill: string
  }
}
