import { describe, expect, it } from 'vitest'
import { ICON_MAP } from './Icon'
import { ICON_NAMES } from '@/lib/assembly/icon-names'

describe('ICON_NAMES (parser icon vocabulary)', () => {
  it('matches the Icon component map exactly', () => {
    expect([...ICON_NAMES].sort()).toEqual(Object.keys(ICON_MAP).sort())
  })
})
