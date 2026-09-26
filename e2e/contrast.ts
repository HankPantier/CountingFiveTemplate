import type { Page } from '@playwright/test'

/**
 * WCAG contrast measured from the browser's computed styles. Runs in-page:
 * every CSS colour (rgb/oklab/color-mix/hsl…) is resolved to sRGB through a
 * 1×1 canvas, the text colour's alpha and ancestor opacity are composited
 * over the effective (stacked) background, then the WCAG ratio is taken.
 */
export type ContrastSample = { label: string; ratio: number; fg: string; bg: string }

/** Luminance / ratio math, shared by the in-page code (serialised) and specs. */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

type InPageArgs = { selector: string; bgOf?: string }

/**
 * Contrast of every visible, non-empty element matching `selector` (text
 * elements) or every visible svg (icons, colour = currentColor). `bgOf`
 * pins the background to one element's composited surface (e.g. the bar);
 * otherwise each element's own stacked background is used.
 */
export async function measureContrast(page: Page, args: InPageArgs): Promise<ContrastSample[]> {
  return page.evaluate(({ selector, bgOf }) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const rgba = (css: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const over = (top: [number, number, number, number], under: [number, number, number]): [number, number, number] =>
      [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])) as [number, number, number]
    const lum = ([r, g, b]: [number, number, number]) => {
      const lin = (c: number) => {
        const s = c / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    // Stack every translucent background from the root down to `el`.
    const surface = (el: Element): [number, number, number] => {
      const chain: Element[] = []
      for (let n: Element | null = el; n; n = n.parentElement) chain.unshift(n)
      let acc: [number, number, number] = [255, 255, 255]
      for (const n of chain) acc = over(rgba(getComputedStyle(n).backgroundColor), acc)
      return acc
    }
    const opacityUpTo = (el: Element) => {
      let o = 1
      for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
      return o
    }
    const pinned = bgOf ? document.querySelector(bgOf) : null
    const out: { label: string; ratio: number; fg: string; bg: string }[] = []
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const isIcon = el.tagName.toLowerCase() === 'svg'
      if (!isIcon && !(el.textContent ?? '').trim()) continue
      const bg = surface(pinned ?? el)
      const c = rgba(getComputedStyle(el).color)
      const fg = over([c[0], c[1], c[2], c[3] * opacityUpTo(el)], bg)
      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
      out.push({
        label: `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 28)}"`,
        ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100,
        fg: `rgb(${fg.map(Math.round).join(',')})`,
        bg: `rgb(${bg.map(Math.round).join(',')})`,
      })
    }
    return out
  }, args)
}

/** sRGB [r,g,b] of an element's composited background surface. */
export async function surfaceRgb(page: Page, selector: string): Promise<[number, number, number]> {
  return page.evaluate((sel) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const rgba = (css: string) => {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const chain: Element[] = []
    for (let n: Element | null = document.querySelector(sel); n; n = n.parentElement) chain.unshift(n)
    let acc = [255, 255, 255]
    for (const n of chain) {
      const t = rgba(getComputedStyle(n).backgroundColor)
      acc = [0, 1, 2].map((i) => t[i] * t[3] + acc[i] * (1 - t[3]))
    }
    return acc as [number, number, number]
  }, selector)
}

/** sRGB [r,g,b,alpha 0–1] of any CSS colour string, resolved by the browser. */
export async function cssRgba(page: Page, css: string): Promise<[number, number, number, number]> {
  return page.evaluate((c) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#000'
    ctx.fillStyle = c
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2], d[3] / 255] as [number, number, number, number]
  }, css)
}

/** Composite a translucent colour over an opaque one. */
export function over([r, g, b, a]: [number, number, number, number], under: [number, number, number]): [number, number, number] {
  return [r, g, b].map((c, i) => c * a + under[i] * (1 - a)) as [number, number, number]
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
