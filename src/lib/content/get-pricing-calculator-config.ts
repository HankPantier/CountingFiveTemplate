import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import type { PricingCalculatorConfig } from './pricing-calculator-types'

// Reads content/pricing-calculator.json at build time (mirrors get-brand-config).
// Unlike brand.json this file is OPTIONAL — a deliverable without an enabled
// calculator ships none, so a missing file resolves to null and the block
// renders nothing rather than throwing.
export async function getPricingCalculatorConfig(): Promise<PricingCalculatorConfig | null> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(process.cwd(), 'content', 'pricing-calculator.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as PricingCalculatorConfig
  } catch {
    return null
  }
}
