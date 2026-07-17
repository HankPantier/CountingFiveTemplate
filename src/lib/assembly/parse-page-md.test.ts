import { describe, expect, it } from 'vitest'
import { parsePageMd } from './parse-page-md'
import { extractHeroProps } from './extract-block-props'

const fm = (extra = '') => `---
title: T | Firm
url: /t
${extra}---
`

describe('parsePageMd — section parsing', () => {
  it('parses block-annotated sections', () => {
    const md = fm() + `
<!-- block: intro-text | variant: centered -->
## Hello
Body copy.

<!-- block: cta-banner -->
## Act now
Do it.
`
    const out = parsePageMd(md)
    expect(out.sections.map(s => s.blockId)).toEqual(['intro-text', 'cta-banner'])
    expect(out.sections[0].variant).toBe('centered')
  })

  it('trims the SEO & AIO metadata trailer before section parsing', () => {
    const md = fm() + `
<!-- block: content-prose -->
## Real
Keep me.

---
## SEO & AIO Metadata

**Answer Block:** drop me
`
    const out = parsePageMd(md)
    expect(out.sections).toHaveLength(1)
    expect(out.sections[0].content).not.toContain('drop me')
  })
})

describe('parsePageMd — emitted JSON-LD extraction', () => {
  const structuredTrailer = `
---
## Structured Data — paste into \`<head>\`

\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AccountingService",
  "name": "Firm — Bel Air",
  "areaServed": "Harford County"
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": []
}
</script>
\`\`\`
`

  it('extracts every ld+json block from the Structured Data trailer', () => {
    const md = fm() + `
<!-- block: content-prose -->
## Real
Keep me.
` + structuredTrailer
    const out = parsePageMd(md)
    expect(out.json_ld).toHaveLength(2)
    expect(out.json_ld?.[0]['@type']).toBe('AccountingService')
    expect(out.json_ld?.[0]['areaServed']).toBe('Harford County')
    expect(out.json_ld?.[1]['@type']).toBe('FAQPage')
    // Trailer must still be trimmed from the rendered body.
    expect(out.sections).toHaveLength(1)
  })

  it('is undefined when no Structured Data trailer is present', () => {
    const out = parsePageMd(fm() + '\n<!-- block: content-prose -->\n## X\nBody.\n')
    expect(out.json_ld).toBeUndefined()
  })

  it('skips a malformed block but keeps the valid ones', () => {
    const md = fm() + structuredTrailer.replace('"mainEntity": []', '"mainEntity": [,,,]')
    const out = parsePageMd(md)
    expect(out.json_ld).toHaveLength(1)
    expect(out.json_ld?.[0]['@type']).toBe('AccountingService')
  })

  it('restores content that escaped </script> in the emitted JSON', () => {
    const md = fm() + `
---
## Structured Data — paste into \`<head>\`

\`\`\`html
<script type="application/ld+json">
{ "@type": "WebPage", "name": "A <\\/script> B" }
</script>
\`\`\`
`
    const out = parsePageMd(md)
    expect(out.json_ld?.[0]['name']).toBe('A </script> B')
  })
})

describe('parsePageMd — defensive JSON-envelope unwrap', () => {
  it('unwraps a fenced { content, metadata } envelope so blocks still render', () => {
    const envelope = JSON.stringify({
      content: '<!-- block: intro-text -->\n## Real Heading\nReal body.',
      metadata: { meta_title: 'x' },
    })
    const md = fm() + '\n```json\n' + envelope + '\n```\n'
    const out = parsePageMd(md)
    expect(out.sections).toHaveLength(1)
    expect(out.sections[0].blockId).toBe('intro-text')
    expect(out.sections[0].heading).toBe('Real Heading')
  })

  it('leaves a corrupt JSON envelope untouched (no throw, zero sections surfaced for the validator)', () => {
    // Invalid JSON (unescaped quote) — must not crash; body stays as-is so the
    // deliverable validator can flag the empty render.
    const md = fm() + '\n```json\n{ "content": "<!-- block: x -->## "broken" }\n```\n'
    const out = parsePageMd(md)
    expect(out.sections).toHaveLength(0)
  })

  it('does not unwrap a normal body that merely starts with a code fence', () => {
    const md = fm() + '\n<!-- block: content-prose -->\n## Code\n```json\n{"a":1}\n```\n'
    const out = parsePageMd(md)
    expect(out.sections).toHaveLength(1)
    expect(out.sections[0].blockId).toBe('content-prose')
  })
})

describe('parsePageMd — hero headline', () => {
  it('prefers hero_headline over the page title for the H1', () => {
    const md = fm('hero: hero\nhero_headline: "Real Value Prop"\n') +
      '\n<!-- block: content-prose -->\n## Body\nText.\n'
    const out = parsePageMd(md)
    expect(out.hero_headline).toBe('Real Value Prop')
    expect(extractHeroProps(out).headline).toBe('Real Value Prop')
  })

  it('falls back to the title (minus firm suffix) when no hero_headline', () => {
    const md = fm() + '\n<!-- block: content-prose -->\n## Body\nText.\n'
    expect(extractHeroProps(parsePageMd(md)).headline).toBe('T')
  })

  it('passes hero_video + hero_images through to the manifest and hero props', () => {
    const md = fm('hero: hero\nhero_variant: slider\nhero_video: promo.mp4\nhero_images: [a.jpg, b.jpg]\n') +
      '\n<!-- block: content-prose -->\n## Body\nText.\n'
    const out = parsePageMd(md)
    expect(out.hero_video).toBe('promo.mp4')
    expect(out.hero_images).toEqual(['a.jpg', 'b.jpg'])
    const hero = extractHeroProps(out)
    expect(hero.video).toBe('promo.mp4')
    expect(hero.images).toEqual(['a.jpg', 'b.jpg'])
  })

  it('de-dupes the hero headline from the lead section heading', () => {
    const md = fm('hero: hero\nhero_headline: "Lead Heading"\n') +
      '\n<!-- block: intro-text -->\n## Lead Heading\nIntro body stays.\n\n<!-- block: cta-banner -->\n## CTA\nGo.\n'
    const out = parsePageMd(md)
    expect(out.sections[0].heading).toBe('')        // blanked — hero owns it
    expect(out.sections[0].content).toContain('Intro body stays.')
    expect(out.sections[1].heading).toBe('CTA')     // untouched
  })
})
