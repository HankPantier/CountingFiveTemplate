import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Hero, type HeroProps } from './Hero'
import { MEDIA_ACTION_TEXT_CLASS, MEDIA_SCRIM, MEDIA_SECTION_CLASS } from './media-scrim'

/**
 * 2026.09.10: the full-bleed image / video / slider Hero draws its media. Same
 * bug and fix as the image cta-banner: the section gets its own stacking
 * context (`isolate`), so the media (-z-20) and scrim (-z-10) paint above the
 * section's bg-primary fill. The statement hero and the no-media full-bleed
 * hero must stay byte-identical (R1): the goldens were rendered from 4ac337d
 * (2026.09.9). HeroSplit is a separate component and is not touched.
 */
const base = {
  headline: 'Three generations who actually *answer*.',
  subheadline: 'Sub',
  eyebrow: 'Since 1972',
  cta_primary: { label: 'Go', url: '/contact' },
  cta_secondary: { label: 'More', url: '/about' },
}
const html = (p: Partial<HeroProps>) => renderToStaticMarkup(createElement(Hero, { ...base, variant: 'image', ...p } as HeroProps))
const headerClass = (markup: string) => markup.match(/<header[^>]*class="([^"]*)"/)![1].split(' ')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

const GOLDEN = {
  "statementImage": "<link rel=\"preload\" as=\"image\" imageSrcSet=\"/_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=384&amp;q=75 384w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=640&amp;q=75 640w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=750&amp;q=75 750w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=828&amp;q=75 828w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=1080&amp;q=75 1080w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=1200&amp;q=75 1200w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=1920&amp;q=75 1920w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=2048&amp;q=75 2048w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=3840&amp;q=75 3840w\" imageSizes=\"(max-width: 768px) 100vw, 42vw\"/><header data-block=\"hero\" data-c5-spacing=\"spacious\" class=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative\"><div class=\"grid gap-10 lg:gap-14 md:grid-cols-[1.15fr_0.85fr] items-center\"><div><div class=\"t-kicker mb-5\">Since 1972</div><h1 class=\"t-display max-w-[18ch] text-foreground\">Three generations who actually <span class=\"font-accent\" data-c5=\"headline-accent\" style=\"color:var(--color-action-text, var(--color-action))\">answer</span>.</h1><p class=\"t-body-lg mt-6 max-w-[46ch] text-foreground/70\">Sub</p><div class=\"mt-9 flex flex-wrap items-center gap-5\"><a data-c5=\"button\" class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 bg-action text-action-foreground hover:bg-action/90 active:bg-action/80 h-11 rounded-md px-8\" href=\"/contact\">Go</a><a class=\"font-semibold border-b-2 pb-0.5 transition-opacity hover:opacity-70\" style=\"border-color:var(--color-action)\" href=\"/about\">More \u2192</a></div></div><div class=\"relative w-full overflow-hidden bg-muted aspect-[4/5] u-frame\"><span aria-hidden=\"true\" class=\"pointer-events-none absolute inset-0 animate-pulse bg-muted transition-opacity duration-500\"></span><img alt=\"\" decoding=\"async\" data-nimg=\"fill\" class=\"object-cover [filter:saturate(0.85)_contrast(1.04)]\" style=\"position:absolute;height:100%;width:100%;left:0;top:0;right:0;bottom:0;color:transparent\" sizes=\"(max-width: 768px) 100vw, 42vw\" srcSet=\"/_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=384&amp;q=75 384w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=640&amp;q=75 640w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=750&amp;q=75 750w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=828&amp;q=75 828w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=1080&amp;q=75 1080w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=1200&amp;q=75 1200w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=1920&amp;q=75 1920w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=2048&amp;q=75 2048w, /_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=3840&amp;q=75 3840w\" src=\"/_next/image?url=%2Fcontent-assets%2Fhero.jpg&amp;w=3840&amp;q=75\"/><span aria-hidden=\"true\" data-c5=\"media-grade\" class=\"pointer-events-none absolute inset-0 mix-blend-multiply opacity-[var(--c5-media-grade-opacity,0.24)] [background:var(--c5-media-grade-fill,linear-gradient(150deg,var(--color-primary)_0%,var(--color-action)_130%))]\"></span></div></div></header>",
  "statementPlain": "<header data-block=\"hero\" data-c5-spacing=\"spacious\" class=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative\"><div class=\"max-w-4xl\"><div><div class=\"t-kicker mb-5\">Since 1972</div><h1 class=\"t-display max-w-[18ch] text-foreground\">Three generations who actually <span class=\"font-accent\" data-c5=\"headline-accent\" style=\"color:var(--color-action-text, var(--color-action))\">answer</span>.</h1><p class=\"t-body-lg mt-6 max-w-[46ch] text-foreground/70\">Sub</p><div class=\"mt-9 flex flex-wrap items-center gap-5\"><a data-c5=\"button\" class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 bg-action text-action-foreground hover:bg-action/90 active:bg-action/80 h-11 rounded-md px-8\" href=\"/contact\">Go</a><a class=\"font-semibold border-b-2 pb-0.5 transition-opacity hover:opacity-70\" style=\"border-color:var(--color-action)\" href=\"/about\">More \u2192</a></div></div></div></header>",
  "imageNoMedia": "<header data-block=\"hero\" class=\"bg-primary text-primary-foreground relative overflow-hidden\"><div class=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\"><div class=\"relative max-w-3xl mx-auto py-24 md:py-36 text-center\"><div class=\"t-kicker mb-5 justify-center\">Since 1972</div><h1 class=\"t-display\">Three generations who actually <span class=\"font-accent\" data-c5=\"headline-accent\" style=\"color:var(--color-action-text, var(--color-action))\">answer</span>.</h1><p class=\"t-body-lg mt-6 text-primary-foreground/85\">Sub</p><div class=\"mt-8 flex flex-wrap gap-3 justify-center\"><a data-c5=\"button\" class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 bg-action text-action-foreground hover:bg-action/90 active:bg-action/80 h-11 rounded-md px-8\" href=\"/contact\">Go</a><a data-c5=\"button\" class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/90 h-11 rounded-md px-8\" href=\"/about\">More</a></div></div></div></header>"
}

describe('Hero media fix (2026.09.10)', () => {
  it('statement (with and without its framed image) renders byte-identical to 2026.09.9', () => {
    expect(html({ variant: 'statement', image: 'hero.jpg' })).toBe(GOLDEN.statementImage)
    expect(html({ variant: 'statement' })).toBe(GOLDEN.statementPlain)
  })
  it('the full-bleed hero with no media renders byte-identical to 2026.09.9', () => {
    expect(html({ variant: 'image' })).toBe(GOLDEN.imageNoMedia)
    expect(html({ variant: 'slider', images: [] })).toBe(GOLDEN.imageNoMedia)
  })

  it.each([
    ['image', { variant: 'image', image: 'hero.jpg' }],
    ['video', { variant: 'video', video: 'hero.mp4', image: 'poster.jpg' }],
    ['video without a poster', { variant: 'video', video: 'hero.mp4' }],
    ['slider', { variant: 'slider', images: ['a.jpg', 'b.jpg'] }],
  ] as const)('%s: isolated section, ink scrim, near-white copy, tinted action text', (_, p) => {
    const markup = html(p as Partial<HeroProps>)
    expect(headerClass(markup)).toEqual(expect.arrayContaining(['relative', 'overflow-hidden', ...MEDIA_SECTION_CLASS.split(' ')]))
    expect(markup).toContain(`<div aria-hidden="true" class="absolute inset-0 -z-10" style="background:${esc(MEDIA_SCRIM)}"></div>`)
    // The action-text re-scope sits on the content div (a child), where it
    // beats the unlayered `.bg-primary { --color-action-text }` rule.
    expect(markup).toContain(`<div class="relative max-w-3xl mx-auto py-24 md:py-36 text-center ${MEDIA_ACTION_TEXT_CLASS}">`)
    // Eyebrow + headline accent still read --color-action-text.
    expect(markup).toContain('class="t-kicker mb-5 justify-center"')
    expect(markup).toContain('data-c5="headline-accent" style="color:var(--color-action-text, var(--color-action))"')
  })

  it('image: media first, then the scrim, then the copy; the photo keeps priority + 100vw', () => {
    const markup = html({ variant: 'image', image: 'hero.jpg' })
    const img = markup.indexOf('<img')
    const scrim = markup.indexOf('-z-10')
    const copy = markup.indexOf('<div class="relative max-w-3xl')
    expect(img).toBeGreaterThan(-1)
    expect(scrim).toBeGreaterThan(img)
    expect(copy).toBeGreaterThan(scrim)
    expect(markup).toMatch(/<img[^>]*data-nimg="fill"[^>]*class="object-cover -z-20"[^>]*sizes="100vw"/)
    expect(markup).not.toContain('loading="lazy"')
    // No skeleton-image placeholder: it painted above the -z-20 photo and scrim.
    expect(markup).not.toContain('animate-pulse')
  })

  it('the media scrim is the ink token (near-black fallback), 86% → 76%', () => {
    expect(MEDIA_SCRIM).toBe(
      'linear-gradient(160deg, color-mix(in srgb, var(--color-ink, var(--color-near-black)) 86%, transparent) 0%, ' +
        'color-mix(in srgb, var(--color-ink, var(--color-near-black)) 76%, transparent) 100%)',
    )
  })
})
