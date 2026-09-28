import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CtaBanner, type CtaBannerProps } from './CtaBanner'

/**
 * 2026.09.10: image-bg / image-bg-centered banners draw their photo. The
 * section gets its own stacking context (`isolate`), so the photo (-z-20) and
 * scrim (-z-10) paint above the section's bg-primary fill; before, they
 * painted behind it and every image banner rendered as flat colour.
 * color-bg / color-bg-centered must stay byte-identical (R1): the goldens below
 * were rendered from 4ac337d (2026.09.9).
 */
const copy = { heading: 'Ready?', body: 'Book a call.', cta_primary: { label: 'Go', url: '/contact' } }
const html = (p: Omit<CtaBannerProps, 'heading'>) => renderToStaticMarkup(createElement(CtaBanner, { ...copy, ...p }))
const sectionClass = (markup: string) => markup.match(/^<section[^>]*class="([^"]*)"/)![1].split(' ')

const GOLDEN_COLOR_BG = "<section data-block=\"cta-banner\" class=\"bg-primary text-primary-foreground relative overflow-hidden\"><div data-c5-spacing=\"spacious\" class=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32\"><div aria-hidden=\"true\" class=\"absolute inset-0 -z-10\" style=\"background:linear-gradient(160deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 80%, black))\"></div><div class=\"relative flex flex-col md:flex-row md:items-center md:justify-between gap-6\"><div class=\"md:max-w-2xl\"><h2 class=\"t-h1 text-primary-foreground\">Ready?</h2><div class=\"prose prose-invert t-body-lg mt-4 max-w-none text-primary-foreground/80 prose-p:my-0 prose-a:underline\"><p>Book a call.</p></div></div><div class=\"shrink-0\"><a data-c5=\"button\" class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 bg-action text-action-foreground hover:bg-action/90 active:bg-action/80 h-11 rounded-md px-8\" href=\"/contact\">Go</a></div></div></div></section>"
const GOLDEN_COLOR_BG_CENTERED = "<section data-block=\"cta-banner\" data-layout=\"color-bg-centered\" class=\"bg-primary text-primary-foreground relative overflow-hidden\"><div data-c5-spacing=\"spacious\" class=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32\"><div aria-hidden=\"true\" class=\"absolute inset-0 -z-10\" style=\"background:linear-gradient(160deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 80%, black))\"></div><div class=\"relative flex flex-col md:flex-row md:items-center md:justify-between gap-6\" data-c5-slot=\"content\"><div class=\"md:max-w-2xl\" data-c5-slot=\"copy\"><h2 class=\"t-h1 text-primary-foreground\">Ready?</h2><div class=\"prose prose-invert t-body-lg mt-4 max-w-none text-primary-foreground/80 prose-p:my-0 prose-a:underline\"><p>Book a call.</p></div></div><div class=\"shrink-0\" data-c5-slot=\"actions\"><a data-c5=\"button\" class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 bg-action text-action-foreground hover:bg-action/90 active:bg-action/80 h-11 rounded-md px-8\" href=\"/contact\">Go</a></div></div></div></section>"

describe('CtaBanner image fix (2026.09.10)', () => {
  it('color-bg renders byte-identical to 2026.09.9', () => {
    expect(html({ variant: 'color-bg' })).toBe(GOLDEN_COLOR_BG)
  })
  it('color-bg-centered renders byte-identical to 2026.09.9', () => {
    expect(html({ variant: 'color-bg', align: 'centered' })).toBe(GOLDEN_COLOR_BG_CENTERED)
  })
  it('color-bg ignores a stray image (no isolate, no photo)', () => {
    expect(html({ variant: 'color-bg', background_asset: 'office.jpg' })).toBe(GOLDEN_COLOR_BG)
  })
  it('image-bg without a resolvable image falls back to the colour banner markup', () => {
    expect(html({ variant: 'image-bg' })).toBe(GOLDEN_COLOR_BG)
  })

  it.each([undefined, 'centered'] as const)('image-bg (align=%s) isolates the section and pins the text token to near-white', (align) => {
    const markup = html({ variant: 'image-bg', align, background_asset: 'office.jpg' })
    const cls = sectionClass(markup)
    expect(cls).toEqual(expect.arrayContaining(['relative', 'overflow-hidden', 'isolate', '[--color-primary-foreground:var(--color-near-white)]']))
    if (align) expect(markup).toContain('data-layout="image-bg-centered"')
    else expect(markup).not.toContain('data-layout')
  })

  it('image-bg: photo, scrim, then the content as the last child (block-layouts.css `> div > div:last-child`)', () => {
    const markup = html({ variant: 'image-bg', background_asset: 'office.jpg' })
    const inner = markup.match(/^<section[^>]*><div[^>]*>([\s\S]*)<\/div><\/section>$/)![1]
    const img = inner.indexOf('<img')
    const scrim = inner.indexOf('<div aria-hidden="true" class="absolute inset-0 -z-10"')
    const content = inner.indexOf('<div class="relative flex')
    expect(img).toBe(0)
    expect(scrim).toBeGreaterThan(img)
    expect(content).toBeGreaterThan(scrim)
    // next/image: fill + 100vw, lazy (a closing banner sits below the fold), decorative.
    expect(markup).toMatch(/<img alt="" loading="lazy"[^>]*data-nimg="fill"[^>]*class="object-cover -z-20"[^>]*sizes="100vw"/)
    // The scrim is the palette's ink (primary-tinted near-black) at two
    // translucent stops, falling back to near-black on pre-ink themes.
    const bg = markup.match(/-z-10" style="background:([^"]*)"/)![1]
    expect(bg).toMatch(/^linear-gradient\(160deg, /)
    expect(bg.match(/color-mix\(in srgb, var\(--color-ink, var\(--color-near-black\)\) \d+%, transparent\)/g)).toHaveLength(2)
  })

  it('image-bg keeps the copy / slot hooks the Studio CSS and layout presets target', () => {
    const plain = html({ variant: 'image-bg', background_asset: 'office.jpg' })
    const centred = html({ variant: 'image-bg', align: 'centered', background_asset: 'office.jpg' })
    expect(plain).toContain('<h2 class="t-h1 text-primary-foreground">Ready?</h2>')
    expect(plain).not.toContain('data-c5-slot')
    for (const slot of ['content', 'copy', 'actions']) expect(centred).toContain(`data-c5-slot="${slot}"`)
    // Stripping the layout hooks gives the plain image banner (R1 for layouts).
    expect(centred.replace(/ data-layout="[^"]*"/, '').replace(/ data-c5-slot="[^"]*"/g, '')).toBe(plain)
  })
})
