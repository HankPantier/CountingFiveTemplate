import { describe, expect, it } from 'vitest'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { Hero } from './Hero'
import { HeroSplit } from './HeroSplit'
import { PageHeader } from './PageHeader'
import { IntroText } from './IntroText'
import { StatsBar } from './StatsBar'
import { ACTION_DISPLAY_COLOR } from '@/lib/theme/accent-color'

type AnyProps = { children?: ReactNode; style?: { color?: string }; 'data-c5'?: string; dataBlock?: string }

/** Walk an unrendered element tree through props.children (no component calls). */
function find(node: ReactNode, pred: (el: ReactElement<AnyProps>) => boolean): ReactElement<AnyProps>[] {
  const out: ReactElement<AnyProps>[] = []
  const walk = (n: ReactNode) => {
    if (Array.isArray(n)) return n.forEach(walk)
    if (!isValidElement<AnyProps>(n)) return
    if (pred(n)) out.push(n)
    walk(n.props.children)
  }
  walk(node)
  return out
}

const accents = (node: ReactNode) => find(node, (el) => el.props['data-c5'] === 'headline-accent')

describe('large action-coloured display text reads the surface-corrected token', () => {
  it('the headline accent word (Hero statement + full-bleed, HeroSplit, PageHeader, IntroText)', () => {
    const trees: ReactNode[] = [
      Hero({ variant: 'statement', headline: 'We *answer*.', subheadline: 's' }),
      Hero({ variant: 'image', headline: 'We *answer*.', subheadline: 's' }),
      HeroSplit({ variant: 'image-right', headline: 'We *answer*.', subheadline: 's', image: '', image_alt: '' }),
      PageHeader({ headline: 'We *answer*.' }),
      IntroText({ variant: 'centered', heading: 'We *answer*.', body: 'b' }),
    ]
    for (const t of trees) {
      const spans = accents(t)
      expect(spans).toHaveLength(1)
      expect(spans[0].props.style?.color).toBe(ACTION_DISPLAY_COLOR)
    }
    expect(ACTION_DISPLAY_COLOR).toBe('var(--color-action-text, var(--color-action))')
  })

  it('primary-band StatsBar figures (light-theme figures stay primary)', () => {
    const dd = (theme?: 'light' | 'ink') =>
      find(StatsBar({ variant: '3-up', theme, stats: [{ value: '25+', label: 'years' }] }), (el) => el.type === 'dd')[0]
    expect(dd().props.style?.color).toBe(ACTION_DISPLAY_COLOR)
    expect(dd('light').props.style?.color).toBe('var(--color-primary)')
  })
})
