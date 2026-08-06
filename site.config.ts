// site.config.ts — per-client runtime config.
// Edit this for each new client repo (siteUrl, legalLinks, forms).

export type FormsConfig = {
  /**
   * External POST target for form submissions (Formspree, Zapier, etc.).
   * When set, Form.tsx POSTs here INSTEAD of the built-in /api/contact
   * route. Useful for clients who want submissions to land in their
   * existing CRM / lead pipeline without provisioning Resend.
   *
   * Leave blank to use the built-in /api/contact + Resend flow.
   */
  endpoint: string

  /**
   * Resend sender address used by /api/contact. Must be a verified-domain
   * address in Resend for production clients. The default
   * 'onboarding@resend.dev' works without domain verification — useful
   * for dev and for clients who haven't set up a sender domain yet.
   */
  fromEmail: string

  /**
   * Recipient override for /api/contact. When blank, the route falls back
   * to brand.contact.email from content/brand.json (the normal case).
   * Set this when the firm wants submissions to land somewhere other
   * than their public contact address.
   */
  toEmail: string

  /**
   * Dropdown options for the "quote" form variant's service-select field.
   * Edit per client to reflect the actual services the firm offers.
   * 'Other' is conventional as the final entry.
   */
  serviceOptions: string[]

  // API key for Resend is read from process.env.RESEND_API_KEY.
  // Never commit secrets here. See .env.example.
}

export type BookingConfig = {
  /**
   * 'calendly' loads Calendly's official inline widget (best UX; requires
   * `https://*.calendly.com` in csp.extraOrigins).
   * 'iframe' embeds the booking URL as a plain iframe — lighter CSP impact
   * (still need frame-src for the provider's origin).
   * 'none' renders nothing; use for clients who don't book online.
   */
  provider: 'calendly' | 'iframe' | 'none'
  /** Full booking URL, e.g. https://calendly.com/firmname/discovery-call. */
  url: string
}

export type CspConfig = {
  /**
   * 'enforce'      — sends the Content-Security-Policy header (browsers
   *                  block violations).
   * 'report-only'  — sends Content-Security-Policy-Report-Only (browsers
   *                  log violations to the console without blocking).
   *                  Useful before flipping a client to 'enforce' for the
   *                  first time, or when adding new third-party services.
   * 'off'          — sends no CSP header. Use sparingly.
   */
  mode: 'enforce' | 'report-only' | 'off'

  /**
   * Extra origins added to the script-src, style-src, connect-src,
   * img-src, and frame-src directives all at once. Use when a client
   * embeds a third-party service (Calendly, Stripe, Meta Pixel, HubSpot,
   * etc.) — adding the origin here is usually enough to make it work.
   *
   * Example: ['https://*.calendly.com', 'https://*.stripe.com']
   *
   * If you need per-directive control, edit next.config.ts's buildCsp()
   * helper directly.
   */
  extraOrigins: string[]
}

export type SiteConfig = {
  siteUrl: string
  legalLinks: { label: string; url: string }[]
  forms: FormsConfig
  csp: CspConfig
  booking: BookingConfig
}

export const siteConfig: SiteConfig = {
  siteUrl: 'https://korbeylague.com',
  legalLinks: [
    { label: 'Privacy Policy', url: '/privacy-policy' },
    { label: 'Terms of Service', url: '/terms-of-use' },
  ],
  forms: {
    endpoint: '',
    fromEmail: 'onboarding@resend.dev',
    toEmail: '',
    serviceOptions: [
      'Bookkeeping',
      'Tax Preparation',
      'Payroll Services',
      'CFO Advisory',
      'Business Consulting',
      'Other',
    ],
  },
  csp: {
    // Start new clients in 'report-only' so first-deploy CSP violations (incl.
    // anything from new third-party embeds, and a sanity check that Vercel
    // BotID's same-origin challenge isn't blocked) surface in the browser
    // console without blocking content. Flip to 'enforce' once the deployed
    // site loads clean. See docs/how-to-new-site.md, step 7.
    mode: 'report-only',
    extraOrigins: ['https://*.calendly.com'],
  },
  booking: {
    // Placeholder Calendly URL so the contact drawer's "Book a call" demos out
    // of the box. Replace per client with the firm's real scheduling link (or
    // manage it from the onboarding admin's "Contact & scheduling" editor).
    provider: 'calendly',
    url: 'https://calendly.com/your-firm/discovery-call',
  },
}
