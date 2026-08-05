#!/usr/bin/env tsx
/**
 * Export a "Design Kit" for Claude Design.
 *
 * Produces a `design-kit/` folder of attach-ready files tuned for the current
 * conversational + file-attachment Claude Design flow (replacing the old
 * single ~500KB design-brief.md monolith):
 *
 *   design-kit/
 *     START-HERE.md      the kickoff prompt to paste + the output contract
 *     brand.md           who the firm is, how they sound, intended design direction
 *     design-system.md   the template token contract + data-block targeting rules
 *     blocks.md          block + site-chrome vocabulary with rendered HTML samples
 *     pages/             2–3 representative real pages
 *     assets/            firm logo + full-page screenshots of the current site
 *
 * Usage:
 *   npm run export-brief                       # writes ./design-kit/ (tries localhost:3001 for samples+shots)
 *   npm run export-brief -- --out kit          # custom output dir
 *   npm run export-brief -- --server http://localhost:3000
 *   npm run export-brief -- --no-markup        # skip rendered HTML samples
 *   npm run export-brief -- --no-screenshots   # skip Playwright screenshots
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Palette {
  primary: string
  secondary: string
  complementary: string
  action: string
  nearBlack: string
  nearWhite: string
}

interface BrandJson {
  firm: {
    name: string
    tagline?: string
    foundingYear?: string
  }
  contact?: {
    address?: {
      street?: string
      city?: string
      state?: string
      zip?: string
    }
    phone?: string
    email?: string
  }
  palette: Palette
  logo?: {
    primary?: string
    alt?: string
  }
}

interface DesignJson {
  typography: {
    headingFont: string
    bodyFont: string
    googleFontsUrl?: string
  }
  roundness?: string
  density?: string
  visualFeel?: string
  spacing?: Record<string, string>
  radius?: Record<string, string>
}

interface PageFile {
  filename: string
  raw: string
}

interface BlockSpec {
  id: string
  purpose: string
  variants: string[]
  tokens?: string
}

// ---------------------------------------------------------------------------
// Block catalog (sourced from component-library-spec.md)
// ---------------------------------------------------------------------------

const BLOCK_CATALOG: BlockSpec[] = [
  // Page-level
  {
    id: 'hero',
    purpose: 'Full-bleed, above-the-fold page opener.',
    variants: ['image', 'video', 'slider'],
    tokens: '--color-primary (overlay), --color-action (CTA), --font-heading',
  },
  {
    id: 'hero-split',
    purpose: 'Two-column page opener with text + image.',
    variants: ['image-right', 'image-left'],
  },
  {
    id: 'page-header',
    purpose: 'Slim inner-page title bar.',
    variants: [],
    tokens: '--color-primary (background), --color-near-white (text)',
  },
  // Inline
  {
    id: 'intro-text',
    purpose: 'Short headline + paragraph transition between sections.',
    variants: ['centered', 'left-aligned'],
  },
  {
    id: 'content-split',
    purpose: 'Narrative paragraph with a supporting image.',
    variants: ['image-right', 'image-left'],
  },
  {
    id: 'content-prose',
    purpose: 'Long-form copy with no supporting image.',
    variants: [],
  },
  {
    id: 'checklist-section',
    purpose: 'List of benefits, inclusions, or qualifying criteria.',
    variants: ['with-image', 'standalone'],
    tokens: '--color-action (checkmark icon)',
  },
  {
    id: 'process-steps',
    purpose: 'Numbered or sequential how-it-works explanation.',
    variants: ['horizontal', 'vertical'],
  },
  {
    id: 'feature-grid',
    purpose: '3–8 equal-weight features with icon + short description.',
    variants: ['3-col', '4-col'],
  },
  {
    id: 'service-cards',
    purpose: '2–9 named services with descriptions and links.',
    variants: ['2-col', '3-col'],
  },
  {
    id: 'content-cards',
    purpose: 'Blog posts, articles, or resources with images.',
    variants: ['3-col', '2-col'],
  },
  {
    id: 'team-grid',
    purpose: 'Staff or partner profiles with photos.',
    variants: ['2-col', '3-col', '4-col'],
  },
  {
    id: 'industry-cards',
    purpose: 'Industry or niche verticals with icons.',
    variants: ['3-col', '4-col'],
  },
  {
    id: 'testimonials',
    purpose: 'Client quotes or reviews.',
    variants: ['carousel', 'grid'],
  },
  {
    id: 'stats-bar',
    purpose: '3–4 numeric proof points (years, clients, staff).',
    variants: ['3-up', '4-up'],
    tokens: '--color-primary (bg), --color-near-white (text)',
  },
  {
    id: 'logo-bar',
    purpose: 'Certification badges or association logos.',
    variants: [],
  },
  {
    id: 'cta-banner',
    purpose: 'A direct call to action with a single button.',
    variants: ['color-bg', 'image-bg'],
    tokens: '--color-action, --color-primary, --color-near-white',
  },
  {
    id: 'pricing',
    purpose: 'Tiered service packages with feature lists and prices.',
    variants: ['2-tier', '3-tier', '4-tier'],
  },
  {
    id: 'faq-accordion',
    purpose: 'Expandable question-and-answer pairs.',
    variants: [],
  },
  {
    id: 'form',
    purpose: 'A lead-capture, contact, or newsletter signup form. The custom variant renders field definitions declared in markdown.',
    variants: ['contact', 'quote', 'newsletter', 'custom'],
  },
  {
    id: 'content-table',
    purpose: 'Comparison data, calendars, or structured reference info.',
    variants: [],
  },
  {
    id: 'contact-info',
    purpose: 'Auto-filled contact info card. Reads phone, email, fax, address, and hours from brand.json — no markdown body needed. Two-column layout (Reach out | Visit) with lucide icons (Phone, Mail, Printer, MapPin, Clock).',
    variants: [],
    tokens: '--color-primary (icons), --color-foreground (values), --color-border',
  },
  {
    id: 'map',
    purpose: 'Embedded Google Map for the firm address from brand.json. Single iframe in a 16:9 rounded frame.',
    variants: [],
    tokens: '--color-border (frame), --radius-lg (corner)',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse YAML frontmatter + body from a markdown file. Very light parser. */
function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  if (!raw.startsWith('---')) {
    return { frontmatter: {}, body: raw }
  }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) {
    return { frontmatter: {}, body: raw }
  }
  const yamlBlock = raw.slice(4, end)
  const body = raw.slice(end + 4).replace(/^\n/, '')
  const frontmatter: Record<string, string> = {}
  for (const line of yamlBlock.split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) frontmatter[key] = value
  }
  return { frontmatter, body }
}

/** Extract block annotation IDs from page body in order. */
function extractBlockIds(body: string): string[] {
  const ids: string[] = []
  const re = /<!--\s*block:\s*([a-z-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    ids.push(m[1])
  }
  return ids
}

/** Derive URL from filename: home.md → /, about.md → /about */
function urlFromFilename(filename: string): string {
  const base = filename.replace(/\.md$/, '')
  if (base === 'home') return '/'
  // Files use "--" to encode "/" since "/" isn't filename-safe
  return '/' + base.replace(/--/g, '/')
}

/** A filesystem-safe screenshot name for a page URL: / → home, /a/b → a--b */
function screenshotNameFor(filename: string): string {
  const base = filename.replace(/\.md$/, '')
  return `${base === 'home' ? 'home' : base}.png`
}

/**
 * Pick 2–3 representative pages so the kit stays attach-friendly instead of
 * dumping all ~25 pages. Prefer home + a service detail + an about/industries
 * page for structural variety; fall back to whatever exists.
 */
function pickRepresentativePages(pages: PageFile[]): PageFile[] {
  const picks: PageFile[] = []
  const push = (p: PageFile | undefined) => {
    if (p && !picks.includes(p)) picks.push(p)
  }
  push(pages.find(p => p.filename === 'home.md'))
  push(pages.find(p => /^services--/.test(p.filename)))
  push(pages.find(p => /^(about|industries)/.test(p.filename)))
  for (const p of pages) {
    if (picks.length >= 3) break
    push(p)
  }
  return picks.slice(0, 3)
}

/**
 * Fetch real rendered HTML for each block + chrome component from a running
 * dev server. Walks every page, extracts the outer element matching either
 * data-block="..." (content blocks) or data-component="..." (NavBar / Footer),
 * and keeps the first sample encountered per id.
 *
 * Returns empty maps if the server isn't reachable. The caller falls back to
 * "no sample available" with a note in the kit output.
 */
async function fetchRenderedMarkup(
  serverUrl: string,
  pageUrls: string[]
): Promise<{ blocks: Map<string, string>; components: Map<string, string> }> {
  const blocks = new Map<string, string>()
  const components = new Map<string, string>()
  const blockRe = /<(section|header|aside|footer)([^>]*\sdata-block="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g
  const chromeRe = /<(header|footer|nav|aside)([^>]*\sdata-component="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g

  for (const url of pageUrls) {
    let html: string
    try {
      const res = await fetch(`${serverUrl}${url}`, {
        // _cookie-preview=1 forces <Analytics> to render the consent banner
        // even when no analytics ID is set, so the kit can capture banner markup.
        headers: { cookie: '_cookie-preview=1' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) continue
      html = await res.text()
    } catch {
      continue // Server unreachable or page errored — skip
    }

    let m: RegExpExecArray | null
    blockRe.lastIndex = 0
    while ((m = blockRe.exec(html)) !== null) {
      const blockId = m[3]
      if (!blocks.has(blockId)) blocks.set(blockId, m[0])
    }
    chromeRe.lastIndex = 0
    while ((m = chromeRe.exec(html)) !== null) {
      const componentId = m[3]
      if (!components.has(componentId)) components.set(componentId, m[0])
    }
  }

  return { blocks, components }
}

/**
 * Capture full-page screenshots of the representative pages via Playwright
 * (already a devDependency). Gated behind a reachable --server. Degrades
 * gracefully — a missing browser binary or unreachable page just yields fewer
 * screenshots and a note, never a hard failure.
 */
async function captureScreenshots(
  serverUrl: string,
  targets: { url: string; name: string }[],
  outDir: string
): Promise<string[]> {
  let chromium: typeof import('playwright').chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.warn('Note: playwright not available — skipping screenshots.')
    return []
  }

  let browser: import('playwright').Browser
  try {
    browser = await chromium.launch()
  } catch (err) {
    console.warn(
      `Note: could not launch a browser for screenshots (${(err as Error).message}). ` +
        'Run `npx playwright install chromium` if you want them. Continuing without.'
    )
    return []
  }

  const written: string[] = []
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
    })
    for (const { url, name } of targets) {
      const page = await ctx.newPage()
      try {
        const res = await page.goto(`${serverUrl}${url}`, {
          waitUntil: 'networkidle',
          timeout: 20_000,
        })
        if (!res || !res.ok()) continue
        await page.screenshot({ path: path.join(outDir, name), fullPage: true })
        written.push(name)
      } catch {
        // page errored — skip this one
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
  return written
}

/** Copy the firm logo referenced by brand.json into the kit's assets/. */
async function copyLogo(
  repoRoot: string,
  brand: BrandJson,
  assetsDir: string
): Promise<string | null> {
  const primary = brand.logo?.primary
  if (!primary) return null
  const candidates = [
    path.join(repoRoot, 'public', 'content-assets', primary),
    path.join(repoRoot, 'content', 'assets', primary),
    path.join(repoRoot, 'public', primary),
  ]
  for (const src of candidates) {
    try {
      await fs.access(src)
      const base = path.basename(primary)
      await fs.copyFile(src, path.join(assetsDir, base))
      return base
    } catch {
      // try next candidate
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Per-file builders
// ---------------------------------------------------------------------------

interface KitContext {
  brand: BrandJson
  design: DesignJson
  brandMd: string
  designMd: string
  pages: PageFile[]
  blockMarkup?: Map<string, string>
  chromeMarkup?: Map<string, string>
  manifest: {
    pageFiles: string[]
    screenshots: string[]
    logo: string | null
  }
}

function firmLocation(brand: BrandJson): string {
  const city = brand.contact?.address?.city ?? ''
  const state = brand.contact?.address?.state ?? ''
  return city && state ? `${city}, ${state}` : city || state || ''
}

/** START-HERE.md — the paste-in kickoff prompt + output contract + manifest. */
function buildStartHere(ctx: KitContext): string {
  const { brand, manifest } = ctx
  const firm = brand.firm.name
  const location = firmLocation(brand)
  const taglinePart = brand.firm.tagline ? `, ${brand.firm.tagline}` : ''
  const locationPart = location ? ` — based in ${location}` : ''

  const shotList = manifest.screenshots.length
    ? manifest.screenshots.map(s => `\`assets/${s}\``).join(', ')
    : '(none captured — run with a reachable dev server to include them)'
  const logoClause = manifest.logo
    ? `the firm logo (\`assets/${manifest.logo}\`)`
    : 'no firm logo was found'

  return `# Design Kit — ${firm}

**Paste this file as your first message in a new Claude Design chat, then attach the other files in this folder** (\`brand.md\`, \`design-system.md\`, \`blocks.md\`, everything in \`pages/\`, and the images in \`assets/\`).

You are the designer for **${firm}**${taglinePart}${locationPart}. Give this website a distinctive, on-brand visual identity that a small professional firm would be proud of.

## What you're producing — the only two outputs

1. **\`design-overrides.css\`** — CSS layered on top of the template's base theme. Target blocks and site chrome via the \`data-block="…"\` and \`data-component="…"\` selectors documented in **design-system.md** and **blocks.md**. Aim for 50–200 lines. Concentrate on the identity-defining surfaces: \`hero\`, \`content-split\`, \`feature-grid\`, \`cta-banner\`, \`faq-accordion\`, and the \`navbar\` / \`footer\` chrome.
2. **\`design.json\`** *(optional)* — only if you'd refine the palette, typography, or token scale. Output the **full file**, not a diff. Otherwise say "no token changes needed."

## Hard constraints — this is what makes your output drop in with zero rework

- **Restyle only.** Do **not** change the React component tree, the HTML structure, or the block markup — those are fixed. Style through CSS + tokens only.
- Style **strictly** through the documented tokens and \`data-block\` / \`data-component\` selectors. Don't invent class names the template doesn't emit.
- Never hardcode a raw hex outside a \`:root { --… }\` helper variable — prefer the existing \`--color-*\` tokens.
- **Honor the firm's voice and its "avoid" list in \`brand.md\`** — including any words or tones it says to avoid.
- Keep every text/background pairing at **WCAG AA** (≥ 4.5:1).
- Navy-tinted shadows, never pure black. One action-color CTA per screen.

## What's in this kit

- **brand.md** — who ${firm} is, how they sound, and their intended design direction (palette rationale, visual feel, do's & don'ts).
- **design-system.md** — the template's token contract + the \`data-block\` / \`data-component\` targeting rules you must use. This is your integration contract.
- **blocks.md** — the block + site-chrome vocabulary, with real rendered HTML samples so you can target child selectors precisely.
- **pages/** — ${manifest.pageFiles.length} representative real page(s), so you can see what a real hero / feature-grid / long prose section actually contains.
- **assets/** — ${logoClause}, plus full-page screenshots of the current, un-styled site: ${shotList}. Use the screenshots as your visual "before."

## Output format

When you produce \`design-overrides.css\`, prefix it with this header:

\`\`\`css
/* design-overrides.css for ${firm}
 * Generated by Claude Design — YYYY-MM-DD
 * Save to: content/design-overrides.css (loaded by src/app/globals.css after theme.css)
 */
\`\`\`

Use \`data-block\` / \`data-component\` selectors for targeted overrides and \`:root\` for global token tweaks. Avoid \`!important\` unless unavoidable. If you refine \`design.json\`, output it as a full fenced \`\`\`json block (not a diff).`
}

/** brand.md — client brand narrative + intended design direction. */
function buildBrandDoc(ctx: KitContext): string {
  const { brand, brandMd, designMd } = ctx
  const firm = brand.firm.name
  const location = firmLocation(brand)

  const header = [
    `# ${firm} — Brand`,
    '',
    [
      `**Name:** ${firm}`,
      brand.firm.tagline ? `**Tagline:** ${brand.firm.tagline}` : '',
      brand.firm.foundingYear ? `**Founded:** ${brand.firm.foundingYear}` : '',
      location ? `**Location:** ${location}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  ].join('\n')

  const parts: string[] = [header]

  if (brandMd.trim()) {
    parts.push('---', brandMd.trim())
  }

  if (designMd.trim()) {
    // Drop the YAML front matter (machine tokens live in design-system.md /
    // design.json) and keep the narrative design direction.
    const narrative = stripFrontMatter(designMd).trim()
    if (narrative) {
      parts.push('---', '## Intended design direction', '', narrative)
    }
  }

  if (!brandMd.trim() && !designMd.trim()) {
    parts.push(
      '---',
      '_No generated brand.md / design.md were found in content/. Base the styling on the firm identity above, the palette in design-system.md, and the screenshots in assets/._'
    )
  }

  return parts.join('\n\n') + '\n'
}

/** Strip a leading `<!-- … -->`? no — strip a leading YAML `---` front matter block. */
function stripFrontMatter(md: string): string {
  let s = md
  // Optional leading HTML comment (e.g. "<!-- Fonts: … -->") before front matter.
  s = s.replace(/^\s*<!--[\s\S]*?-->\s*/, '')
  if (s.startsWith('---')) {
    const end = s.indexOf('\n---', 3)
    if (end !== -1) s = s.slice(end + 4).replace(/^\n/, '')
  }
  return s
}

/** design-system.md — the fixed token + selector contract the template exposes. */
function buildDesignSystem(ctx: KitContext): string {
  const { brand, design } = ctx
  const { palette } = brand
  const { typography, roundness, density, visualFeel, spacing, radius } = design

  const paletteRows = [
    ['primary', palette.primary],
    ['secondary', palette.secondary],
    ['complementary', palette.complementary],
    ['action', palette.action],
    ['near-black', palette.nearBlack],
    ['near-white', palette.nearWhite],
  ]
    .map(([role, hex]) => `| ${role} | ${hex} |`)
    .join('\n')

  const typoLines = [
    `- Heading font: **${typography.headingFont}**`,
    `- Body font: **${typography.bodyFont}**`,
    typography.googleFontsUrl ? `- Google Fonts URL: ${typography.googleFontsUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const shapeLines = [
    roundness ? `- Roundness: **${roundness}** (pill value: ${radius?.pill ?? 'n/a'})` : '',
    density ? `- Density: **${density}**` : '',
    visualFeel ? `- Visual feel: **${visualFeel}**` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const spacingList = spacing
    ? Object.entries(spacing).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : '(not defined)'
  const radiusList = radius
    ? Object.entries(radius).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : '(not defined)'

  return `# Design System — token & selector contract

This is the fixed contract the template exposes. Refine token *values* via \`design.json\` (which feeds \`theme.css\` through the theme generator). Everything else — block-specific tints, shadows, gradients — goes in \`design-overrides.css\`, targeted by \`data-block\` / \`data-component\`.

## Current tokens

### Palette

| Role | Hex |
|---|---|
${paletteRows}

### Typography

${typoLines}

### Shape system

${shapeLines}

### Spacing scale

${spacingList}

### Radius scale

${radiusList}

## CSS variable contract

### Color variables (from palette → HSL)

- \`--color-primary\`, \`--color-primary-foreground\`
- \`--color-secondary\`, \`--color-secondary-foreground\`
- \`--color-accent\`, \`--color-accent-foreground\` (derived from complementary)
- \`--color-background\`, \`--color-foreground\`
- \`--color-muted\`, \`--color-muted-foreground\`
- \`--color-card\`, \`--color-card-foreground\`
- \`--color-popover\`, \`--color-popover-foreground\`
- \`--color-border\`, \`--color-input\`
- \`--color-ring\` (derived from action)
- \`--color-destructive\`, \`--color-destructive-foreground\`

### Direct hex tokens (for direct CSS usage)

- \`--color-action\` (the brand's CTA color) and \`--color-action-foreground\`
- \`--color-primary-hex\`, \`--color-near-black\`, \`--color-near-white\`, \`--color-complementary\`

### Spacing / radius / font

- \`--c5-space-xs\` through \`--c5-space-2xl\` (brand spacing scale; namespaced to avoid Tailwind v4's \`--spacing-*\` namespace. For a Tailwind utility value use the native scale: p-1=4px, p-2=8px, p-4=16px, p-6=24px, p-12=48px, p-24=96px)
- \`--radius-sm\`, \`--radius-md\`, \`--radius-lg\`, \`--radius-pill\`, \`--radius\` (default)
- \`--font-heading\`, \`--font-body\`

### Prose baseline in globals.css

The template's \`src/app/globals.css\` ships baseline \`.prose\` rules (outside \`@layer base\`, since Tailwind v4 tree-shakes custom selectors from base):

- \`.prose p\`, \`.prose ul\`, \`.prose ol\`, \`.prose blockquote\` get \`margin-bottom: 1em\` (last-child zeroed)
- \`.prose ul\` / \`.prose ol\` get list-style + \`padding-left: 1.5em\`
- \`.prose h2/h3/h4\` get \`font-weight: 600\` + top/bottom margins
- \`.prose a\` gets \`text-decoration: underline\`
- \`.prose strong\` gets \`font-weight: 600\`

To override prose for one block, scope it: \`[data-block="cta-banner"] .prose p { margin-bottom: 0.5em }\` — don't redefine the global rules.

## Targeting rules

- \`data-block="…"\` — content blocks that appear inline based on a page's markdown (see **blocks.md**). Your primary selector for section styling.
- \`data-component="…"\` — persistent site chrome (\`navbar\`, \`footer\`, \`cookie-consent\`) that appears on every page.
- Don't mix the two namespaces in one selector, and don't rely on class names the template doesn't emit — the \`data-*\` attributes are the stable contract.`
}

/** blocks.md — block vocabulary + site chrome, with rendered HTML samples. */
function buildBlocks(ctx: KitContext): string {
  const { blockMarkup, chromeMarkup } = ctx

  const renderSample = (blockId: string): string => {
    const html = blockMarkup?.get(blockId)
    if (!html) return ''
    return `\n\n**Sample rendered HTML** (verbatim from the dev server — target child selectors precisely):\n\n\`\`\`html\n${html}\n\`\`\``
  }

  const pageLevelBlocks = BLOCK_CATALOG.slice(0, 3)
  const inlineBlocks = BLOCK_CATALOG.slice(3)

  const pageLevelMd = pageLevelBlocks
    .map(b => {
      const variantsStr = b.variants.length ? b.variants.join(', ') : '(none)'
      const tokensLine = b.tokens ? `\n**Currently uses:** ${b.tokens}` : ''
      return `#### \`[data-block="${b.id}"]\`\n**Purpose:** ${b.purpose}\n**Variants:** ${variantsStr}${tokensLine}${renderSample(b.id)}`
    })
    .join('\n\n')

  const inlineMd = inlineBlocks
    .map(b => {
      const variantsStr = b.variants.length ? b.variants.join(', ') : '(none)'
      const tokensLine = b.tokens
        ? `**Currently uses:** ${b.tokens}`
        : '**Currently uses:** shadcn semantic colors (card, foreground, muted)'
      return `#### \`[data-block="${b.id}"]\`\n**Purpose:** ${b.purpose}\n**Variants:** ${variantsStr}\n${tokensLine}${renderSample(b.id)}`
    })
    .join('\n\n')

  const chromeSamples =
    chromeMarkup && chromeMarkup.size > 0
      ? `\n\n### Rendered chrome markup (verbatim)\n\n${['navbar', 'footer', 'cookie-consent']
          .map(id => {
            const html = chromeMarkup.get(id)
            if (!html) return ''
            return `#### \`[data-component="${id}"]\`\n\n\`\`\`html\n${html}\n\`\`\``
          })
          .filter(Boolean)
          .join('\n\n')}`
      : ''

  return `# Block & chrome vocabulary

The site is composed from a fixed set of reusable blocks. Each block carries a \`data-block\` attribute on its outer element — that's your primary selector in \`design-overrides.css\`. Persistent chrome (NavBar, Footer, Cookie Consent) carries a \`data-component\` attribute instead.

## Page-level blocks (one per page, from the frontmatter \`hero:\` field)

${pageLevelMd}

## Inline blocks (selected during content generation, annotated \`<!-- block: … -->\`)

${inlineMd}

## Site chrome

### NavBar — \`[data-component="navbar"]\`

A sticky \`<header>\` on every page. Left→right: firm logo (or wordmark fallback) → desktop NavigationMenu (hidden below md) → optional CTA button (\`nav.cta\`) → mobile hamburger (below md).

- Background toggles on scroll: \`bg-background\` at top, \`bg-background/95 backdrop-blur border-b border-border\` after 12px. Restyle via \`[data-component="navbar"]\`.
- Top-level links: \`[data-component="navbar"] a[role="menuitem"]\` or \`[data-component="navbar"] nav a\`.
- Active state: \`aria-current="page"\` on links (and \`data-active\` on the trigger whose subtree is current) — currently \`text-primary underline underline-offset-8\`.
- Mobile menu: shadcn Sheet (\`[role="dialog"]\`) + Accordion.

### Footer — \`[data-component="footer"]\`

Server component, default \`bg-foreground text-background\` (inverted). Three zones: (1) logo + tagline then 3 nav columns; (2) certifications bar of \`brand.certifications[]\` logos; (3) legal bar (copyright + legal links + social icons).

- Logo renders with \`invert opacity-90\` so a dark logo reads on the dark footer — override if the firm's logo is already light.
- Social icons: lucide \`<Mail/>\` + inline-SVG \`SocialIcon\`. Target \`[data-component="footer"] [aria-label*="Visit"]\`.

### Cookie Consent Banner — \`[data-component="cookie-consent"]\`

A sticky \`<aside>\` pinned bottom, shown until accept/decline. Sub-elements: \`[data-slot="message"]\`, \`[data-slot="accept"]\`, \`[data-slot="decline"]\`. Respects \`--color-background\`, \`--color-foreground\`, \`--color-border\`, \`--color-primary\`, \`--color-action\`. Keep Accept (primary) and Decline (secondary) visually distinct.${chromeSamples}`
}

/** One page file for the kit's pages/ folder. */
function buildPageFile(page: PageFile): string {
  const { frontmatter, body } = parseFrontmatter(page.raw)
  const url = frontmatter['url'] ?? urlFromFilename(page.filename)
  const pageTitle = frontmatter['title'] ?? page.filename
  const heroBlock = frontmatter['hero'] ?? 'unknown'
  const heroVariant = frontmatter['hero_variant'] ?? 'unknown'
  const blockIds = extractBlockIds(body)
  const sectionsStr = blockIds.length ? blockIds.join(', ') : '(none)'

  return `# ${url} (${pageTitle})

**Hero:** ${heroBlock} (${heroVariant})
**Sections:** ${sectionsStr}

---

${body.trim()}
`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--out')
  const outDirName = outIdx >= 0 ? args[outIdx + 1] : 'design-kit'
  const noMarkupFlag = args.includes('--no-markup')
  const noScreenshotsFlag = args.includes('--no-screenshots')
  const serverIdx = args.indexOf('--server')
  const serverUrl = serverIdx >= 0 ? args[serverIdx + 1] : 'http://localhost:3001'

  if (outIdx >= 0 && !outDirName) {
    console.error('Error: --out requires a path argument')
    process.exit(1)
  }

  const repoRoot = process.cwd()
  const contentDir = path.join(repoRoot, 'content')

  // Required inputs
  let brand: BrandJson
  let design: DesignJson
  try {
    brand = JSON.parse(await fs.readFile(path.join(contentDir, 'brand.json'), 'utf-8')) as BrandJson
  } catch (err) {
    console.error('Error: could not read content/brand.json —', (err as Error).message)
    process.exit(1)
  }
  try {
    design = JSON.parse(await fs.readFile(path.join(contentDir, 'design.json'), 'utf-8')) as DesignJson
  } catch (err) {
    console.error('Error: could not read content/design.json —', (err as Error).message)
    process.exit(1)
  }

  // Optional narrative docs shipped by the onboarding deliverable
  let brandMd = ''
  try {
    brandMd = await fs.readFile(path.join(contentDir, 'brand.md'), 'utf-8')
  } catch {
    /* optional */
  }
  let designMd = ''
  try {
    designMd = await fs.readFile(path.join(contentDir, 'design.md'), 'utf-8')
  } catch {
    /* optional */
  }

  // Pages
  const pagesDir = path.join(contentDir, 'pages')
  const pageFiles = await fs.readdir(pagesDir).catch(() => [] as string[])
  const allPages = await Promise.all(
    pageFiles
      .filter(f => f.endsWith('.md'))
      .sort()
      .map(async f => ({ filename: f, raw: await fs.readFile(path.join(pagesDir, f), 'utf-8') }))
  )
  const pages = pickRepresentativePages(allPages)

  // Rendered HTML samples (optional, from a running dev server)
  let blockMarkup: Map<string, string> | undefined
  let chromeMarkup: Map<string, string> | undefined
  if (!noMarkupFlag) {
    const pageUrls = allPages.map(p => urlFromFilename(p.filename))
    const samples = await fetchRenderedMarkup(serverUrl, pageUrls)
    if (samples.blocks.size > 0 || samples.components.size > 0) {
      blockMarkup = samples.blocks
      chromeMarkup = samples.components
      console.log(
        `Rendered markup fetched from ${serverUrl}: ${samples.blocks.size} blocks, ${samples.components.size} chrome components`
      )
    } else {
      console.log(
        `Note: no rendered markup fetched (server ${serverUrl} unreachable or returned no blocks). blocks.md will use text descriptions only.`
      )
    }
  }

  // Prepare output tree (fresh each run)
  const outDir = path.join(repoRoot, outDirName)
  await fs.rm(outDir, { recursive: true, force: true })
  const kitPagesDir = path.join(outDir, 'pages')
  const kitAssetsDir = path.join(outDir, 'assets')
  const kitShotsDir = path.join(kitAssetsDir, 'screenshots')
  await fs.mkdir(kitPagesDir, { recursive: true })
  await fs.mkdir(kitShotsDir, { recursive: true })

  // Logo
  const logo = await copyLogo(repoRoot, brand, kitAssetsDir)
  if (!logo) console.warn('Note: no logo file resolved from brand.json.logo.primary — assets/ has no logo.')

  // Screenshots (optional, needs a reachable server + a browser binary)
  let screenshots: string[] = []
  if (!noScreenshotsFlag) {
    const targets = pages.map(p => ({ url: urlFromFilename(p.filename), name: screenshotNameFor(p.filename) }))
    screenshots = await captureScreenshots(serverUrl, targets, kitShotsDir)
    if (screenshots.length > 0) {
      console.log(`Captured ${screenshots.length} screenshot(s) from ${serverUrl}.`)
    } else {
      console.log(`Note: no screenshots captured (server ${serverUrl} unreachable, or no browser). Kit ships text-only.`)
    }
  }

  const ctx: KitContext = {
    brand,
    design,
    brandMd,
    designMd,
    pages,
    blockMarkup,
    chromeMarkup,
    manifest: {
      pageFiles: pages.map(p => p.filename),
      screenshots: screenshots.map(s => `screenshots/${s}`),
      logo,
    },
  }

  // Write the kit
  await fs.writeFile(path.join(outDir, 'START-HERE.md'), buildStartHere(ctx) + '\n', 'utf-8')
  await fs.writeFile(path.join(outDir, 'brand.md'), buildBrandDoc(ctx), 'utf-8')
  await fs.writeFile(path.join(outDir, 'design-system.md'), buildDesignSystem(ctx) + '\n', 'utf-8')
  await fs.writeFile(path.join(outDir, 'blocks.md'), buildBlocks(ctx) + '\n', 'utf-8')
  for (const page of pages) {
    await fs.writeFile(path.join(kitPagesDir, page.filename), buildPageFile(page), 'utf-8')
  }

  console.log('')
  console.log(`Design kit written to ${outDirName}/`)
  console.log(`  START-HERE.md, brand.md, design-system.md, blocks.md`)
  console.log(`  pages/ (${pages.length}): ${pages.map(p => p.filename).join(', ')}`)
  console.log(`  assets/: ${logo ?? 'no logo'}${screenshots.length ? `, screenshots/ (${screenshots.length})` : ''}`)
  console.log('')
  console.log('Next steps:')
  console.log('  1. Open Claude.ai → start a new Design chat')
  console.log(`  2. Paste ${outDirName}/START-HERE.md, then attach the other files + assets/screenshots`)
  console.log('  3. Ask it to produce design-overrides.css per the kit')
  console.log('  4. Save the returned CSS to content/design-overrides.css and run `npm run dev`')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
