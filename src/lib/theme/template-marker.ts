/**
 * The template's capability marker (repo-root c5-template.json). The Revaltus
 * Design Studio reads it from the DRAFT branch and intersects it with the
 * <meta name="c5-capabilities"> this layout emits on the DEPLOYED site, so a
 * lever unlocks only when both the next build and the live shell support it.
 * Tokens: fonts (L2), style-axes (L3), specimen (L4).
 */
import raw from '../../../c5-template.json'

export const KNOWN_CAPABILITIES = ['fonts', 'style-axes', 'specimen'] as const
export type TemplateMarker = { templateVersion: string; capabilities: string[] }

export const TEMPLATE_MARKER: TemplateMarker = {
  templateVersion: String(raw.templateVersion),
  capabilities: raw.capabilities.map(String),
}

export function capabilitiesMetaContent(marker: TemplateMarker = TEMPLATE_MARKER): string {
  return marker.capabilities.join(',')
}
