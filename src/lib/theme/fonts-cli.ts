/**
 * Pure CLI-argument parsing for scripts/generate-fonts.ts, kept here (not in
 * the script) so vitest — which only collects src/**\/*.test.ts — can exercise
 * it directly.
 *
 * Modes are mutually exclusive: --check, --all and --default each pick a
 * distinct output; passing more than one is a usage error (never partially
 * acted on — in particular, never written in check mode). --design requires
 * a real path argument, not a missing value or another flag swallowed by
 * mistake (e.g. `--design --check` must fail loudly, not silently check
 * against a file literally named "--check").
 */
export type FontsCliMode = 'check' | 'all' | 'default' | 'sync'

export type FontsCliArgs = {
  mode: FontsCliMode
  /** Explicit --design <path>, if given; undefined = caller's default (content/design.json). */
  designPath?: string
  stdout: boolean
}

export type FontsCliParseResult = { ok: true; args: FontsCliArgs } | { ok: false; error: string }

const MODE_FLAGS = ['--check', '--all', '--default'] as const

export function parseFontsCliArgs(argv: readonly string[]): FontsCliParseResult {
  const present = MODE_FLAGS.filter((f) => argv.includes(f))
  if (present.length > 1) {
    return { ok: false, error: `Conflicting flags: ${present.join(' and ')} cannot be combined.` }
  }

  const designIndex = argv.indexOf('--design')
  let designPath: string | undefined
  if (designIndex >= 0) {
    const value = argv[designIndex + 1]
    if (!value || value.startsWith('--')) {
      return { ok: false, error: '--design requires a path argument (got none, or another flag instead of a path).' }
    }
    designPath = value
  }

  const mode: FontsCliMode = present.length === 1 ? (present[0].slice(2) as FontsCliMode) : 'sync'
  return { ok: true, args: { mode, designPath, stdout: argv.includes('--stdout') } }
}
