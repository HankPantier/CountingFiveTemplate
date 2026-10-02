# Changelog

All notable changes to this template are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project loosely follows semver — though as a per-client template, "release" means "checkpoint on `main`" rather than a published package version.

## [2026.09.12] — Fonts module loads the families a locked design area needs

Build-tooling release: **no visible change** on any site.

### Added
- **`typography.pinnedFonts`** in `content/design.json` (written by the
  Revaltus platform when an admin locks a design area in the Design Studio).
  `generateFontsModule` gives each pinned family a `--font-pin-<slug>`
  variable: an alias of the role variable when a role already loads that
  family (its load widened to every role weight), otherwise its own
  next/font load. Absent or empty → the module is byte-identical to before.
- `npm run generate-fonts` / `--check` pass `pinnedFonts` through, so a site
  with locks no longer reports fonts-module drift in CI.
- New golden `src/lib/theme/__fixtures__/fonts/{design-pinned.json,
  fonts-pinned.golden.txt}` (also mirrored by the platform).

### Rollout notes (template 2026.09.11 → 2026.09.12)
Ship in ONE commit, `c5-template.json` last.
- **Overwrite (M):** `CHANGELOG.md`, `scripts/generate-design-contracts.ts`,
  `scripts/generate-fonts.ts`, `src/lib/theme/design-contracts.test.ts`,
  `src/lib/theme/font-module.ts`, `src/lib/theme/template-marker.test.ts`.
- **Add (A):** `src/lib/theme/__fixtures__/fonts/design-pinned.json`,
  `src/lib/theme/__fixtures__/fonts/fonts-pinned.golden.txt`.
- **Delete (D):** none.
- **Write last:** `c5-template.json` = `{"templateVersion": "2026.09.12",
  "capabilities": ["fonts", "style-axes", "specimen", "layout-presets"],
  "syncedFrom": "<the template main SHA being rolled out>"}`.
- theme.css and `src/app/fonts.generated.ts` are not rewritten; no
  package.json change.

## [2026.09.11] — Every surface is stylable; no debug placeholder on live sites

Markup-only release: **no visible change** except on pages that showed the
"Block not yet implemented" debug box (Aurora /privacy-policy and
/meet-the-team/careers/apply), which now render that section as prose.

### Added
- **Styling hooks** for the surfaces that sat outside every `data-block` /
  `data-component`, so the platform's Design Studio chat could not restyle them
  (fleet audit 2026-09-28, 7 sites × every page type × 1440/390):
  - `data-component="topbar"` — the top utility bar (TopUtilityBar).
  - `data-component="contact-drawer"` — the floating Contact button
    (ContactFab) and the drawer panel (ContactDrawer's SheetContent).
  - `data-component="section-nav"` — the "In this section" side nav (SideNav,
    incl. its mobile collapse).
  - `data-block="resource-browser"` — the blog index search, filters, sort
    and post cards.
  - `data-block="post-image"`, `post-body`, `related-posts` — a post's
    featured image, body (tables included) + "More …" button, and related
    reading cards.
  - `data-block="not-found"` — the 404 page.
- Attributes only: no element, class or style changed.

### Fixed
- **No debug placeholder in production.** BlockRenderer rendered
  "Block not yet implemented: <id>" for an annotation the registry doesn't
  render (a page-level `page-header` placed in the body). A production build
  now falls back to `content-prose` (heading + copy); development keeps the
  placeholder.

### Rollout notes (template 2026.09.10 → 2026.09.11)
Ship in ONE commit, `c5-template.json` last.
- **Overwrite (M):** `CHANGELOG.md`, `docs/architecture.md`,
  `src/app/not-found.tsx`, `src/components/assembly/BlockRenderer.tsx`,
  `src/components/contact/ContactDrawer.tsx`,
  `src/components/contact/ContactFab.tsx`, `src/components/nav/SideNav.tsx`,
  `src/components/nav/TopUtilityBar.tsx`, `src/lib/content/blog-views.tsx`,
  `src/lib/theme/template-marker.test.ts`.
- **Add (A):** `src/components/assembly/BlockRenderer.test.ts`.
- **Delete (D):** none.
- **Write last:** `c5-template.json` = `{"templateVersion": "2026.09.11",
  "capabilities": ["fonts", "style-axes", "specimen", "layout-presets"],
  "syncedFrom": "<the template main SHA being rolled out>"}`.
- theme.css is not rewritten; no package.json change.

## [2026.09.10] — Image CTA banners and image heroes show their photo

One bug, two blocks: every `image-bg` cta-banner (and `image-bg-centered`)
and every full-bleed `image` / `video` / `slider` Hero rendered as a flat
colour block. **Visible change:** on every live page with an image banner or
a media hero, the photo now appears behind the copy under a dark ink scrim.
Colour banners, the statement hero, HeroSplit and every other block are
unchanged. Fleet scope (draft `content/pages`, 2026-09-28): 304 rendered
image banners across the 11 sites, and 2 media heroes (Berg and Kinexus
`/industries`, `hero: hero` + `hero_variant: image`).

### Fixed
- **Media backgrounds are drawn.** The media (`-z-20`) and scrim (`-z-10`)
  sat in a `bg-primary` section with no stacking context, so the section's own
  fill painted over them. Both blocks now give that section
  `isolation: isolate` (`MEDIA_SECTION_CLASS`, new
  `src/components/blocks/media-scrim.ts`), so the media paints above the fill
  and below the copy. The cta-banner photo stays `next/image` `fill`,
  `sizes="100vw"`, lazy (a closing banner is below the fold); the hero photo
  stays `priority`. Both are absolutely positioned — no layout shift.
- **Readable scrim** (shared, `MEDIA_SCRIM`). The old scrim (primary 62% +
  black → near-black at 74%) is replaced by the palette's ink token — a
  primary-tinted near-black that generate-theme.ts pins at 12% lightness for
  every brand, falling back to `--color-near-black` on themes without the
  token (Slachta, TruCount) — at 86% (top-left) → 76% (bottom-right). The
  copy token (`--color-primary-foreground`) is re-scoped to
  `--color-near-white` on media sections only (a light brand's
  primary-foreground would be dark on the dark scrim).
- **Hero eyebrow and headline accent.** They read `--color-action-text`. The
  ink-corrected action colour is only AA on the solid ink; over a bright photo
  seen through the scrim it falls to ~2.2:1 on mid-tone brand accents. On
  media heroes the content div re-scopes it to a light tint of the brand
  accent (35% `--color-action-on-ink` + 65% near-white).
- **Hero skeleton veil.** The full-bleed hero photo used skeleton-image, whose
  pulse placeholder is a `z-auto` sibling: behind a `-z-20` photo it painted
  above the photo and the scrim, and its `animate-pulse` keeps cycling 0 → 50%
  opacity after load. The hero now uses plain `next/image`, like CtaBanner and
  HeroSlides; the primary fill is the placeholder while the photo loads.
- **Measured contrast** (pixel-sampled under every text line box,
  `e2e/cta-banner-image.spec.ts`, `e2e/hero-image.spec.ts`; minimums over a
  pure-white photo, the worst case, long multi-paragraph copy, 1440 / 390 /
  360, light and dark):
  - Banner body (80% alpha): ≥ 5.6:1 on every fleet palette, the lowest being
    the near-black fallback (Slachta / TruCount) at 5.62:1; 5.16:1 on a stress
    light-gold ink. Banner heading ≥ 8.4:1. Over the real / dark photos
    ≥ 10:1. (At the review build's 70% light stop the fallback body measured
    ~4.6:1 at 390 / 360 — that is why the stop moved to 76%.)
  - Hero, every fleet palette: H1 ≥ 8.0:1, subhead (85% alpha) ≥ 6.0:1,
    eyebrow ≥ 5.7:1, headline accent ≥ 5.2:1.
- `imageTreatment` (natural / mono / rounded) is unchanged: it grades framed
  images (`.u-frame`, FramedMedia's media-grade) and never applied to a
  full-bleed banner or hero background.

### Site-specific exception
- **korbey-lague-site**: its image banners were never flat.
  `content/design-overrides.css` sets
  `[data-block="cta-banner"] > * { position: relative; z-index: 1 }`, which
  makes the banner's inner (max-width) div the stacking context, so the photo
  and scrim have always rendered boxed inside the content column rather than
  full-bleed. `isolate` on the section does not change that: korbey's banners
  look the same after this release.

### Added
- `/design-specimen?layouts=1` media cells below the layout cells
  (`[data-specimen-media]`, `mediaSpecimenCells()` in samples.ts):
  `hero:image`, `hero:slider` and `cta-banner:image-bg:long` (a three-paragraph
  body). `e2e/media-contrast.ts` holds the pixel-contrast helpers and the fleet
  palettes.

### R1
- `color-bg` / `color-bg-centered` banners, an `image-bg` banner with no
  resolvable image, the statement hero (with and without its framed image) and
  the no-media full-bleed hero render byte-identical to 2026.09.9 (unit goldens
  rendered from 4ac337d: `cta-banner-image.test.ts`, `hero-media.test.ts`).
  HeroSplit is untouched. Section / slot hooks, `data-layout`, the ink theme
  and the `ctaBanner: centered` preset are untouched — the copy stays the
  banner's last child (`block-layouts.css` `> div > div:last-child`).
- @visual: the four `cta-banner-image-bg-centered{,-ink}` layout-cell
  baselines are re-recorded (they had recorded the flat render; they pass
  either way under the default 0.2 colour threshold because the specimen photo
  is a dark flat placeholder, so the pixel specs are the real gate). Six NEW
  baselines for the media cells (`e2e/hero-image.spec.ts-snapshots`). No
  zero-change page or other layout cell moves (8/8 zero-change unchanged).
- `e2e/block-layouts.spec.ts` "an explicit layout variant wins" fingerprints
  the layout cells only: the new plain image-banner media cell rightly follows
  the `ctaBanner` preset.

### Notes
- `content/posts` also carries 34 `image-bg` banner annotations (Abramson 13,
  Accord 20, TruCount 1). They are inert: posts render their body as markdown,
  not through the block registry, so nothing there changes.

### Rollout notes (template 2026.09.9 → 2026.09.10)
Ship in ONE commit, `c5-template.json` last.
- **Overwrite (M):** `CHANGELOG.md`, `docs/blocks.md`,
  `e2e/block-layouts.spec.ts`, `src/app/design-specimen/layouts/page.tsx`,
  `src/components/blocks/CtaBanner.tsx`, `src/components/blocks/Hero.tsx`,
  `src/lib/showcase/samples.ts`, `src/lib/theme/template-marker.test.ts`.
- **Add (A):** `e2e/cta-banner-image.spec.ts`, `e2e/hero-image.spec.ts`,
  `e2e/media-contrast.ts`, `src/components/blocks/cta-banner-image.test.ts`,
  `src/components/blocks/hero-media.test.ts`,
  `src/components/blocks/media-scrim.ts`.
- **Delete (D):** none.
- **Skip:** `e2e/*-snapshots/**` and `*.png` (local @visual baselines),
  `package-lock.json` (unchanged), `content/**`.
- **Write last:** `c5-template.json` = `{"templateVersion": "2026.09.10",
  "capabilities": ["fonts", "style-axes", "specimen", "layout-presets"],
  "syncedFrom": "<the template main SHA being rolled out>"}`.
- theme.css is not rewritten; no package.json change. Sites with image
  banners or media heroes change visibly on deploy (the canary shows before /
  after).

## [2026.09.9] — Layout variants and site-wide layout presets

More layouts per block, chosen per section (the platform's layout picker) or
site-wide (design.json `layout`, the Design Studio's lever), plus the block
catalog contract (on main since 2026.09.8, first shipped here) and a template
version meta so the platform can tell what the deployed shell renders.

### Added
- **Layout variants** (catalog `since: 2026.09.9`, `layout: true`):
  `list` on service-cards / feature-grid / content-cards / team-grid (one item
  per row, media or icon left, text right; works with `theme: ink` on the
  blocks that take it), testimonials `featured` (first quote as a full-width
  pull quote, every other quote still shown below), cta-banner
  `color-bg-centered` / `image-bg-centered` (stacked, centred).
  `extractCtaBannerProps` splits `<bg>-centered` into `variant` + `align`.
- Mechanism: a layout variant renders the block's default markup plus
  `data-layout` on the section root and pixel-neutral `data-c5-slot` hooks;
  **`src/styles/block-layouts.css`** (after nav-fit.css, before the client
  overrides) restructures from that markup. Nothing is hidden or reordered.
- **Layout presets** (`src/lib/theme/layout-presets.ts`, `DesignJson.layout?`):
  `cards: list`, `ctaBanner: centered`, `faq: split`, `team: list`,
  `testimonials: featured` → `<html data-c5-layout-*>` (layout.tsx), reusing the
  same rules via `html[data-c5-layout-…] [data-block=X]:not([data-layout])`,
  never on ink card bands (service-cards / feature-grid `theme: ink`; an ink
  cta-banner renders like any banner and does follow `ctaBanner`). An
  explicit layout variant wins; legacy column /
  background variants follow the preset; a testimonials carousel stays one.
  FAQ split is preset-only. Absent / default / malformed emit nothing.
  Contract: `docs/design/layout-presets.json` (`npm run design-contracts`).
- **Block catalog contract** (from main 772a1b1, unreleased until now):
  `src/lib/assembly/block-catalog.ts` + test, `docs/design/blocks.json`,
  generated by `scripts/generate-design-contracts.ts`.
- **`<meta name="c5-template-version">`** on every page. `c5-capabilities` is
  unchanged apart from the new `layout-presets` token.
- **`/design-specimen?layouts=1`**: every block × layout cell (and list × ink)
  from sample content; `src/proxy.ts` rewrites it to the static
  `/design-specimen/layouts`, so `/design-specimen` is untouched. noindex.
- `scripts/validate-deliverable.ts` warns (never errors) on unknown block ids,
  inline page openers, unknown variants and the hero / hero_variant pair
  (`src/lib/assembly/annotation-lint.ts`).

### Changed
- `HeroProps['variant']` (extractor and component) narrowed to
  `image | video | slider | statement`. Type-only: unknown values, including
  the dead `image-right` / `image-left`, still render the full-bleed hero.
- `Section` takes `dataLayout`; `FramedMedia` takes `slot`. Both emit nothing
  when unset.
- `block-catalog.test.ts`: the registry ↔ catalog equality is exact in the
  template; in a client repo every registry block only has to be catalogued
  (repos without the opt-in `pricing-plans` block — Abramson, Accord, Aurora,
  bblcpa, Kinexus, Slachta — failed it in the fleet dry-verify).
- `hooks.test.ts`: block-layouts.css is the sixth hook stylesheet.
  `template-marker.test.ts`: 2026.09.9 + `layout-presets`.
  `e2e/design-defaults.spec.ts`: the preset attributes from design.json are
  part of the html hook contract (none by default); both metas asserted.

### Compatibility
- A pre-2026.09.9 template casts an unknown variant: `list` / `featured`
  render as the default grid; both centred banners render as the flat
  `color-bg` banner (its image is drawn only for exactly `image-bg`, so
  `image-bg-centered` would lose its image there — moot while every image-bg
  banner renders flat, see Known issue). The platform only offers the
  new values once a site's draft marker is 2026.09.9.

### Known issue (pre-existing, unchanged here — fixed in 2026.09.10)
- Every `image-bg` cta-banner, including the new `image-bg-centered`,
  rendered as the flat colour banner: the image sat at `-z-20` in a section
  that created no stacking context, so the section's `bg-primary` painted over
  it. Left as is in this release (CtaBanner untouched); the
  `image-bg-centered` @visual baselines showed that flat result. Fixed in
  2026.09.10.

### R1
- Existing variants emit no new attribute or class (unit-tested for every
  legacy variant × theme); stripping the hooks from a layout variant gives
  the base variant's exact markup. Every block-layouts.css selector is gated
  on `[data-layout]` or `html[data-c5-layout-*]`.
- @visual zero-change baselines unchanged (8/8). 22 new @visual baselines
  (layout cells at 1440/390).

### Rollout notes (template 2026.09.8 → 2026.09.9)
Ship in ONE commit, `c5-template.json` last.
- **Overwrite (M):** `docs/architecture.md`, `docs/blocks.md`,
  `e2e/design-defaults.spec.ts`, `next.config.ts`,
  `scripts/generate-design-contracts.ts`, `scripts/validate-deliverable.ts`,
  `src/app/globals.css`, `src/app/layout.tsx`,
  `src/components/blocks/{ContentCards,CtaBanner,FeatureGrid,Hero,Section,ServiceCards,TeamGrid,Testimonials}.tsx`,
  `src/components/ui/framed-media.tsx`,
  `src/lib/assembly/{extract-block-props,extract-block-props.test}.ts`,
  `src/lib/showcase/{samples,samples.test}.ts`,
  `src/lib/theme/{hooks.test,template-marker,template-marker.test,types}.ts`,
  `src/proxy.ts`, `src/proxy.test.ts`, `CHANGELOG.md`.
- **Add (A):** `docs/design/blocks.json`, `docs/design/layout-presets.json`,
  `e2e/block-layouts.spec.ts`, `src/app/design-specimen/layouts/page.tsx`,
  `src/components/blocks/{hero-variant.test,layout-slot}.ts`,
  `src/lib/assembly/{annotation-lint,annotation-lint.test,block-catalog,block-catalog.test}.ts`,
  `src/lib/theme/{block-layouts.test,layout-presets,layout-presets.test}.ts`,
  `src/styles/block-layouts.css`.
- **Delete (D):** none.
- **Skip:** `e2e/*-snapshots/**` and `*.png` (local @visual baselines),
  `package-lock.json` (unchanged), `content/**`.
- **Write last:** `c5-template.json` = `{"templateVersion": "2026.09.9",
  "capabilities": ["fonts", "style-axes", "specimen", "layout-presets"],
  "syncedFrom": "<the template main SHA being rolled out>"}`.
- theme.css is not rewritten; no package.json change. No site changes until an
  operator picks a layout variant or a preset.

## [2026.09.8] — Opt-in larger logo; a long nav never crushes the logo

Two header fixes. The header and footer logos render at a fixed 32px height,
which is small for stacked or two-line lockups (Stephen P. Pryor CPA). And a
desktop nav wider than the bar squeezed the logo, down to 0px on Kinexus: the
logo link's img has `max-width: 100%`, so it has no minimum width and absorbed
the whole overflow.

### Added
- **`design.json` `logo.size`** (`"standard" | "large"`, optional).
  `"large"` emits `<html data-c5-logo-size="large">`
  (`src/lib/theme/logo-size.ts`, layout.tsx); absent / `"standard"` /
  malformed emit nothing, so every site renders exactly as before (R1).
- **`src/styles/logo-size.css`** (imported after action-edge.css, before the
  client overrides), every rule gated on the attribute: header logo 40px on
  phones and 44px from `md` (the bar stays 64px), footer logo 40px (same h-8
  as the header today, not a shared variable, so it gets its own rule), the
  text wordmark text-lg → text-xl. The image keeps its aspect ratio;
  `object-fit: contain` scales a logo that outgrows its box down whole
  instead of squashing it.
- Why not a Design Studio style axis: a concept rewrites the whole `style`
  object (absent axis = default), so an axis would reset the operator's size
  on every concept apply, and the Studio critic never scores the logo. `logo`
  is a sibling key the Studio's design.json merge carries through untouched.
  The platform sets it from the Theme Studio Controls ("Logo size").
- **Header fit guard, decided before first paint** (`src/lib/nav/nav-fit.ts`):
  a tiny inline script layout.tsx emits right after `<NavBar>` (the CSP
  already allows inline scripts) measures the header row (logo at its NATURAL
  width · desktop nav · actions) while the page is parsed. If it is wider than
  the bar it sets `<html data-c5-nav-fit="collapse">` and
  **`src/styles/nav-fit.css`** (from `md` up) hides the desktop nav and shows
  the menu button. A row that fits sets nothing. It re-decides on window
  resize, bar resize and logo load; a re-check while collapsed removes the
  attribute, measures and restores it in the same task, so the expanded state
  is never painted. It waits for the logo image to load rather than guess its
  width (next/image boxes every logo at 160×32 until then). Any error leaves
  the 2026.09.7 page.
- JavaScript off: `@media (scripting: none)` clips the bar's horizontal
  overflow, so a too-long row no longer widens the page (2026.09.7 scrolled
  sideways). No effect when scripting is on.
- Tests: unit (`logoSizeAttributes` gating, every logo-size.css selector
  gated, sizes, import order; the fit script executed against a fake DOM;
  nav-fit.css gating); e2e `logo-size.spec.ts` measured from the rendered
  boxes: default 32px header and footer; large 44px desktop / 40px phone /
  40px footer at the logo's own aspect ratio, bar still 64px, no sideways
  scroll on a phone. Fit guard: fixtures written into the SERVED HTML
  (page.route) with the JS bundles blocked, so what is measured is the
  pre-hydration first paint — a Kinexus-like header (287×85 logo, 9 items +
  CTA) reproduces the 0px logo without the attribute and is collapsed with
  the logo at its natural 108px (44px tall when large); a Buss-like header
  (164px logo) collapses at 1024/1180 and is untouched at 1280/1440; resizing
  re-decides. Content-agnostic.

### Changed
- **NavBar / MobileNav are unchanged** (byte-identical to 2026.09.7): the fit
  guard is the inline script + nav-fit.css, so SSR, no-JS and pre-hydration
  markup are 2026.09.7's. Labels still wrap exactly as before when that is
  enough to fit: only a row that cannot fit with the logo at its natural width
  collapses.
- `hooks.test.ts`: nav-fit.css is the fifth hook stylesheet.
- `e2e/design-defaults.spec.ts`: `data-c5-nav-fit` (viewport-derived runtime
  state) is excluded from the design.json/brand.json hook contract.
- `hooks.test.ts`: logo-size.css is the fourth stylesheet allowed to reference
  `data-c5` hooks. `template-marker.test.ts`: 2026.09.8.
- `e2e/design-defaults.spec.ts`: the `<html data-c5-*>` contract includes the
  `data-c5-logo-size` hook derived from design.json.
- Docs: architecture.md ("Header logo size and fit"), how-to-new-site.md.

### R1
- @visual baselines unchanged (8/8). Header screenshots byte-identical to
  2026.09.7 at 390/768/834/1024/1280/1440 px with the text wordmark, a stacked
  lockup and the Kinexus logo on the default nav, and with a Buss-like header
  at 1280/1440 (it fits there).
- The fit guard only changes a header whose logo is squeezed today (row wider
  than the bar at the logo's natural width). Measured on the live sites
  (2026-09-27, logo rendered / natural width):
  - **768px** (every site's logo is squeezed today → menu button instead):
    Kinexus 30/108, Buss 0/164, Berg 20/132, Pryor 126/164, bblcpa 0/164,
    Aurora 0/125, Abramson 68/134, Slachta (text wordmark) wrapped, TruCount
    (text wordmark) wrapped, Accord 0/120.
  - **1024px**: Buss 0/164, bblcpa 97/164, Slachta and TruCount (wordmark
    wrapped) → menu button. Kinexus, Berg, Pryor, Aurora, Abramson, Accord
    fit → unchanged.
  - **1280px and wider**: every site fits → unchanged (Buss exactly, 1280 of
    1280).
- `logo.size`: no site sets it, so nothing changes until an operator opts in.

### Rollout notes (template 2026.09.7 → 2026.09.8)
Ship in ONE commit, `c5-template.json` last.
- **Overwrite (M):** `src/app/globals.css`, `src/app/layout.tsx`,
  `src/lib/theme/types.ts`,
  `src/lib/theme/{hooks.test,template-marker.test,action-edge.test}.ts`,
  `e2e/design-defaults.spec.ts`, `docs/architecture.md`,
  `docs/how-to-new-site.md`, `CHANGELOG.md`.
- **Add (A):** `src/styles/logo-size.css`, `src/styles/nav-fit.css`,
  `src/lib/theme/{logo-size,logo-size.test}.ts`,
  `src/lib/nav/{nav-fit,nav-fit.test}.ts`,
  `e2e/logo-size.spec.ts`.
- **Delete (D):** none.
- `action-edge.test.ts` is template main 548271e (its theme.css/brand.json
  parity check runs only on template-default content), merged into this
  release; repos synced from 17909dc don't have it yet.
- **Skip:** `package-lock.json` (unchanged), `content/**`.
- **Write last:** `c5-template.json` = `{"templateVersion": "2026.09.8",
  "capabilities": ["fonts", "style-axes", "specimen"], "syncedFrom":
  "<the template main SHA being rolled out>"}`.
- theme.css is not rewritten by this release; no package.json change.
- To opt a site in (e.g. Pryor): add `"logo": { "size": "large" }` to its
  `content/design.json`, or use Theme Studio → Controls → Logo size.

## [2026.09.7] — CTA buttons keep their shape on primary bands

The call-to-action button (Button `variant="cta"`, raw `--color-action`
fill) also sits on primary bands, above all the CtaBanner at the foot of most
pages. Measured on the live sites (2026-09-27, computed styles + rendered
pixels), the button fill against the band next to it: Accord 1.50:1, Aurora
2.08, Abramson 2.19, Pryor 2.64, Berg 2.91, Buss 2.93 — the button shape
dissolved into the band (WCAG 1.4.11 asks 3:1 for a component's boundary).
Kinexus (3.14) and bblcpa (5.32) already pass and are unchanged, as is every
site whose raw action clears 3:1 on primary.

No large accent TEXT on primary still reads the raw action (2026.09.5 routed
it through `--color-action-text`); nothing else on the live sites paints raw
action on primary except the page-header accent rule (decorative,
`aria-hidden`) and the pricing "Most popular" badge (its label is 4.5:1 on its
own fill), both left as they are.

### Added
- **`<html data-c5-action-edge="on">`** (`src/lib/theme/action-edge.ts`,
  layout.tsx) when brand.json's raw action is under 3:1 against the RENDERED
  primary (the AA-corrected surface as theme.css emits it, hsl rounded to
  whole percents). Every palette that passes emits nothing (R1).
- **`src/styles/action-edge.css`** (imported after logo-tone.css, before the
  client overrides), every rule gated on the attribute: a cta button inside a
  `.bg-primary` surface gets a 2px inner edge (`outline`, offset −2px) in
  `--color-action-on-primary` (≥ 4.5:1 on primary by construction). An
  outline, not a border or box-shadow: no layout shift and the focus ring
  (box-shadow) still draws. Fill, label and hover are unchanged; a light card
  inside the band keeps the plain button.
- `src/lib/theme/surface-contrast.ts`: `pickForeground` / `setLightness` /
  `ensureContrast` moved verbatim out of `scripts/generate-theme.ts` (theme.css
  output byte-identical) plus `renderedPrimarySurface()`, so the runtime gate
  and the generator compute the same primary.
- Tests: unit (the eight live palettes → attribute on/off with the ratios
  measured on the live sites; template default emits nothing; malformed
  palette never throws; rendered primary equals theme.css; every
  action-edge.css selector gated, outline-only, import order); e2e
  `action-edge.spec.ts` measured from pixels — an Accord-palette CtaBanner
  fixture reproduces < 3:1 without the flag, clears 3:1 with it, the light-card
  button keeps no edge, and layout emits the attribute exactly when the site's
  own palette needs it (content-agnostic).

### Changed
- `hooks.test.ts`: action-edge.css is the third stylesheet allowed to
  reference `data-c5` hooks. `template-marker.test.ts`: 2026.09.7.
- `e2e/design-defaults.spec.ts`: the `<html data-c5-*>` contract now also
  expects the brand.json-derived hooks (`data-c5-logo-tone`, 2026.09.6, and
  `data-c5-action-edge`), so it passes on Berg and on the edge sites.
- The default-palette unit check skips outside the template
  (`content/.template-default`), like the logo-tone one.

### Rollout notes (template 2026.09.6 → 2026.09.7)
Ship in ONE commit, `c5-template.json` last.
- **Overwrite (M):** `src/app/globals.css`, `src/app/layout.tsx`,
  `scripts/generate-theme.ts`,
  `src/lib/theme/{hooks.test,template-marker.test}.ts`,
  `e2e/design-defaults.spec.ts`, `CHANGELOG.md`.
- **Add (A):** `src/styles/action-edge.css`,
  `src/lib/theme/{action-edge,action-edge.test,surface-contrast}.ts`,
  `e2e/action-edge.spec.ts`.
- **Delete (D):** none.
- **Skip:** `package-lock.json` (unchanged), `content/**`.
- **Write last:** `c5-template.json` = `{"templateVersion": "2026.09.7",
  "capabilities": ["fonts", "style-axes", "specimen"], "syncedFrom":
  "<the template main SHA being rolled out>"}`.
- theme.css is not rewritten by this release; no package.json change.
- **Visible per site** (from each repo's brand.json palette): Accord 1.50,
  Aurora 2.08, Abramson 2.19, korbey 2.27, Pryor 2.64, Slachta 2.87,
  TruCount 2.87, Berg 2.91, Buss 2.93 — the cta buttons on primary bands
  (CtaBanner) gain the on-primary edge. Kinexus (3.14) and bblcpa (5.32): no
  change. The layout e2e checks the attribute against the site's own
  brand.json.

## [2026.09.6] — Light (white) logos stay visible

A white wordmark on transparent (Berg) was invisible everywhere: on the
default header (light bar), on the inverted nav (the logo sat on a
near-white plate), and in the dark footer (the primary logo is inverted,
white → black on dark). Sites whose logo is not flagged light are unchanged.

### Added
- **`brand.json` `logo.tone`** (`"light" | "dark"`, optional). Only
  `"light"` with a logo image emits `<html data-c5-logo-tone="light">`
  (`src/lib/brand/logo-tone.ts`); absent / `"dark"` / a text wordmark emit
  nothing, so every other site renders exactly as before. The platform's
  logo preflight writes `"light"` on a first deploy when the uploaded logo
  is mostly light (the same check that already defaults `style.nav` to
  `inverted`); on a live site set it by hand in brand.json.
- **`src/styles/logo-tone.css`** (imported after style-axes.css, before the
  client overrides), every rule gated on the attribute:
  - inverted nav: no plate — the primary bar is the dark surface;
  - default / bordered nav in light mode: a `--color-near-black` plate
    (in `.dark` the bar is already dark, so no plate);
  - dark footer: the primary logo's `invert` is dropped;
  - `footer="light"` in light mode: a `--color-near-black` plate.
  Why a dark plate rather than CSS recolouring (e.g. `brightness(0)`) on the
  light nav: the template never filters a client logo (a light logo with a
  coloured accent would flatten to a black silhouette, and `invert` shifts
  hues); the plate shows the mark as authored, its contrast does not depend
  on the palette, and it matches the existing dark plate for a light
  `logo.footer` on the light footer.
- e2e `logo-tone.spec.ts`: a Berg-like white-wordmark fixture measured from
  rendered pixels — ≥ 3:1 against its backdrop on every nav and footer
  preset, and in dark mode for the default, inverted and bordered nav and the
  default and light footer; no plate on the inverted nav; and a control that
  reproduces the invisible logo without the flag. Content-agnostic; the
  screenshot is decoded on a canvas in the page (no image library needed).
- Unit tests: attribute gating, every logo-tone.css selector gated on the
  attribute, no recolouring filter, import order.

### Changed
- `hooks.test.ts`: logo-tone.css is the second stylesheet allowed to
  reference `data-c5` hooks. `template-marker.test.ts`: 2026.09.6.

### Fixed
- **e2e on client content** (korbey CI, sha 3ff75d7): three specs assumed
  the template's demo content.
  - `form.spec.ts` ran on `/`. It now runs on the page that carries the
    `form` block (`e2e/site-pages.ts`: home, then contact, then any page) and
    skips when no page has one.
  - `smoke.spec.ts`'s blog-index check hard-coded `/resources` and
    `/resources/i` (4 matching headings on korbey, whose `/resources` is a
    real page). It now reads `content/blog.json` (`readBlogConfigFile`) and
    expects the index's h1 to be exactly the blog title at the blog path.
  The template's own run still exercises all three (home form,
  `/resources` "Resources").
- **The page files' review trailer never renders.** Page .md files end in
  `---` + `## SEO & AIO Metadata` (answer block, E-E-A-T, internal links,
  FAQ dump, citation note) and `---` + `## Structured Data — paste into
  \`<head>\`` (a JSON-LD code block). New pure
  `src/lib/content/strip-generator-notes.ts`, whose detection mirrors the
  platform's `lib/content/strip-generator-notes.ts`: the anchors are
  byte-mirrored through `src/lib/content/__fixtures__/generator-trailer.template.json`
  (copied from the platform) and `strip-generator-notes.parity.test.ts`
  checks them and runs every vector there (canonical JSON; cut, keep and
  refuse cases). Same behaviour as the platform: CRLF files, a heading-less
  label run bounded by a following Structured Data trailer, and NO cut
  (content renders as-is) when a foreign heading follows the trailer. Plus
  the same real Accord fixtures:
  - post bodies (`get-post.ts`) drop the trailer — a page relocated into
    `content/posts/` rendered all of it (35 posts live);
  - `parse-page-md.ts` also cuts at an orphaned Structured Data rule when
    the SEO heading is missing, including the dash-scrubbed "Structured
    Data, paste into `<head>`" (Accord /services); the JSON-LD is still
    extracted;
  - `/api/md/[[...slug]]` serves frontmatter + body only.
  Anchored on the `---` rule plus the exact heading, so a post's own
  "## FAQ" section (tested) or prose that mentions SEO is never cut.

### R1 / baselines
- No `@visual` baseline re-captured: the template's brand.json has no
  `logo.tone`, so no rule applies (all 8 zero-change screenshots pass
  unchanged).

### Rollout notes (template 2026.09.5 → 2026.09.6)
Ship in ONE commit, `c5-template.json` last.
- **Overwrite (M):** `src/app/globals.css`, `src/app/layout.tsx`,
  `src/lib/brand/types.ts`,
  `src/lib/theme/{hooks.test,template-marker.test}.ts`,
  `e2e/{form,smoke}.spec.ts`, `src/lib/content/get-post.ts`,
  `src/lib/assembly/parse-page-md.ts`,
  `src/app/api/md/[[...slug]]/{route,route.test}.ts`, `CHANGELOG.md`.
- **Add (A):** `src/styles/logo-tone.css`,
  `src/lib/brand/{logo-tone,logo-tone.test}.ts`, `e2e/logo-tone.spec.ts`,
  `e2e/site-pages.ts`,
  `src/lib/content/{strip-generator-notes,strip-generator-notes.test,strip-generator-notes.parity.test}.ts`,
  `src/lib/content/__fixtures__/generator-trailer.template.json`,
  `src/lib/content/__fixtures__/leaked-generator-notes/{accord-services.orphan-structured.page,accord-year-end-cheer.post}.md`.
- **Delete (D):** none.
- **Skip:** `package-lock.json` (unchanged), `content/**`.
- **Write last:** `c5-template.json` = `{"templateVersion": "2026.09.6",
  "capabilities": ["fonts", "style-axes", "specimen"], "syncedFrom":
  "<the template main SHA being rolled out>"}`.
- theme.css is not rewritten by this release; no package.json change.
- **Visible per site:** none until a site's brand.json has
  `"logo": { …, "tone": "light" }`. Berg needs that edit (its white
  wordmark), made in the site's own repo as a content change.

## [2026.09.5] — Hero + header CTA, block polish, green CI

Approved visible changes (production-ready styling review, WS-D). Sites
that don't opt in to darkSections see: a hero button, balanced display
headings, and the fixes below.

### Added
- **Hero call to action.** `hero` / `hero-split` heroes render a primary
  button (they never did: `cta_primary` was hard-coded `undefined`). First
  match wins: frontmatter `hero_cta_label` + `hero_cta_url` → the platform's
  per-page `cta_text` + `cta_url` → `nav.json` `cta` → "Schedule a
  consultation" → the site's contact destination: the nav's childless
  Contact item (e.g. Accord `/locations`, Berg `/contact-us`), else `/contact`
  only when `content/pages/contact.md` exists, else NO button (never a link
  to a 404). Omitted when it would link the page to itself.
- **Header CTA de-duplication.** With `nav.cta` set (the platform now turns
  it on by default), a childless primary item pointing at the same page
  (typically "Contact") is dropped from the desktop and mobile menus.
- **`design.json` `darkSections`** now does something: `<html
  data-dark-sections="on">` moves the ink bands (ServiceCards / FeatureGrid /
  IndustryCards `theme: ink`, marked `.u-band-ink`) from `--color-primary`
  onto `--color-ink`, with the ink foreground and on-ink action token.
- **Image grade tokens** `--c5-media-grade-opacity` (default .24) and
  `--c5-media-grade-fill` (default primary → action gradient) on FramedMedia's
  duotone wash (was an inline style CSS couldn't raise).
- `c5-template.json` **`syncedFrom`**: the template commit SHA a client repo
  was synced from (null in the template itself). Read by the platform fleet
  tool as the 3-way gate's OLD.
- **Large action text reads the surface-corrected token.** The headline
  accent word (Hero, HeroSplit, PageHeader, IntroText), primary-band StatsBar
  figures and the pricing-calculator estimate use
  `var(--color-action-text, var(--color-action))`
  (`src/lib/theme/accent-color.ts`), which globals.css rebinds to the
  on-primary / on-ink / canvas value per surface. Raw action was unreadable
  on primary with real palettes (Accord crimson on charcoal 1.50:1, Pryor
  1.26, Aurora 2.08, Abramson 2.19, bblcpa 2.58). Where the raw action
  already passes, the token equals it (no change).
- e2e `polish.spec.ts` (content-agnostic except the hero-button check;
  includes a failing-palette page-header accent ≥ 3:1 check); unit tests for
  every item; a template-only lockfile check
  (`src/lib/lockfile-platforms.test.ts`).

### Changed
- `.t-display` / `.t-h1` / `.t-h2`: `text-wrap: balance`.
- A page ending on the full-bleed `cta-banner` drops the footer's `mt-16`.
- Centred IntroText with a body over 600 characters: heading stays centred,
  body left-aligns in a 65ch column.
- StatsBar: each value is judged on its own — true figures (digits with
  `$ , . / % + x K M B`) keep the display numerals; a phrase value is set as
  an upright `t-h3` in the heading colour.
- NavBar top-level labels over 24 characters truncate with a tooltip.

### Fixed
- process-steps parses `### Title` + paragraph steps (rendered heading only).
- Feature lists parse `Icon: **Title:** desc` / `Icon: Title: desc` (icon
  names showed up in card titles) and `Icon: **Title** - desc`; the leading
  word is an icon only when it is one of the Icon component's names
  (`src/lib/assembly/icon-names.ts`) — "Bookkeeping: Monthly close: …" is
  Title: description.
- FeatureGrid, ServiceCards, IndustryCards, TeamGrid, ChecklistSection,
  ProcessSteps, Pricing, ContentCards, ContentTable render nothing when no
  item parsed and there is no intro.
- **CI**: `package-lock.json` listed only darwin-arm64 native bindings
  (npm/cli#4828), so `npm ci` on ubuntu died at the Test step ("Cannot find
  module '@rolldown/binding-linux-x64-gnu'") on every run since 2026-09-02.
  The rolldown, @tailwindcss/oxide, lightningcss, esbuild, unrs-resolver
  and next → sharp (`@img/sharp-*`, used by `next start` image optimisation
  in CI e2e) entries were re-resolved so every platform's binding is listed.

### R1 / baselines
- `@visual` desktop-home + mobile-home re-captured deliberately (hero button;
  headings re-break under balance; the statement-hero accent word "answer"
  now reads the canvas-corrected action, #007a8d instead of raw #00C1DE,
  because the template default action fails on the canvas). privacy-policy, pricing-calculator and
  404 baselines unchanged (the nav label clamp only applies to labels over
  24 characters, so the active underline is untouched).
- theme.css and `scripts/generate-theme.ts` are unchanged (byte parity with
  the platform generator is unaffected).

### Rollout notes (template 964ceb4 → 2026.09.5)
Ship in ONE commit, `c5-template.json` last.
- **Overwrite (M):** `src/app/design-specimen/page.tsx`,
  `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`,
  `src/components/assembly/GeneratedMarkdownPage.tsx`,
  `src/components/blocks/{ChecklistSection,ContentCards,ContentTable,FeatureGrid,Hero,HeroSplit,Icon,IndustryCards,IntroText,PageHeader,Pricing,PricingCalculatorClient,ProcessSteps,ServiceCards,StatsBar,TeamGrid}.tsx`,
  `src/components/nav/{MobileNav,NavBar}.tsx`,
  `src/components/ui/framed-media.tsx`,
  `src/lib/assembly/{extract-block-props,extract-block-props.test,md-utils,md-utils.test,page-frontmatter-schema,parse-page-md}.ts`,
  `src/lib/nav/{nav-tree,nav-tree.test}.ts`,
  `src/lib/theme/{hooks.test,template-marker,template-marker.test}.ts`, `README.md`,
  `CHANGELOG.md`.
- **Add (A):** `e2e/polish.spec.ts`,
  `src/components/blocks/{empty-blocks,accent-color,icon-names}.test.ts`,
  `src/lib/assembly/icon-names.ts`, `src/lib/nav/hero-cta-site.ts`,
  `src/lib/theme/accent-color.ts`,
  `src/lib/lockfile-platforms.test.ts` (skips in client repos).
- **Delete (D):** none.
- **Skip:** `package-lock.json` (client-owned; see the CI recipe below),
  `e2e/zero-change.spec.ts-snapshots/*` (template-content baselines, gated on
  `content/.template-default`), `content/**`.
- **Write last:** `c5-template.json` = `{"templateVersion": "2026.09.5",
  "capabilities": ["fonts", "style-axes", "specimen"], "syncedFrom":
  "<the template main SHA being rolled out>"}`.
- **Also carried (fleet on rollout 3 = d97c04b):** 964ceb4 changed
  `src/lib/theme/{action-text-contrast,action-text-contrast.test}.ts` after
  rollout 3 (tint-badge text vs the page background, fb02628). Overwrite them
  too unless the client already matches 964ceb4. theme.css is not rewritten
  by this release.
- **Gate:** 3-way per file — client vs OLD (the client's `syncedFrom`, else
  d97c04b for the 2026.09.4 fleet) vs NEW; a client edit to any overwritten
  file is a stop-and-look.
- **Visible per site:** hero button on every hero/hero-split page that has a
  contact destination (nav Contact item or a contact page) or a page/nav CTA;
  accent words / primary-band stat figures on palettes whose raw action
  fails their surface get the corrected action; header
  CTA only once the platform writes `nav.cta` (new packages) or an operator
  adds one in the NavEditor; ink bands change only where design.json has
  `darkSections: true`.
- **Client CI recipe** (korbey today; any repo before it gets `ci.yml`), on
  the client repo with no other changes pending:
  ```sh
  node -e "const f='package-lock.json',l=require('./'+f);for(const k of Object.keys(l.packages))if(k==='node_modules/next'||/(^|\/)node_modules\/(rolldown|@rolldown\/binding-|lightningcss|@tailwindcss\/oxide|esbuild|@esbuild\/|unrs-resolver|@unrs\/resolver-binding-|sharp|@img\/)/.test(k))delete l.packages[k];require('fs').writeFileSync(f,JSON.stringify(l,null,2)+'\n')"
  npm install --package-lock-only --ignore-scripts
  grep -c '"node_modules/@rolldown/binding-linux-x64-gnu"\|"node_modules/@img/sharp-linux-x64"' package-lock.json   # expect 2
  npm ci && npm test && npm run build
  ```
  (`node_modules/next` is removed too: npm only re-adds next's optional
  `sharp` when it re-resolves next; the pinned next version does not move.)
  Check the lock diff changes no top-level versions beyond patch bumps, then
  commit `package-lock.json` alone ("fix(ci): lockfile keeps every
  platform's native bindings").

## [2026.09.4] — Auto-corrected action colour for small text

### Added
- **Small-text action tokens** in theme.css (from `scripts/generate-theme.ts`
  via `src/lib/theme/action-text-contrast.ts`), each the action colour moved in
  OKLCH lightness only (hue held, chroma reduced only to stay in sRGB) to the
  smallest step reaching 4.5:1 against the surfaces it RENDERS on — the
  `hsl()` values theme.css emits (whole-percent rounding), not the palette hex:
  - `--color-action-text` / `--color-action-text-canvas`: canvas background,
    muted (flat cards) and card;
  - `--color-action-text-tint`: the 10% / 15% action-tint badges on a card;
  - `--color-action-on-primary` / `--color-action-on-ink`: bg-primary and
    Section bg="ink";
  - `.dark` re-derives `-text`, `-text-canvas` and `-text-tint` on the dark
    background, muted and card.
  A raw action that already passes is emitted verbatim. House default
  #00C1DE on #F7F5F2 was 1.99:1; the canvas token is now #007a8d.

### Changed
- Small action-coloured text reads the corrected tokens, always with a
  `var(…, var(--color-action))` fallback so a site whose theme.css predates the
  tokens renders exactly as before: `.t-kicker` (hero / section kickers, card
  dates, page-header kicker), the tertiary button label, and (tint token) the
  pricing-plans "Save n%" pill and Article / Case study badges.
- `.bg-primary` and the new Section ink hook `.u-surface-ink` re-scope
  `--color-action-text` to their variant; a light card inside them
  (`.u-card`, `.bg-card`, `.bg-background`) gets `-text-canvas` back. Token
  re-scopes, so client `design-overrides.css` kicker rules still win.
- Large display accents (headline accent word, stat figures, calculator
  estimate), icons, stars, rules and fills keep the raw brand action.
- R1 baselines: the home @visual baselines were re-captured deliberately — the
  template default's own palette fails on the canvas, so the statement-hero
  kicker darkens. The other six baselines are unchanged.

## [2026.09.3] — Style-axis preset fixes + export-brief retired

### Fixed
- **`footer=light` / `footer=brand`** now set the footer's `background-color`
  and `color` directly (not only re-scoped tokens), so a client
  `design-overrides.css` that paints the footer (e.g. bblcpa's
  `background: var(--color-primary)`) can no longer leave light-preset text on
  a dark surface (was 1.46:1, now 11.76:1). On the light footer, images are
  shown as authored (the dark-footer `invert` / client whitening is dropped);
  a dedicated `brand.logo.footer` gets a dark plate.
- **`nav=inverted`** seats the logo on a near-white plate so dark client logos
  (and the text wordmark) stay legible on the primary bar. Logos are never
  filtered or recoloured.
- **`nav=bordered`** is now clearly visible: a 2px primary rule under the bar
  (was a 1.13:1 `--color-border` hairline) plus a tinted chip behind the
  active item.
- **Dark-mode current/active indicators** were 1.57:1 (`--color-primary` is
  deliberately not flipped under `.dark`): top-nav + mobile-nav active items,
  SideNav active section/page, the breadcrumb current item and the contact
  drawer's active tab now use foreground text (+ action-colour
  underline/bar) in dark mode — 15.24:1 text, 8.29:1 indicator bar. Light
  mode is unchanged. `dark:` is now class-based (`@custom-variant dark`,
  following next-themes' `.dark`).

### Added
- Inert hooks `data-c5="logo"` (NavBar + Footer logo links) and
  `data-c5-variant="footer"` (footer logo when `brand.logo.footer` is set).
- e2e WCAG contrast checks for the nav/footer presets (`e2e/contrast.ts`),
  including on top of client-style chrome overrides.

### Removed
- **`export-brief` / `export-kit` / `design-preview`** npm scripts and
  `scripts/export-design-brief.ts` + `scripts/design-preview.ts` — the
  in-platform Revaltus Design Studio replaces the Claude.ai brief handoff.
  The `design-kit/` + `design-brief.md` `.gitignore` entries and the docs
  describing the handoff are gone too.

### Rollout notes
- Fleet sync must **delete** `scripts/export-design-brief.ts` and
  `scripts/design-preview.ts` and drop the three npm scripts from each client
  `package.json`. A client repo with a local `design-kit/` folder should delete
  it (it is no longer ignored). No capability change; write
  `c5-template.json` last as before.

## [2026.09.2] — Design Studio T2: style axes + design specimen

### Added
- **Style axes.** `design.json.style` (sectionRhythm, cards, buttons, heroScale,
  imageTreatment, nav, footer, accentUsage — see `src/lib/theme/style-axes.ts`,
  mirrored at `docs/design/style-axes.json`) → `<html data-c5-*>` → presets in
  `src/styles/style-axes.css` (imported between theme.css and the overrides).
  `default` / absent emits nothing: untouched sites are unchanged.
- Inert hooks: `data-c5="button"`, `data-c5="headline-accent"`,
  `data-c5="media-grade"`, `data-c5-spacing`.
- **`/design-specimen`** — every block once (first real instance from the site's
  pages, else the showcase sample). noindex + `X-Robots-Tag`, not in the sitemap,
  unlinked. Samples now live in `src/lib/showcase/samples.ts`.
- `c5-template.json` capabilities: `fonts`, `style-axes`, `specimen`.

### Rollout notes
- Never copy (and delete if present) `content/.template-default` — it marks the
  *template's own* default content and gates template-only specs; it must never
  reach a client repo (`npm run unpack` removes it automatically).
- Ship the whole file set in **ONE commit**, with `c5-template.json` **last** —
  `layout.tsx` hard-imports it, as does `src/app/fonts.generated.ts`.

## [2026.09.1] — Design Studio T1: live fonts + capability marker

### Added
- **Live fonts.** `src/app/fonts.generated.ts` (generated by `npm run generate-fonts`
  from `design.json` typography, incl. the new optional `accentFont`) replaces the
  hardcoded next/font calls in `layout.tsx`. The default file loads exactly the
  previous fonts. Allowed families: `src/lib/theme/font-manifest.ts`
  (mirrored at `docs/design/font-manifest.json`).
- **Capability marker** `c5-template.json` + `<meta name="c5-capabilities">` on every
  page, read by the Revaltus Design Studio.
- CI: fonts-module drift check, and a job that builds every manifest font once.

### Fixed
- `content/redirects.csv` destinations starting `//` or `/\` (open redirect) are skipped.

### Rollout notes
- `src/app/fonts.generated.ts` is client-owned after seeding: never overwrite it in a
  fleet sync; seed it (this default file, verbatim) only when absent. Write
  `c5-template.json` last.

## [Unreleased] — 2026-05-28 product-polish pass (7 batches)

Sweep through the 18-item analysis covering functionality, structure, and
design workflow. Each batch landed in its own commit; this is the umbrella
note. Visitor-facing wins are in Batches 2, 4, 5; operator workflow wins
in Batches 6, 7; foundation in Batch 1; brand schema bump in Batch 3.

### Added
- **`generate_lead` GA4/GTM event** fired from `FormFields` on every
  successful form submission (real submit + mailto-fallback path,
  differentiated by `method`). Bots/honeypot trips are not tracked.
- **Booking block** (`<!-- block: booking -->`) that embeds the client's
  Calendly via the official inline widget or a lighter `<iframe>`, gated
  by a new `siteConfig.booking` config. Renders nothing until wired.
- **Programmatic favicon + Apple touch icon** (`src/app/icon.tsx` and
  `apple-icon.tsx`) — initials on `brand.palette.primary`. Zero-config
  branded favicons in every client clone, no static asset required.
- **Auto-generated OG images** via `/api/og/[[...slug]]/route.tsx` (next/og
  `ImageResponse`); branded 1200×630 PNG built from page title + brand
  colors. Replaces the per-deliverable `/og-images/<slug>.png` convention.
- **Branded 404** at `src/app/not-found.tsx` — renders the firm's primary
  nav as recovery links + a back-to-home CTA.
- **Insights blog** at `/insights` + `/insights/[slug]` with full
  BlogPosting JSON-LD, Article OG type, and per-post canonical/published
  metadata. Posts live in `content/posts/*.md`. Empty-state UX when no
  posts exist — fresh clones don't crash.
- **RSS 2.0 feed** at `/feed.xml`; global `Link: rel=alternate` header
  added to `next.config.ts` so feed readers + agents auto-discover it.
- **ResourceList lead-magnet block** (`<!-- block: resource-list -->`)
  with a card grid of downloads and an inline newsletter signup CTA.
  Files in `public/resources/`; ungated by design.
- **Dev-only block showcase** at `/showcase` — renders every block in
  the registry with realistic sample content. `notFound()` in production.
- **`npm run new-client <zip>`** — one-shot bootstrap: install + unpack +
  validate + initial commit. Idempotent.
- **`npm run design-preview`** — watches `content/` + `site.config.ts`
  and re-runs `export-brief` so the Claude.ai handoff brief stays fresh.
- **`npm run analyze`** — production build with `@next/bundle-analyzer`
  (gated by `ANALYZE=true`); no-op for regular builds.

### Changed
- **`BlockRenderer` refactored** to a typed `BLOCK_REGISTRY` map
  (`src/components/assembly/block-registry.tsx`). Same behavior, much
  thinner dispatch — adding a new block is one registry entry instead of
  edits across three locations. Same `UnknownBlockPlaceholder` fallback
  for unregistered ids.
- **`parsePageMd` now validates frontmatter via Zod** (`PageFrontmatterSchema`),
  catching the kind of type-shape errors (`faq_block: "broken"`) the old
  `String(x ?? '')` casts silently swallowed.
- **`/api/contact` page handler degradation:** wraps the load + parse in
  a single `try/catch` so runtime parse failures become `notFound()`
  rather than a 500.
- **CI workflow runs `npm run validate`** between install and lint, so a
  malformed deliverable fails CI before any other step.
- **`BrandJson.logo`** gains optional `mark` / `stacked` / `horizontal` /
  `monochrome` variants alongside `primary` / `footer`. Type-only;
  existing deliverables keep building.
- **`generateMetadata` in both page handlers** no longer references
  `/og-images/*.png`; OG + Twitter images now point at the new
  `/api/og/[[...slug]]` route.
- **`sitemap.ts`** includes `/insights` + per-post URLs when at least
  one post exists.

### Tests
- New: `page-frontmatter-schema` (6), `track-event` (5),
  `post-frontmatter-schema` (4), `block-registry` smoke (23 — registry
  size lock + one per block).
- **138 → 176 tests** across 11 files.

### Notes
- The previous `/og-images/<slug>.png` deliverable convention is no
  longer used by `generateMetadata`. Clients with a hand-crafted PNG
  for a specific non-catch-all route can still drop a static
  `opengraph-image.png` in that route's folder (Next file-based
  convention picks it up over the route handler).

## [Unreleased] — 2026-05-28 agent-readiness pass

Compared the codebase against the "agent-ready website" best-practices
([suganthan.com/blog/how-to-make-website-agent-ready](https://suganthan.com/blog/how-to-make-website-agent-ready))
and closed the three real gaps. Most of the article's checklist was already
satisfied (per-page JSON-LD, OG / Twitter card metadata, canonical URLs,
semantic HTML + Microdata, dynamic sitemap, CLS-safe layout).

### Added
- **Default `public/robots.txt`** with explicit `Allow:` rules for GPTBot,
  ClaudeBot, anthropic-ai, PerplexityBot, CCBot, OAI-SearchBot, and
  Google-Extended, plus a `Sitemap:` line. Fresh clones are no longer blank
  to AI bots; the Phase I deliverable's `robots.txt` overwrites this default
  when unpacked.
- **Markdown endpoint** for every page. `src/proxy.ts` (Next 16's renamed
  middleware) rewrites `<page>.md` URLs to a new optional-catch-all route
  handler `src/app/api/md/[[...slug]]/route.ts` that serves `text/markdown`.
  Frontmatter is preserved (machine-readable metadata) and block annotations
  (`<!-- block: ... -->`) are stripped via the new pure helper
  `src/lib/content/strip-block-annotations.ts` (7 vitest cases). The proxy
  also appends a per-URL `Link: <foo.md>; rel="alternate";
  type="text/markdown"` header on every HTML page response so agents can
  discover the markdown via a `curl -I`.
- **Global `Link` headers** in `next.config.ts`:
  `</llms.txt>; rel="describedby"; type="text/markdown"` and
  `</sitemap.xml>; rel="sitemap"`.

### Changed
- `docs/architecture.md` — new "Agent readiness" section documents the
  layered design (robots.txt default + Link headers + .md endpoint + the
  deliberately-out-of-scope items: OpenAPI / WebMCP / MCP server card stay
  *off* so `/api/contact` isn't advertised to the bots the BotID layer is
  there to block).
- `docs/how-to-new-site.md` — step 2 notes the robots.txt default + overwrite
  behavior; step 5 includes optional `curl -I` checks for the Link headers
  and the `.md` endpoint.
- `README.md` — new "Agent readiness" section linking the deeper doc.

### Tests
- `strip-block-annotations.test.ts` (7) — pure helper edges.
- `src/app/api/md/[[...slug]]/route.test.ts` (2) — handler returns
  `text/markdown` w/ frontmatter + stripped annotations on hit; `404` on miss.
- `src/proxy.test.ts` (4) — rewrite branch for `.md` URLs (incl. `/index.md`
  → `/api/md` and slug shapes); Link-header branch for HTML pages.
- Total: **125 → 138 tests** across 7 test files.

### Out of scope (recorded)
- Sitewide `Organization` JSON-LD in the root layout, and a
  `/.well-known/agent.json` (A2A) — Tier 2 items in the analysis; can be
  added in a later pass.

## [Unreleased] — 2026-05-25 form spam protection

Layered spam / bogus-entry defenses on the built-in Resend contact route, all **on by default** in every client clone. Rate limiting was intentionally left out of this pass (see Deferred).

### Added
- **Vercel BotID** (`botid`) — invisible CAPTCHA against headless/Playwright bots. `next.config.ts` is wrapped with `withBotId()`; `src/instrumentation-client.ts` calls `initBotId({ protect: [{ path: '/api/contact', method: 'POST' }] })`; the route calls `checkBotId()` and returns 403 on a bot. Basic mode is free, inert in local dev / off-Vercel, served same-origin so no CSP change is needed. Deep Analysis is an opt-in Vercel dashboard toggle.
- **`src/lib/forms/spam.ts`** — pure, unit-tested heuristics: server-side honeypot (`isHoneypotFilled`), timing trap (`isSubmittedTooFast`, 3s minimum), and content scoring (`scoreContent` — link density + spam-keyword list). Covered by `src/lib/forms/spam.test.ts`.
- **`/api/contact` spam layers** in cheapest-first order: honeypot → timing → content → BotID, ahead of the Resend send. Honeypot/timing/link-flood return a **covert `{ok:true}`** (no email, no signal to spammers); lightly suspicious content is still delivered with a `[likely spam]` subject prefix + body note so no real lead is lost. New `route.test.ts` cases cover each layer.

### Changed
- **`FormSubmitPayload`** gained top-level `hp` (honeypot) and `t` (form-mount timestamp) fields — kept out of `fields` so the Zod schemas (which strip unknown keys) don't discard them before the spam check.
- **`FormFields.tsx`** now sends `hp` + `t` with each built-in submission and treats a **403 like a 503** → `mailto:` fallback, so a rare false-positive human still reaches the firm.

### Deferred
- **Rate limiting** — skipped for now. Future options: Vercel WAF rate rules (no app code) or Upstash Redis (Marketplace) + `@upstash/ratelimit` for durable per-IP limits on Fluid/serverless.

## [Unreleased] — 2026-05-24 deferred-items cleanup

Clears the three items left in the 2026-05-22 "Deferred" list below.

### Fixed
- **`secondary-fg / secondary` contrast now passes WCAG AA.** Was 4.47 : 1, under the 4.5 : 1 threshold. `scripts/generate-theme.ts` gains an `ensureContrast()` step that nudges a brand *surface* token's lightness (preserving hue + saturation) until it meets AA against its chosen foreground — a no-op for pairs that already pass. For the default palette this shifts `--color-secondary` from `hsl(210 5% 45%)` to `hsl(210 5% 44%)`, an imperceptible change that lifts the pair to **4.59 : 1**. Generic by design: any future client palette with a borderline surface is auto-corrected instead of shipping an audit failure. The `REQUIRED_PAIRS` verifier now checks the corrected surfaces.

### Changed
- **`react-markdown` removed from the FaqAccordion client bundle.** `FaqAccordion.tsx` is now a server wrapper that pre-renders each answer's markdown to a React node and passes it to the new `FaqAccordionClient.tsx` (`'use client'`), which keeps only the interactive Radix accordion. Mirrors the `Form.tsx` / `FormFields.tsx` split. `react-markdown` + `remark-gfm` no longer ship in any client bundle.

### Performance
- **Image CLS sweep — verified, no code change required.** Audited every `next/image` usage in `LogoBar`, `TeamGrid`, `ContentCards`, and `ChecklistSection`. All already render with `fill` inside space-reserving containers (`h-12`, `aspect-[4/5]`, `aspect-video`, `aspect-[4/3]`), so layout space is reserved before the image loads — no cumulative layout shift. Closed as verified.

## [Unreleased] — 2026-05-22 audit + features pass

### Added
- **Analytics (GA4 / GTM) with cookie consent.** Optional analytics via the official `@next/third-parties` package, gated by a server-rendered consent banner. Configured via `NEXT_PUBLIC_GA4_ID` and `NEXT_PUBLIC_GTM_ID` env vars; when both are set, GTM wins. Consent decision persists in the `analytics-consent` cookie (365-day expiry), revisited via a "Cookie preferences" link in the footer. See `docs/architecture.md#analytics--consent`.
- **Cookie consent banner in the design-brief.** `scripts/export-design-brief.ts` now sends `Cookie: _cookie-preview=1` on its chrome fetch and emits a "Cookie Consent Banner" subsection in the brief output. Per-client banner styling flows through `content/design-overrides.css` the same way navbar + footer chrome does. Spec at `docs/superpowers/specs/2026-05-22-analytics-and-consent-design.md`.
- **Optional `brand.logo.footer`** override on the `BrandJson` type. When set, the footer renders this asset directly; when unset, falls back to the prior primary-with-invert behavior. Fixes silent-breakage for clients whose primary logo is already light.
- **`siteConfig.forms.serviceOptions`** moved out of a hard-coded Form.tsx constant so each client edits one file.
- **Security headers** on every response: `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation off). CSP deferred — see Deferred below.
- **`@next/third-parties`** dependency (analytics scripts + SPA pageview tracking).
- **`@icons-pack/react-simple-icons`** dependency (replaces hand-rolled social SVGs).
- **`/api/contact` integration tests** (8 cases): missing API key, oversized payload, unknown variant, schema failure, happy path with assertions on To/From/replyTo/subject, Resend rejection, malformed JSON. Vitest tests jumped 100 → 108.
- **`CHANGELOG.md`** (this file) and **`docs/architecture.md`** for the architecture rationale of the new subsystems.

### Changed
- **`site.config.ts` restructured** — `formEndpoint` and `formFromEmail` removed from the top level; replaced with a typed `forms: { endpoint, fromEmail, toEmail, serviceOptions }` block. `toEmail` is an optional override; it falls back to `brand.contact.email` when blank. README's "Form / email setup" section documents the new shape.
- **Social icons** in the footer now use `@icons-pack/react-simple-icons` (Facebook, X, Instagram, YouTube). LinkedIn stays as an inline SVG because Simple Icons honored a takedown request from LinkedIn and lucide v1 doesn't ship brand marks either. The exported `SocialIcon` component API is unchanged, so no consumer changed.
- **NavBar scroll listener** now coalesces state updates through `requestAnimationFrame` so React re-renders cap at one per animation frame instead of one per scroll event.
- **Public Sans font** is loaded once and aliased to both `--font-heading-loaded` and `--font-body-loaded` via inline style on `<html>`, avoiding a duplicate font loader call.
- **Consent banner reload removed.** Accepting / declining now calls `useRouter().refresh()` instead of `window.location.reload()`, so the GA / GTM script appears in place without losing scroll position or re-fetching static assets.
- **Form.tsx split into server wrapper + `FormFields.tsx` client component.** The server wrapper pre-renders the markdown `intro` (via `InlineProse`) and `sidebar_content` (via `ReactMarkdown` + `remark-gfm`) and hands them to the client as React nodes. `react-markdown`, `remark-gfm`, and `InlineProse` no longer ship in the client bundles for contact/quote/newsletter/custom routes (~60 KB gzipped saved).
- **Footer text contrast** — six muted-text sites bumped from `text-background/{60,70,80}` to `text-background/90` so all rendered text passes WCAG AA on the dark footer surface. `scripts/generate-theme.ts` gains a new `REQUIRED_PAIRS` entry that verifies the `/90`-over-`bg-foreground` pair via `chroma.mix` alpha-blend.
- **`ConsentBannerClient.tsx` renamed to `ConsentBanner.tsx`** for consistency — the `'use client'` directive is the marker; no need for a suffix.
- **Footer "Cookie preferences" link** added to the legal bar. Clears the `analytics-consent` cookie and reloads, satisfying the GDPR right-to-withdraw.

### Fixed
- **Open-redirect in `content/redirects.csv`.** `next.config.ts`'s loader now rejects rows whose destination doesn't start with `/`. A row like `/old,https://attacker.com` would otherwise have shipped as a 308 to an attacker-controlled URL.
- **Zip-slip in `scripts/unpack-deliverable.ts`.** Entries that resolve outside the repo root are refused before `extractAllTo` runs. `adm-zip` 0.5.x has no built-in protection.
- **Email reply-To header injection.** `/api/contact` strips CR/LF from the visitor's email before passing as Resend `replyTo`. Defense in depth — Zod also rejects the malformed input first.
- **Unbounded payloads on `/api/contact`.** Early `Content-Length` check caps requests at 64 KB (legitimate payloads are around 6 KB).
- **Info leak on unknown form variant.** `/api/contact` now returns a generic `Invalid request` 400; the verbose variant name goes to `console.error`.
- **All 5 ESLint warnings eliminated.** Lint output is now empty.
  - `scripts/check-all-blocks.ts` — `void BlockRenderer` keeps the import live as the module-load assertion intends.
  - `scripts/generate-theme.ts` — dropped unused `firmName` destructure.
  - `src/lib/assembly/extract-block-props.ts` — stopped binding unused `_cta`.
  - `src/lib/assembly/md-utils.ts` — deleted unreached `metaLinePattern`.
  - `.remember/**` added to ESLint `globalIgnores`.
- **Cross-platform lockfile.** `npm install` populated `@next/swc-*` entries for Linux/Windows/etc. so CI no longer needs a fresh install to resolve the SWC binary.

### Security
The following defense-in-depth changes are summarized in **Fixed** above but worth calling out in a security context too:
- Open-redirect destination allowlist
- Zip-slip path validation
- CR/LF strip on email reply-To
- Request body size cap
- Generic error messages on unknown input
- Four platform-wide security response headers

### Performance — Cache Components / PPR (follow-up to the earlier deferral)
- **`cacheComponents: true`** enabled in `next.config.ts`. Next 16's unified caching model: data fetches are excluded from prerenders unless wrapped in `'use cache'`, and dynamic islands (anything reading `cookies()` / `headers()` / per-request data) stream in via Suspense boundaries while the surrounding shell stays static.
- All four content loaders converted to **`'use cache'` + `cacheLife('max')`**:
  - `src/lib/brand/get-brand-config.ts`
  - `src/lib/nav/get-nav-config.ts`
  - `src/lib/theme/get-theme-vars.ts`
  - `src/lib/content/get-page.ts` (both `getPageMarkdown` and `listPageSlugs`)
  The prior manual in-memory cache pattern (`let cached: T | null = null; if (NODE_ENV === 'production' && cached) return cached`) is removed — Next's cache supersedes it.
- **`<Analytics />` wrapped in `<Suspense fallback={null}>`** in `src/app/layout.tsx` so the `cookies()` read doesn't bubble dynamism up to the whole page.
- **`Footer.tsx` marked `'use cache'`** so its `new Date().getFullYear()` copyright doesn't get treated as per-request data.
- **`sitemap.ts` marked `'use cache'` + `cacheLife('max')`** for the same reason.
- **`[...slug]` `generateStaticParams` placeholder.** Cache Components requires `generateStaticParams` to return at least one entry. When `content/pages/` only has `home.md` (the fresh-clone state), the function now returns a `__no_pages__` placeholder, and the page handler maps that to `notFound()`. Once a client unpacks a real deliverable, the actual slugs take over and the placeholder disappears.
- **`runtime = 'nodejs'` removed from `/api/contact`.** Under Cache Components, route segment `runtime` config is rejected at build time (Node is the default and only setting; explicit export is disallowed).
- **Route table outcome:**
  - `/` flipped from `ƒ (Dynamic)` → **`◐ (Partial Prerender)`** — static shell + dynamic Analytics island.
  - `/_not-found` same.
  - `/[...slug]` placeholder is `○ (Static)`; runtime fallback for un-prerendered slugs stays `ƒ` (expected). Real client pages from the deliverable will each be `◐`.
  - `/sitemap.xml` flipped from `ƒ` → **`○ (Static)`**.
  - `/api/contact` stays `ƒ` (correct for POST endpoint).

### Security — Content-Security-Policy (follow-up to the earlier deferral)
- **CSP header enabled by default** in `enforce` mode, set in `next.config.ts` via `buildCsp()` and configured under `siteConfig.csp` in `site.config.ts`. The directive set:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' https://*.googletagmanager.com https://*.google-analytics.com` (`'unsafe-eval'` added in dev for React's debug eval)
  - `style-src 'self' 'unsafe-inline'` (Tailwind + the inline font-variable alias need it)
  - `font-src 'self'` (next/font self-hosts Google Fonts under `/_next/static`)
  - `img-src 'self' data: blob: https:` (permissive: content assets, OG images, certifications, markdown-embedded images)
  - `connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`
  - `frame-src https://www.google.com https://*.google.com` (Google Maps embed in `Map.tsx`)
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`
- **Approach: `'unsafe-inline'` + explicit third-party allowlist, NOT nonces.** Nonce-based CSP requires per-request rendering, which Next's PPR docs explicitly note is incompatible with Cache Components — going nonce would undo the static-prerender win from the prior commit. The CSP we ship still meaningfully defends against clickjacking, base-URI hijacks, form-action redirects, plugin abuse, and mixed content. XSS protection comes from upstream markdown sanitization (`react-markdown`), not from CSP blocking inline scripts.
- **`siteConfig.csp` config block** with three knobs:
  - `mode: 'enforce' | 'report-only' | 'off'` — defaults to `enforce`. Set `report-only` when wiring up a client for the first time or adding a new third-party service to catch violations in the browser console without blocking content.
  - `extraOrigins: string[]` — additional origins added to `script-src`, `style-src`, `connect-src`, `img-src`, and `frame-src` all at once. Example: `['https://*.calendly.com', 'https://*.stripe.com']`. Per-directive control requires editing `buildCsp()` directly.

### Deferred
These three items were carried out of this pass and **all resolved in the 2026-05-24 deferred-items cleanup** (see the section above):
- **`secondary-fg / secondary` contrast pair** shipped at 4.47 : 1 vs. the 4.5 : 1 AA threshold. → Fixed (now 4.59 : 1).
- **react-markdown in `FaqAccordion.tsx` client bundle.** → Fixed (server/client split).
- **Image aspect-ratio sweep** across LogoBar, TeamGrid, ContentCards, ChecklistSection. → Verified already CLS-safe; no change needed.
