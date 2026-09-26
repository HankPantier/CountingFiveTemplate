# Upgrading an existing client clone

How to bring template improvements into a client repo that was created from
the template some time ago. Read this **before** you start cherry-picking
template commits into a clone.

> If you're just spinning up a *new* client, none of this applies — `git clone`
> always gives you the latest template. See [`how-to-new-site.md`](./how-to-new-site.md).

---

## Why upgrades aren't automatic

Each client is a **fork**, not a dependency. The template at
`HankPantier/CountingFiveTemplate` is the starting point; once you `git clone`
into a client repo, the two histories diverge.

There's no `package.json` pointer at the template, no `git submodule`, no
"upstream pull." Template improvements have to be **explicitly merged** into
each client clone — there is no other path.

This is by design. Per-client clones can diverge in ways that would break a
shared dependency model:

- Custom `content/design-overrides.css` per client
- Per-client tweaks to `site.config.ts` (forms, CSP, booking)
- Occasionally, custom blocks or page handlers that aren't in the template

The tradeoff: clones drift, and you only get improvements when you do the
work to pull them in. That work is what this doc is about.

---

## One-time setup per clone: add a `template` remote

For each existing client repo you want to keep upgradable:

```bash
cd <client-slug>-site
git remote add template https://github.com/HankPantier/CountingFiveTemplate.git
git remote -v   # confirm both `origin` (the client) and `template` are listed
git fetch template
```

`origin` stays the client's own remote (a fresh GitHub repo per client).
`template` is read-only — you never push to it from a client clone.

---

## The two upgrade strategies

Pick one per upgrade — they don't mix well.

### Strategy A: Merge `template/main` into client `main`

Best for **comprehensive** upgrades where you want to pull in everything new
since the last sync. Produces one merge commit; the client's history shows a
clear "synced with template at commit X" marker.

```bash
git checkout main
git fetch template
git merge template/main --no-ff -m "chore: sync template main (<short-sha>)"
```

You'll get conflicts in the files listed under [Conflict patterns](#conflict-patterns) below.
Resolve them per the guidance in that section. After resolution:

```bash
npm install                  # in case dependencies changed
npm run validate             # confirm content still parses
npm run build                # confirm nothing broke
git add -A && git commit     # finish the merge
```

### Strategy B: Cherry-pick specific commits

Best for **surgical** upgrades — you want one feature (say, the recent Booking
block) but want to skip a refactor you don't care about. Lower-risk, more
manual work.

```bash
git fetch template
git log --oneline template/main ^main   # commits in template not in this clone
# Pick the SHA(s) you want:
git cherry-pick <sha>
```

Each cherry-pick produces a fresh commit on `main`. Resolve conflicts per the
same guidance below.

---

## Conflict patterns

After running either strategy, certain files always or sometimes conflict.
Here's what to do with each.

### Almost always conflicts — **keep yours**

| File | Why | Resolution |
|---|---|---|
| `content/**` | Every client has different copy, brand, posts | Keep yours unless the template added a structural change (rare) |
| `site.config.ts` | Different siteUrl, forms, booking per client | Keep yours; cherry-pick only the *new fields* if the template added some |
| `content/design-overrides.css` | Per-client design treatment | Always keep yours |
| `src/styles/theme.css` | Generated from `brand.json` per client | Always keep yours; regenerate later with `npx tsx scripts/generate-theme.ts` if needed |
| `package-lock.json` | Both sides install at different times | Accept either, then `rm package-lock.json && npm install` to regenerate cleanly |

### Sometimes conflicts — **inspect before merging**

| File | What to look for |
|---|---|
| `package.json` | Template may add deps + scripts. Take both sides' adds; resolve any version pins toward the *newer* version, then `rm package-lock.json && npm install` |
| `next.config.ts` | Template adds headers/middleware/wrappers over time. Take template's additions unless they conflict with a client-specific config (e.g. a CSP `extraOrigins` value) |
| `.env.example` | Take template additions; preserve any client-specific entries |
| `.github/workflows/*.yml` | Take template's; client-specific workflow changes are rare and obvious |
| `README.md` and `docs/**` | Take template's. These reflect template behavior, not client behavior |

### Rarely conflicts — **take template's**

Everything in `src/`, `scripts/`, and `public/robots.txt` (the template default,
not the deliverable's) is template-driven. Take the template's version unless
you've made a documented per-client tweak.

---

## A sample upgrade session

A realistic walk-through of pulling in template improvements landing roughly
six months after the clone was made:

```bash
cd korbey-lague-site
git remote add template https://github.com/HankPantier/CountingFiveTemplate.git
git fetch template

git log --oneline template/main ^main | head -20
# scan: which commits look relevant?

# Strategy A (everything):
git checkout -b chore/template-sync-2027-Q1
git merge template/main --no-ff -m "chore: sync template main (<sha>)"

# Conflicts come back. Open each:
#   content/* → git checkout --ours
#   site.config.ts → manual merge; keep client-specific values, take new fields
#   package.json → manual merge; take both sides' deps, newer versions
#   src/* → take template's (git checkout --theirs) unless intentional client tweak
#   src/styles/theme.css → git checkout --ours

rm package-lock.json && npm install
npm run validate                  # frontmatter, image refs
npm run lint && npx tsc --noEmit  # type + lint regressions
npm test                          # 177+ vitest cases
npm run build                     # final gate

git add -A && git commit          # close the merge

# Open a PR against client main:
git push origin chore/template-sync-2027-Q1
gh pr create --title "Sync template main" --body "<list of upstream commits>"
```

Review the PR yourself (or with the client team). The PR description should
link the **template** commit range you pulled in, so future readers can see
exactly which template state landed.

---

## Migration notes for specific template passes

Dated notes for template passes that need more than the generic conflict
guidance above. Check here before syncing a clone across one of these dates.

### 2026-06-03 — Image system (`cb1cd29..fce57bd`)

This pass made images first-class across every block: the preferred authoring
method is now a standard Markdown image (`![alt text](file-or-url)`) as the
first line of a block body, with URL support, `hero_image_alt:` frontmatter,
per-card images on `service-cards`, and a shared resolver
(`src/lib/assembly/resolve-image.ts`). See `docs/blocks.md` and the Images
section of `docs/architecture.md` for the full authoring reference.

**Backward compatible — no content changes required.** The `| image:` comment
attribute, `photo:` lines, and filename-based `hero_image:` all keep working
exactly as before; the new syntax just takes priority when present.

Three things to check when merging this pass into a clone:

1. **`content/pages/home.md` conflicts — keep yours.** The template's home.md
   changed only to demo the new syntax (placeholder `.png` refs +
   `hero_image_alt`). Standard `git checkout --ours content/` applies. The
   merge also adds `public/content-assets/.gitkeep` and two solid-color
   placeholder PNGs (`hero-office.png`, `team-photo.png`); they're harmless
   next to the client's real assets and safe to delete if unreferenced.

2. **One real rendering change — spot-check visually.** A *standalone*
   `![image](...)` line inside a `content-split`, `cta-banner`, or
   `checklist-section` body is now promoted to the block's image and removed
   from the prose (previously it rendered inline via ReactMarkdown). Likewise
   a `photo:` line under a `service-cards` `###` heading was literal
   description text before and now becomes the card image. Both are usually
   improvements, but if a client's content hits either pattern, eyeball those
   pages after the merge. Images embedded *within* a prose sentence are left
   in the prose, as before.

3. **New validation warnings may appear.** `npm run validate` now also checks
   `photo:` line references and skips remote URLs. New warnings after the
   merge mean images that were *already broken in production* — fix the
   content or upload the missing files; warnings don't fail the build.

Remote image URLs need no per-client setup: `images.remotePatterns` in
`next.config.ts` and the CSP `img-src` directive already allow them. If a
clone has a customized `next.config.ts`, take the template's `images:` block
during conflict resolution.

### 2026-06-03 — Unknown-URL 404 fix (pull this one promptly)

**Every deployed client site currently returns HTTP 500 for unknown URLs**
(mistyped links, stale backlinks, crawler probes) instead of the branded 404.
Root cause is upstream vercel/next.js#86251 — `notFound()` for an unlisted
dynamic param under `cacheComponents` breaks when the root layout reads
`cookies()` — which this template triggered via the server-side consent
island. Soft-500s on every bad URL are an SEO problem, so prioritize this
sync.

What the pass changes (all `src/`-only — "take template's" applies):

1. **Consent is now read client-side.** `Analytics.tsx` is a client component
   reading `document.cookie`; the root layout has no `cookies()` island and
   every page prerenders fully static. Visible behavior is unchanged
   (banner → accept/decline → GA/GTM; footer "Cookie preferences" still
   withdraws). The banner ships hidden in SSR markup so plain-HTML capture
   keeps working (the design-brief script it served is now retired).
2. **Content loaders return `null` for missing files** instead of throwing
   ENOENT across the `'use cache'` boundary (`getPageMarkdown`, `getPost`);
   page/route handlers translate null into 404s.
3. **Next 16.2.6 → 16.2.7** (`package.json` + lockfile; run
   `rm package-lock.json && npm install` if the lock conflicts).

After merging: `npm install`, build, deploy, then confirm a gibberish URL on
the live site returns 404 (and the homepage still 200s).

**If your clone customized the consent banner or analytics wiring:**

Resolve the merge by taking the template's new files, then re-apply your
customizations on top. Keeping the clone's old server-side `Analytics.tsx`
re-triggers the 500s — that file is the bug.

- **CSS-only customizations survive untouched.** The banner's selector
  contract is unchanged: `[data-component="cookie-consent"]` and the
  `message` / `accept` / `decline` `data-slot`s are all still there, with the
  same default classes. Anything done properly in
  `content/design-overrides.css` keeps working with zero changes.
- **Copy changes** (banner message, button labels, privacy link) port 1:1 —
  the JSX around them in `ConsentBanner.tsx` is structurally the same.
- **Code-level customizations** must adapt to the new shape:
  - `Analytics.tsx` is `'use client'` and reads `document.cookie` via
    `useSyncExternalStore`. Do **not** reintroduce `next/headers`'s
    `cookies()` — anywhere reachable from the root layout — until
    vercel/next.js#86251 is fixed in a stable release.
  - `ConsentBanner` no longer calls `useRouter().refresh()`. It takes an
    `onDecision('accepted' | 'declined')` callback and a `hidden` prop;
    after writing the cookie it reports the decision up and `<Analytics>`
    swaps in GA/GTM (or nothing) as pure client state.
  - **Keep the `hidden` prop wired to an inline `display:none`.** It is what
    keeps the banner in SSR markup (plain-HTML readers — originally the
    since-retired design-brief script — see it) without flashing at visitors who already decided. Don't
    replace it with a CSS class — utility-class specificity fights make that
    unreliable — and don't render `null` instead, or the brief capture
    breaks.
  - If you renamed the `analytics-consent` cookie, update it in THREE
    places: `readConsentCookie` in `Analytics.tsx`, the write in
    `ConsentBanner.tsx`, and the clear in `FooterCookiePrefsLink.tsx`.

After porting, verify the consent flow end to end on a build with a real (or
test) `NEXT_PUBLIC_GA4_ID`: banner visible on first visit → Accept hides it
and mounts the GA tag → reload keeps it hidden → footer "Cookie preferences"
brings it back → Decline mounts nothing. And `curl` any page: the SSR HTML
must contain `data-component="cookie-consent"` with `display:none`.

---

## Cadence

A reasonable rhythm: **once a quarter** for routine improvements, **as-needed**
for security or hotfix commits.

Subscribe to the template repo's release notifications on GitHub so you see
when notable changes land. The `CHANGELOG.md` in this repo dates each
landed pass — that's the source of truth for "what's new since I last synced."

---

## What if the conflict is too big?

Sometimes a clone has drifted enough that a clean merge isn't practical
(deeply customized layout, custom blocks, etc.). In that case:

1. **Document the divergence** in the client repo's `README.md` so the next
   maintainer knows the clone has deliberate template-incompatible changes.
2. **Cherry-pick** instead of merging — pick only the commits you can take
   cleanly, accept that some template features won't apply.
3. **Consider a full re-clone** for major redesigns: spin up a new clone
   from latest template + run unpack against the client's current deliverable
   + manually port any custom code. Heavy but produces a clean baseline.

The "re-clone" path is rare but exists; the BTS work is roughly a half-day
per client and resets the divergence to zero.
