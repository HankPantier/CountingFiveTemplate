#!/usr/bin/env tsx
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { pageUrlToFilename } from '../src/lib/content/get-page'
import { parsePageMd } from '../src/lib/assembly/parse-page-md'

type Finding = { severity: 'error' | 'warning'; file: string; message: string }

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const repoRoot = process.cwd()
  const findings: Finding[] = []

  // ── Check 1: Required content files ──────────────────────────────────────
  const required = [
    'content/brand.json',
    'content/design.json',
    'content/nav.json',
    'content/pages/home.md',
    'public/robots.txt',
  ]
  for (const rel of required) {
    if (!(await exists(path.join(repoRoot, rel)))) {
      findings.push({ severity: 'error', file: rel, message: 'missing' })
    }
  }

  // ── Check 2: Image references ─────────────────────────────────────────────
  const pagesDir = path.join(repoRoot, 'content', 'pages')
  const assetsDir = path.join(repoRoot, 'public', 'content-assets')
  let pageCount = 0
  const referencedImages = new Set<string>()

  if (await exists(pagesDir)) {
    const files = (await fs.readdir(pagesDir)).filter(f => f.endsWith('.md'))
    pageCount = files.length

    for (const file of files) {
      const raw = await fs.readFile(path.join(pagesDir, file), 'utf-8')
      const { data, content } = matter(raw)

      // Frontmatter shape — Zod-validate via parsePageMd. Catches deliverable
      // typos (e.g. faq_block in the wrong shape) before they ship. Also assert
      // the body produced renderable blocks: a page whose body has substantial
      // text but zero `<!-- block: -->` sections renders an empty content area
      // (e.g. a raw JSON generation envelope stored as the body). parsePageMd
      // now defensively unwraps that envelope, so a still-empty result means
      // genuinely missing block annotations — fail the deliverable.
      try {
        const manifest = parsePageMd(raw)
        const bodyText = content.replace(/\s/g, '')
        if (manifest.sections.length === 0 && bodyText.length > 200) {
          findings.push({
            severity: 'error',
            file: `pages/${file}`,
            message:
              'body has content but produced no renderable blocks — missing <!-- block: --> annotations',
          })
        }
      } catch (err) {
        findings.push({
          severity: 'error',
          file: `pages/${file}`,
          message: `frontmatter invalid: ${err instanceof Error ? err.message : String(err)}`,
        })
      }

      // Frontmatter: hero_image field (skip remote URLs)
      if (typeof data.hero_image === 'string' && data.hero_image) {
        const img = data.hero_image
        const isRemote = img.startsWith('http://') || img.startsWith('https://')
        if (!isRemote) {
          referencedImages.add(img)
          if (!(await exists(path.join(assetsDir, img)))) {
            findings.push({
              severity: 'warning',
              file: `pages/${file}`,
              message: `hero_image "${img}" missing in public/content-assets/`,
            })
          }
        }
      }

      // Frontmatter: hero_video + hero_images (video/slider variants). Same
      // local-asset existence check, skipping remote URLs.
      const heroMedia: string[] = [
        ...(typeof data.hero_video === 'string' && data.hero_video ? [data.hero_video] : []),
        ...(Array.isArray(data.hero_images) ? data.hero_images.filter((s): s is string => typeof s === 'string' && !!s) : []),
      ]
      for (const ref of heroMedia) {
        if (ref.startsWith('http://') || ref.startsWith('https://')) continue
        referencedImages.add(ref)
        if (!(await exists(path.join(assetsDir, ref)))) {
          findings.push({
            severity: 'warning',
            file: `pages/${file}`,
            message: `hero media "${ref}" missing in public/content-assets/`,
          })
        }
      }

      // Inline block annotations: <!-- block: <id> | variant: <v> | image: <filename> -->
      const blockImgPattern =
        /<!-- block: [a-z-]+(?:\s*\|\s*variant: [a-z0-9-]+)?(?:\s*\|\s*image: ([^\s>|]+))?\s*-->/g
      let m: RegExpExecArray | null
      while ((m = blockImgPattern.exec(content)) !== null) {
        if (m[1]) {
          const img = m[1].trim()
          referencedImages.add(img)
          if (!(await exists(path.join(assetsDir, img)))) {
            findings.push({
              severity: 'warning',
              file: `pages/${file}`,
              message: `block annotation image "${img}" missing in public/content-assets/`,
            })
          }
        }
      }

      // Body markdown: ![alt](src) — relative paths or /content-assets/...
      const mdImgPattern = /!\[[^\]]*\]\(([^)]+)\)/g
      while ((m = mdImgPattern.exec(content)) !== null) {
        const src = m[1].trim()
        // Skip external URLs
        if (src.startsWith('http://') || src.startsWith('https://')) continue
        // Convert /content-assets/foo.jpg → foo.jpg; otherwise use as-is
        const filename = src.startsWith('/content-assets/')
          ? src.slice('/content-assets/'.length)
          : src
        referencedImages.add(filename)
        if (!(await exists(path.join(assetsDir, filename)))) {
          findings.push({
            severity: 'warning',
            file: `pages/${file}`,
            message: `markdown image "${src}" missing in public/content-assets/`,
          })
        }
      }

      // Body `photo:` lines (team-grid / service-cards / content-cards convention)
      const photoLinePattern = /^\s*photo:\s*(\S+)\s*$/gim
      while ((m = photoLinePattern.exec(content)) !== null) {
        const src = m[1].trim()
        // Skip external URLs
        if (src.startsWith('http://') || src.startsWith('https://')) continue
        referencedImages.add(src)
        if (!(await exists(path.join(assetsDir, src)))) {
          findings.push({
            severity: 'warning',
            file: `pages/${file}`,
            message: `photo reference "${src}" missing in public/content-assets/`,
          })
        }
      }
    }
  }

  // ── Check 3: Filename round-trip ──────────────────────────────────────────
  let roundtripsClean = 0

  if (await exists(pagesDir)) {
    const files = (await fs.readdir(pagesDir)).filter(f => f.endsWith('.md'))

    for (const file of files) {
      const slug = file.slice(0, -3) // drop .md

      // Convert filename → URL
      const url = slug === 'home' ? '/' : '/' + slug.replace(/--/g, '/')

      // Convert URL back → filename
      const roundtrip = pageUrlToFilename(url)

      if (roundtrip !== file) {
        findings.push({
          severity: 'error',
          file: `pages/${file}`,
          message: `filename → URL → filename round-trip produced "${roundtrip}", not "${file}"`,
        })
      } else {
        roundtripsClean++
      }

      // Flag ambiguous triple-hyphen (or leading/trailing --) patterns
      if (/---/.test(slug) || /^--/.test(slug) || /--$/.test(slug)) {
        findings.push({
          severity: 'warning',
          file: `pages/${file}`,
          message: `filename has ambiguous "--" patterns; ensure URL paths render correctly`,
        })
      }
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const errors = findings.filter(f => f.severity === 'error')
  const warnings = findings.filter(f => f.severity === 'warning')

  if (errors.length > 0) {
    console.log(`⛔ ERRORS (${errors.length})`)
    for (const e of errors) console.log(`   ${e.file}: ${e.message}`)
    console.log()
  }

  if (warnings.length > 0) {
    console.log(`⚠ WARNINGS (${warnings.length})`)
    for (const w of warnings) console.log(`   ${w.file}: ${w.message}`)
    console.log()
  }

  const statusGlyph = errors.length === 0 ? '✓' : '✗'
  console.log(
    `${statusGlyph} ${pageCount} pages validated, ${referencedImages.size} images referenced, ${roundtripsClean} filenames round-trip cleanly`
  )

  process.exit(errors.length > 0 ? 1 : 0)
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
