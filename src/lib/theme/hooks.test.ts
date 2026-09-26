import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { createElement, type ComponentProps, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/blocks/Section'

// Section's own props require `children` (correctly — every real caller has
// content). React.createElement's typed overloads don't waive that just
// because children are supplied as trailing args outside JSX, so for THIS
// test file only we call through an alias typed with `children` optional;
// the trailing-arg values below are what Section actually receives at
// runtime, identical to calling it from JSX.
type SectionWithOptionalChildren = (
  props: Omit<ComponentProps<typeof Section>, 'children'> & { children?: ReactNode }
) => ReturnType<typeof Section>
const SectionEl = Section as unknown as SectionWithOptionalChildren

describe('style-axis hooks', () => {
  it('Button carries data-c5="button", including asChild links', () => {
    expect(renderToStaticMarkup(createElement(Button, null, 'Go'))).toContain('data-c5="button"')
    const link = renderToStaticMarkup(createElement(Button, { asChild: true }, createElement('a', { href: '/x' }, 'Go')))
    expect(link).toMatch(/^<a [^>]*data-c5="button"/)
  })
  it('Section marks its padded element with data-c5-spacing', () => {
    expect(renderToStaticMarkup(createElement(SectionEl, { dataBlock: 'x' }, 'c'))).toMatch(/<section data-block="x" data-c5-spacing="normal"/)
    const bleed = renderToStaticMarkup(createElement(SectionEl, { fullBleed: true, spacing: 'spacious' }, 'c'))
    expect(bleed).toMatch(/<div data-c5-spacing="spacious"/)
    expect(renderToStaticMarkup(createElement(SectionEl, { spacing: 'none' }, 'c'))).not.toContain('data-c5-spacing')
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
