#!/usr/bin/env tsx
/**
 * Unpack a Phase I deliverable into the template repo.
 *
 * Usage:
 *   npm run unpack <path-to-zip-or-folder>
 *
 * Examples:
 *   npm run unpack ~/Downloads/content-package.zip
 *   npm run unpack ~/Downloads/korbey-lague-content/
 *
 * Steps:
 *   1. Extract zip (or copy folder) into the repo root, overwriting any existing
 *      files at the destination paths.
 *   2. Run scripts/generate-theme.ts to produce src/styles/theme.css from the
 *      new content/brand.json + content/design.json.
 *
 * After running this, `npm run dev` renders the unpacked site.
 *
 * Idempotent: re-running with the same input produces the same result. Safe to
 * run after a client returns with content edits — it overwrites content/ but
 * leaves any non-deliverable files (your source code, customizations) alone.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import AdmZip from 'adm-zip'

async function main(): Promise<void> {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: npm run unpack <path-to-zip-or-folder>')
    process.exit(1)
  }

  const absPath = path.resolve(arg)
  const stat = await fs.stat(absPath).catch(() => null)
  if (!stat) {
    console.error(`Not found: ${absPath}`)
    process.exit(1)
  }

  const repoRoot = process.cwd()
  console.log(`Repo root: ${repoRoot}`)

  if (stat.isFile() && absPath.toLowerCase().endsWith('.zip')) {
    console.log(`Extracting ${absPath} into repo root...`)
    const zip = new AdmZip(absPath)
    // Zip-slip guard: refuse any entry whose resolved destination escapes
    // the repo root. adm-zip ≤0.5.x does not validate this on its own.
    const rootWithSep = repoRoot.endsWith(path.sep) ? repoRoot : repoRoot + path.sep
    for (const entry of zip.getEntries()) {
      const resolved = path.resolve(repoRoot, entry.entryName)
      if (resolved !== repoRoot && !resolved.startsWith(rootWithSep)) {
        console.error(`Refusing to extract entry that escapes repo root: ${entry.entryName}`)
        process.exit(1)
      }
    }
    // overwrite = true matches existing `unzip -o` behavior
    zip.extractAllTo(repoRoot, true)
    // Log a count of extracted entries so the operator sees progress
    console.log(`✓ Extracted ${zip.getEntries().length} entries`)
  } else if (stat.isDirectory()) {
    console.log(`Copying ${absPath}/* into repo root...`)
    // Enumerate top-level entries and copy each one to match cp -R "$src/." "$dst/" semantics
    const entries = await fs.readdir(absPath, { withFileTypes: true })
    for (const entry of entries) {
      const src = path.join(absPath, entry.name)
      const dest = path.join(repoRoot, entry.name)
      await fs.cp(src, dest, { recursive: true, force: true })
    }
    console.log(`✓ Copied ${entries.length} entries`)
  } else {
    console.error(`Expected a .zip file or a directory. Got: ${absPath}`)
    process.exit(1)
  }

  // content/.template-default marks the TEMPLATE's own content (see
  // e2e/template-default.ts) and must never survive into a client repo — a
  // client's CI would otherwise run template-only specs (zero-change pixel
  // baselines, content-dependent design-defaults) against client content.
  const templateDefaultMarker = path.join(repoRoot, 'content', '.template-default')
  await fs.rm(templateDefaultMarker, { force: true })

  console.log('\nRunning theme generator...')
  execSync('npx --yes tsx scripts/generate-theme.ts', { stdio: 'inherit', cwd: repoRoot })

  console.log('\n✓ Unpack complete. Run `npm run dev` to start the site.\n')
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
