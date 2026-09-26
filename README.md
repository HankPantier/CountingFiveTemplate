# CountingFive Client Site Template

Next.js 16 + Tailwind v4 + shadcn/ui. Built to consume a Phase I content deliverable from the CountingFive onboarding pipeline.

## Spinning up a new client site — step by step

### Prerequisites

- Node.js 20 or later (`node --version`)
- npm 10 or later (`npm --version`)
- Git
- A Phase I deliverable `content-package.zip` downloaded from the admin tool (Phase 6 "Assemble Package" → Download)

### 1. Clone the template

```bash
git clone https://github.com/HankPantier/CountingFiveTemplate.git korbey-lague-site
cd korbey-lague-site
```

Pick whatever folder name fits the client. Each client gets their own clone — the template is the starting point, not a shared dependency.

### 2. Install dependencies

```bash
npm install
```

Pulls Next.js, shadcn/ui, gray-matter, react-markdown, chroma-js, and the rest. Takes ~30 seconds on a fast connection.

### 3. Unpack the deliverable zip

This is the key step. The Phase I zip is structured so its internal paths mirror the template's layout. The `unpack` script extracts everything into the current repo root, dropping files exactly where Next.js + the assembly system expect them.

```bash
npm run unpack ~/Downloads/content-package.zip
```

**What this does:**

```
content-package.zip                           (the deliverable)
├── content/                                  → korbey-lague-site/content/
│   ├── pages/*.md                            → content/pages/*.md
│   ├── brand.json                            → content/brand.json
│   ├── design.json                           → content/design.json
│   ├── nav.json                              → content/nav.json
│   ├── brand.md, design.md                   → content/ (LLM-crawler narratives)
│   └── redirects.csv                         → content/redirects.csv
├── public/                                   → korbey-lague-site/public/
│   ├── robots.txt                            → public/ (served at canonical URLs)
│   ├── llms.txt, llms-full.txt               → public/
│   ├── og-images/                            → public/og-images/
│   └── content-assets/                       → public/content-assets/
│       ├── <logo>.png                          (firm logo)
│       ├── <team-photos>.png                   (uploaded headshots)
│       └── ...                                 (other session assets)
└── <firm-slug>-content.docx                  → korbey-lague-site/<firm-slug>-content.docx
                                                  (top-level — human review artifact;
                                                  not used by the site)
```

The script then automatically runs `scripts/generate-theme.ts`, which reads the freshly unpacked `content/brand.json` + `content/design.json` and writes `src/styles/theme.css` — the per-client palette + typography variables.

You should see:

```
Repo root: /Users/you/code/korbey-lague-site
Extracting /Users/you/Downloads/content-package.zip into repo root...
Archive:  /Users/you/Downloads/content-package.zip
  inflating: content/pages/home.md
  inflating: content/pages/services--virtual-cfo.md
  ... (etc)
Running theme generator...
✓ Wrote /Users/you/code/korbey-lague-site/src/styles/theme.css (palette: #003B71, fonts: Public Sans + Public Sans)
✓ Unpack complete. Run `npm run dev` to start the site.
```

The script is **idempotent** — running it again with the same zip (or a fresh deliverable later) overwrites `content/` and regenerates the theme. Your hand-edits to `content/design-overrides.css`, your source code, and any other files in the repo stay untouched.

`content/.template-default` (if present) marks the *template's own* default content — it gates the template's internal pixel-baseline and content-dependent specs so they don't run against client content. It's template-only: `npm run unpack` removes it as part of the unpack step, so it never reaches a client repo or a client's CI run.

### 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000. You should see the client's homepage rendered with:
- Their firm name + tagline in the NavBar
- Their actual logo (if a logo file landed in `public/content-assets/`)
- Their brand colors throughout
- Their generated page content in each block

If a sub-page like `/services/virtual-cfo` was confirmed in the sitemap, navigating to it should serve its `.md` content via the `[...slug]` route.

### 5. Verify everything looks right

A few quick checks:

```bash
# Pages should exist
ls content/pages/

# Theme CSS should be ~5KB with @theme block + :root duplicate
ls -la src/styles/theme.css

# Public files should be served at canonical URLs:
#   http://localhost:3000/robots.txt
#   http://localhost:3000/sitemap.xml
#   http://localhost:3000/llms.txt
#   http://localhost:3000/llms-full.txt
```

If a redirect was set up in the deliverable, hit an old URL in the browser — should 301 to the new one. The dev server console will log `[next.config] Loaded N redirect(s) from content/redirects.csv` at startup.

### 6. Commit the unpacked state

```bash
git add -A
git commit -m "chore: unpack initial deliverable"
```

This pins the client's content in git history, so you have a baseline to diff against when they come back with edits.

### 7. (Optional) Run the design handoff to Claude.ai

If you want a per-client visual treatment beyond the default theme, see [Designing the visual look](#designing-the-visual-look-claudeai-design-handoff) below.

---

## Re-unpacking after a content update

When the client comes back with edits, regenerate the deliverable in the admin tool, download the new zip, and re-run:

```bash
npm run unpack ~/Downloads/content-package-v2.zip
```

The script overwrites `content/` and regenerates the theme. Any changes you've made to `content/design-overrides.css`, your source code, or files outside `content/` and `public/` stay put. Commit the diff to see exactly what changed in the deliverable.

---

## Troubleshooting

**`npm run unpack` errors with "Not found"**
The path you passed doesn't exist. Use an absolute path or one relative to the repo root.

**Homepage 404s**
The deliverable didn't include `content/pages/home.md`. Re-check the package contents with `unzip -l <path-to-zip>`.

**Blocks render as "Block not yet implemented" placeholders**
The `.md` file references a block ID that the template's `BlockRenderer` doesn't have a case for. Open the dev console to see which ID is missing. All 22 blocks from the spec are implemented; an unknown ID likely means Claude emitted a typo. Fix the annotation in the `.md` file or re-run content generation in the admin tool.

**Theme colors look wrong (dark red where light gray should be)**
`generate-theme.ts` didn't run, or it ran on a stale `brand.json`. Re-run `npm run unpack <zip>` to refresh both `content/` and `theme.css` in one shot.

**Images don't load (broken `<img>` tags)**
The referenced files aren't in `public/content-assets/`. Either:
- The deliverable didn't include them (check `unzip -l <zip> | grep content-assets`)
- The `.md` references a different filename than what was uploaded. Open `public/content-assets/` and adjust the `hero_image:` / `image:` value in the page frontmatter or block annotation.

**Build fails on Vercel but works locally**
Almost always a TypeScript error caused by the local cache being stale. Run `rm -rf .next && npm run build` locally to reproduce.

## File layout

```
content/                      ← editable source of truth (unpacked from deliverable)
├── pages/*.md                ← one file per page, with block annotations
├── posts/*.md                ← optional: blog posts served at /insights/<slug>
├── brand.json                ← palette, firm info, social, certifications
├── design.json               ← typography pairing, radius, spacing
├── nav.json                  ← curated nav structure (NavBar + Footer)
├── brand.md, design.md       ← narrative versions (LLM-crawler signal)
├── redirects.csv             ← 301 redirects from old URLs to new ones
public/                       ← files served at canonical URLs
├── robots.txt, llms.txt, llms-full.txt
├── og-images/                ← (legacy, optional) per-page PNGs; auto-OG via /api/og now
├── resources/                ← optional: PDFs for the resource-list lead-magnet block
├── content-assets/           ← logo, team photos, hero images
src/app/sitemap.ts            ← dynamic sitemap generator (sole source; pages + posts)
src/styles/theme.css           ← generated by scripts/generate-theme.ts; do not hand-edit.
                                  A neutral placeholder is committed so fresh clones
                                  build before the first generate-theme run.
```

### What's available out of the box

Beyond the page assembly system, the template ships several surfaces a client gets for free:

- **Blog at `/insights`** — `content/posts/*.md` populates a date-sorted index + per-post pages with BlogPosting JSON-LD; RSS 2.0 at `/feed.xml`. Empty-state UX until posts exist.
- **Auto OG share cards** at `/api/og` (home) and `/api/og/<slug>` (per page) — 1200×630 PNG rendered from brand colors + page title. No per-page PNG required. (You can still drop a static `opengraph-image.png` next to a route to override.)
- **Auto favicon + Apple touch icon** at `/icon` and `/apple-icon` — initials on brand-primary, generated per request.
- **Booking block** (`<!-- block: booking -->`) — embeds Calendly (or any iframe-compatible scheduler) once `siteConfig.booking` is set.
- **Resource-list block** (`<!-- block: resource-list -->`) — downloadable PDFs from `public/resources/` rendered as cards with an inline newsletter signup CTA below.
- **GA4 `generate_lead` event** fired on every successful form submission (distinguishes `form_submit` vs `mailto_fallback`).
- **Branded 404** with the firm's primary nav as recovery links.
- **Dev-only `/showcase`** — every block in the registry rendered with realistic sample content. Useful for the Claude.ai design handoff and visual reviews before content lands.

**Sitemaps:**
- `/sitemap.xml` is generated dynamically by `src/app/sitemap.ts` from the actual pages in `content/pages/` **plus** every post in `content/posts/` (and the `/resources` index once a post exists). It always reflects current content — add or remove a page or post and the sitemap follows on the next build.
- The deliverable does **not** ship a static `public/sitemap.xml`. A static file in `public/` is served by Next before the route, so it would shadow the generator and freeze the sitemap at packaging time — missing any post drafted later. Don't add one back.

## Editing redirects

Open `content/redirects.csv` and add, edit, or remove rows. The CSV is loaded by `next.config.ts` on every build and registered with Next.js as permanent (301) redirects.

Format (header on line 5):

```
old_url,new_url,status_code,reason
/old-services,/services,301,redirected to new structure
"/old, with comma",/destination,301,consolidated into /destination
```

Notes:
- Lines starting with `#` are ignored — useful for comments.
- `status_code` and `reason` columns aren't currently used by the loader (all redirects are permanent / 308 treated as 301 by search engines), but they're documented for clarity.
- After editing, run `npm run dev` or `npm run build` to pick up changes.
- Wildcards / regex sources are NOT currently supported — page-level redirects only. (Next.js supports them via the `:path*` syntax if you need it; extend `next.config.ts` to handle that.)

## Form / email setup

Forms ship with two paths: the built-in Resend-backed `/api/contact` route, or an external POST target (Formspree, Zapier, your CRM webhook, etc.). Pick one per client.

### Path A — built-in Resend

1. Get an API key at [resend.com](https://resend.com) → API Keys.
2. Add it to `.env.local` (and to Vercel's project env vars for prod):
   ```
   RESEND_API_KEY="re_..."
   ```
3. Edit the `forms` block in `site.config.ts`:
   ```ts
   forms: {
     endpoint: '',                        // leave blank to use built-in route
     fromEmail: 'noreply@clientdomain.com', // must be a Resend-verified address in prod
     toEmail: '',                         // blank = use brand.contact.email
     serviceOptions: ['Bookkeeping', 'Tax Preparation', ...], // dropdown values for the quote form
   }
   ```
4. Recipient default is `brand.contact.email` in `content/brand.json`. Set `forms.toEmail` only if submissions should go somewhere other than the firm's public contact address.
5. `forms.serviceOptions` drives the service-select dropdown in the `quote` form variant. Edit per client to reflect the actual services the firm offers; keep `'Other'` as the last entry.

If `RESEND_API_KEY` is missing or blank, the route returns 503 and the client form falls back to a `mailto:` link automatically — the form stays functional even before Resend is wired up.

#### Spam protection (built-in, on by default)

The built-in route layers four defenses with no per-client setup:

1. **Honeypot** — a hidden field bots fill and humans don't.
2. **Timing trap** — submissions faster than 3 seconds are dropped.
3. **Content heuristics** — link-flood messages are dropped; lightly suspicious ones are still delivered with a `[likely spam]` subject prefix so you can filter (never silently lost).
4. **Vercel BotID** — an invisible CAPTCHA that blocks headless/scripted bots. It works automatically once deployed on Vercel (Basic mode is free), is inert in local dev, and needs no keys. To strengthen it, enable **BotID Deep Analysis** in the Vercel dashboard → Firewall → Rules (Pro/Enterprise).

Layers 1–3 respond with a covert "success" so spammers get no feedback; a BotID block (403) and an unconfigured Resend (503) both fall back to the `mailto:` link, so a real visitor always has a path through. Tune thresholds/keywords in `src/lib/forms/spam.ts`. See `docs/architecture.md#spam--abuse-defenses` for the full rationale.

> Note: spam protection applies to the built-in Resend route only. If you set `forms.endpoint` (Path B below), submissions go straight to your external provider, which handles its own spam filtering.

### Path B — external endpoint

Set `forms.endpoint` to the service URL and `Form.tsx` will POST submissions there directly, skipping `/api/contact` entirely:

```ts
forms: {
  endpoint: 'https://formspree.io/f/xyzabc',
  fromEmail: '',
  toEmail: '',
}
```

## Booking setup (Calendly / iframe scheduler)

The Booking block (`<!-- block: booking -->`) embeds a scheduling widget on any page that includes the annotation. Drive it from `site.config.ts`:

```ts
booking: {
  provider: 'calendly',   // 'calendly' | 'iframe' | 'none'
  url: 'https://calendly.com/firmname/discovery-call',
},
```

**Provider modes:**
- `'calendly'` — loads Calendly's official inline widget via `next/script` (lazy-loaded). Best UX. **Requires `'https://*.calendly.com'` in `csp.extraOrigins`**, otherwise the embed is blocked once CSP flips from `report-only` to `enforce`.
- `'iframe'` — embeds the URL as a plain `<iframe>`. Lighter CSP impact (no script tag), works with any iframe-friendly scheduler (Cal.com, SavvyCal, etc.); `frame-src` still needs the origin.
- `'none'` (default) — renders nothing. Safe default so a fresh clone with a stray `<!-- block: booking -->` annotation doesn't show a broken widget.

A successful "Book" click on the embed counts as a conversion in the provider's own analytics; if you also want a GA4 event from your end, wire it up in the widget's callback (Calendly emits `postMessage` events you can listen for).

## Analytics (Google Analytics / Google Tag Manager)

The template ships with optional GA4 / GTM support, gated by a cookie consent banner so no scripts fire before the visitor accepts.

### Setup

1. In `.env.local` (and Vercel project env vars for prod), set ONE of:
   ```
   NEXT_PUBLIC_GA4_ID="G-XXXXXXXXXX"     # GA4 measurement ID
   # OR
   NEXT_PUBLIC_GTM_ID="GTM-XXXXXX"       # Tag Manager container ID
   ```
2. Restart `npm run dev`. Load the site — a consent banner appears at the bottom. Accept it and confirm the script loads in the Network tab (`gtag/js?id=...` for GA4, `gtm.js?id=...` for GTM).

If both vars are set, **GTM wins** and GA4 is not loaded separately (GTM can load GA4 itself plus any other tags). If neither is set, no banner appears and nothing tracks — the site stays clean.

### Lead tracking (automatic)

Once GA4 or GTM is wired, **every successful form submission fires a `generate_lead` event** with two parameters:

- `method` — `'form_submit'` for the normal path, `'mailto_fallback'` when the visitor was bumped to `mailto:` (Resend unconfigured, BotID 403, or external endpoint failure)
- `form_variant` — `'contact' | 'quote' | 'newsletter' | 'custom'`

Find it in GA4 → Reports → Engagement → Events (or in Realtime to test). Bots blocked by honeypot / timing / BotID are deliberately **not** tracked. See [`src/lib/analytics/track-event.ts`](./src/lib/analytics/track-event.ts) and [architecture.md](./docs/architecture.md#conversion--lead-tracking) for the rationale.

### Consent flow

- Cookie: `analytics-consent=accepted|declined` (365-day expiry, `path=/`).
- Visitors can revisit the choice via the **"Cookie preferences"** link in the footer (clears the cookie and reloads, banner reappears).
- `<Analytics />` is an async Server Component (`src/components/analytics/Analytics.tsx`). It reads the cookie via `next/headers` and either renders the GA/GTM script tag, renders the consent banner, or renders nothing.

### Styling the banner per-client

The consent banner is captured in the design brief alongside navbar + footer (`data-component="cookie-consent"` outer element, with `data-slot="message|accept|decline"` on the named child elements). Brand-specific overrides go in `content/design-overrides.css` the same way as any other chrome element — see the "Designing the visual look" section below.

## Designing the visual look (Claude.ai Design handoff)

The 22 block components define the *shape* of every page. Their actual visual treatment — colors, gradients, shadows, custom corner radii, spacing nuance — is fed in via two files:

- **`content/design.json`** — design tokens (palette, fonts, radius scale). Drives the generated `theme.css`.
- **`content/design-overrides.css`** — block-specific CSS authored by Claude.ai Design (or you by hand). Loaded after `theme.css`, so any rule here wins.

### Workflow

```bash
# 1. Generate a "design brief" markdown file from the current content
npm run export-brief                  # writes ./design-brief.md
# (or: npm run export-brief -- --out brief.md  /  --stdout)

# 2. Open Claude.ai → new chat → attach design-brief.md
# 3. Ask: "Produce design-overrides.css per the brief."
# 4. Save the returned CSS as content/design-overrides.css
# 5. (Optional) If Claude.ai also proposed token changes, overwrite content/design.json
#    and re-run the theme generator:
npx tsx scripts/generate-theme.ts

# 6. Restart dev to see the result
npm run dev
```

### What Claude.ai Design sees

`design-brief.md` collates everything in one document:
- Firm context (positioning, location, tagline)
- Brand identity (palette, typography pairing, radius/spacing tokens)
- The full CSS-variable contract (the names you can reference)
- The 22-block vocabulary with their `data-block` selectors
- All page markdown (so Claude sees the actual content it's styling)
- A standardized prompt asking for the two outputs (CSS overrides + optional refined `design.json`)

### Targeting blocks in `design-overrides.css`

Every block has a `data-block="<id>"` attribute on its outer element. Use that as your primary selector:

```css
/* Make the hero feel warmer for this client */
[data-block="hero"] {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hex) 100%);
}
[data-block="hero"] h1 {
  letter-spacing: -0.03em;
}

/* Softer corners on feature-grid cards */
[data-block="feature-grid"] .rounded-lg {
  border-radius: 20px;
}

/* Restrained CTA banner — flat color, no shadow */
[data-block="cta-banner"] {
  box-shadow: none;
}
```

The full list of available `data-block` values matches the 22 block IDs documented in `raw-docs/phaseII/component-library-spec.md` (in the onboarding repo). The brief script also lists them inline.

### Versioning

`content/design-overrides.css` is committed to the repo — each client clone carries its own design decisions in git history. The placeholder ships empty; Claude.ai's output replaces it. Re-running `npm run unpack` does NOT overwrite this file (the Phase I deliverable doesn't include a `design-overrides.css`), so iteration on the design is safe.

### When to re-export the brief

Re-run `npm run export-brief` whenever:
- Content changes substantively (new pages added, services renamed)
- Brand tokens change (palette tweak, font swap)
- You want a fresh design pass on the same content

You don't need to re-export to *use* an existing `design-overrides.css` — just edit it and `npm run dev`.

## Editing content

- **Page content:** edit the matching `.md` file in `content/pages/`. Block annotations (`<!-- block: feature-grid | variant: 3-col -->`) drive layout — don't remove them.
- **Hero subheadline:** the `.md` frontmatter has a `hero_subhead:` field used by the `hero`, `hero-split`, and `page-header` blocks. It's a 12-18-word benefit-led line distinct from `meta_description` (which targets SERPs). If `hero_subhead:` is absent, the hero falls back to `meta_description`.
- **Brand colors / fonts:** edit `content/brand.json` and `content/design.json`, then run `npx tsx scripts/generate-theme.ts` to regenerate `src/styles/theme.css`. Or just re-run `npm run unpack <path>` to reset everything.
- **Nav menu:** edit `content/nav.json` — `primary` is the top-level list, each item may have `children` (one level deep), optional `cta` at the top right.
- **SEO files:** `public/robots.txt`, `public/llms.txt`, `public/llms-full.txt` are served as-is — edit directly. `/sitemap.xml` is generated dynamically by `src/app/sitemap.ts` (there is no static file to edit).
- **Images:** drop logo/team/hero photos into `public/content-assets/`. Reference them in the .md frontmatter or JSON configs by filename (e.g., `hero_image: hero-office.jpg` → served at `/content-assets/hero-office.jpg`).

## Agent readiness (LLM crawlers / AI agents)

Every page is also served as raw markdown at `<page>.md` (e.g. `/index.md`,
`/services/virtual-cfo.md`) for agents that prefer markdown over HTML —
frontmatter preserved, block annotations stripped. The HTML response advertises
the markdown companion via a `Link: rel="alternate"; type="text/markdown"`
header, and the site root advertises `Link: </llms.txt>; rel="describedby"`
plus `Link: </sitemap.xml>; rel="sitemap"`. A template default `public/robots.txt`
ships with explicit Allow rules for GPTBot, ClaudeBot, PerplexityBot, CCBot,
anthropic-ai, OAI-SearchBot, and Google-Extended; the Phase I deliverable's
own `robots.txt` overwrites it when unpacked. See
[`docs/architecture.md`](./docs/architecture.md#agent-readiness) for the design rationale.

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run analyze` | Production build with the bundle analyzer (`ANALYZE=true`); writes interactive `*.html` reports to `.next/analyze/`. No-op for regular builds. |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the vitest suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with v8 coverage report |
| `npm run test:e2e` | Run the Playwright smoke suite (production build, chromium-only). Requires `npx playwright install chromium` the first time. |
| `npm run test:e2e:ui` | Same, in Playwright's interactive UI |
| `npm run lighthouse` | Run Lighthouse CI against the production build (`/` + `/insights`). Uses budgets in `lighthouserc.json`. CI runs this on every PR via `.github/workflows/lighthouse.yml`. |
| `npm run validate` | Sanity-check a deliverable: required files present, image references resolve, page filenames round-trip, **and frontmatter shape parses via Zod**. CI runs this between install and lint. |
| `npm run unpack <path>` | Unpack a Phase I deliverable (zip or folder) |
| `npm run new-client <zip>` | One-shot bootstrap from a fresh clone: install + unpack + validate + initial commit. Idempotent / re-run-safe. |
| `npm run export-brief` | Generate a design-brief markdown file to paste into Claude.ai Design |
| `npm run design-preview` | Watch `content/` + `site.config.ts` and re-run `export-brief` on change. Pairs with `npm run dev` in another terminal to tighten the design-handoff loop. |
| `npx tsx scripts/generate-theme.ts` | Regenerate the theme CSS from current brand.json/design.json |

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main`. It executes lint → `tsc --noEmit` → `npm test` → `npm run build` on Node 20. A red CI status almost always means: an env mismatch (Node version), a typecheck regression, or a parser-test failure caused by an `md-utils` change.

## Further reading

- **[`docs/how-to-new-site.md`](./docs/how-to-new-site.md)** — start-to-finish runbook for spinning up and deploying a new client site.
- **[`docs/setup.md`](./docs/setup.md)** — agent-actionable version of the same flow. Point an AI coding agent at your zip and the agent walks the whole setup to a green build (no commit / no deploy), with one consolidated question for per-client config.
- **[`docs/blocks.md`](./docs/blocks.md)** — reference catalogue of all 22 blocks: annotation form, body convention, variants, and a working sample per block.
- **[`docs/authoring-content.md`](./docs/authoring-content.md)** — non-technical guide for the firm/end-client: editing copy, adding team members, publishing blog posts, updating contact info. Drop the URL into a follow-up email after handoff.
- **[`docs/upgrading.md`](./docs/upgrading.md)** — how to bring template improvements into an existing client clone (template-as-remote, conflict patterns, cadence).
- **[`docs/security-incidents.md`](./docs/security-incidents.md)** — operational runbook for form failures, BotID over/under-blocking, CSP debugging, deploy failures, stale-content troubleshooting.
- **[`CHANGELOG.md`](./CHANGELOG.md)** — recent changes grouped by Added / Changed / Fixed / Security / Deferred.
- **[`docs/architecture.md`](./docs/architecture.md)** — design rationale for every subsystem (forms, conversion, agent readiness, caching, theming, build-time validation, block assembly, insights blog, per-page polish, etc.). Read this before extending those subsystems.
- **[`docs/superpowers/specs/`](./docs/superpowers/specs/)** — historical design specs for major features (analytics + consent currently).
