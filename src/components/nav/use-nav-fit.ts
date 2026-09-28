'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'

/**
 * Desktop header fit guard (template 2026.09.8).
 *
 * The header bar is one flex row: logo link · desktop nav · actions. From md
 * up the logo link no longer shrinks (NavBar `md:shrink-0`) and top-level nav
 * labels no longer wrap, so every item in the row keeps its natural width.
 * Before, a nav too long for the bar (Kinexus: 9 items + CTA needed 1311px in a
 * 1280px bar) flex-shrank the logo to 0px: the img's `max-width: 100%` gives
 * it a zero min-content width, so the logo absorbed the whole overflow.
 *
 * Now, when the row's natural width exceeds the bar, NavBar collapses the
 * desktop nav into the mobile menu (hamburger) at that width instead. A nav
 * that fits is never touched: state only flips when the row overflows, and
 * the server render (collapsed = false) is unchanged.
 *
 * While collapsed the nav is hidden and can't be measured, so on a bar width
 * change or a web-font swap the hook PROBES: it expands, measures and, if the
 * row still overflows, collapses again — synchronously (flushSync) inside one
 * animation frame, so the expanded state is never painted.
 */

/** 1px of slack absorbs sub-pixel rounding in the summed child widths. */
const SLACK_PX = 1

export function rowOverflows(required: number, available: number): boolean {
  return required > available + SLACK_PX
}

/** Natural width of the bar's row: horizontal padding + every child's box. */
function requiredWidth(bar: HTMLElement): number {
  const cs = getComputedStyle(bar)
  let w = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  for (const child of Array.from(bar.children)) w += child.getBoundingClientRect().width
  return w
}

export function useNavFit(barRef: RefObject<HTMLElement | null>): boolean {
  const [collapsed, setCollapsed] = useState(false)
  const collapsedRef = useRef(false)

  useEffect(() => {
    const bar = barRef.current
    if (!bar || typeof ResizeObserver === 'undefined') return
    let frame = 0
    let probe = true
    let lastWidth = bar.clientWidth
    const set = (next: boolean) => {
      if (collapsedRef.current === next) return
      collapsedRef.current = next
      flushSync(() => setCollapsed(next))
    }
    const check = () => {
      frame = 0
      if (collapsedRef.current) {
        // A child resizing while collapsed is the hidden nav / hamburger
        // itself: nothing to re-decide.
        if (!probe) return
        set(false)
      }
      probe = false
      set(rowOverflows(requiredWidth(bar), bar.clientWidth))
    }
    const schedule = (withProbe: boolean) => {
      probe = probe || withProbe
      if (!frame) frame = requestAnimationFrame(check)
    }
    // The bar (viewport width) and each row child (logo image load, the nav's
    // labels) can change the fit; only a bar width change re-probes a
    // collapsed nav.
    const ro = new ResizeObserver(() => {
      const width = bar.clientWidth
      const widthChanged = width !== lastWidth
      lastWidth = width
      schedule(widthChanged)
    })
    ro.observe(bar)
    for (const child of Array.from(bar.children)) ro.observe(child)
    void document.fonts?.ready.then(() => schedule(true))
    schedule(true)
    return () => {
      ro.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [barRef])

  return collapsed
}
