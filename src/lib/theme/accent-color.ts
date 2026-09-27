/**
 * Colour for LARGE action-coloured display text: the headline accent word
 * (Hero, HeroSplit, PageHeader, IntroText), primary-band StatsBar figures and
 * the pricing-calculator estimate.
 *
 * Raw --color-action is unreadable on the primary / ink bands with real
 * palettes (Accord crimson on charcoal 1.50:1, Pryor 1.26:1). globals.css
 * rebinds --color-action-text per surface — the canvas value on light
 * surfaces, --color-action-on-primary inside .bg-primary, -on-ink inside
 * .u-surface-ink / ink bands — each the action moved in lightness only to
 * 4.5:1. Where the raw action already passes, the token IS the raw action
 * (no visual change); a theme.css that predates the token falls back to raw.
 */
export const ACTION_DISPLAY_COLOR = 'var(--color-action-text, var(--color-action))'
