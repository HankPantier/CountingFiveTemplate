export type SocialLink = {
  platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'other'
  url: string
}

export type Address = {
  street: string
  line2?: string
  city: string
  state: string
  zip: string
}

export type Certification = {
  src: string
  alt: string
  url?: string
}

export type BrandJson = {
  firm: {
    name: string
    /** Compact display name (e.g. breadcrumb root). Falls back to `name` when unset. */
    shortName?: string
    tagline?: string
    foundingYear?: string
  }
  contact: {
    address?: Address
    phone?: string
    fax?: string
    email?: string
    hours?: Record<string, string>
  }
  palette: {
    primary: string
    secondary: string
    complementary: string
    action: string
    nearBlack: string
    nearWhite: string
  }
  social: SocialLink[]
  certifications: Certification[]
  logo: {
    primary: string
    alt: string
    /**
     * Optional footer-specific logo variant. The footer surface is dark
     * (`bg-foreground`), so a dark primary logo is hard to read. When set,
     * the footer renders this asset directly. When unset, the footer falls
     * back to `primary` with an `invert` filter — works for dark logos,
     * fails silently for already-light ones. Provide this field for any
     * client whose primary logo is already light/white.
     */
    footer?: string
    /**
     * Standalone mark / icon (no wordmark) for tight spaces. Used by the
     * favicon generator at `src/app/icon.tsx` when present; falls back to
     * `primary`, then to a brand-colored initial when neither is set.
     */
    mark?: string
    /**
     * Logo + tagline stacked vertically. Reserved for layouts that want a
     * taller mark (e.g. centered hero treatments). No required consumer
     * today — declared so designers can hand off a variant without a code
     * change.
     */
    stacked?: string
    /**
     * Wide horizontal lockup. Reserved for header treatments that benefit
     * from a wider mark than `primary`. No required consumer today.
     */
    horizontal?: string
    /**
     * Single-color version (typically monochrome black or white) for use
     * on photography or saturated backgrounds. No required consumer today.
     */
    monochrome?: string
  }
}
