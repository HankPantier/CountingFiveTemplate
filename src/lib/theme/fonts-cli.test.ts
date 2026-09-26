import { describe, expect, it } from 'vitest'
import { parseFontsCliArgs } from './fonts-cli'

describe('parseFontsCliArgs', () => {
  it('defaults to sync mode with no flags', () => {
    expect(parseFontsCliArgs([])).toEqual({ ok: true, args: { mode: 'sync', designPath: undefined, stdout: false } })
  })

  it.each(['--check', '--all', '--default'] as const)('parses a lone %s into its mode', (flag) => {
    const result = parseFontsCliArgs([flag])
    expect(result).toEqual({ ok: true, args: { mode: flag.slice(2), designPath: undefined, stdout: false } })
  })

  it('parses --stdout alongside a mode', () => {
    expect(parseFontsCliArgs(['--default', '--stdout'])).toEqual({
      ok: true,
      args: { mode: 'default', designPath: undefined, stdout: true },
    })
  })

  it('parses a valid --design <path>', () => {
    expect(parseFontsCliArgs(['--design', 'fixtures/design.json'])).toEqual({
      ok: true,
      args: { mode: 'sync', designPath: 'fixtures/design.json', stdout: false },
    })
  })

  it.each([
    ['--check', '--all'],
    ['--check', '--default'],
    ['--all', '--default'],
  ])('rejects conflicting flags %s + %s', (a, b) => {
    const result = parseFontsCliArgs([a, b])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Conflicting flags')
  })

  it('rejects --check --all --default together', () => {
    const result = parseFontsCliArgs(['--check', '--all', '--default'])
    expect(result.ok).toBe(false)
  })

  it('rejects --design with a missing value (end of argv)', () => {
    const result = parseFontsCliArgs(['--design'])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('--design requires a path argument')
  })

  it('rejects --design immediately followed by another flag', () => {
    const result = parseFontsCliArgs(['--design', '--check'])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('--design requires a path argument')
  })

  it('rejects --design followed by an empty string', () => {
    const result = parseFontsCliArgs(['--design', ''])
    expect(result.ok).toBe(false)
  })

  it('never partially returns args on a rejected parse', () => {
    const result = parseFontsCliArgs(['--check', '--all'])
    expect(result).not.toHaveProperty('args')
  })
})
