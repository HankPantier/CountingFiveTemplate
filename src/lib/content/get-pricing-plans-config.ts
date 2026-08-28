import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import type { PricingPlansConfig } from './pricing-plans-types'

// Reads content/pricing-plans.json at build time (mirrors get-pricing-calculator-config).
// OPTIONAL — a deliverable without an enabled plans page ships none, so a missing
// file resolves to null and the block renders nothing rather than throwing.
export async function getPricingPlansConfig(): Promise<PricingPlansConfig | null> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(process.cwd(), 'content', 'pricing-plans.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as PricingPlansConfig
  } catch {
    return null
  }
}
