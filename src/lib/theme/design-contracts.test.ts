import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { fontManifestJson } from './font-manifest'
import { fontsModuleKind, generateFontsModule } from './font-module'
import { styleAxesJson } from './style-axes'

const root = process.cwd()
const read = (p: string) => readFileSync(path.join(root, p), 'utf-8')
const lf = (s: string) => s.replace(/\r\n/g, '\n')
const FIX = 'src/lib/theme/__fixtures__/fonts'
const MODULE = 'src/app/fonts.generated.ts'
// Template-only (see e2e/template-default.ts): client repos have their own content/.
const IS_TEMPLATE_DEFAULT = existsSync(path.join(root, 'content', '.template-default'))

describe('committed fonts module (any content)', () => {
  // PF5: a DEFAULT module (seeded on rollout) is held to the default generator;
  // only a SYNCED module (written from design.json) is held to design.json parity.
  it('src/app/fonts.generated.ts is current for its kind (run npm run generate-fonts)', () => {
    const committed = lf(read(MODULE))
    const kind = fontsModuleKind(committed)
    if (kind === 'default') {
      expect(committed).toBe(generateFontsModule().source)
    } else if (kind === 'synced') {
      const design = JSON.parse(read('content/design.json')) as { typography?: Record<string, string> }
      expect(committed).toBe(generateFontsModule(design.typography ?? {}).source)
    } else {
      expect.fail(
        `${MODULE} has no generated default/synced header — regenerate it with \`npm run generate-fonts\` (or --default) instead of editing it.`,
      )
    }
  })
})

describe('font contracts + goldens', () => {
  it('the default golden is exactly the DEFAULT-kind module (run npm run design-contracts)', () => {
    expect(read(`${FIX}/fonts-default.golden.txt`)).toBe(generateFontsModule().source)
  })
  it.each(['editorial', 'noitalic'])('the %s golden matches the generator', (name) => {
    const design = JSON.parse(read(`${FIX}/design-${name}.json`)) as { typography: Record<string, string> }
    expect(read(`${FIX}/fonts-${name}.golden.txt`)).toBe(generateFontsModule(design.typography).source)
  })
  it('docs/design/font-manifest.json matches the manifest (run npm run design-contracts)', () => {
    expect(read('docs/design/font-manifest.json')).toBe(fontManifestJson())
  })
  it('docs/design/style-axes.json matches the vocabulary (run npm run design-contracts)', () => {
    expect(read('docs/design/style-axes.json')).toBe(styleAxesJson())
  })
})

describe.skipIf(!IS_TEMPLATE_DEFAULT)('template default content', () => {
  it('the template ships the DEFAULT fonts module, identical to the default golden', () => {
    expect(read(MODULE)).toBe(read(`${FIX}/fonts-default.golden.txt`))
  })
})
