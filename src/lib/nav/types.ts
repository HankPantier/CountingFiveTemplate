export type NavItem = {
  label: string
  url: string
  // Up to two nesting levels: secondary (header dropdown) + tertiary (side-nav
  // only). The header/footer render one level; the section side-nav renders two.
  children?: NavItem[]
}

export type NavJson = {
  primary: NavItem[]
  cta?: { label: string; url: string }
}
