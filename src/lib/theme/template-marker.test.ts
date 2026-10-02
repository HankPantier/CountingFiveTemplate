import { describe, expect, it } from 'vitest'
import { KNOWN_CAPABILITIES, SYNCED_FROM, TEMPLATE_MARKER, capabilitiesMetaContent, templateVersionMetaContent } from './template-marker'

describe('c5-template.json', () => {
  it('declares exactly the T2 capabilities + layout-presets (R2)', () => {
    expect(TEMPLATE_MARKER).toEqual({
      templateVersion: '2026.09.13',
      capabilities: ['fonts', 'style-axes', 'specimen', 'layout-presets'],
    })
  })
  it('syncedFrom is null (template) or a git SHA (client repo)', () => {
    if (SYNCED_FROM !== null) expect(SYNCED_FROM).toMatch(/^[0-9a-f]{7,40}$/)
  })
  it('only uses tokens the platform knows', () => {
    for (const c of TEMPLATE_MARKER.capabilities) expect(KNOWN_CAPABILITIES).toContain(c)
  })
  it('renders the meta content comma-joined', () => {
    expect(capabilitiesMetaContent()).toBe(TEMPLATE_MARKER.capabilities.join(','))
  })
  it('renders the template version meta (2026.09.13) from the marker', () => {
    expect(templateVersionMetaContent()).toBe(TEMPLATE_MARKER.templateVersion)
    expect(templateVersionMetaContent({ templateVersion: '2026.10.1', capabilities: [] })).toBe('2026.10.1')
  })
})
