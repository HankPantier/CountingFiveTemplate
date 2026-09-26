import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_AXIS_VALUE, STYLE_AXES, STYLE_AXIS_NAMES } from './style-axes'

const css = readFileSync(path.join(process.cwd(), 'src/styles/style-axes.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')

// Every selector-list preceding a `{` that is not an at-rule.
function selectorLists(text: string): string[] {
  const out: string[] = []
  const re = /([^{};]+)\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const s = m[1].trim()
    if (!s.startsWith('@')) out.push(s)
  }
  return out
}
// Split on top-level commas only (:is(a, b) stays whole).
function splitSelectors(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of list) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  parts.push(cur.trim())
  return parts
}

const ATTR_RE = /^html\[(data-c5-[a-z-]+)="([a-z-]+)"\]/
const selectors = selectorLists(css).flatMap(splitSelectors)

describe('src/styles/style-axes.css', () => {
  it('gates EVERY selector on a known, non-default html axis attribute (R1: inert by default)', () => {
    expect(selectors.length).toBeGreaterThan(0)
    for (const sel of selectors) {
      const m = ATTR_RE.exec(sel)
      expect(m, sel).not.toBeNull()
      const axis = STYLE_AXIS_NAMES.find((a) => STYLE_AXES[a].attribute === m![1])
      expect(axis, sel).toBeDefined()
      expect(STYLE_AXES[axis!].values as readonly string[], sel).toContain(m![2])
      expect(m![2], sel).not.toBe(DEFAULT_AXIS_VALUE)
    }
  })
  it('implements every non-default value of every axis', () => {
    const used = new Set(selectors.map((s) => ATTR_RE.exec(s)).filter(Boolean).map((m) => `${m![1]}=${m![2]}`))
    for (const a of STYLE_AXIS_NAMES) {
      for (const v of STYLE_AXES[a].values) {
        if (v !== DEFAULT_AXIS_VALUE) expect(used, `${a}=${v}`).toContain(`${STYLE_AXES[a].attribute}=${v}`)
      }
    }
  })
  it('is imported after theme.css and before design-overrides.css', () => {
    const g = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8')
    const i = (s: string) => g.indexOf(s)
    expect(i('@import "../styles/theme.css";')).toBeLessThan(i('@import "../styles/style-axes.css";'))
    expect(i('@import "../styles/style-axes.css";')).toBeLessThan(i('@import "../../content/design-overrides.css";'))
  })
})
