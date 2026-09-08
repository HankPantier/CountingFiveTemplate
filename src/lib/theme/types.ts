export type Roundness = 'sharp' | 'soft' | 'pill'
export type Density = 'tight' | 'balanced' | 'airy'
export type VisualFeel = 'classic' | 'modern' | 'editorial'

export type DesignJson = {
  typography: {
    headingFont: string
    bodyFont: string
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
