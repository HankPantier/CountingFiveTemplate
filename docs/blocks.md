# Block reference

Every page is assembled from blocks. This is the complete catalogue: what each block does, how to annotate it in markdown, what shape the body needs to be, and a tiny working sample.

For the *why* behind the assembly pipeline (parser → extractor → renderer) and the
registry pattern, see [`architecture.md`](./architecture.md#block-assembly--registry).
For visual previews of every block, run `npm run dev` and open
`http://localhost:3000/showcase`.

---

## How blocks are annotated

Section blocks live in a page's `.md` body, preceded by an HTML-comment annotation that
the parser splits on:

```markdown
<!-- block: <block-id> | variant: <name> | image: <file> | query: "<pexels-query>" -->
## Heading
Body content here…
```

- **`block`** — the block id from the table below. Required.
- **`variant`** — one of the block's documented variants. Optional; the block has a default.
- **`image`** — filename in `public/content-assets/`. Used by blocks that take a hero / aside image. **Preferred: use a Markdown image instead** (see below).
- **`query`** — Pexels search query the deliverable used when sourcing the image. Preserved for introspection; never consumed by the renderer.

**Including an image (preferred):** write a standard Markdown image as the first line of the block body. Alt text and source come from one line, and the source may be a local filename **or** a full `https://` URL:

```markdown
<!-- block: content-split | variant: image-right -->
## Built on Relationships

![Our team in the office](team-photo.png)

When you call us, you get the partner who knows your business…
```

Local filenames resolve under `public/content-assets/`. The `| image: <file>` comment attribute still works as a fallback. Remote `https://` URLs work with no extra configuration.

The parser also tolerates *extra* whitespace and attribute order, but the canonical form above is what the deliverable emits.

Three "blocks" are **page-level**, set in frontmatter rather than as section annotations:
`hero`, `hero-split`, `page-header`. They render before all section blocks. See the
**Page-level heroes** section at the end.

---

## At a glance

| Block id | Purpose | Variants |
|---|---|---|
| `booking` | Scheduling-widget embed (Calendly / iframe) | — |
| `checklist-section` | Bullet list of value props, optionally beside an image | `standalone`, `with-image` |
| `contact-info` | Address / phone / email card from `brand.json` | — |
| `content-cards` | Generic linked cards (blog, resource, news teaser) | `2-col`, `3-col`, `list`* |
| `content-prose` | Free-form long-form markdown body | — |
| `content-split` | Heading + prose on one side, image on the other | `image-right`, `image-left` |
| `content-table` | Markdown table with optional caption | — |
| `cta-banner` | One-line call-to-action band | `color-bg`, `image-bg`, `color-bg-centered`*, `image-bg-centered`* |
| `faq-accordion` | Question/answer accordion + FAQPage JSON-LD | — |
| `feature-grid` | Icon + title + description bullet grid | `3-col`, `4-col`, `list`* |
| `form` | Contact / quote / newsletter / custom form | `contact`, `quote`, `newsletter`, `custom` |
| `industry-cards` | Industry-served cards | `3-col`, `4-col` |
| `intro-text` | Centered intro paragraph beneath a heading | `centered`, `left-aligned` |
| `logo-bar` | Client/partner logo row | — |
| `map` | Google Maps embed from `brand.contact.address` | — |
| `pricing` | Tier cards with bullet features | `2-tier`, `3-tier`, `4-tier` |
| `process-steps` | Numbered/lettered step list | `horizontal`, `vertical` |
| `resource-list` | Downloadable resources + newsletter CTA | — |
| `service-cards` | Service offering cards (3-up by default) | `2-col`, `3-col`, `list`* |
| `stats-bar` | Big-number metrics strip | `3-up`, `4-up` |
| `team-grid` | Photo + bio member grid | `2-col`, `3-col`, `4-col`, `list`* |
| `testimonials` | Quote + attribution carousel or grid | `carousel`, `grid`, `featured`* |

\* **Layout variants** (template 2026.09.9; `layout: true` in `docs/design/blocks.json`):
`list` = one item per row, media or icon left, text right (works with `theme: ink`);
`featured` = the first quote as a full-width pull quote, the rest below;
`<bg>-centered` = the banner's heading, text and button stacked and centred. They add
`data-layout` to the section and are styled in `src/styles/block-layouts.css`. The same
layouts can be set site-wide with `design.json` `layout` presets (see
`docs/architecture.md`); an explicit layout variant always wins over the preset. A
template older than 2026.09.9 renders `list`/`featured` as the default grid and both
centred banners as the flat `color-bg` banner. Preview every cell at
`/design-specimen?layouts=1`.

---

## `booking`

Scheduling-widget embed. URL + provider come from `siteConfig.booking` — see [README → Booking setup](../README.md#booking-setup-calendly--iframe-scheduler). Renders nothing when `provider === 'none'`.

```markdown
<!-- block: booking -->
## Book a discovery call
A quick 30-minute call to see if we're a good fit.
```

The heading + body intro render above the embed. The body's parser ignores everything below the first paragraph — the embed handles the rest. Source: `src/components/blocks/Booking.tsx`.

---

## `checklist-section`

A checkmark-prefixed bullet list, optionally beside a supporting image.

```markdown
<!-- block: checklist-section | variant: with-image | image: workspace.jpg -->
## Why clients stay with us

A short intro paragraph (optional).

- Year-round planning, not year-end scrambles
- One partner per client — no rotating associates
- Plain-English explanations of what changed and why

[**Schedule a call →**](/contact)
```

`variant: with-image` renders the checklist in a two-column layout with the image on the
right; `standalone` (default) is full-width. Body shape: optional intro paragraph(s), then
plain `- ` bullets, then an optional trailing markdown link (parsed as the CTA).

---

## `contact-info`

Address / phone / email card. **Data-driven** — reads `brand.contact` from
`content/brand.json` and ignores the body. The annotation only needs a heading.

```markdown
<!-- block: contact-info -->
## Contact
```

Source: `src/components/blocks/ContactInfo.tsx`.

---

## `content-cards`

Generic linked teaser cards — used for blog posts, news, or resource teasers when
they're embedded into a regular page (the `/resources` index uses its own renderer).

```markdown
<!-- block: content-cards | variant: 3-col -->
## Recent resources

Optional intro paragraph here.

### Year-end tax tips
Date: 2026-11-04
URL: /resources/year-end-tips
Excerpt: A quick rundown of what to handle before December 31.

### Choosing a CFO
Date: 2026-10-22
URL: /resources/hiring-a-cfo
Excerpt: Signs your business needs strategic financial leadership.

[**Browse all resources →**](/resources)
```

Each card is `### Title` followed by an inline-attribute block (`Date:`, `URL:`,
`Excerpt:`). The trailing markdown link is the section CTA.

---

## `content-prose`

A long-form prose section — free-form markdown rendered through `react-markdown`. The
heading from the annotation becomes the section heading; the entire body becomes the
prose body.

```markdown
<!-- block: content-prose -->
## Our approach

Free-form markdown here, with **bold**, [links](/services), bullets, etc.

Multiple paragraphs are fine.
```

---

## `content-split`

Side-by-side prose + image. Variants pick which side the image sits on.

```markdown
<!-- block: content-split | variant: image-right | image: team-photo.jpg -->
## Built on relationships, not transactions

When you call us, you get the partner who knows your business — not a rotating cast
of associates. That's been our promise for fifty years.

[**Meet the team →**](/team)
```

Body is free markdown + optional trailing markdown link as the CTA.

---

## `content-table`

Standard markdown table, optionally with an intro paragraph above and a caption below.

```markdown
<!-- block: content-table -->
## Service tiers

A high-level look at what each engagement includes.

| Service | Starter | Growth | Enterprise |
|---|---|---|---|
| Bookkeeping | ✓ | ✓ | ✓ |
| Tax prep | — | ✓ | ✓ |
| CFO advisory | — | — | ✓ |

*Caption: Custom packages available — ask.*
```

The intro is everything before the table; the caption is a trailing `*italic*` paragraph.

---

## `cta-banner`

A one- or two-sentence call-to-action band, usually with a single CTA button.

```markdown
<!-- block: cta-banner | variant: color-bg -->
## Ready to have a real conversation?

No commitment. No jargon.

[**Schedule a call**](/contact)
```

`color-bg` (default) uses the brand primary color; `image-bg` uses `image:` from the
annotation as a hero background.

---

## `faq-accordion`

A collapsing FAQ accordion that also emits a `FAQPage` JSON-LD blob. **Prefers the
structured `faq_block` array in the page's frontmatter** — when that's present (the
normal case for Phase I deliverables), the body is ignored.

```markdown
---
faq_block:
  - question: Do you serve clients outside Massachusetts?
    answer: Yes — we work with clients across New England and beyond.
  - question: Do you offer fixed-fee engagements?
    answer: For most recurring work, yes.
---

<!-- block: faq-accordion -->
## Frequently asked questions
```

When `faq_block` is absent, the parser falls back to scanning the body for Q/A pairs.

---

## `feature-grid`

Icon-led feature bullets in a 3- or 4-column grid.

```markdown
<!-- block: feature-grid | variant: 3-col -->
## What we do

Three lines on each of our services.

- Calculator: **Tax Strategy & Compliance** — Year-round planning, not season-end filing.
- Briefcase: **Advisory & Virtual CFO** — Financial oversight on a fractional basis.
- ChartLine: **Audit & Assurance** — For nonprofits, foundations, and closely held companies.
```

Each bullet is `- <IconName>: **Title** — Description`. Icons come from the curated
`ICON_MAP` in `src/components/blocks/Icon.tsx` (~64 lucide-react names, PascalCase);
unknown names fall back to a plain square. The icon-less form `- **Title** — Description`
is also accepted (defaults to `CheckCircle`).

The `### Title` chunk format (what Phase I generation emits) can pick its icon with an
`icon:` line directly under the heading — same convention as `photo:` in content-cards:

```markdown
### Healthcare Professionals
icon: Stethoscope

Practice owners face billing complexity…
```

Without an `icon:` line, chunks default to `CheckCircle`.

---

## `form`

Contact / quote / newsletter / custom form. The interactive shell lives in
`FormFields.tsx`; the variants drive layout + the schema used for validation.

```markdown
<!-- block: form | variant: contact -->
## Get in touch

Tell us about your business and we'll be in touch within one business day.

sidebar:

**Or call us directly:**
(978) 555-0100

Mon–Fri, 9–5 Eastern.
```

The `sidebar:` marker splits the body — the part above becomes the form intro, the
part below renders as a sidebar. For `variant: custom`, the body should declare the
fields in a markdown list (one per line, format `- name: type (required?) — placeholder`).
See [`README → Form / email setup`](../README.md#form--email-setup) for the wiring and
spam-protection details.

---

## `industry-cards`

Industries-served grid with icon + title + description.

```markdown
<!-- block: industry-cards | variant: 3-col -->
## Industries we serve

Optional intro.

- Briefcase: **Professional Services** — Law firms, consultancies, and creative agencies.
- Stethoscope: **Healthcare & Dental** — Private practices, group practices, clinics.
- Heart: **Nonprofits** — Foundations, 501(c)(3)s, member organizations.
```

Same bullet shape as `feature-grid`; renders as cards rather than a flat grid.

---

## `intro-text`

A short heading + paragraph section, usually right under the hero. Centered by default.

```markdown
<!-- block: intro-text | variant: centered -->
## Three generations of CPAs who actually pick up the phone

Korbey Lague has been the CPA firm of choice for closely held businesses across the
Merrimack Valley since 1972.

[**Read our story →**](/about)
```

`variant: left-aligned` left-aligns the content. The trailing markdown link is the CTA.

---

## `logo-bar`

Client / partner logo strip.

```markdown
<!-- block: logo-bar -->
## Trusted by businesses across New England

- ![Acme Corp](acme.png)
- [![Beta Inc](beta.png)](https://beta.example.com)
- ![Gamma LLC](gamma.png)
```

Wrapping a logo in `[…](url)` makes it a link. Logo image filenames resolve under
`public/content-assets/`.

---

## `map`

Google Maps embed. **Data-driven** — reads `brand.contact.address` from `brand.json`.
Annotation just needs a heading.

```markdown
<!-- block: map -->
## Visit us
```

Source: `src/components/blocks/Map.tsx`.

---

## `pricing`

Tier-cards with bullet features.

```markdown
<!-- block: pricing | variant: 3-tier -->
## Pricing

Optional intro.

### Starter
$300 / month

- Monthly bookkeeping
- Quarterly check-in
- Email support

### Growth
$750 / month

- Everything in Starter
- Monthly P&L review
- Phone + email support
- Tax planning meeting

### Enterprise
Custom

- Everything in Growth
- Fractional CFO support
- Board-ready reporting

*All plans include a 30-day no-questions cancellation.*
```

Each tier is `### Name` + a price line + a feature bullet list. A trailing `*italic*`
paragraph becomes the disclaimer beneath the cards.

---

## `process-steps`

Numbered process. Renders horizontally or vertically.

```markdown
<!-- block: process-steps | variant: vertical -->
## How we work

Optional intro paragraph.

**Step 1 — Discovery** Conversation about your business, goals, and current setup. No commitment.

**Step 2 — Engagement** Custom scope of work, fixed fees, and a clear timeline.

**Step 3 — Onboarding** Document collection, software access, and your partner introduction.
```

The parser also accepts plain numbered lists (`1.` …) and Markdown headings — the
`**Step N — Title**` form above is the canonical one.

---

## `resource-list`

Lead-magnet downloads + a newsletter signup right below. Resources are ungated; the
newsletter is the soft conversion ask. See
[`architecture.md → Resources blog`](./architecture.md#resources-blog--rss--lead-magnet-block)
for the design rationale.

```markdown
<!-- block: resource-list -->
## Free resources for small business owners

A quick word about what these are for.

- [Year-End Tax Checklist](/resources/year-end-checklist.pdf) — A printable checklist of documents you'll need for filing.
- [Quarterly Compliance Calendar](/resources/compliance-calendar.pdf) — All your filing deadlines on one page.
```

Files live in `public/resources/`. Each bullet: `- [Title](url) — Description`. Any
prose before the first bullet becomes the intro.

---

## `service-cards`

Service-offering cards. Each card is a `### Title` block.

```markdown
<!-- block: service-cards | variant: 3-col -->
## Services

Optional intro paragraph here.

### Bookkeeping
Monthly cleanup, reconciliations, and management reports.

### Tax Preparation
Federal, state, and local filings for individuals, partnerships, and S-corps.

### CFO Advisory
Fractional CFO services — forecasting, KPIs, board-ready reports.
```

A `### Title` plus its paragraph make one card. To make a card link to a sub-page,
trail a markdown link: `[**Learn more →**](/services/cfo)`. Each card also accepts an
optional image: place a Markdown image (`![alt](file.png)`) or a `photo: <file>` line
under the `### Title` heading, the same way `content-cards` handles per-card images.

---

## `stats-bar`

Big-number metrics strip.

```markdown
<!-- block: stats-bar | variant: 3-up -->
## By the numbers

- **50+** years serving the Merrimack Valley
- **200+** active business clients
- **$2B+** in payroll processed annually
```

The parser also accepts an inline dot-delimited single-line form for terser sources.

---

## `team-grid`

Team-member grid with photos, credentials, and bios.

```markdown
<!-- block: team-grid | variant: 3-col -->
## Meet the team

Optional intro paragraph here.

### Jane Korbey
_Managing Partner, CPA_

Forty years of public accounting. Specializes in succession planning and complex partnerships.

### Tom Lague
_Partner, CPA, MST_

Tax strategy, multistate filings, and trust + estate work.
```

Each member is `### Name`, optional `_Title in italics_`, and a bio paragraph. Photo
filenames pair to members by order (`team-1.jpg`, `team-2.jpg`, etc.) when present in
`public/content-assets/`.

---

## `testimonials`

Quotes + attribution.

```markdown
<!-- block: testimonials | variant: carousel -->
## What clients say

> Korbey Lague turned around our quarterly close from a three-week scramble into a four-day process.
> — Sarah Chen, COO at Northstar Manufacturing

> Best CPA experience we've had — actual phone calls returned the same day.
> — Marcus Patel, Owner, Patel & Sons
```

`carousel` and `grid` are visual variants. Each quote is a blockquote (`>`) with a
trailing `— Name, Title at Company` attribution line.

---

## Page-level heroes

Heroes are not section blocks — they're set in the page's frontmatter and rendered
before any section block:

```markdown
---
hero: hero               # or 'hero-split' or 'page-header'
hero_variant: image      # variant for the chosen hero
hero_image: hero.jpg
hero_subhead: A short benefit-led tagline.
---
```

- **`hero`** — full-bleed hero with optional background image. Variants: `image`, `video`, `slider`, `image-right`, `image-left`.
- **`hero-split`** — two-column hero with prose on one side, image on the other. Variants: `image-right`, `image-left`.
- **`page-header`** — minimal title + subheadline + breadcrumb. No variant.

Source: `src/lib/assembly/extract-block-props.ts` (`extractHeroProps`,
`extractHeroSplitProps`, `extractPageHeaderProps`).

---

## Adding a new block

The mechanical steps:

1. Add the component at `src/components/blocks/<Block>.tsx`.
2. Add the prop type + `extract<Block>Props(section, manifest?)` extractor in
   `src/lib/assembly/extract-block-props.ts`.
3. Add one line to `BLOCK_REGISTRY` in `src/components/assembly/block-registry.tsx`.
4. Bump the count assertion in `block-registry.test.ts` (one line) — this is the
   guard that prevents silent drift.
5. Add a sample to `src/app/showcase/page.tsx`'s `SAMPLE_CONTENT` map and a section
   to this doc.

The registry's smoke tests will run the extractor against your sample and catch
extractor-level regressions immediately.
