import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Hero, type HeroProps } from './Hero'
import { extractHeroProps } from '@/lib/assembly/extract-block-props'
import type { PageManifest } from '@/lib/assembly/parse-page-md'

/**
 * 2026.09.9 narrowed Hero's variant type to image | video | slider | statement.
 * Type-only: the extractor still passes any hero_variant through, and Hero
 * renders an unknown value (the dead image-right / image-left included)
 * exactly like the full-bleed image hero.
 */
const base: HeroProps = { variant: 'image', image: 'hero.jpg', headline: 'Headline', subheadline: 'Sub' }
const html = (variant: string) => renderToStaticMarkup(createElement(Hero, { ...base, variant: variant as HeroProps['variant'] }))

describe('Hero variant narrowing (type-only)', () => {
  it('extractHeroProps passes an unknown hero_variant through unchanged', () => {
    const m = { title: 'T', url: '/', meta_description: 'D', hero_variant: 'image-right' } as unknown as PageManifest
    expect(extractHeroProps(m).variant).toBe('image-right')
  })
  it.each(['image-right', 'image-left', 'bogus'])('%s renders exactly like the full-bleed image hero', (v) => {
    expect(html(v)).toBe(html('image'))
  })
  it('statement still renders its own layout', () => {
    expect(html('statement')).not.toBe(html('image'))
  })
})
