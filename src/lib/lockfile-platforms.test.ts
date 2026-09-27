import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * CI (ubuntu, `npm ci`) installs ONLY what package-lock.json lists. A lock
 * regenerated on a Mac with an existing node_modules can drop every other
 * platform's optional native binding (npm/cli#4828) — CI then died at the Test
 * step with "Cannot find module '@rolldown/binding-linux-x64-gnu'" on every
 * run from 2026-09-02 to 2026.09.5. This fails locally before that ships.
 * Fix recipe: CHANGELOG 2026.09.5 → "CI".
 *
 * Template-only (content/.template-default): a client repo's lock is its own
 * and is not part of a fleet sync, so this must not fail a rollout's local
 * verify there — apply the CHANGELOG recipe to a client repo before shipping
 * its CI workflow.
 */
const IS_TEMPLATE_DEFAULT = existsSync(path.join(process.cwd(), 'content', '.template-default'))
const LINUX_BINDINGS = [
  '@rolldown/binding-linux-x64-gnu', // vitest 4 → vite 8 → rolldown
  '@tailwindcss/oxide-linux-x64-gnu', // next build (Tailwind v4)
  'lightningcss-linux-x64-gnu', // next build (Tailwind v4)
  '@esbuild/linux-x64', // tsx (validate / generate-fonts)
  '@next/swc-linux-x64-gnu', // next build
]

describe.skipIf(!IS_TEMPLATE_DEFAULT)('package-lock.json', () => {
  const lock = JSON.parse(readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf-8')) as {
    packages: Record<string, unknown>
  }
  for (const name of LINUX_BINDINGS) {
    it(`keeps the linux x64 binding ${name} (CI + Vercel)`, () => {
      expect(Object.keys(lock.packages)).toContain(`node_modules/${name}`)
    })
  }
})
