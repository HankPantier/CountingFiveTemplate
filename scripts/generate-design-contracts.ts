#!/usr/bin/env tsx
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fontManifestJson } from '../src/lib/theme/font-manifest'
import { generateFontsModule } from '../src/lib/theme/font-module'
import { styleAxesJson } from '../src/lib/theme/style-axes'
import { blockCatalogJson } from '../src/lib/assembly/block-catalog'
import { layoutPresetsJson } from '../src/lib/theme/layout-presets'

/**
 * Writes the machine-readable contracts the Revaltus platform mirrors (and
 * parity-tests against): docs/design/font-manifest.json, docs/design/style-axes.json,
 * docs/design/blocks.json, docs/design/layout-presets.json,
 * and the golden fonts modules under src/lib/theme/__fixtures__/fonts/. The
 * default golden is the DEFAULT kind (generateFontsModule() with no design).
 * Content-independent: nothing here reads content/.
 */
const root = process.cwd()
const FIX = path.join(root, 'src', 'lib', 'theme', '__fixtures__', 'fonts')

async function main(): Promise<void> {
  await fs.mkdir(path.join(root, 'docs', 'design'), { recursive: true })
  await fs.writeFile(path.join(root, 'docs', 'design', 'font-manifest.json'), fontManifestJson(), 'utf-8')
  await fs.writeFile(path.join(FIX, 'fonts-default.golden.txt'), generateFontsModule().source, 'utf-8')
  for (const name of ['editorial', 'noitalic', 'pinned']) {
    const design = JSON.parse(await fs.readFile(path.join(FIX, `design-${name}.json`), 'utf-8')) as {
      typography: { headingFont?: string; bodyFont?: string; accentFont?: string; pinnedFonts?: string[] }
    }
    await fs.writeFile(path.join(FIX, `fonts-${name}.golden.txt`), generateFontsModule(design.typography).source, 'utf-8')
  }
  await fs.writeFile(path.join(root, 'docs', 'design', 'style-axes.json'), styleAxesJson(), 'utf-8')
  await fs.writeFile(path.join(root, 'docs', 'design', 'blocks.json'), blockCatalogJson(), 'utf-8')
  await fs.writeFile(path.join(root, 'docs', 'design', 'layout-presets.json'), layoutPresetsJson(), 'utf-8')
  console.log('✓ Wrote docs/design/{font-manifest,style-axes,blocks,layout-presets}.json + font golden fixtures')
}

main().catch((err) => {
  console.error('Error writing design contracts:', err)
  process.exit(1)
})
