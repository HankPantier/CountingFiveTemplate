# Architecture notes

This document captures the *why* behind the subsystems added or restructured during the 2026-05-22 audit + features pass. The README covers the operational *how*; this is the design rationale for anyone debugging or extending these areas.

## Forms + email

### Configuration shape

`site.config.ts` exposes a typed `forms: { endpoint, fromEmail, toEmail, serviceOptions }` block. The choice of where each value lives:

| Value | Lives in | Why |
|---|---|---|
| `RESEND_API_KEY` | `.env.local` / Vercel env | It's a secret; never commit to git. |
| `forms.fromEmail` | `site.config.ts` | Per-client config; not secret but tied to the firm's verified Resend domain. |
| `forms.toEmail` | `site.config.ts` (optional) | Override for the recipient. Blank → falls back to `brand.contact.email` from `content/brand.json`. |
| `forms.endpoint` | `site.config.ts` (optional) | When set, `Form.tsx` POSTs there directly and skips `/api/contact` entirely (Formspree / Zapier / CRM webhook). |
| `forms.serviceOptions` | `site.config.ts` | Dropdown values for the `quote` form variant — accounting-firm specific list per client. |
| `brand.contact.email` | `content/brand.json` | Public-facing contact address; also used as the default form recipient. |

The split is deliberate: secrets in env, per-client config in `site.config.ts`, brand-data the public sees in `content/brand.json`.

### Graceful degradation

If `RESEND_API_KEY` is missing or blank, `/api/contact` returns 503 and the client `Form` component falls back to a `mailto:` link reading the recipient from `document.body.dataset.contactEmail` (surfaced by the root layout). The form stays functional even before Resend is wired up — useful during initial client setup.

### Server vs client split

`Form.tsx` is a server component that pre-renders the optional markdown `intro` and `sidebar_content` and passes them as React nodes to the new `FormFields.tsx` client component. This keeps `react-markdown` and `remark-gfm` out of the contact/quote/newsletter/custom route client bundles (~60 KB gzipped saved). When extending the form, follow the same pattern: any markdown rendering belongs in the server wrapper.

The same split applies to the FAQ block: `FaqAccordion.tsx` (server) pre-renders each answer's markdown to a React node and hands the array to `FaqAccordionClient.tsx` (`'use client'`), which owns only the interactive Radix accordion. It's the canonical pattern for any block that needs both markdown rendering and client interactivity — render markdown in the server wrapper, pass `ReactNode`s to the client island. The remaining markdown-rendering blocks (`TeamGrid`, `ContentCards`, `ProcessSteps`, etc.) are already pure server components, so `react-markdown` ships in zero client bundles.

### Security model for `/api/contact`

Layered defenses, in order of execution:

1. **Missing API key → 503.** Signals client fallback path.
2. **`Content-Length > 64 KB` → 413.** Legitimate payloads top out around 6 KB; early reject before parsing.
3. **Malformed JSON → 400.**
4. **Unknown form variant → generic `Invalid request` 400.** The variant string goes to `console.error`, never to the response (no info leak).
5. **Zod validation per variant.** 400 with `fieldErrors`.
6. **Recipient resolution.** `siteConfig.forms.toEmail` overrides `brand.contact.email`. 500 if both blank.
7. **CR/LF strip on replyTo.** Defense in depth — Zod already rejects CR/LF in email format, but the strip protects if a future schema loosens.
8. **Resend rejection → 502.**

The route is covered by `src/app/api/contact/route.test.ts` (vitest). Mocks Resend (and BotID) via a real `class`/deferred-lookup factory so the SDKs work under vitest's mock factory hoisting.

### Spam / abuse defenses

Four independent layers protect the built-in Resend path, in cheapest-first order so free local checks reject obvious spam before the (potentially billable) BotID call:

| Layer | Where | Trip response | Notes |
|---|---|---|---|
| 1. Honeypot | `route.ts` via `isHoneypotFilled` (`src/lib/forms/spam.ts`) | **covert 200** `{ok:true}`, no send | Checks both the top-level `hp` our client sends and a `website` key inside `fields` (the hidden input's name) that a form-scraping bot would fill. Our client strips `website` from `fields`, so its presence is itself a tell. |
| 2. Timing trap | `route.ts` via `isSubmittedTooFast` | **covert 200** | Client stamps form-mount time as `t`; a submit faster than `MIN_SUBMIT_MS` (3s) is a bot. Missing/stale/future `t` soft-passes (never blocks a legit edge case). |
| 3. Content heuristics | `route.ts` via `scoreContent` | **drop**→covert 200; **flag**→deliver with `[likely spam]` subject + body note | Link density + spam-keyword list. Defaults to *flag-not-drop* because losing a real CPA lead to a false positive is worse than a flagged inbox; only a link flood (≥`URL_DROP_THRESHOLD`) hard-drops. |
| 4. Vercel BotID | `route.ts` via `checkBotId()` (`botid/server`) | **403** → client falls back to `mailto:` | Invisible challenge against headless/Playwright bots. Wired by `withBotId()` in `next.config.ts` + `initBotId({ protect: [{ path: '/api/contact', method: 'POST' }] })` in `src/instrumentation-client.ts`. |

**Why covert success for layers 1–3:** returning a fake `{ok:true}` (rather than an error) denies spammers any signal to tune against. Layer 4 returns 403 per Vercel's documented pattern; the client (`FormFields.tsx`) maps **both 403 and 503 to the `mailto:` fallback**, so a rare false-positive human still reaches the firm while a bot won't drive a mail client.

**`hp`/`t` live at the payload top level**, not inside `fields`, because the Zod schemas strip unknown keys — they'd be discarded before the spam check otherwise.

**BotID specifics:** Basic mode is free on all plans and **inert in local dev / off-Vercel** (`checkBotId()` returns `isBot:false`), so the layer ships enabled by default without breaking dev or non-Vercel hosts. Deep Analysis (Pro/Enterprise) is an opt-in dashboard toggle — no code change. The challenge is served same-origin (withBotId rewrites), so the existing CSP (`script-src 'self'` / `connect-src 'self'`) already permits it — no `extraOrigins` needed. **External-endpoint clients** (`siteConfig.forms.endpoint` set) bypass `/api/contact` entirely, so these server-side layers don't apply; spam handling is the external provider's job, and the client-side honeypot still runs.

Pure helpers in `src/lib/forms/spam.ts` are unit-tested in `spam.test.ts`; the layered route behavior is covered in `route.test.ts`.

## Conversion / lead tracking

Two visitor-facing additions sit on the conversion path that matters most for a marketing site for professional services: **measure the lead**, and **give visitors a one-click way to book the call**.

### `generate_lead` event

`src/lib/analytics/track-event.ts` exposes a fire-and-forget `trackLead({ method, variant })` that no-ops when no tag manager is loaded (consent declined, env vars unset, SSR) and pushes to both `window.gtag` (GA4) and `window.dataLayer` (GTM) when present. Both wiring paths can coexist; if both are loaded we push to both.

`FormFields` calls it on every successful submission path — the built-in `/api/contact` 200, the external-endpoint POST 200, and the mailto fallback (403/503). The `method` parameter (`'form_submit' | 'mailto_fallback'`) lets the firm tell channels apart in GA4 reports. **Honeypot / timing / BotID-blocked submissions are deliberately not tracked** — those are bots, not leads, and counting them would skew conversion metrics in the spammer's favor.

### Booking block

`src/components/blocks/Booking.tsx` is a content block (`<!-- block: booking -->`) that embeds Calendly's official inline widget — lazy-loaded via `next/script` — or a plain iframe, depending on `siteConfig.booking.provider`. URL + provider are *config*, not page markdown, so the same block can be dropped on any page without per-page wiring. Returns `null` when `provider === 'none'` (the default) so a fresh clone with a stray annotation stays harmless.

Calendly's inline widget requires its origin in three CSP directives (`script-src`, `connect-src`, `frame-src`); the existing `siteConfig.csp.extraOrigins` covers all three at once with `'https://*.calendly.com'`. The `'iframe'` provider mode skips the script tag entirely (only `frame-src` is needed) — useful for Cal.com, SavvyCal, or any other iframe-friendly scheduler that some clients prefer.

## Analytics + cookie consent

### Why consent is read client-side (and NOT via `cookies()`)

`src/components/analytics/Analytics.tsx` is a client component that reads the
visitor's consent state from `document.cookie` via `useSyncExternalStore`. It
was originally an async Server Component reading `next/headers`'s `cookies()`
inside a Suspense island — that design was **deliberately removed** on
2026-06-03 for two reasons:

1. **It escalated every unknown-URL 404 into a 500.** Upstream bug
   vercel/next.js#86251 (unfixed in stable 16.x as of 2026-06): with
   `cacheComponents: true`, a `notFound()` thrown for an *unlisted* dynamic
   param — i.e. any mistyped URL on a site whose `generateStaticParams`
   returns real slugs — fails during the runtime prerender whenever the root
   layout contains a Suspense-wrapped `cookies()` read (`Invalid revalidate
   configuration provided: 0 < 1` + `DYNAMIC_SERVER_USAGE`). The fresh-clone
   template never showed it because its placeholder param keeps the route on
   the plain dynamic path; every real client site hit it. Do not reintroduce
   request APIs (`cookies()`/`headers()`) into the root layout until that bug
   is fixed in a stable release.
2. **The layout is now fully static.** With no per-request island, every page
   prerenders completely — build output shows no `DYNAMIC_SERVER_USAGE`
   digests at all, and there is no per-request streaming hole.

SSR correctness for the design brief is preserved by a different trick: the
banner is **always present in SSR markup, hidden with an inline
`display:none`**, until the client-side cookie read decides — reveal
(undecided + an analytics ID configured), swap in GA/GTM (accepted), or
unmount (declined). Visitors who already decided never see a flash; the
brief's regex still finds the markup in plain HTML.

### Behavior matrix

| GA4_ID | GTM_ID | Consent | Result |
|---|---|---|---|
| unset | unset | (any) | No banner, no scripts. Site stays clean. |
| set | unset | undecided | `<ConsentBanner>` renders. |
| set | unset | accepted | `<GoogleAnalytics gaId={...}>` renders. |
| set | unset | declined | Nothing renders. |
| unset | set | undecided | Banner. |
| unset | set | accepted | `<GoogleTagManager gtmId={...}>`. |
| set | set | accepted | **GTM wins.** GA4 is NOT loaded separately (GTM can load GA4 itself + any other tags). |

### Consent withdrawal

The footer's "Cookie preferences" link (`src/components/footer/FooterCookiePrefsLink.tsx`) clears the `analytics-consent` cookie and reloads the page. Satisfies GDPR's right-to-withdraw requirement when the banner is shipped enabled.

### Accept/Decline flow

`ConsentBanner.tsx` writes the cookie client-side and notifies `<Analytics>`
through its `onDecision` callback (which pokes the `useSyncExternalStore`
store). `Analytics` re-renders immediately with the GA/GTM tag (accept) or
nothing (decline) — pure client state, no server round-trip, no reload,
scroll position preserved.

### `_cookie-preview` escape hatch (now inert)

`scripts/export-design-brief.ts` still sends `Cookie: _cookie-preview=1` on
its chrome-capture fetch, but the cookie no longer does anything: the banner
markup is *always* in SSR output (hidden), even with no analytics IDs
configured, so the brief's regex capture works unconditionally. The header is
harmless and kept for compatibility with older clones' scripts.

## Design-brief integration

The brief (`scripts/export-design-brief.ts`) captures live rendered HTML from a running dev server. Block-level samples come from `data-block="..."` attributes; persistent chrome (navbar, footer, consent banner) comes from `data-component="..."` attributes. The regex in `fetchRenderedMarkup` matches outer `<section|header|aside|footer|nav>` tags carrying either attribute.

To add a new persistent chrome element that should ship in the brief:

1. Give its outer element a stable `data-component="<id>"` attribute on a matching outer tag.
2. Add `<id>` to the ordering array in `export-design-brief.ts`'s chrome-rendering block (currently `['navbar', 'footer', 'cookie-consent']`).
3. Add a descriptive paragraph in the same file noting selectors, slots, and the token contract Claude.ai Design should respect.

To target child slots from `content/design-overrides.css`, give them `data-slot="<name>"` attributes (e.g. `<button data-slot="accept">`). Designs then target via `[data-component="..."] [data-slot="..."]`.

## Caching model (Cache Components)

`next.config.ts` sets `cacheComponents: true`, opting into Next 16's unified caching model. The rules:

- **Data-fetching functions are excluded from prerenders by default.** Any `async` server-side data fetch (file read, db query, fetch call) that runs during render makes the route dynamic — unless wrapped in `'use cache'`.
- **`'use cache'` at the top of an async function** caches its return value across requests, using the function ID + serialized args as the cache key. `cacheLife('max')` tells Next this is build-time data that effectively never expires.
- **Per-request reads bubble up.** `cookies()`, `headers()`, `searchParams`, and `new Date()` (in a non-cached scope) all force their containing component into dynamic rendering. The remedy is either (a) cache the component / wrap it in `'use cache'`, or (b) wrap the dynamic island in a `<Suspense>` boundary so the rest of the tree can still prerender.

### Where `'use cache'` is applied in this repo

| File | Why |
|---|---|
| `src/lib/brand/get-brand-config.ts` | `content/brand.json` is build-time data. |
| `src/lib/nav/get-nav-config.ts` | `content/nav.json` same. |
| `src/lib/theme/get-theme-vars.ts` | `content/design.json` same. |
| `src/lib/content/get-page.ts` (`getPageMarkdown` + `listPageSlugs`) | Page markdown and the slug list are read from disk per-build, not per-request. |
| `src/app/sitemap.ts` | Uses `new Date()` for `lastModified`; without `'use cache'` the sitemap would be per-request dynamic. |
| `src/components/footer/Footer.tsx` | Uses `new Date().getFullYear()` for copyright; same reason. |

### Where Suspense isolates dynamism

Currently nowhere — the repo has **no per-request server islands**. The
former example (`<Analytics />` reading `cookies()` behind Suspense in the
root layout) was removed on 2026-06-03; consent is now read client-side (see
"Analytics + cookie consent" above for why, incl. vercel/next.js#86251). If
you add a per-request read, wrap it in `<Suspense>` per the rules above —
but keep request APIs out of the **root layout** until that upstream bug is
fixed in a stable release.

### Catchall route placeholder

`[...slug]/page.tsx`'s `generateStaticParams` must return at least one entry under Cache Components. When `content/pages/` only contains `home.md` (the fresh-clone state, before a deliverable is unpacked), the function returns a `__no_pages__` placeholder; the page handler maps that to `notFound()`. Once a client unpacks pages, real slugs take over and the placeholder disappears from the prerender set.

### When adding a new data loader

If the data is build-time constant (file from `content/`, JSON config, etc.), add `'use cache'` + `cacheLife('max')` to the loader function. If it's per-request (reads `cookies()` / `headers()` / `searchParams`), don't cache it — and if it's used inside a layout or shared component, wrap the consumer in `<Suspense>` so it doesn't dynamic-ize the whole route.

If you add a route segment config (`export const runtime = 'nodejs'`, `export const dynamic = '...'`), the build will fail under Cache Components. Remove the export; the runtime is implicit (Node by default).

## Build-time validation

Two checks run before the build proper so deliverable / assembly errors fail loudly instead of silently breaking the rendered site.

### Page + post frontmatter Zod schemas

`src/lib/assembly/page-frontmatter-schema.ts` and `src/lib/content/post-frontmatter-schema.ts` validate frontmatter shape on the way through `parsePageMd` and `getPost`. The schemas match the parser's previous lenient behavior — missing fields default to safe values, unknown fields pass through — so deliverables that build today still build. The win is they reject *malformed* fields the old `String(x ?? '')` casts silently swallowed: `faq_block: "broken"` (string instead of an array of `{question, answer}`) used to render an empty FAQ accordion + empty FAQPage JSON-LD; now it fails the build with a clear Zod error pointing at the page filename.

### `npm run validate` CI gate

`scripts/validate-deliverable.ts` checks (1) required files present (`brand.json`, `design.json`, `nav.json`, `pages/home.md`, `robots.txt`), (2) image references resolve in `public/content-assets/`, (3) page filenames round-trip through `pageUrlToFilename`, and (4) every page's frontmatter parses cleanly via the Zod schema. CI runs this between `npm ci` and `npm run lint`, so a malformed deliverable fails before any other step — fast feedback, clear error message identifying the bad page.

### E2E smoke (Playwright)

`e2e/smoke.spec.ts` covers the high-blast-radius surfaces against a production build: home renders + emits the sitewide Organization JSON-LD, branded 404, `/feed.xml` RSS shape, `/icon` + `/apple-icon` + `/api/og` MIME types, `/resources` empty state, `/.well-known/agent.json` JSON contract, per-page Link header, and the `.md` page-companion endpoint. Form submission, BotID classification, and Resend integration are NOT here — vitest covers them faster without a browser.

Runs in CI after the build step (`npx playwright install --with-deps chromium` then `npm run test:e2e`). Locally, run the same after a one-time `npx playwright install chromium`.

### Lighthouse CI (perf budgets)

A separate workflow (`.github/workflows/lighthouse.yml`) runs Lighthouse CI on every PR against the production build (3 runs against `/` and `/resources`, desktop preset). Budgets live in `lighthouserc.json`:

- **`error` thresholds (block the PR):** accessibility score ≥ 0.90, CLS ≤ 0.1.
- **`warn` thresholds (surface in PR comments, don't block):** performance ≥ 0.85, best-practices ≥ 0.90, SEO ≥ 0.90, FCP ≤ 2000 ms, LCP ≤ 2500 ms, TBT ≤ 200 ms. (The SEO floor is intentionally relaxed for the template's empty-state CI; raise to 0.95 in client clones once real content lands.)

Reports upload to `temporary-public-storage` and a viewable URL appears in the workflow output. Two-tier severity (error vs warn) is deliberate: a11y + CLS are non-negotiables; perf scores can drift with content size and don't deserve a hard block until budgets are tuned to a real client's content. Edit thresholds in `lighthouserc.json` per client as their content matures.

## Block assembly + registry

The page-assembly pipeline runs in three stages:

1. **`parsePageMd`** (`src/lib/assembly/parse-page-md.ts`) — Zod-validates frontmatter + splits the body into typed `PageSection`s on the `<!-- block: <id> -->` annotation pattern.
2. **`extract<Block>Props`** (`src/lib/assembly/extract-block-props.ts`) — one per block; takes a `PageSection` (and the page-level manifest for blocks that need it, e.g. `extractFaqAccordionProps`) and returns typed component props.
3. **`BlockRenderer`** + **`BLOCK_REGISTRY`** (`src/components/assembly/`) — dispatch by block id. Falls back to `UnknownBlockPlaceholder` for any unregistered id so pages keep rendering during incremental delivery.

`BLOCK_REGISTRY` (`src/components/assembly/block-registry.tsx`) is a `Record<string, (section, manifest) => ReactNode>` keyed by block id. Adding a block is **one** registry entry plus the matching extractor — no edits to a switch statement, no three-file-change ritual. The 22-case smoke test (`block-registry.test.ts`) locks the registry size and invokes every entry with a minimal-but-valid section + manifest, catching extractor regressions cheaply without needing a browser env for a full mount.

A complete reference of every block's annotation form, body convention, variants, and a sample lives in [`docs/blocks.md`](./blocks.md).

## Theming + WCAG

`scripts/generate-theme.ts` produces `src/styles/theme.css` from `content/brand.json` + `content/design.json`. After computing the palette, it verifies a set of foreground/background pairs against WCAG AA (4.5 : 1) and prints warnings for failures. The site still renders on a failed pair — the verifier is a soft alert, not a build gate, because brand palettes are externally driven and stopping the build mid-deliverable would be worse than shipping a warning.

Before that verification, each brand *surface* token (`primary`, `secondary`, `accent`) passes through `ensureContrast(bg, fg)`, which nudges the surface's lightness — preserving hue + saturation — until it meets AA against its chosen foreground. It darkens when the foreground is the lighter of the pair and lightens otherwise, so it always converges; it's a no-op for pairs that already pass. This auto-corrects the common case of a borderline mid-tone surface (the default palette's `secondary` shipped at 4.47 : 1 and is nudged from 45% → 44% lightness to reach 4.59 : 1) without a human editing `brand.json`. The verifier still runs afterward and warns if anything *else* (e.g. a foreground/background or muted pair it doesn't auto-correct) is below threshold. `ensureContrast` only adjusts the semantic surface tokens (`--color-secondary` etc.); the exact brand-hex tokens (`--color-primary-hex`, `--color-complementary`) are left untouched.

When adding a new color combination to the site, add its pair to `REQUIRED_PAIRS` in `generate-theme.ts`. For combinations that use Tailwind's `/N` opacity syntax, approximate the rendered color via `chroma.mix(bg, fg, N/100, 'rgb')` — that's what the new footer `text-background/90` pair does.

## Security headers

Set in `next.config.ts`'s `headers()` function, applied to `/:path*`:

- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing.
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking via iframe (legacy; modern browsers prefer the CSP `frame-ancestors` directive below, but X-Frame-Options is kept as a fallback).
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — denies feature access by default.
- `Content-Security-Policy` (or `-Report-Only`, depending on `siteConfig.csp.mode`) — see below.

### Content-Security-Policy

Built by `buildCsp()` in `next.config.ts` and configured under `siteConfig.csp` in `site.config.ts`:

```ts
csp: {
  mode: 'enforce' | 'report-only' | 'off'
  extraOrigins: string[]
}
```

**Default mode: `enforce`.** Sends `Content-Security-Policy`; browsers block violations.

**Mode `report-only`** sends `Content-Security-Policy-Report-Only` instead — browsers log violations to the dev console without blocking. Use when wiring up a client for the first time, or before adding a new third-party service (Calendly, Stripe, Meta Pixel, HubSpot, etc.) so you can see exactly which origins need allowlisting.

**`extraOrigins`** appends to `script-src`, `style-src`, `connect-src`, `img-src`, and `frame-src` in one go. Most third-party services need entries in all four. For per-directive control, edit `buildCsp()` directly.

**Approach: `'unsafe-inline'` + explicit allowlist, NOT nonces.** Nonce-based CSP requires per-request rendering, which Next's PPR docs note is incompatible with Cache Components — going nonce would undo the static-prerender benefit. What our CSP still defends against:

| Attack | Directive that blocks it |
|---|---|
| Clickjacking | `frame-ancestors 'self'` (+ legacy X-Frame-Options) |
| Plugin/Flash abuse | `object-src 'none'` |
| `<base href="evil">` hijack | `base-uri 'self'` |
| Form-action redirect | `form-action 'self'` |
| Mixed-content downgrade | `upgrade-insecure-requests` |
| Unknown-origin scripts/iframes/images/fetches | per-directive allowlists |

What it does NOT block: inline `<script>` injection, because `'unsafe-inline'` allows it. Mitigated upstream by `react-markdown` sanitizing all user-provided markdown content.

### Adding a third-party service

1. Set `csp.mode = 'report-only'` in `site.config.ts`, deploy, load the page where the service runs, watch the console for `Refused to load ...` messages.
2. Add the service's origins to `csp.extraOrigins`.
3. Reload, confirm no new violations.
4. Flip `csp.mode` back to `'enforce'`.

If the violations are in a directive other than the five `extraOrigins` covers (e.g. `worker-src`, `media-src`, `manifest-src`), edit `buildCsp()` in `next.config.ts` directly.

## Agent readiness

The site is built to be readable by LLM crawlers / AI agents as well as humans. Four layers cooperate, none of which need per-client setup:

### `robots.txt`

A template default ships at `public/robots.txt` with explicit `Allow:` blocks for the known AI crawlers (GPTBot, ClaudeBot, anthropic-ai, PerplexityBot, CCBot, OAI-SearchBot, Google-Extended) plus a `Sitemap:` line. A fresh clone is therefore never "blank" to AI bots. When the Phase I deliverable is unpacked, **its `public/robots.txt` overwrites the template default** — clients who want to tighten access edit that file (or the deliverable generator).

### `Link` headers — site-wide and per-page

Set in `next.config.ts`'s `headers()`, applied to `/:path*`:

- `Link: </llms.txt>; rel="describedby"; type="text/markdown"` — RFC 8288 hint pointing agents at the LLM-crawler narrative shipped in the deliverable
- `Link: </sitemap.xml>; rel="sitemap"` — sitemap discovery via header (in addition to robots.txt)

A per-URL `Link: <foo.md>; rel="alternate"; type="text/markdown"` is appended by `src/proxy.ts` for every HTML page response, telling agents the markdown companion exists at `<page>.md`. The two static and one dynamic Link header all compose into the same response (RFC 8288 permits multiple Link headers).

### Markdown endpoint (`<page>.md`)

The content already lives as markdown at `content/pages/*.md`; the agent-readiness pass simply *serves* it.

- **`src/proxy.ts`** (formerly "middleware" — Next 16 renamed the convention) intercepts any URL ending in `.md`, except `/_next/*`, `/api/*`, and other static-asset extensions. It rewrites `/index.md` → `/api/md` and `/services/virtual-cfo.md` → `/api/md/services/virtual-cfo`. Rewrite preserves the visible URL — the browser address bar still shows `.md`.
- **`src/app/api/md/[[...slug]]/route.ts`** is an optional-catch-all GET handler that calls `getPageMarkdown(url)` (already `'use cache' + cacheLife('max')`), runs `stripBlockAnnotations`, and responds with `Content-Type: text/markdown; charset=utf-8` plus a long `s-maxage`. Optional catch-all lets one handler serve both the home page and any subpage.
- **`src/lib/content/strip-block-annotations.ts`** removes the assembly-layer HTML comments (`<!-- block: feature-grid | variant: 3-col -->`) that are noise to a reader. Frontmatter is *kept* — agents get the machine-readable `title`, `canonical_url`, `schema_markup`, etc. without the HTML cruft.

Why not `Accept: text/markdown` content negotiation on the same URL? Two reasons. (1) PPR + per-request `Accept`-header branching needs Suspense gymnastics to stay statically prerenderable. (2) `.md` URLs are explicit, cacheable, and discoverable in a `curl -I` response via the Link header — no header detection needed.

### Existing structured data (unchanged, kept for SEO)

- `src/components/layout/SchemaScript.tsx` emits per-page JSON-LD: `WebPage` by default, `LocalBusiness` w/ `PostalAddress` when the page frontmatter sets `schema_markup: LocalBusiness`, and a separate `FAQPage` blob when the FAQ block is present.
- **`src/app/layout.tsx`** emits a sitewide `Organization` JSON-LD blob in every response (built from `brand.json` — name, url, logo, sameAs from social links, contactPoint, postal address). Sits alongside the page-level schema so the firm-as-entity record is available on every page.
- Per-post `BlogPosting` JSON-LD on `/resources/[slug]` (see the [Resources blog](#resources-blog--rss--lead-magnet-block) section below).
- Microdata `itemScope` / `itemType` on people (`TeamGrid`) and addresses (`ContactInfo`).
- `generateMetadata()` in the page handlers emits canonical URLs, OG, and Twitter Card metadata.

JSON-LD has weak evidence as an agent-citation signal (multiple AI systems strip it at runtime), so we don't add more — but it's free SEO that we keep. The higher-leverage move for agents is the **markdown endpoint** above.

### A2A agent card

`/.well-known/agent.json` (rewritten by `src/proxy.ts` to `/api/agent-card`) emits a structured agent-to-agent discovery card built from `brand.json` + `siteConfig.siteUrl`. Fields: `name`, `description`, `url`, `type: 'Organization'`, contact + address, `sameAs` (social links), and a `serves` array listing the agent-discoverable resources we already expose (`llms.txt`, sitemap, RSS feed, the `.md` page-companion endpoint).

The A2A spec is still in flux; this emits a stable subset and is easy to update. The proxy rewrite stands in for a direct route handler at `src/app/.well-known/agent.json/` because Next has unreliable support for dot-prefixed app folders.

### Deliberately out of scope

- **OpenAPI / `rel="service-desc"` for `/api/contact`** — would advertise the contact route to bots, undermining the BotID + spam-layer work in the previous pass. Not added.
- **WebMCP / `navigator.modelContext.provideContext`** — no actionable agent tools on a marketing site; the contact form is the only action and we *don't* want agents driving it.
- **`/.well-known/mcp/server-card.json`** — we don't run an MCP server.

## Per-page polish (favicon, OG, 404)

Three small surfaces every visitor sees, all generated per request from brand config — zero per-client setup.

### Programmatic favicon + Apple touch icon

`src/app/icon.tsx` and `src/app/apple-icon.tsx` use `next/og`'s `ImageResponse` to render an initials-on-`brand.palette.primary` tile (32×32 and 180×180 respectively). Reads `brand.firm.name` + `brand.palette.primary` at request time; no static PNG required. Every fresh clone gets a branded favicon immediately. `brand.logo.mark` is declared on the `BrandJson` type as a future consumer — when designers ship a standalone mark, swapping initials for the mark is a small follow-up.

### Auto OG share cards

`src/app/api/og/[[...slug]]/route.tsx` returns a 1200×630 PNG built from brand colors + page title/description. One optional-catch-all route handler serves both `/api/og` (home) and any subpage `/api/og/services/virtual-cfo`. We can't use the file-based `opengraph-image.tsx` convention inside the existing `[...slug]` catch-all (Next forbids segments after a catch-all), so the route-handler form stands in. `generateMetadata` in both page handlers points `openGraph.images` + `twitter.images` at this route.

The previous deliverable convention `public/og-images/<slug>.png` is no longer referenced by `generateMetadata`. Clients with a hand-crafted PNG for a *specific non-catch-all route* can still drop a static `opengraph-image.png` in that route's folder (Next file-based convention picks it up over the route handler).

### Branded 404

`src/app/not-found.tsx` replaces Next's generic 404 body with the firm's primary nav items rendered as recovery links + a "Back to *firm*" CTA. `NavBar` + `Footer` come from `layout.tsx`, so the 404 looks like the rest of the site without duplicating chrome.

## Resources blog + RSS + lead-magnet block

A self-contained content-marketing surface, zero-config for fresh clones (empty state until posts land), wired into the existing OG + agent-readiness infrastructure.

### Posts loader

`src/lib/content/get-post.ts` reads `content/posts/*.md`. `listPostSlugs` returns `[]` when the directory is absent (fresh-clone state), so the index page renders a friendly empty state instead of erroring. `getPost` reads + Zod-validates a single post via `PostFrontmatterSchema`. `listPostsMeta` reads every post's frontmatter (skipping bodies) for the index and the RSS feed, sorted newest-first by `date` (string compare works for ISO YYYY-MM-DD). All three are `'use cache' + cacheLife('max')` so prerenders stay static-friendly.

### Routes

- **`/resources`** — date-sorted card grid of all posts; falls back to "No posts published yet — check back soon" when empty.
- **`/resources/[slug]`** — per-post page: header, optional hero image, server-rendered body (`react-markdown` + `remark-gfm`, no client bundle bloat), back-to-resources CTA. Uses the same `__no_posts__` placeholder pattern as `[...slug]` for Cache Components `generateStaticParams`.
- **`/feed.xml`** — RSS 2.0 channel + items from `listPostsMeta`. Empty channel when no posts. A global `Link: </feed.xml>; rel="alternate"; type="application/rss+xml"` header in `next.config.ts` makes feed readers + agents auto-discover the feed.

### Structured data

Each post emits a `BlogPosting` JSON-LD blob inline (built from *validated* frontmatter, never raw user input — same `<script type="application/ld+json">` + `JSON.stringify` pattern as `SchemaScript.tsx`). Per-page OG comes from `/api/og/resources/<slug>` (the OG handler accepts arbitrary slugs).

### Sitemap

`src/app/sitemap.ts` includes `/resources` + every post URL **only when at least one post exists**, so search engines don't crawl an empty index.

### `ResourceList` lead-magnet block

`<!-- block: resource-list -->` renders downloadable resources (PDFs from `public/resources/`) as a card grid with a download button per item, then composes an inline `<Form variant="newsletter">` immediately below. Resources are **ungated by design** — visitors can grab files directly; the newsletter signup is the soft conversion ask, not a wall. Losing a real lead because a CPA firm hid a tax checklist behind an email gate is a worse outcome than the marginal email-list growth from forcing it. Clients who want strict gating can swap the inner form for a custom variant later. Markdown convention: one bullet per resource as `- [Title](/resources/file.pdf) — Description`.

## Per-client clone workflow

The template is designed to be cloned per client (not consumed as a shared dependency). Each client clone:

1. `git clone … <client-slug>-site`
2. `npm install`
3. `npm run unpack ~/Downloads/<client>-content-package.zip`
4. Edit `site.config.ts` for `siteUrl`, `legalLinks`, `forms.*`.
5. Set `RESEND_API_KEY` (+ optional `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_GTM_ID`) in `.env.local`.
6. `npm run dev`, verify, commit.
7. Optionally: `npm run export-brief` → Claude.ai Design → save `content/design-overrides.css`.

Re-running `npm run unpack` with a fresh deliverable overwrites `content/` and regenerates `src/styles/theme.css`. Hand-edits to `content/design-overrides.css`, `site.config.ts`, and source code are preserved.

## Operator workflow tooling

Three helpers that don't change visitor-facing behavior but shorten the per-client setup loop and the design-handoff loop.

### `/showcase` (dev-only)

`src/app/showcase/page.tsx` renders every block in `BLOCK_REGISTRY` with realistic CPA-flavored sample content. `notFound()` in production. Useful for the Claude.ai handoff (designer sees every block exactly once) and for reviewing the visual vocabulary before any real content is unpacked. The route is at `/showcase` rather than `/__showcase` because Next treats `_`-prefixed folders as private and excludes them from routing.

### `scripts/design-preview.ts`

Watches `content/` + `site.config.ts` and re-runs `export-brief` (debounced 400ms, serial-queued) so `design-brief.md` stays fresh while you iterate on content. Pairs with `npm run dev` in another terminal. Next dev hot-reloads `content/design-overrides.css` automatically; this script handles the orthogonal need of keeping the *brief input* current for the next Claude.ai paste.

### `scripts/new-client.ts`

Collapses the 7-step bootstrap into a single command after `git clone`:

```bash
git clone … <slug>-site && cd <slug>-site
npm run new-client ~/Downloads/content-package.zip
```

Runs install → unpack → validate → initial commit. Each step is idempotent (unpack overwrites cleanly, validate is read-only, commit no-ops when nothing's new), so the script is safe to re-run after a failure mid-way.

## Images

Authored image references resolve through one helper,
`src/lib/assembly/resolve-image.ts` (`resolveImageSrc`): a bare filename becomes
`/content-assets/<file>` (served from `public/content-assets/`), while an
`http(s)` URL or an absolute path is passed through unchanged. Every block
component and the resources pages call it instead of hardcoding the asset path.

Single-image blocks (`content-split`, `checklist-section`, `cta-banner`) accept
the image as the first Markdown image in the body; `extractLeadingImage`
(`md-utils.ts`) lifts it out and strips it from the rendered prose, with the
`| image:` comment attribute kept as a fallback. Hero images come from
`hero_image` / `hero_image_alt` frontmatter. Per-item blocks (`team-grid`,
`service-cards`, `content-cards`, `logo-bar`) carry per-item refs through the
same resolver.

Remote images are enabled by `images.remotePatterns` in `next.config.ts`. The
CSP `img-src` directive already includes `https:`, so remote origins are not
blocked — the trade-off is that any HTTPS image origin is permitted, which is
the standard posture for author-supplied images and low-risk for `img-src`.

## Design Studio contracts (T1/T2)

The Revaltus Design Studio drives four template levers. Each has one source file here
and a mirror + parity test on the platform:

| Lever | Template source | Platform mirror |
|---|---|---|
| Capability marker | `c5-template.json` + `<meta name="c5-capabilities">` | `lib/design/capabilities.ts` |
| Live fonts | `src/lib/theme/font-{manifest,module}.ts` → `src/app/fonts.generated.ts` (`npm run generate-fonts`) | `lib/content/font-{manifest,module-generator}.ts` + goldens |
| Style axes | `src/lib/theme/style-axes.ts` + `src/styles/style-axes.css` | `lib/design/style-axes.ts` + `docs/design/style-axes.json` |
| Specimen | `src/app/design-specimen/page.tsx` | the page picker (`lib/design/pages.ts`) |

After changing a contract, run `npm run design-contracts` and re-copy the JSON / golden
files into the platform fixtures.
