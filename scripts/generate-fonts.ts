#!/usr/bin/env tsx
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fontsModuleKind, generateAllFontsModule, generateFontsModule } from '../src/lib/theme/font-module'
import { parseFontsCliArgs } from '../src/lib/theme/fonts-cli'

/**
 * Regenerate src/app/fonts.generated.ts.
 *   (no flags)            write the SYNCED module from content/design.json (typography)
 *   --default             write the DEFAULT module (template default fonts, not synced — what rollout seeds)
 *   --check               exit 1 when the committed module is stale for its kind (CI):
 *                           default header → must equal the DEFAULT module;
 *                           synced header  → must equal the module generated from content/design.json;
 *                           anything else  → fail (hand-edited / unknown)
 *   --all                 write a module loading EVERY manifest font (CI `fonts` job only — never commit)
 *   --design <p> --stdout print the SYNCED module for another design.json (golden fixtures)
 *
 * --check, --all and --default are mutually exclusive; --design requires a
 * real path (not another flag). Argument validation lives in
 * src/lib/theme/fonts-cli.ts (parseFontsCliArgs) so it's unit-testable —
 * invalid combinations exit non-zero before anything is read or written.
 */
const OUT = path.join(process.cwd(), 'src', 'app', 'fonts.generated.ts')
const REL = 'src/app/fonts.generated.ts'

type DesignJson = { typography?: Record<string, string> }

async function syncedSource(designPath: string): Promise<string> {
  const design = JSON.parse(await fs.readFile(designPath, 'utf-8')) as DesignJson
  const { source, warnings } = generateFontsModule(design.typography ?? {})
  for (const w of warnings) console.warn(`[generate-fonts] ${w}`)
  return source
}

async function check(designPath: string): Promise<void> {
  const current = (await fs.readFile(OUT, 'utf-8').catch(() => '')).replace(/\r\n/g, '\n')
  const kind = fontsModuleKind(current)
  if (kind === null) {
    console.error(
      `✗ ${REL} is missing or has no generated default/synced header — regenerate it with \`npm run generate-fonts\` (synced) or \`npm run generate-fonts -- --default\`.`,
    )
    process.exit(1)
  }
  const expected = kind === 'default' ? generateFontsModule().source : await syncedSource(designPath)
  if (current !== expected) {
    const fix = kind === 'default' ? '`npm run generate-fonts -- --default`' : '`npm run generate-fonts`'
    console.error(`✗ ${REL} (${kind}) is stale — run ${fix} and commit it.`)
    process.exit(1)
  }
  console.log(
    kind === 'default'
      ? `✓ ${REL} is the current default module (not synced from design.json)`
      : `✓ ${REL} matches content/design.json`,
  )
}

async function main(): Promise<void> {
  const parsed = parseFontsCliArgs(process.argv.slice(2))
  if (!parsed.ok) {
    console.error(`✗ ${parsed.error}`)
    process.exit(1)
  }
  const { mode, designPath: designArg, stdout } = parsed.args
  const designPath = designArg ?? path.join(process.cwd(), 'content', 'design.json')

  if (mode === 'all') {
    await fs.writeFile(OUT, generateAllFontsModule(), 'utf-8')
    console.log(`✓ Wrote ${OUT} with every manifest font (CI only — do not commit)`)
    return
  }
  if (mode === 'check') {
    await check(designPath)
    return
  }
  if (mode === 'default') {
    const { source } = generateFontsModule()
    if (stdout) {
      process.stdout.write(source)
      return
    }
    await fs.writeFile(OUT, source, 'utf-8')
    console.log(`✓ Wrote ${OUT} (default fonts — not synced from design.json)`)
    return
  }
  const source = await syncedSource(designPath)
  if (stdout) {
    process.stdout.write(source)
    return
  }
  await fs.writeFile(OUT, source, 'utf-8')
  console.log(`✓ Wrote ${OUT} from ${path.relative(process.cwd(), designPath)}`)
}

main().catch((err) => {
  console.error('Error generating fonts module:', err)
  process.exit(1)
})
