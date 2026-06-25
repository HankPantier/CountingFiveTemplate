'use client'

/**
 * FooterCookiePrefsLink — clears the analytics-consent cookie and reloads;
 * the client-side <Analytics> re-reads document.cookie on the fresh load,
 * finds no decision, and brings the consent banner back. Satisfies the GDPR
 * right-to-withdraw when the banner is shipped enabled.
 */
export function FooterCookiePrefsLink() {
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie =
          'analytics-consent=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        window.location.reload()
      }}
      className="hover:text-footer-foreground"
    >
      Cookie preferences
    </button>
  )
}
