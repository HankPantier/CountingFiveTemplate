# How to spin up a new client site

A start-to-finish runbook for turning the template + a Phase I deliverable into a
deployed client site. Each client gets its **own clone** — the template is the
starting point, not a shared dependency.

> **Want to hand this off to an AI agent?** [`docs/setup.md`](./setup.md) is the
> same flow rewritten as an agent playbook — clone the template, drop the zip,
> tell Claude Code "follow `docs/setup.md` with the zip at `<path>`", and it
> walks the entire setup to a green build (no commits, no deploy). Use this
> human-readable doc for understanding *why*; use `setup.md` to delegate the
> *doing*.
>
> Deeper references: [`README.md`](../README.md) (operational detail per topic),
> [`docs/architecture.md`](./architecture.md) (the *why* behind each subsystem).

---

## 0. Prerequisites

- **Node.js 20+** and **npm 10+** (`node --version`, `npm --version`)
- **Git**
- A **Vercel account** (the site is built to deploy on Vercel)
- The client's **`content-package.zip`** — the Phase I deliverable downloaded from
  the admin tool (Phase 6 "Assemble Package" → Download)
- *(Optional)* a **Resend** account for the contact form, and a **GA4 / GTM** ID if
  the client wants analytics

---

## 1. Clone & install

```bash
git clone https://github.com/HankPantier/CountingFiveTemplate.git <client-slug>-site
cd <client-slug>-site
```

Pick a folder name that fits the client (e.g. `korbey-lague-site`).

The clone's `origin` is the template. Each client gets its **own** GitHub repo
(forked from this codebase) — that repo is what Vercel deploys and what the admin
tool links to for the in-admin editor. Re-point `origin` at it and keep the
template as an upstream for future upgrades (see [`upgrading.md`](./upgrading.md)):

```bash
git remote rename origin template      # template stays a read-only upstream
# create <org>/<client-slug>-site on GitHub, then:
git remote add origin https://github.com/<org>/<client-slug>-site.git
git push -u origin main
```

**Shortcut:** instead of running steps 2 + 5 (`npm install` then `npm run unpack <zip>`) separately, you can collapse them with:

```bash
npm run new-client ~/Downloads/content-package.zip
```

This installs deps, unpacks the deliverable, runs `validate`, and commits the unpacked state in one go. Re-run-safe: each step is idempotent.

---

## 2. Unpack the deliverable

The zip's internal paths mirror the template layout, so `unpack` drops every file
exactly where Next.js + the assembly system expect it, then regenerates the theme.

```bash
npm run unpack ~/Downloads/content-package.zip
npm run validate      # sanity-check: required files present, image refs resolve
```

`unpack` is **idempotent** — re-running it (or running a newer deliverable later)
overwrites `content/` and `public/` and regenerates `src/styles/theme.css`. Your
hand-edits to `site.config.ts`, `content/design-overrides.css`, and source code are
left untouched.

> The template ships a default `public/robots.txt` (with explicit Allow rules for
> GPTBot / ClaudeBot / PerplexityBot / etc.). The deliverable's own `robots.txt`
> **overwrites** it when unpacked. If the client wants to tighten or loosen AI-crawler
> access, edit `public/robots.txt` after this step.

---

## 3. Configure `site.config.ts`

Open `site.config.ts` and set the per-client values:

| Field | What to set |
|---|---|
| `siteUrl` | The production URL (e.g. `https://korbeylague.com`). Drives canonical URLs, sitemap, OG metadata. |
| `legalLinks` | Privacy / Terms (and any others) shown in the footer. |
| `forms.endpoint` | **Leave blank** to use the built-in Resend route. Set to a Formspree/Zapier/CRM URL to POST submissions there instead (Path B). |
| `forms.fromEmail` | Resend sender. Must be a **verified-domain** address in production; `onboarding@resend.dev` works for dev/unverified. |
| `forms.toEmail` | Recipient override. Blank → falls back to `brand.contact.email` from `content/brand.json` (the normal case). |
| `forms.serviceOptions` | The dropdown values for the quote form — edit to the firm's actual services; keep `'Other'` last. |
| `booking.provider` | `'calendly'`, `'iframe'`, or `'none'` (default). Drives the `<!-- block: booking -->` embed used on any page that has one. |
| `booking.url` | Full booking URL (e.g. `https://calendly.com/firmname/discovery-call`). Required when `provider !== 'none'`. |
| `csp.mode` | Ships as **`report-only`** for new clients (see step 7). Leave it until after the first clean deploy. |
| `csp.extraOrigins` | Third-party embed origins the client uses (Calendly, Stripe, etc.). **Calendly users:** add `'https://*.calendly.com'` here when `booking.provider = 'calendly'`, otherwise the embed will be blocked once CSP flips to enforce. |

---

## 4. Set environment variables

Create `.env.local` (copy from `.env.example`). None are required to run, but for a
real client you'll usually set:

```bash
RESEND_API_KEY="re_..."          # contact-form email delivery (Path A)
NEXT_PUBLIC_GA4_ID="G-XXXXXXXX"   # OR…
NEXT_PUBLIC_GTM_ID="GTM-XXXXXX"   # …GTM (if both set, GTM wins)
```

- **No `RESEND_API_KEY`?** The form still works — it falls back to a `mailto:` link.
- **Spam protection needs no env vars.** The honeypot, timing trap, and content
  heuristics are always on; **Vercel BotID** activates automatically once deployed
  on Vercel and is inert locally. (See [architecture.md](./architecture.md#spam--abuse-defenses).)
- **Lead tracking is automatic.** When GA4 or GTM is wired, every successful form submit fires a `generate_lead` event (`method: 'form_submit' \| 'mailto_fallback'`, `form_variant: 'contact' \| 'quote' \| 'newsletter' \| 'custom'`). Visible under GA4 → Reports → Engagement → Events.

> Set these same variables in the Vercel project too (step 6) — `.env.local` is local only.

---

## 5. Run & verify locally

```bash
npm run dev          # http://localhost:3000
```

Check:
- Homepage shows the firm name, logo, brand colors, and generated content.
- **Dark mode:** the site auto-adapts to the visitor's OS appearance setting
  (`prefers-color-scheme`, no toggle). Toggle your OS to dark and reload — only
  the neutral surfaces/text flip; the brand-colored hero, buttons, CTAs, and the
  footer stay on-brand. The dark palette is generated into `theme.css` from the
  brand near-black/near-white, so it follows each client's palette automatically.
  Per-client tweaks go in `content/design-overrides.css` under a
  `@media (prefers-color-scheme: dark)` block.
- Sub-pages confirmed in the sitemap resolve (e.g. `/services/virtual-cfo`).
- `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` serve.
- Any configured redirect 301s (dev console logs `Loaded N redirect(s)` at startup).
- Submit the contact form — with `RESEND_API_KEY` set it emails; without it, opens a
  `mailto:`. (BotID does nothing locally — that's expected; it's verified post-deploy.)
- **Agent-readiness sanity** (optional but quick):
  ```bash
  curl -I http://localhost:3000/                  # expect Link: rel=describedby + rel=sitemap + rel=alternate
  curl http://localhost:3000/index.md             # expect text/markdown with frontmatter, no <!-- block: ... --> comments
  curl http://localhost:3000/services/virtual-cfo.md  # same, for any unpacked subpage
  ```
- **Polish sanity** (the new conversion + content surfaces):
  ```bash
  curl -o /tmp/icon.png http://localhost:3000/icon && file /tmp/icon.png   # → PNG image, 32×32
  curl -o /tmp/og.png http://localhost:3000/api/og && file /tmp/og.png      # → 1200×630 PNG (branded share card)
  curl http://localhost:3000/feed.xml | head -5                            # → valid RSS 2.0 (empty channel until posts exist)
  # Browse:
  open http://localhost:3000/resources                                       # → blog index (empty-state if no posts yet)
  open http://localhost:3000/showcase                                       # → every block in the registry, dev-only
  ```

Then run the quality gate before committing:

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

Commit the unpacked baseline:

```bash
git add -A && git commit -m "chore: unpack initial deliverable for <client>"
```

---

## 6. (Optional) Design handoff to Claude.ai

For a bespoke visual treatment beyond the default theme:

```bash
npm run export-brief                       # writes ./design-brief.md
# Attach design-brief.md in a Claude.ai chat → "Produce design-overrides.css per the brief."
# Save the result as content/design-overrides.css, then:
npm run dev
```

`content/design-overrides.css` is committed per clone and is **not** overwritten by
re-running `unpack`. If Claude also returns refined tokens, overwrite
`content/design.json` and run `npx tsx scripts/generate-theme.ts`.

**Tight iteration loop:** for back-and-forth design rounds, run `npm run design-preview` in a second terminal alongside `npm run dev`. The watcher re-generates `design-brief.md` automatically whenever `content/` or `site.config.ts` changes, so the next paste into Claude.ai always reflects the latest state.

---

## 7. Deploy to Vercel

1. **Create the project**: import the repo in the Vercel dashboard (or run `vercel`
   with the CLI). Framework preset = Next.js; no special build settings needed.
2. **Add environment variables** in the Vercel project settings — the same keys from
   step 4 (`RESEND_API_KEY`, `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_GTM_ID`).
3. **Deploy.** The first deploy ships with **`csp.mode: 'report-only'`** on purpose.
4. **Verify the deployed site** with DevTools open:
   - No CSP **violation** errors in the console (report-only logs them without
     blocking). BotID's challenge is served same-origin, so it should be clean.
   - **If using Calendly**: load any page with the booking block and confirm the widget renders. If it's blocked, add `'https://*.calendly.com'` to `csp.extraOrigins` *before* flipping CSP to enforce in the next step.
   - Submit the contact form from the live page → the firm receives the email **and** a `generate_lead` event appears in GA4 → Reports → Realtime within a minute.
   - Confirm a direct bot-style POST is blocked: `curl -X POST https://<site>/api/contact`
     with a JSON body should return **403** (no BotID challenge header = bot).
   - **Spot-check the new routes**: `curl -I https://<site>/feed.xml` (RSS, `application/rss+xml`), `curl -o /tmp/og.png https://<site>/api/og` (1200×630 PNG), `curl -o /tmp/icon.png https://<site>/icon` (32×32 PNG), and open `/resources` (blog index — empty-state until posts exist).
5. **Flip CSP to enforce**: set `csp.mode: 'enforce'` in `site.config.ts`, commit, redeploy.
6. *(Optional, Pro/Enterprise)* Enable stronger bot detection: Vercel dashboard →
   **Firewall → Rules → Vercel BotID Deep Analysis**. No code change.

---

## 8. Handling content updates later

Two paths, by size of the change:

- **Routine edits — the in-admin editor.** Once the repo is linked in the admin
  tool, **Edit content ↗** commits straight to this repo's `draft` branch and
  **Publish to live** fast-forwards `main` (Vercel builds previews on `draft`,
  prod on `main`). No local clone needed. Operator setup for the editor lives in
  the onboarding repo's `docs/github.readme.md`.
- **Bulk regeneration — re-unpack a fresh deliverable** locally:

  ```bash
  npm run unpack ~/Downloads/content-package-v2.zip
  git diff            # review exactly what changed in content/ + theme
  npm run dev         # verify, then commit + push to redeploy
  ```

Your `site.config.ts`, `content/design-overrides.css`, and source changes survive either way.

---

## Quick reference

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run analyze` | Production build with the bundle analyzer (`ANALYZE=true`) |
| `npm run unpack <zip>` | Unpack a Phase I deliverable + regenerate theme |
| `npm run new-client <zip>` | One-shot: install + unpack + validate + initial commit |
| `npm run validate` | Sanity-check a deliverable (frontmatter, files, image refs) |
| `npm run export-brief` | Generate the Claude.ai design brief |
| `npm run design-preview` | Watch `content/` + auto-re-export the brief on change |
| `npx tsx scripts/generate-theme.ts` | Regenerate `theme.css` from brand/design JSON |
| `npm run lint` / `npm test` | Lint / vitest suite |

In dev, visit `/showcase` to see every block rendered with realistic sample content — useful for reviewing the visual vocabulary before unpacking real content, and for the Claude.ai design handoff. The route returns 404 in production.

**Stuck?** See the Troubleshooting section in [`README.md`](../README.md#troubleshooting)
(homepage 404, missing blocks, wrong theme colors, broken images, Vercel-only build
failures).
