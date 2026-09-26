# Per-client setup — agent runbook

> **Audience:** an AI coding agent (Claude Code or similar). Humans should
> follow [`how-to-new-site.md`](./how-to-new-site.md) instead — that's the
> prose runbook with explanations. This doc is the imperative agent playbook
> with explicit stop conditions.
>
> Humans, you're welcome to read it as a sanity-check on what the agent will
> do before you trigger it.

---

## How a human invokes you

1. Human clones the template into a new folder and `cd`s into it.
2. Human places a `<client>-content-package.zip` somewhere on disk.
3. Human starts a Claude Code session in the cloned repo and says some
   variation of:

   > "Follow `docs/setup.md` with the zip at `~/Downloads/<client>-content-package.zip`."

Your job: execute the phases below in order. Stop where this doc says to stop.
Ask the user only at the consolidated question in Phase 3. Surface every
failure with enough context for the human to fix it without re-reading
the whole doc.

---

## Required input

- **The absolute path to the zip.** The human gives you this in the trigger
  message above. If they don't, ask once with `AskUserQuestion` for the path
  before doing anything else.

Everything else is gathered after unpack (Phase 3) where you can pull smart
defaults from `content/brand.json`.

---

## Stop conditions

You **stop and hand control back** when:

1. **Phase 7 (Report) completes** with a green build (and the design
   handoff either applied or explicitly skipped). You do NOT commit.
   The human inspects the diff and commits + pushes themselves.
2. **Any phase fails.** Surface the diagnostic; do not attempt heroic
   recovery beyond what the failure-recovery playbook below describes.
3. **A required input is missing** after one round of asking. Do not invent
   placeholders for siteUrl or guess at API keys.
4. **The design handoff is paused** waiting for the human to paste the CSS
   back. That's expected — wait without polling or continuing.

---

## What you must NOT do

These are non-negotiable. Each exists because past agents got it wrong:

- **Do not commit.** `git status` should remain dirty when you finish.
- **Do not `git push`.** Not even after a successful build.
- **Do not run `vercel deploy` or any deploy command.** Vercel setup is
  step 7 of `how-to-new-site.md` and is the operator's job.
- **Do not edit anything in `samples/`.** That directory is reference-only.
- **Do not modify `content/` beyond what `npm run unpack` does.** Page edits
  are the firm's job (see [`authoring-content.md`](./authoring-content.md)).
- **Do not regenerate `theme.css` separately.** `npm run unpack` already
  invokes `scripts/generate-theme.ts`.
- **Do not start `npm run dev` in the foreground** — it will hang you
  indefinitely. Use `npm run build` for verification.
- **Do not put API keys or secrets into chat.** When asking about Resend
  / GA4 / GTM, ask only whether the user *plans* to use the feature; they
  will populate `.env.local` themselves afterward.
- **Do not author `content/design-overrides.css` yourself.** Design is
  done in the Revaltus Design Studio (Phase 6), not by the setup agent —
  even if you have frontend-design skills available. Leave the placeholder
  in place.

---

## Phase 1 — Pre-flight checks

Run these checks. Abort with a clear message if any fails.

```bash
node --version    # expect v20.x or higher
npm --version     # expect 10.x or higher
git rev-parse --is-inside-work-tree   # expect "true"
ls package.json   # confirm we're in the template root
ls content/pages/ # confirm fresh-clone state OR existing client state
```

The repo is in **fresh-clone state** if `content/pages/` contains only
`home.md` (or is empty). It's in **existing-client state** otherwise —
running setup again would overwrite the content. If you detect
existing-client state, **stop and confirm with the user** that they really
want to re-unpack: that's a re-unpack flow (`how-to-new-site.md` §
"Re-unpacking after a content update"), not a fresh setup.

Verify the zip exists:

```bash
ls -lh <zip-path>
```

If `ls` errors, the human gave you a wrong path — surface the actual error
and ask for a corrected path via `AskUserQuestion`.

---

## Phase 2 — Install + unpack + validate

Three commands, in order. Each must succeed before the next.

```bash
[ -d node_modules ] || npm install
npm run unpack <zip-path>
npm run validate
```

**Pass criteria:**

- `npm install` exits 0. (Skip if `node_modules` already exists.)
- `npm run unpack` emits `✓ Wrote …/theme.css` and `✓ Unpack complete`.
- `npm run validate` exits 0. **Warnings about missing images are
  acceptable** — the deliverable may not include every referenced image
  yet. **Errors are not** — abort if any errors print.

**On validate errors:** copy the error lines verbatim, then ask the human
to inspect the bad file(s). Most common: a page's frontmatter has a typo
(Zod will tell you which field on which page).

---

## Phase 3 — Gather per-client config (first user pause)

You now have `content/brand.json`. Read it to seed the questions.

```ts
// pseudo: read in your context, don't actually write code
const brand = JSON.parse(readFile('content/brand.json'))
const firmName = brand.firm.name
const contactEmail = brand.contact.email      // e.g. 'info@korbeylague.com'
const emailDomain = contactEmail?.split('@')[1]  // e.g. 'korbeylague.com'
const inferredSiteUrl = emailDomain ? `https://${emailDomain}` : undefined
```

Issue **one** `AskUserQuestion` call with the four questions below, in this
order. Use the exact shape:

### Question 1 — Production site URL

- **header:** `Site URL`
- **multiSelect:** false
- **options:**
  - `Use ${inferredSiteUrl}` — *only include this option if `inferredSiteUrl` resolved* — description: "Inferred from the contact email domain in brand.json. Drives canonical URLs, sitemap, and OG metadata. Easy to change later if the firm uses a different domain in production."
  - `Use a placeholder for now (https://example.com)` — description: "Pick this if the production domain isn't decided yet. You'll need to edit `site.config.ts` later before going live."
  - (Other is auto-added — the user can type the actual URL.)

### Question 2 — Contact form / Resend

- **header:** `Forms`
- **multiSelect:** false
- **options:**
  - `Built-in Resend route (I'll add RESEND_API_KEY to .env.local later)` — description: "Best UX. After this runs, the human edits `.env.local` to paste their Resend key. Form falls back to mailto until they do."
  - `External endpoint (Formspree / Zapier / CRM webhook)` — description: "Use this if the firm has an existing lead pipeline. They'll provide the POST URL via Other."
  - `Skip for now — mailto fallback only` — description: "The form opens the visitor's mail client to send. Works without any config."

### Question 3 — Booking widget

- **header:** `Booking`
- **multiSelect:** false
- **options:**
  - `Calendly — I have the URL` — description: "Embed Calendly's official inline widget. User will provide the URL via Other. The agent must also add `'https://*.calendly.com'` to `csp.extraOrigins`."
  - `Other iframe scheduler (Cal.com, SavvyCal, etc.)` — description: "Generic iframe embed. User provides URL via Other."
  - `Skip — no booking widget` — description: "The `<!-- block: booking -->` block renders nothing until configured. Safe default."

### Question 4 — Analytics

- **header:** `Analytics`
- **multiSelect:** true
- **options:**
  - `GA4 — I'll add NEXT_PUBLIC_GA4_ID to .env.local` — description: "Pageviews + `generate_lead` event on form submit. Requires consent banner acceptance (already wired)."
  - `GTM — I'll add NEXT_PUBLIC_GTM_ID to .env.local` — description: "Tag Manager container; can load GA4 itself plus other tags. If both GA4 and GTM are picked, GTM wins in the loader."
  - `Skip — no analytics for now` — description: "No banner appears and no scripts load. Easy to enable later by editing `.env.local`."

After the human answers, parse the responses into a `config` object:

```ts
const config = {
  siteUrl: /* their answer */,
  forms: { mode: 'resend' | 'external' | 'mailto', endpoint?: string },
  booking: { provider: 'calendly' | 'iframe' | 'none', url?: string },
  analytics: { ga4: boolean, gtm: boolean },
}
```

---

## Phase 4 — Apply the config

### `site.config.ts`

Use Edit (not Write) and match against the existing field comments — those
are stable anchors that survive across template updates.

Apply in this order:

1. **`siteUrl`** — find `siteUrl: '` and replace the string literal with the
   answer from Q1.
2. **`forms.fromEmail`** — leave the default (`onboarding@resend.dev`) so
   `RESEND_API_KEY` works in any environment until the firm verifies a
   sender domain. The human will tighten this later.
3. **`forms.endpoint`** — if Q2 = external, set to the URL the user provided.
   Otherwise leave blank.
4. **`booking.provider`** and **`booking.url`** — set from Q3 answer:
   - `calendly` → provider `'calendly'`, url is the URL the user provided
   - `iframe` → provider `'iframe'`, url is the URL the user provided
   - skip → leave `provider: 'none'`, url blank
5. **`csp.extraOrigins`** — if Q3 = Calendly, set to
   `['https://*.calendly.com']`. Otherwise leave as `[]`.

Leave `csp.mode: 'report-only'` (the existing default). The human flips it
to `'enforce'` after the first clean deploy — that's documented in
`how-to-new-site.md` step 7.

### `.env.local`

Create it by copying `.env.example`:

```bash
cp .env.example .env.local
```

Leave every value blank. The human will fill in:

- `RESEND_API_KEY=""` if Q2 = Resend
- `NEXT_PUBLIC_GA4_ID=""` if Q4 includes GA4
- `NEXT_PUBLIC_GTM_ID=""` if Q4 includes GTM

Do not paste any keys yourself even if the user offers — `.env.local` is in
`.gitignore`, but chat history is not, and an API key in chat is an
incident.

### Re-verify

After the edits, run a quick sanity check:

```bash
npx tsc --noEmit
```

Should exit 0. If it doesn't, your edit had a syntax problem — surface the
error and revert that file.

---

## Phase 5 — Quality gate

Four commands. All must exit 0. Run them in order; abort on the first failure.

```bash
npm run lint           # catches obvious regressions cheaply
npx tsc --noEmit       # catches type errors from your edits
npm test               # vitest suite (177+ cases)
npm run build          # the only gate that proves the whole pipeline composes
```

**Expected output on success:**

- Lint: empty (or just `> eslint`).
- tsc: empty.
- Tests: `Test Files 11 passed (11)` and `Tests 177 passed (177)` or more.
- Build: a Route table at the end with the documented set of routes,
  including `◐ /`, `○ /sitemap.xml`, `○ /feed.xml`, `ƒ /api/contact`, `ƒ
  /api/og/[[...slug]]`, `ƒ /api/md/[[...slug]]`, `○ /api/agent-card`, `○
  /showcase`. The line `[Error: …DYNAMIC_SERVER_USAGE…]` in the build
  output is **expected** — it's the `[...slug]` route's dynamic fallback
  signal, not a failure. Only treat the build as failed if the **exit code**
  is non-zero.

**On any failure:** see the playbook below.

---

## Phase 6 — Design (nothing to do locally)

Per-client visual design is done in the **Revaltus Design Studio** in the
onboarding platform, after the site is deployed: it reads the live site and
`/design-specimen` and writes `content/design.json` (incl. `style` axes),
`content/design-overrides.css` and the fonts module back to the repo. The
old `export-brief` → Claude.ai paste handoff is retired.

Leave the `content/design-overrides.css` placeholder as shipped and proceed
to Phase 7. Tell the human, verbatim:

> Design is handled in the Revaltus Design Studio once the site is
> deployed — nothing to do here.

---

## Phase 7 — Report

Write a summary message to the human in this exact shape. Fill the bracketed
parts.

```
Setup complete. Build green; nothing committed.

## Configured
- siteUrl: <value>
- forms: <resend / external <url> / mailto fallback>
- booking: <calendly <url> / iframe <url> / none>
- analytics: <GA4 / GTM / GA4+GTM / none>
- design: placeholder kept (done later in the Revaltus Design Studio)
- CSP mode: report-only (flip to enforce after first clean Vercel deploy)

## Pending — your turn
- Inspect the diff:  git status; git diff site.config.ts; git diff --stat
- Commit when satisfied:  git add -A && git commit -m "chore: unpack initial deliverable for <client-slug>"
- (If Resend) edit .env.local and paste RESEND_API_KEY
- (If GA4/GTM) edit .env.local and paste the measurement ID(s)
- Design the site in the Revaltus Design Studio after deploy (how-to-new-site.md §6)
- Push to your client GitHub remote (originally cloned from the template; you set up the new origin manually)
- Deploy to Vercel — see docs/how-to-new-site.md step 7

## Verified
- npm run lint:           green
- npx tsc --noEmit:        green
- npm test:                177/177 (or whatever vitest reported)
- npm run build:           exit 0; route table matches expectations

## What I did NOT do
- Did not commit (per setup.md)
- Did not push (per setup.md)
- Did not author design CSS myself (per setup.md — that's the Design Studio's job)
- Did not flip CSP to enforce (do this AFTER the first clean Vercel deploy)
- Did not run `vercel deploy` (deploy steps live in how-to-new-site.md §7)
- Did not paste any API keys; you'll add them to .env.local yourself
```

Then **stop**. Do not run more commands. Do not commit. Do not push.

---

## Failure recovery playbook

For each likely failure, here's the signature and what to do.

| Symptom | What it means | Your move |
|---|---|---|
| `Zip not found: <path>` | Phase 1 ls failed | Ask the human via `AskUserQuestion` for the correct path. Don't guess. |
| `adm-zip` error mid-`unpack` | Zip is corrupt or has bad entries | Surface the adm-zip error verbatim. Ask the human to confirm the zip is the one they want. |
| `validate` prints `⛔ ERRORS` lines | Required files missing OR frontmatter shape invalid | List every error path. For frontmatter errors, name the bad page; ask the human to inspect that file (or regenerate the deliverable). Do NOT continue to Phase 3. |
| `tsc` errors after Phase 4 edits | Your Edit introduced a type/syntax error in `site.config.ts` | Read the error, revert your Edit if you can't see an obvious fix, surface to human. |
| `npm test` failing tests | Possible: the deliverable's `home.md` shape is unusual; or template behavior changed | Surface the failing test name + first 20 lines of the failure output. Do NOT modify test files to make them pass. |
| `next build` exits non-zero | Build failed for real (not the expected DYNAMIC_SERVER_USAGE info line) | Capture the last 30 lines of build output. The most common real failures are: a malformed page slug, a missing route handler, or a node version mismatch. Surface to human + suggest reading [`security-incidents.md`](./security-incidents.md) §"Vercel deploy build fails on validate". |
| `npm install` fails | Often network or registry issue | Surface the npm error verbatim. Don't retry more than once. |
| Port 3000 in use during a smoke check | Another dev server is running | You shouldn't be running dev anyway; if you somehow ended up here, use `kill $(lsof -ti:3000)` (with the human's permission) or just skip the smoke check. |
| Build fails immediately after pasting design CSS | Malformed CSS — usually a missing brace, mistyped selector, or stray character | Surface the build error + the relevant lines from `content/design-overrides.css`. Do NOT try to fix the CSS yourself. Suggest the human go back to Claude.ai with the error and ask for a corrected version, then paste again. |
| Human pastes something that doesn't look like CSS | Sometimes they paste the brief back instead of the CSS, or stop mid-paste | Don't write a malformed file. Surface what you received (first ~20 lines) and ask for a clarifying paste; or honor `skip` if they explicitly say so. |

**General rule:** when in doubt, stop and surface the error rather than trying
to recover. The human can almost always fix it faster than you can.

---

## Reference — where to look for deeper context

If a question comes up that this doc doesn't answer:

- **Why a subsystem works the way it does** → [`docs/architecture.md`](./architecture.md)
- **What a specific block expects in its body** → [`docs/blocks.md`](./blocks.md)
- **Full human-friendly setup walkthrough** → [`docs/how-to-new-site.md`](./how-to-new-site.md)
- **Helping the firm edit content later** → [`docs/authoring-content.md`](./authoring-content.md)
- **An incident on a live deploy** → [`docs/security-incidents.md`](./security-incidents.md)
- **Bringing template improvements into an old clone** → [`docs/upgrading.md`](./upgrading.md)

You don't need to read those proactively. Reach for them only when you're
stuck on a specific question.

---

## Reminder on stop conditions

Re-read this if you're considering doing something past Phase 7:

- After Phase 7, **stop**.
- No commits. No pushes. No deploys.
- The human has the diff in front of them and decides what happens next.
