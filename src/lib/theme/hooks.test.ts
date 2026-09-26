import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/blocks/Section'

describe('style-axis hooks', () => {
  it('Button carries data-c5="button", including asChild links', () => {
    expect(renderToStaticMarkup(createElement(Button, null, 'Go'))).toContain('data-c5="button"')
    const link = renderToStaticMarkup(createElement(Button, { asChild: true }, createElement('a', { href: '/x' }, 'Go')))
    expect(link).toMatch(/^<a [^>]*data-c5="button"/)
  })
  it('Section marks its padded element with data-c5-spacing', () => {
    expect(renderToStaticMarkup(createElement(Section, { dataBlock: 'x', children: 'c' }))).toMatch(/<section data-block="x" data-c5-spacing="normal"/)
    const bleed = renderToStaticMarkup(createElement(Section, { fullBleed: true, spacing: 'spacious', children: 'c' }))
    expect(bleed).toMatch(/<div data-c5-spacing="spacious"/)
    expect(renderToStaticMarkup(createElement(Section, { spacing: 'none', children: 'c' }))).not.toContain('data-c5-spacing')
  })
  it('every headline accent span and the media grade carry their hook', () => {
    for (const f of ['Hero', 'HeroSplit', 'PageHeader', 'IntroText']) {
      const src = readFileSync(path.join(process.cwd(), `src/components/blocks/${f}.tsx`), 'utf-8')
      expect(src, f).toContain(`<span className="font-accent" data-c5="headline-accent" style={{ color: 'var(--color-action)' }}>`)
    }
    expect(readFileSync(path.join(process.cwd(), 'src/components/ui/framed-media.tsx'), 'utf-8')).toContain('data-c5="media-grade"')
  })
  it('no stylesheet except src/styles/style-axes.css references data-c5 (R1)', () => {
    const css: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name)
        if (statSync(p).isDirectory()) walk(p)
        else if (p.endsWith('.css')) css.push(p)
      }
    }
    walk(path.join(process.cwd(), 'src'))
    const offenders = css.filter((p) => !p.endsWith(path.join('src', 'styles', 'style-axes.css')) && readFileSync(p, 'utf-8').includes('data-c5'))
    expect(offenders).toEqual([])
  })
})
