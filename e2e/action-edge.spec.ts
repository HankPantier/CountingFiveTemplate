import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { contrastRatio } from './contrast'
import { actionEdgeAttributes, ACTION_EDGE_ATTRIBUTE } from '../src/lib/theme/action-edge'
import { ensureTextContrast, renderedHex } from '../src/lib/theme/action-text-contrast'
import type { BrandJson } from '../src/lib/brand/types'

/**
 * Template 2026.09.7: the cta button (raw --color-action fill) on a primary
 * band — the CtaBanner — gets a 2px on-primary inner edge when the palette's
 * raw action is under 3:1 on primary (<html data-c5-action-edge="on">,
 * src/lib/theme/action-edge.ts). Measured from PIXELS: the button's outer
 * boundary vs the band next to it (WCAG 1.4.11, 3:1).
 *
 * Content-agnostic: the fixture band is injected, so this runs in client repos.
 */

// Accord's live pairing: crimson action on charcoal primary, 1.50:1.
const PRIMARY = '#413939'
const ACTION = '#a31e37'
const ON_PRIMARY = ensureTextContrast(ACTION, renderedHex(PRIMARY))

async function setup(page: Page, edge: boolean) {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  // Inject only after hydration, or React discards the probe node.
  await page.waitForLoadState('networkidle')
  await page.evaluate(
    ({ primary, action, onPrimary, edge, attr }) => {
      const root = document.documentElement
      root.style.setProperty('--color-primary', primary)
      root.style.setProperty('--color-action', action)
      root.style.setProperty('--color-action-on-primary', onPrimary)
      if (edge) root.setAttribute(attr, 'on')
      else root.removeAttribute(attr)
      // A CtaBanner-like band: bg-primary section, the cta Button's classes,
      // plus the same button inside a light card on the band.
      const band = document.createElement('section')
      band.className = 'bg-primary text-primary-foreground'
      band.dataset.block = 'action-edge-probe'
      band.style.padding = '48px'
      const btn =
        '<a href="#" data-c5="button" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-action text-action-foreground h-11 px-8">Schedule a consultation</a>'
      band.innerHTML = `<div data-probe="band">${btn}</div><div class="bg-card" data-probe="card" style="margin-top:24px;padding:24px">${btn}</div>`
      document.querySelector('main')!.prepend(band)
    },
    { primary: PRIMARY, action: ACTION, onPrimary: ON_PRIMARY, edge, attr: ACTION_EDGE_ATTRIBUTE },
  )
}

/** Contrast of the button's outermost pixel column vs the band 4px outside it. */
async function boundaryContrast(page: Page, probe: 'band' | 'card'): Promise<number> {
  const btn = page.locator(`[data-block="action-edge-probe"] [data-probe="${probe}"] [data-c5="button"]`)
  await btn.scrollIntoViewIfNeeded()
  const box = (await btn.boundingBox())!
  const pad = 8
  const png = await page.screenshot({
    clip: { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad },
    animations: 'disabled',
  })
  const [edge, outside] = await page.evaluate(
    async ({ b64, pad, h }) => {
      const el = new Image()
      el.src = `data:image/png;base64,${b64}`
      await el.decode()
      const canvas = document.createElement('canvas')
      canvas.width = el.naturalWidth
      canvas.height = el.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(el, 0, 0)
      const scale = canvas.width / el.width || 1
      const at = (x: number, y: number): [number, number, number] => {
        const d = ctx.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data
        return [d[0], d[1], d[2]]
      }
      const midY = pad + h / 2
      // Left edge, vertically centred: 0.5px inside the button vs 4px outside.
      return [at(pad + 0.5, midY), at(pad - 4, midY)]
    },
    { b64: png.toString('base64'), pad, h: box.height },
  )
  return contrastRatio(edge, outside)
}

test.describe('cta button on a primary band', () => {
  test('the fixture reproduces the bug without the flag (boundary under 3:1)', async ({ page }) => {
    await setup(page, false)
    expect(await boundaryContrast(page, 'band')).toBeLessThan(3)
    const outline = await page
      .locator('[data-block="action-edge-probe"] [data-probe="band"] [data-c5="button"]')
      .evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline, 'no attribute → no edge (R1)').toBe('none')
  })

  test('with data-c5-action-edge the boundary clears 3:1', async ({ page }) => {
    await setup(page, true)
    expect(await boundaryContrast(page, 'band')).toBeGreaterThanOrEqual(3)
  })

  test('a light card inside the band keeps the plain button', async ({ page }) => {
    await setup(page, true)
    const outline = await page
      .locator('[data-block="action-edge-probe"] [data-probe="card"] [data-c5="button"]')
      .evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).toBe('none')
  })
})

test('layout emits data-c5-action-edge exactly when this site’s palette needs it', async ({ page }) => {
  const brand = JSON.parse(readFileSync(path.join(process.cwd(), 'content/brand.json'), 'utf-8')) as BrandJson
  await page.goto('/')
  const attr = await page.locator('html').getAttribute(ACTION_EDGE_ATTRIBUTE)
  expect(attr ?? undefined).toBe(actionEdgeAttributes(brand)[ACTION_EDGE_ATTRIBUTE])
})
