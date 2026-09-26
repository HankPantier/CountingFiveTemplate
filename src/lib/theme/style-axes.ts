/**
 * Design Studio style axes (template T2). design.json `style` → <html data-c5-*>
 * attributes (layout.tsx) → presets in src/styles/style-axes.css. A value of
 * 'default' (or an absent axis) emits NO attribute, so an untouched site
 * matches no preset rule. The platform mirrors docs/design/style-axes.json
 * (onboarding lib/design/style-axes.ts) and parity-tests it.
 */
export const DEFAULT_AXIS_VALUE = 'default'

export const STYLE_AXES = {
  sectionRhythm: {
    attribute: 'data-c5-section-rhythm',
    summary: 'Vertical padding between sections: compact = tighter, generous = roomier.',
    values: ['default', 'compact', 'generous'],
  },
  cards: {
    attribute: 'data-c5-cards',
    summary: 'Card surfaces: flat = tinted fill no shadow, outlined = stronger hairline no shadow, elevated = deeper shadow.',
    values: ['default', 'flat', 'outlined', 'elevated'],
  },
  buttons: {
    attribute: 'data-c5-buttons',
    summary: 'Button shape: pill = fully rounded, sharp = square corners, bold = uppercase tracked labels.',
    values: ['default', 'pill', 'sharp', 'bold'],
  },
  heroScale: {
    attribute: 'data-c5-hero-scale',
    summary: 'Hero headline size: compact = smaller, dramatic = larger display type.',
    values: ['default', 'compact', 'dramatic'],
  },
  imageTreatment: {
    attribute: 'data-c5-image-treatment',
    summary: 'Framed images: natural = no brand grade, mono = greyscale, rounded = larger corner radius.',
    values: ['default', 'natural', 'mono', 'rounded'],
  },
  nav: {
    attribute: 'data-c5-nav',
    summary: 'Top navigation: bordered = hairline under the bar, inverted = primary-colour bar with light text.',
    values: ['default', 'bordered', 'inverted'],
  },
  footer: {
    attribute: 'data-c5-footer',
    summary: 'Footer surface: light = muted light surface, brand = primary colour.',
    values: ['default', 'light', 'brand'],
  },
  accentUsage: {
    attribute: 'data-c5-accent-usage',
    summary: 'The italic accent word in headlines: subtle = headline colour, plain = no accent styling, underline = action-colour underline.',
    values: ['default', 'subtle', 'plain', 'underline'],
  },
} as const

export type StyleAxis = keyof typeof STYLE_AXES
export type StyleAxisValue<A extends StyleAxis> = (typeof STYLE_AXES)[A]['values'][number]
export type StyleAxes = { [A in StyleAxis]?: StyleAxisValue<A> }
export const STYLE_AXIS_NAMES = Object.keys(STYLE_AXES) as StyleAxis[]

export function styleAxisAttributes(style: unknown): Record<string, string> {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return {}
  const out: Record<string, string> = {}
  for (const axis of STYLE_AXIS_NAMES) {
    const value = (style as Record<string, unknown>)[axis]
    const def = STYLE_AXES[axis]
    if (typeof value === 'string' && value !== DEFAULT_AXIS_VALUE && (def.values as readonly string[]).includes(value)) {
      out[def.attribute] = value
    }
  }
  return out
}

export function styleAxesJson(): string {
  return JSON.stringify({ version: 1, defaultValue: DEFAULT_AXIS_VALUE, axes: STYLE_AXES }, null, 2) + '\n'
}
