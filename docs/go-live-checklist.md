# Go-Live Checklist

The 5-minute final gate before pointing a client's domain at the site. The full
setup flow lives in [`how-to-new-site.md`](./how-to-new-site.md) — this is the
condensed pass/fail list to run on the production deploy, in order.

## Config (`site.config.ts`)

- [ ] `siteUrl` is the client's real domain (drives canonical URLs, JSON-LD, sitemap)
- [ ] `forms.fromEmail` is a **verified-domain** Resend sender — `onboarding@resend.dev`
      only delivers to the Resend account owner and will silently fail for real visitors
- [ ] `forms.serviceOptions` reflect this client's actual services (template ships accounting defaults)
- [ ] `booking.url` / `booking.provider` set or the booking block removed from content
- [ ] `csp.extraOrigins` includes every third-party embed (Calendly, Stripe, …)

## Environment (Vercel → Project → Settings → Environment Variables)

- [ ] `RESEND_API_KEY` set in Production
- [ ] `NEXT_PUBLIC_GA4_ID` (or `NEXT_PUBLIC_GTM_ID`) set — a professional-services
      site without measurement can't prove ROI; don't skip without the client's sign-off

## Functional spot-checks (on the production URL)

- [ ] Contact form: submit with recipient `delivered@resend.dev` → success;
      confirm the client's inbox address is correct in config
- [ ] `/sitemap.xml` lists every page; `/robots.txt` points at it
- [ ] Pick 3 entries from `content/redirects.csv` → each old URL 308s to the right new page
- [ ] Share a page URL in a social-card debugger (e.g. opengraph.xyz) → `/api/og` card renders
- [ ] 404 a bogus path → branded not-found page
- [ ] Dark mode: switch your OS to dark appearance, reload home + a content page —
      neutrals flip, brand hero/buttons/footer stay on-brand, text stays readable
- [ ] No CSP **violation** errors in the browser console on home, a service page, and contact

## Hardening (after the above are green)

- [ ] Flip `csp.mode: 'report-only'` → `'enforce'`, commit, redeploy, re-check console
- [ ] Submit the sitemap in Google Search Console (and verify the domain property)
- [ ] Confirm Vercel BotID shows active under Firewall

## Hand-off

- [ ] Client has the editor link and knows Save (draft) vs Publish (live)
- [ ] CREDITS.md reviewed — Pexels attribution ships with the repo, nothing to do unless
      the client wants stock photos replaced with their own
