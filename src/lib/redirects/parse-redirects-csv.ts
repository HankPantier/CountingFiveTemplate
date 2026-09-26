/**
 * Pure parser for content/redirects.csv (read by next.config.ts at build).
 * Destinations must be same-site paths: `/x` is fine; `//host` and `/\host`
 * are protocol-relative (browsers treat `\` as `/`), and control characters
 * can smuggle a scheme or split the Location header — all skipped.
 */
export type CsvRedirect = { source: string; destination: string; permanent: true }
export type SkippedRedirect = { line: string; reason: string }

const CONTROL_RE = /[\u0000-\u001f\u007f]/

export function redirectDestinationError(to: string): string | null {
  if (!to.startsWith('/')) return 'non-relative destination'
  if (to.startsWith('//') || to.startsWith('/\\')) return 'protocol-relative destination'
  if (CONTROL_RE.test(to)) return 'control character in destination'
  return null
}

export function parseRedirectsCsv(raw: string): { redirects: CsvRedirect[]; skipped: SkippedRedirect[] } {
  const redirects: CsvRedirect[] = []
  const skipped: SkippedRedirect[] = []
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('#')) continue
    if (line.startsWith('old_url,')) continue
    const [from, to] = parseCsvLine(line)
    if (!from || !to) continue
    const reason = redirectDestinationError(to)
    if (reason) {
      skipped.push({ line, reason })
      continue
    }
    redirects.push({ source: from, destination: to, permanent: true })
  }
  return { redirects, skipped }
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        out.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
  }
  out.push(cur)
  return out.map((c) => c.trim())
}
