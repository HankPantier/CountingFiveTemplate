import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { rowOverflows } from './use-nav-fit'

describe('rowOverflows', () => {
  it('a row that fits stays expanded (R1), within sub-pixel rounding', () => {
    expect(rowOverflows(900, 1280)).toBe(false)
    expect(rowOverflows(1280, 1280)).toBe(false)
    expect(rowOverflows(1280.8, 1280)).toBe(false)
  })

  it('a row wider than the bar collapses (Kinexus: 1311 needed in 1280)', () => {
    expect(rowOverflows(1311, 1280)).toBe(true)
    expect(rowOverflows(1281.5, 1280)).toBe(true)
  })
})

describe('NavBar fit guard wiring', () => {
  const nav = readFileSync(path.join(process.cwd(), 'src/components/nav/NavBar.tsx'), 'utf-8')
  const mobile = readFileSync(path.join(process.cwd(), 'src/components/nav/MobileNav.tsx'), 'utf-8')

  it('the logo link keeps its natural width from md up', () => {
    expect(nav).toMatch(/<Link href="\/" className="flex items-center gap-2 md:shrink-0" /)
  })

  it('renders today’s classes when the nav fits (server render = not collapsed)', () => {
    expect(nav).toContain(`<NavigationMenu className={navCollapsed ? 'hidden' : 'hidden md:flex'}>`)
    expect(nav).toContain('<MobileNav nav={nav} desktop={navCollapsed} />')
    expect(mobile).toContain(`className={desktop ? undefined : 'md:hidden'}`)
  })
})
