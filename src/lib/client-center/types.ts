// Mirror of the onboarding repo's types/client-center.ts — the shape of
// content/client-center.json, read by the Client Center modal. Keep in sync.

export type ClientPortalLink = {
  label: string
  url: string
  description?: string
  icon?: string
}

export type ClientCenterGroup = {
  title: string
  links: ClientPortalLink[]
}

export type ClientCenterJson = {
  enabled: boolean
  label: string
  groups: ClientCenterGroup[]
}
