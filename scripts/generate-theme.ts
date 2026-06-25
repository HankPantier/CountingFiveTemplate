#!/usr/bin/env tsx
import { promises as fs } from 'node:fs'
import path from 'node:path'
import chroma from 'chroma-js'
import type { BrandJson } from '../src/lib/brand/types'
import type { DesignJson } from '../src/lib/theme/types'

/**
 * Helper: Convert a hex color to HSL space-separated token (e.g., "220 75% 50%")
 * without the hsl() wrapper.
 */
function toHslTokens(hex: string, fallback = '220 10% 50%'): string {
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

/**
 * Helper: Pick foreground color (near-white or near-black) with WCAG contrast ratio >= 4.5
 */
function pickForeground(
  bgHex: string,
  nearWhiteHex: string,
  nearBlackHex: string
): string {
  try {
    const cw = chroma.contrast(bgHex, nearWhiteHex)
    const cb = chroma.contrast(bgHex, nearBlackHex)
    if (cw >= 4.5) return nearWhiteHex
    if (cb >= 4.5) return nearBlackHex
    return cw >= cb ? nearWhiteHex : nearBlackHex
  } catch {
    return nearWhiteHex
  }
}

/**
 * Helper: Override the HSL lightness of a color. `targetL` is 0–100.
 * Preserves the original hue and saturation. Uses chroma's `.set('hsl.l', ...)`
 * to avoid the bare-array constructor which defaults to RGB.
 */
function setLightness(hex: string, targetL: number): string {
  try {
    return chroma(hex).set('hsl.l', targetL / 100).hex()
  } catch {
    return hex
  }
}

/**
 * Helper: Nudge a surface (background) color's lightness until it reaches the
 * WCAG contrast `minRatio` against the given foreground, preserving hue +
 * saturation. Darkens when the foreground is the lighter of the pair, lightens
 * otherwise — so it always converges (contrast grows without bound toward the
 * opposite extreme). A no-op when the pair already passes.
 *
 * Why: client brand palettes are externally driven and a borderline surface
 * (e.g. a mid-gray `secondary`) can ship just under AA. This auto-corrects the
 * shipped surface by an imperceptible amount instead of failing the audit.
 */
function ensureContrast(bgHex: string, fgHex: string, minRatio = 4.5): string {
  try {
    if (chroma.contrast(bgHex, fgHex) >= minRatio) return bgHex
    const darkenBg = chroma(fgHex).luminance() > chroma(bgHex).luminance()
    const startL = Math.round(chroma(bgHex).get('hsl.l') * 100)
    for (let l = startL; l >= 0 && l <= 100; darkenBg ? l-- : l++) {
      const candidate = setLightness(bgHex, l)
      if (chroma.contrast(candidate, fgHex) >= minRatio) return candidate
    }
    return setLightness(bgHex, darkenBg ? 0 : 100)
  } catch {
    return bgHex
  }
}

async function main() {
  try {
    // 1. Read brand.json and design.json
    const brandPath = path.join(process.cwd(), 'content', 'brand.json')
    const designPath = path.join(process.cwd(), 'content', 'design.json')

    const brandJson = JSON.parse(
      await fs.readFile(brandPath, 'utf-8')
    ) as BrandJson
    const designJson = JSON.parse(
      await fs.readFile(designPath, 'utf-8')
    ) as DesignJson

    const { palette } = brandJson
    const { typography, spacing, radius } = designJson

    // 2. Build palette → shadcn semantic mapping
    const primaryFg = pickForeground(
      palette.primary,
      palette.nearWhite,
      palette.nearBlack
    )
    const secondaryFg = pickForeground(
      palette.secondary,
      palette.nearWhite,
      palette.nearBlack
    )
    const accentFg = pickForeground(
      palette.complementary,
      palette.nearWhite,
      palette.nearBlack
    )

    // Auto-correct any brand surface that ships just under WCAG AA against its
    // chosen foreground. No-op for pairs that already pass (primary / accent
    // here); nudges a borderline `secondary` by an imperceptible amount.
    const primaryBg = ensureContrast(palette.primary, primaryFg)
    const secondaryBg = ensureContrast(palette.secondary, secondaryFg)
    const accentBg = ensureContrast(palette.complementary, accentFg)

    // Body text floor: ensure the primary text color clears AA against the page
    // background. ensureContrast nudges the *text* lightness (first arg) toward
    // contrast, preserving hue/saturation, so a brand whose nearBlack/nearWhite
    // ship too close still renders readable body copy. Keep palette.nearBlack
    // itself untouched for the literal --color-near-black token + hero scrim.
    const foreground = ensureContrast(palette.nearBlack, palette.nearWhite)

    // Derive muted colors. nearBlack → ~40% L gives a mid-gray for body-secondary
    // text. nearWhite → ~95% L gives an off-white muted surface. nearWhite →
    // ~90% L gives a light-gray border. Floor the muted text against its surface
    // too — it's used at body sizes (metadata, captions).
    const muted = setLightness(palette.nearWhite, 95)
    const mutedForeground = ensureContrast(setLightness(palette.nearBlack, 40), muted)
    const borderColor = setLightness(palette.nearWhite, 90)

    // Static red for destructive. Use chroma's HSL constructor explicitly so
    // the bare-array doesn't get treated as RGB.
    const destructive = chroma.hsl(0, 0.84, 0.6).hex()

    // 2b. Verify WCAG AA contrast for every fg/bg pair the theme exposes.
    // Warn-only: a failed pair still ships, but the CLI prints what failed
    // and by how much so the operator can adjust brand.json before delivery.
    // Normal-text threshold (4.5:1) — UI tap-targets like hover states use
    // these tokens at body-text sizes, so AA-large (3:1) isn't strict enough.
    // Footer renders nearWhite text at 90% opacity over nearBlack. Approximate
    // the rendered color via alpha blend: 0.9 * fg + 0.1 * bg.
    const footerMutedText = chroma.mix(palette.nearBlack, palette.nearWhite, 0.9, 'rgb').hex()

    const REQUIRED_PAIRS: Array<{ name: string; bg: string; fg: string; minRatio: number }> = [
      { name: 'foreground / background',         bg: palette.nearWhite,     fg: palette.nearBlack, minRatio: 4.5 },
      { name: 'primary-fg / primary',            bg: primaryBg,             fg: primaryFg,         minRatio: 4.5 },
      { name: 'secondary-fg / secondary',        bg: secondaryBg,           fg: secondaryFg,       minRatio: 4.5 },
      { name: 'accent-fg / accent',              bg: accentBg,              fg: accentFg,          minRatio: 4.5 },
      { name: 'muted-fg / muted',                bg: muted,                 fg: mutedForeground,   minRatio: 4.5 },
      { name: 'footer muted text (text-bg/90)',  bg: palette.nearBlack,     fg: footerMutedText,   minRatio: 4.5 },
    ]
    const failures: string[] = []
    for (const { name, bg, fg, minRatio } of REQUIRED_PAIRS) {
      const ratio = chroma.contrast(bg, fg)
      if (ratio < minRatio) {
        failures.push(`${name}: ${ratio.toFixed(2)} : 1 (need ${minRatio} : 1) — bg=${bg} fg=${fg}`)
      }
    }
    if (failures.length) {
      console.warn('\n⚠ WCAG AA contrast failures detected in generated theme:')
      for (const line of failures) console.warn(`  - ${line}`)
      console.warn('Action: review brand.json palette and/or pickForeground() output. The site will render but parts will fail accessibility audits.\n')
    }

    // 2c. Dark-mode neutrals (system preference, no toggle). Only the neutral
    // surfaces/text flip — brand-colour tokens (primary/secondary/accent/action)
    // and the footer keep their values, so the dark theme stays on-brand and
    // colored heros/buttons/CTAs render identically. Derived from the brand
    // near-black/near-white so the dark greys feel cohesive with the palette.
    const darkBackground = setLightness(palette.nearBlack, 9)
    const darkForeground = ensureContrast(setLightness(palette.nearWhite, 92), darkBackground)
    const darkCard = setLightness(palette.nearBlack, 13)
    const darkMuted = setLightness(palette.nearBlack, 17)
    const darkMutedForeground = ensureContrast(setLightness(palette.nearWhite, 60), darkMuted)
    const darkBorder = setLightness(palette.nearBlack, 24)

    // Elevation: tint shadows with the brand primary (low alpha) instead of
    // generic black, so cards/popovers read as part of the palette. Drives both
    // the --shadow-card token the block cards reference and the Tailwind
    // shadow-sm/md/lg utilities the shadcn components use.
    const [sr, sg, sb] = chroma(palette.primary).rgb()
    const shadowRgb = `${sr}, ${sg}, ${sb}`

    // 3. Build the @theme CSS block
    const themeCss = `/* This file is generated by scripts/generate-theme.ts.
 * Edit brand.json / design.json and rerun the script instead of editing this file. */

@theme {
  /* Palette → shadcn semantic CSS variables (HSL space-separated).
   * Surface tokens use the AA-corrected backgrounds (see ensureContrast). */
  --color-primary: hsl(${toHslTokens(primaryBg)});
  --color-primary-foreground: hsl(${toHslTokens(primaryFg)});
  --color-secondary: hsl(${toHslTokens(secondaryBg)});
  --color-secondary-foreground: hsl(${toHslTokens(secondaryFg)});
  --color-accent: hsl(${toHslTokens(accentBg)});
  --color-accent-foreground: hsl(${toHslTokens(accentFg)});
  --color-background: hsl(${toHslTokens(palette.nearWhite)});
  --color-foreground: hsl(${toHslTokens(foreground)});
  --color-muted: hsl(${toHslTokens(muted)});
  --color-muted-foreground: hsl(${toHslTokens(mutedForeground)});
  --color-card: hsl(${toHslTokens(palette.nearWhite)});
  --color-card-foreground: hsl(${toHslTokens(foreground)});
  --color-popover: hsl(${toHslTokens(palette.nearWhite)});
  --color-popover-foreground: hsl(${toHslTokens(foreground)});
  --color-border: hsl(${toHslTokens(borderColor)});
  --color-input: hsl(${toHslTokens(borderColor)});
  --color-ring: hsl(${toHslTokens(palette.action)});
  --color-destructive: hsl(${toHslTokens(destructive)});
  --color-destructive-foreground: hsl(${toHslTokens(palette.nearWhite)});

  /* Custom brand tokens — used directly by block components via var() */
  --color-action: ${palette.action};
  --color-action-foreground: ${palette.nearWhite};
  --color-primary-hex: ${palette.primary};
  --color-near-black: ${palette.nearBlack};
  --color-near-white: ${palette.nearWhite};
  --color-complementary: ${palette.complementary};

  /* Footer surface — intentionally dark in BOTH light and dark mode, so the
   * footer stays a consistent dark anchor instead of inverting under the
   * prefers-color-scheme override below. */
  --color-footer: ${palette.nearBlack};
  --color-footer-foreground: ${palette.nearWhite};

  /* Spacing scale — exposed under a c5-prefixed namespace to avoid
   * colliding with Tailwind v4's --spacing-* namespace, which feeds
   * max-w-*, w-*, h-*, p-*, m-*, gap-* utilities. Naming these tokens
   * spacing-xs/sm/md/lg/xl/2xl would silently override max-w-2xl etc.
   * Reference these in custom CSS via var(--c5-space-xs). For Tailwind
   * utility values, use the native scale (p-1=4px, p-2=8px, p-4=16px,
   * p-6=24px, p-12=48px, p-24=96px). */
  --c5-space-xs: ${spacing.xs};
  --c5-space-sm: ${spacing.sm};
  --c5-space-md: ${spacing.md};
  --c5-space-lg: ${spacing.lg};
  --c5-space-xl: ${spacing.xl};
  --c5-space-2xl: ${spacing['2xl']};

  /* Radius (from design.json) */
  --radius-none: ${radius.none};
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-pill: ${radius.pill};
  --radius: var(--radius-lg);

  /* Elevation — brand-tinted shadows (derived from the primary colour). These
   * override Tailwind's default shadow-sm/md/lg utilities AND expose a
   * shadow-card / shadow-card-hover pair for the content block cards. */
  --shadow-sm: 0 1px 2px 0 rgba(${shadowRgb}, 0.06);
  --shadow-md: 0 4px 12px -2px rgba(${shadowRgb}, 0.10);
  --shadow-lg: 0 12px 24px -6px rgba(${shadowRgb}, 0.16);
  --shadow-card: 0 2px 8px rgba(${shadowRgb}, 0.08);
  --shadow-card-hover: 0 8px 20px -4px rgba(${shadowRgb}, 0.16);

  /* Font family CSS vars — next/font sets these at runtime via className,
   * but we expose semantic names here so components can reference them */
  --font-heading: var(--font-heading-loaded, system-ui, sans-serif);
  --font-body: var(--font-body-loaded, system-ui, sans-serif);
}

:root {
  /* Duplicate in :root for shadcn components that read vars directly */
  --color-primary: hsl(${toHslTokens(primaryBg)});
  --color-primary-foreground: hsl(${toHslTokens(primaryFg)});
  --color-secondary: hsl(${toHslTokens(secondaryBg)});
  --color-secondary-foreground: hsl(${toHslTokens(secondaryFg)});
  --color-accent: hsl(${toHslTokens(accentBg)});
  --color-accent-foreground: hsl(${toHslTokens(accentFg)});
  --color-background: hsl(${toHslTokens(palette.nearWhite)});
  --color-foreground: hsl(${toHslTokens(foreground)});
  --color-muted: hsl(${toHslTokens(muted)});
  --color-muted-foreground: hsl(${toHslTokens(mutedForeground)});
  --color-card: hsl(${toHslTokens(palette.nearWhite)});
  --color-card-foreground: hsl(${toHslTokens(foreground)});
  --color-popover: hsl(${toHslTokens(palette.nearWhite)});
  --color-popover-foreground: hsl(${toHslTokens(foreground)});
  --color-border: hsl(${toHslTokens(borderColor)});
  --color-input: hsl(${toHslTokens(borderColor)});
  --color-ring: hsl(${toHslTokens(palette.action)});
  --color-destructive: hsl(${toHslTokens(destructive)});
  --color-destructive-foreground: hsl(${toHslTokens(palette.nearWhite)});

  /* Custom brand tokens */
  --color-action: ${palette.action};
  --color-action-foreground: ${palette.nearWhite};
  --color-primary-hex: ${palette.primary};
  --color-near-black: ${palette.nearBlack};
  --color-near-white: ${palette.nearWhite};
  --color-complementary: ${palette.complementary};

  /* Footer surface — intentionally dark in BOTH light and dark mode, so the
   * footer stays a consistent dark anchor instead of inverting under the
   * prefers-color-scheme override below. */
  --color-footer: ${palette.nearBlack};
  --color-footer-foreground: ${palette.nearWhite};

  /* Spacing scale (c5-prefixed to avoid Tailwind --spacing-* collision) */
  --c5-space-xs: ${spacing.xs};
  --c5-space-sm: ${spacing.sm};
  --c5-space-md: ${spacing.md};
  --c5-space-lg: ${spacing.lg};
  --c5-space-xl: ${spacing.xl};
  --c5-space-2xl: ${spacing['2xl']};

  /* Radius */
  --radius-none: ${radius.none};
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-pill: ${radius.pill};
  --radius: var(--radius-lg);

  /* Font family */
  --font-heading: var(--font-heading-loaded, system-ui, sans-serif);
  --font-body: var(--font-body-loaded, system-ui, sans-serif);
}

/* System-preference dark mode. Flips only the neutral surfaces + text; brand
 * colour tokens and the footer are intentionally left untouched so colored
 * heros, buttons, and CTAs render identically and stay on-brand. */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: hsl(${toHslTokens(darkBackground)});
    --color-foreground: hsl(${toHslTokens(darkForeground)});
    --color-card: hsl(${toHslTokens(darkCard)});
    --color-card-foreground: hsl(${toHslTokens(darkForeground)});
    --color-popover: hsl(${toHslTokens(darkCard)});
    --color-popover-foreground: hsl(${toHslTokens(darkForeground)});
    --color-muted: hsl(${toHslTokens(darkMuted)});
    --color-muted-foreground: hsl(${toHslTokens(darkMutedForeground)});
    --color-border: hsl(${toHslTokens(darkBorder)});
    --color-input: hsl(${toHslTokens(darkBorder)});
  }
}
`

    // 4. Write to src/styles/theme.css
    const themeCssPath = path.join(
      process.cwd(),
      'src',
      'styles',
      'theme.css'
    )
    await fs.mkdir(path.dirname(themeCssPath), { recursive: true })
    await fs.writeFile(themeCssPath, themeCss, 'utf-8')

    // 5. Print confirmation
    console.log(
      `✓ Wrote ${themeCssPath} (palette: ${palette.primary}, fonts: ${typography.headingFont} + ${typography.bodyFont})`
    )
  } catch (err) {
    console.error('Error generating theme.css:', err)
    process.exit(1)
  }
}

main()
