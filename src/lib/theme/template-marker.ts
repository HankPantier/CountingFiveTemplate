/**
 * The template's capability marker (repo-root c5-template.json). The Revaltus
 * Design Studio reads it from the DRAFT branch and intersects it with the
 * <meta name="c5-capabilities"> this layout emits on the DEPLOYED site, so a
 * lever unlocks only when both the next build and the live shell support it.
 * Tokens: fonts (L2), style-axes (L3), specimen (L4).
 *
 * `syncedFrom` is the template commit SHA a client repo was last synced from
 * (the fleet sync writes it with the release; the fleet tool reads it as the
 * 3-way gate's OLD). It is null in the template repo itself.
 */
import raw from '../../../c5-template.json'

export const KNOWN_CAPABILITIES = ['fonts', 'style-axes', 'specimen'] as const
export type TemplateMarker = { templateVersion: string; capabilities: string[] }

/** The template SHA this repo was synced from; null in the template itself. */
export const SYNCED_FROM: string | null = typeof raw.syncedFrom === 'string' ? raw.syncedFrom : null

export const TEMPLATE_MARKER: TemplateMarker = {
  templateVersion: String(raw.templateVersion),
  capabilities: raw.capabilities.map(String),
}

export function capabilitiesMetaContent(marker: TemplateMarker = TEMPLATE_MARKER): string {
  return marker.capabilities.join(',')
}
