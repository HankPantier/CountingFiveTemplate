import { describe, expect, it } from 'vitest'
import { KNOWN_CAPABILITIES, TEMPLATE_MARKER, capabilitiesMetaContent } from './template-marker'

describe('c5-template.json', () => {
  it('declares exactly the T2 capabilities (R2)', () => {
    expect(TEMPLATE_MARKER).toEqual({
      templateVersion: '2026.09.2',
      capabilities: ['fonts', 'style-axes', 'specimen'],
    })
  })
  it('only uses tokens the platform knows', () => {
    for (const c of TEMPLATE_MARKER.capabilities) expect(KNOWN_CAPABILITIES).toContain(c)
  })
  it('renders the meta content comma-joined', () => {
    expect(capabilitiesMetaContent()).toBe(TEMPLATE_MARKER.capabilities.join(','))
  })
})
