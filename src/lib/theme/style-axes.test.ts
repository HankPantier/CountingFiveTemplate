import { describe, expect, it } from 'vitest'
import { DEFAULT_AXIS_VALUE, STYLE_AXES, STYLE_AXIS_NAMES, styleAxesJson, styleAxisAttributes } from './style-axes'

describe('STYLE_AXES', () => {
  it('has the v1 axes, each with default first and 3–4 values', () => {
    expect(STYLE_AXIS_NAMES).toEqual(['sectionRhythm', 'cards', 'buttons', 'heroScale', 'imageTreatment', 'nav', 'footer', 'accentUsage'])
    for (const a of STYLE_AXIS_NAMES) {
      const values = STYLE_AXES[a].values as readonly string[]
      expect(values[0]).toBe(DEFAULT_AXIS_VALUE)
      expect(values.length).toBeGreaterThanOrEqual(3)
      expect(values.length).toBeLessThanOrEqual(4)
      expect(STYLE_AXES[a].attribute).toMatch(/^data-c5-[a-z-]+$/)
    }
  })
})

describe('styleAxisAttributes', () => {
  it.each([undefined, null, {}, [], 'x', { cards: 'default' }])('emits nothing for %j (R1)', (style) => {
    expect(styleAxisAttributes(style)).toEqual({})
  })
  it('maps non-default values to prefixed attributes', () => {
    expect(styleAxisAttributes({ cards: 'flat', nav: 'inverted', heroScale: 'default' })).toEqual({
      'data-c5-cards': 'flat',
      'data-c5-nav': 'inverted',
    })
  })
  it('ignores unknown axes and invalid values (never throws on hand-edited JSON)', () => {
    expect(styleAxisAttributes({ cards: 'wobbly', glitter: 'max', buttons: 7 })).toEqual({})
  })
})

describe('styleAxesJson', () => {
  it('serialises the vocabulary for the platform mirror', () => {
    expect(JSON.parse(styleAxesJson())).toEqual({ version: 1, defaultValue: 'default', axes: STYLE_AXES })
  })
})
