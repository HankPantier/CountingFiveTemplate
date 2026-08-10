import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import type { ClientCenterJson } from './types'

const DISABLED: ClientCenterJson = { enabled: false, label: 'Client Center', groups: [] }

/**
 * Load content/client-center.json. The file is optional — a firm with no client
 * portals never ships it — so a missing file resolves to a disabled config and
 * the nav button stays hidden. Malformed JSON is treated the same way rather
 * than crashing the whole layout.
 */
export async function getClientCenterConfig(): Promise<ClientCenterJson> {
  'use cache'
  cacheLife('max')
  const filePath = path.join(process.cwd(), 'content', 'client-center.json')
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    return DISABLED
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ClientCenterJson>
    if (!parsed || parsed.enabled !== true || !Array.isArray(parsed.groups)) return DISABLED
    return {
      enabled: true,
      label: typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : 'Client Center',
      groups: parsed.groups,
    }
  } catch {
    return DISABLED
  }
}
