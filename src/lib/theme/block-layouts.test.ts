import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BLOCK_CATALOG, BLOCK_IDS } from '@/lib/assembly/block-catalog'
import { BLOCK_REGISTRY } from '@/components/assembly/block-registry'
import type { PageManifest, PageSection } from '@/lib/assembly/parse-page-md'
import { makeSampleManifest, makeSampleSection } from '@/lib/showcase/samples'
import { LAYOUT_PRESETS, LAYOUT_PRESET_NAMES, DEFAULT_LAYOUT_PRESET } from './layout-presets'

const css = readFileSync(path.join(process.cwd(), 'src/styles/block-layouts.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')
// Flatten @media wrappers, then collect every rule's selector list.
const flat = css.replace(/@media[^{]+\{([\s\S]*?\})\s*\}/g, '$1')
const rules = [...flat.matchAll(/([^{}]+)\{[^}]*\}/g)].map((m) => m[1].split(',').map((p) => p.trim()))
const selectors = rules.flat()

const VARIANT_ROOT = /^\[data-block="([a-z-]+)"\]\[data-layout="([a-z-]+)"\]/
const PRESET_ROOT = /^html\[(data-c5-layout-[a-z-]+)="([a-z]+)"\] \[data-block="([a-z-]+)"\]:not\(\[data-layout\]\):not\(\.u-band-ink\)/

const layoutVariants = BLOCK_IDS.flatMap((id) =>
  (BLOCK_CATALOG[id].variants as readonly { value: string; layout?: true }[]).filter((v) => v.layout).map((v) => ({ id, value: v.value })),
)

describe('src/styles/block-layouts.css', () => {
  it('gates EVERY selector on a layout variant or a layout preset attribute (R1: inert by default)', () => {
    expect(selectors.length).toBeGreaterThan(0)
    for (const sel of selectors) expect(VARIANT_ROOT.test(sel) || PRESET_ROOT.test(sel), sel).toBe(true)
  })

  it('variant selectors name only catalogued layout variants of that block', () => {
    for (const sel of selectors) {
      const m = sel.match(VARIANT_ROOT)
      if (m) expect(layoutVariants, sel).toContainEqual({ id: m[1], value: m[2] })
    }
  })

  it('preset selectors name only known preset values, on the blocks of that family', () => {
    for (const sel of selectors) {
      const m = sel.match(PRESET_ROOT)
      if (!m) continue
      const preset = LAYOUT_PRESET_NAMES.find((n) => LAYOUT_PRESETS[n].attribute === m[1])
      expect(preset, sel).toBeDefined()
      const def = LAYOUT_PRESETS[preset!]
      expect(def.values as readonly string[], sel).toContain(m[2])
      expect(m[2]).not.toBe(DEFAULT_LAYOUT_PRESET)
      expect(def.blocks as readonly string[], sel).toContain(m[3])
    }
  })

  it('every catalogued layout variant is styled', () => {
    for (const { id, value } of layoutVariants) expect(css, `${id}:${value}`).toContain(`[data-block="${id}"][data-layout="${value}"]`)
  })

  it('every non-default preset value is styled on every block of its family', () => {
    for (const name of LAYOUT_PRESET_NAMES) {
      const def = LAYOUT_PRESETS[name]
      for (const value of def.values.filter((v) => v !== DEFAULT_LAYOUT_PRESET))
        for (const block of def.blocks) expect(css, `${name}=${value} ${block}`).toContain(`html[${def.attribute}="${value}"] [data-block="${block}"]`)
    }
  })

  it('presets reuse the variant rules: each rule that styles a layout variant also lists the preset selector with the same tail', () => {
    for (const list of rules) {
      const tails = (re: RegExp) => list.filter((s) => re.test(s)).map((s) => s.replace(re, ''))
      const v = tails(VARIANT_ROOT)
      const p = tails(PRESET_ROOT)
      // FAQ split is preset-only (no per-section variant in v1).
      if (v.length === 0) {
        expect(list.every((s) => s.includes('data-c5-layout-faq')), list.join(', ')).toBe(true)
        continue
      }
      expect(new Set(p), list.join(', ')).toEqual(new Set(v))
    }
  })

  it('hides nothing and reorders nothing (a11y: DOM order is the reading order)', () => {
    expect(css).not.toMatch(/display:\s*none|visibility:\s*hidden|\border:|flex-direction:\s*(row|column)-reverse|grid-auto-flow:\s*dense/)
  })

  it('is imported after nav-fit.css and before the client overrides', () => {
    const g = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8')
    const i = (s: string) => g.indexOf(s)
    expect(i('@import "../styles/block-layouts.css";')).toBeGreaterThan(i('@import "../styles/nav-fit.css";'))
    expect(i('@import "../styles/block-layouts.css";')).toBeLessThan(i('@import "../../content/design-overrides.css";'))
  })
})

// ---------------------------------------------------------------------------
// Markup: existing variants emit nothing new (R1); layout variants add only
// data-layout on the root + data-c5-slot hooks, over the default markup.
// ---------------------------------------------------------------------------
const SAMPLES: Record<string, string> = {
  'service-cards': '### A\n\n![A](a.jpg)\n\nAlpha text.\n\n[More](/a)\n\n### B\n\nicon: Calculator\n\nBravo text.',
  'content-cards': '### A\n\n![A](a.jpg)\n\nAlpha.\n\n[Read](/a)\n\n### B\n\nBravo.\n\n[Read](/b)',
  'team-grid': '### Alex Rivera, CPA\n\nManaging Partner\n\nphoto: a.jpg\n\nAlex bio.\n\n### Jordan Blake\n\nPartner\n\nJordan bio.',
}
const manifest: PageManifest = makeSampleManifest()
function sectionFor(id: string, extra: Partial<PageSection> = {}): PageSection {
  const s = makeSampleSection(id)
  return { ...s, content: SAMPLES[id] ?? s.content, ...extra }
}
function render(id: string, extra: Partial<PageSection> = {}): string {
  return renderToStaticMarkup(BLOCK_REGISTRY[id](sectionFor(id, extra), manifest) as ReactElement)
}
const LAYOUT_BLOCKS = [...new Set(layoutVariants.map((v) => v.id))]

describe('layout variant markup', () => {
  it.each(LAYOUT_BLOCKS)('%s: every existing variant (and ink) emits no data-layout / data-c5-slot', (id) => {
    const spec = BLOCK_CATALOG[id as keyof typeof BLOCK_CATALOG]
    const legacy = (spec.variants as readonly { value: string; layout?: true }[]).filter((v) => !v.layout).map((v) => v.value)
    for (const variant of [undefined, ...legacy])
      for (const theme of [undefined, ...spec.themes]) {
        const html = render(id, { variant, theme })
        expect(html, `${id} ${variant} ${theme}`).not.toContain('data-layout')
        expect(html, `${id} ${variant} ${theme}`).not.toContain('data-c5-slot')
      }
  })

  it.each(layoutVariants)('$id $value: data-layout on the section root, slot hooks, else the base markup', ({ id, value }) => {
    const spec = BLOCK_CATALOG[id]
    for (const theme of [undefined, ...spec.themes]) {
      const html = render(id, { variant: value, theme })
      expect(html).toMatch(new RegExp(`^<section data-block="${id}" data-layout="${value}"`))
      expect(html).toContain('data-c5-slot=')
      // Strip the hooks → exactly the base variant's markup (so the preset,
      // which reaches the base markup, gets the same result from the same CSS).
      const base = id === 'cta-banner' ? value.replace(/-centered$/, '') : spec.default
      const stripped = html.replace(/ data-layout="[^"]*"/g, '').replace(/ data-c5-slot="[^"]*"/g, '')
      expect(stripped, `${id} ${value} ${theme}`).toBe(render(id, { variant: base ?? undefined, theme }))
    }
  })
})
