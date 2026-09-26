# Security incidents — runbook

What to do when something on the live deploy starts misbehaving in a
security-adjacent way. Symptoms first, fix steps second, links to deeper
context last.

> Read [`architecture.md → Spam / abuse defenses`](./architecture.md#spam--abuse-defenses)
> and [`architecture.md → Security headers`](./architecture.md#security-headers)
> for the design rationale behind these defenses. This doc is the *operational*
> companion — what to do when an alert fires.

---

## Form submissions stop arriving (firm reports no leads)

**Symptoms.** Firm: "We haven't gotten a contact form submission in two days."
Visitors: form appears to submit (shows "Thank you"), but no email arrives.

**Diagnostic order:**

1. **Resend dashboard** ([resend.com](https://resend.com) → API → Logs). Look
   for the most recent emails sent from your `forms.fromEmail` address. If you
   see them: Resend sent them, the issue is downstream (firm's inbox, SPF/DKIM,
   filtering). If you don't: the API call isn't reaching Resend.
2. **Vercel function logs** (Vercel dashboard → your project → Logs → filter
   on `/api/contact`). Look for `[contact] Resend rejected:` (502 returned to
   client) or `[contact]` warnings (spam-layer drops). Each log line tells you
   which layer fired.
3. **`RESEND_API_KEY`** in Vercel project env. Make sure it's still set,
   still valid (Resend keys can be revoked), and matches the verified domain.
   Test with `curl -X POST` against `/api/contact` from a real browser session
   (you'll need BotID headers — easier to just submit from the live page).
4. **`forms.fromEmail` domain verification** in Resend. The most common silent
   failure mode: someone changed the verified domain in Resend dashboard but
   `forms.fromEmail` in `site.config.ts` still points to the old one. Resend
   returns 422 in that case — visible in the function logs as `Resend rejected`.

**Fix.** Depends on which layer failed; the diagnostic above tells you. Most
common: missing/invalid `RESEND_API_KEY`, or the `forms.fromEmail` domain is no
longer verified.

**Fallback while you fix.** The form already degrades to `mailto:` when the
API returns 503 (or 403 — BotID block). If you intentionally clear
`RESEND_API_KEY` in Vercel env, every submission silently uses the mailto
fallback — the firm keeps receiving leads via their visitor's mail client,
just less seamlessly. Mention this to the firm during a longer outage.

---

## Resend quota exhausted

**Symptoms.** Resend dashboard shows a usage spike that maxes the plan limit.
Vercel function logs show `Resend rejected:` errors with "quota" or "rate limit"
in the message body. New submissions return 502.

**Immediate response:**

1. Upgrade the Resend plan via their dashboard. Takes effect immediately.
2. *Or* if the spike is illegitimate (bot flood that's somehow bypassing the
   spam layers), see [BotID under-blocking](#botid-under-blocking) below and
   harden defenses first.

**Diagnose the cause.** Look at Resend logs for the time window of the spike.
- Submissions all clustered on one IP / minute → bot flood; tighten BotID.
- Steady-state legitimate traffic that just grew → plan upgrade is the answer.

**Note.** Bot submissions that trip honeypot / timing / content heuristics
return covert `{ok: true}` *without* calling Resend, so they don't burn quota.
The spam layers are designed exactly to protect Resend from being the budget
hole. If Resend quota is high but the form receives few real submissions, the
spam layers may not be catching as many bots as expected — see below.

---

## BotID over-blocking (real users blocked)

**Symptoms.** Real visitors reporting "I tried to submit and got an error /
my contact info got opened in my mail client instead." Function logs show
`[contact] BotID classified request as a bot` for sessions that look human
(real referrer, sensible message body, etc.).

**Background.** BotID Basic (the default, free tier) is low-false-positive but
not zero — privacy browsers, aggressive ad-blockers, or unusual fingerprints
can occasionally trigger it. The client already maps a 403 to the `mailto:`
fallback, so a blocked user isn't dead-ended; they're routed to their mail
client. That's a UX bump, not a missed lead.

**If false-positive rate is unacceptable:**

1. **Vercel dashboard → Firewall → Rules → BotID.** Inspect blocked sessions
   (Firewall observability tab). Common patterns: corporate proxy IPs, specific
   user-agent strings.
2. **Add a bypass rule** in the Vercel WAF for the offending pattern. See
   [Vercel BotID bypass docs](https://vercel.com/docs/botid#bypassing-botid).
3. **If a known business client's IP is blocked**, the dashboard supports
   IP-based bypass.

**Don't disable BotID outright** — the layers above it (honeypot, timing,
content heuristics) catch naive bots but BotID is the only defense against
real headless-browser automation. Tuning beats disabling.

---

## BotID under-blocking (spam getting through)

**Symptoms.** Firm reports "we're getting a lot of garbage contact form
submissions." Function logs show successful sends with spammy bodies (lots
of links, casino/pharma keywords, gibberish names).

**Order of escalation:**

1. **Tighten content heuristics.** Edit `src/lib/forms/spam.ts`:
   - Lower `URL_FLAG_THRESHOLD` from 3 → 2 if link-spam dominates
   - Lower `URL_DROP_THRESHOLD` from 5 → 3 to hard-drop more aggressively
   - Add to the `SPAM_KEYWORDS` list — case-insensitive substrings
2. **Enable BotID Deep Analysis.** Vercel dashboard → Firewall → Rules → BotID
   → toggle Deep Analysis. **Pro/Enterprise plan only.** Costs $1/1000 calls
   but materially raises the bar against sophisticated automation. Read the
   [pricing note](https://vercel.com/docs/botid#pricing) first.
3. **Per-incident**: a single coordinated wave can also be blocked by a
   one-off Vercel WAF rule (IP / ASN / user-agent). Vercel dashboard → Firewall
   → Custom rules.

**What not to do.** Don't add a CAPTCHA in front of the form to "see for
yourself" if BotID is failing. CAPTCHAs are a regression in UX and they fight
each other with BotID's invisible challenge. If you suspect a layer isn't
firing, check function logs first.

---

## CSP violations break a new third-party integration

**Symptoms.** A team adds Calendly / HubSpot / Stripe / Meta Pixel / etc. and
the live site shows nothing where the embed should be, with browser console
errors like `Refused to load the script 'https://…'` or `Refused to frame
'https://…'`.

**Fix:**

1. **Flip CSP to report-only** so you can see violations without blocking
   content. Edit `site.config.ts`:
   ```ts
   csp: { mode: 'report-only', extraOrigins: [...] }
   ```
   Deploy. Load the page. Browser console will now log violations under
   `[Report Only]`, the embed will work.
2. **Read the violation messages** — each one names the directive (`script-src`,
   `connect-src`, `frame-src`, etc.) and the origin.
3. **Add the origin(s)** to `csp.extraOrigins`. The helper applies the entry
   to `script-src`, `style-src`, `connect-src`, `img-src`, and `frame-src` in
   one go — covering most third parties without per-directive surgery.
4. **Reload.** Confirm zero violations in the console.
5. **Flip CSP back to enforce**:
   ```ts
   csp: { mode: 'enforce', extraOrigins: [...] }
   ```
6. **If violations remain after `extraOrigins`** (e.g. they're in a directive
   the helper doesn't cover, like `worker-src` or `media-src`), edit
   `buildCsp()` in `next.config.ts` directly. Rare.

> If the third party itself is the wrong choice (legacy iframe-based widget,
> requires `'unsafe-eval'`, etc.), consider an alternative — adding
> `'unsafe-eval'` to script-src would weaken CSP across the whole site.

---

## CSP violations in production after a template upgrade

**Symptoms.** The site was fine yesterday; today, after pulling a template
sync, browser console shows CSP violations for things that should be allowed.

**Diagnose:**

1. **Check the new `buildCsp()` in `next.config.ts`.** Recent template changes
   sometimes tighten directives (e.g. dropping `'unsafe-eval'` outside dev).
   Compare to the previous version with `git log -p next.config.ts`.
2. **Confirm `siteConfig.csp.extraOrigins`** still lists everything the client
   adds (Calendly, Stripe, GA4 — though GA4/GTM origins are in the default
   directive set).
3. **Set `csp.mode: 'report-only'` temporarily** to surface every violation.

This is the most common "template upgrade broke something" scenario — covered
in [`docs/upgrading.md`](./upgrading.md).

---

## Open redirect or zip-slip alert

**Background.** Two specific exploits were already patched in the audit pass:

- `next.config.ts` reads `content/redirects.csv` and refuses any destination
  that doesn't start with `/`. A row like `/old,https://evil.com` is logged and
  skipped, not registered.
- `scripts/unpack-deliverable.ts` validates every zip entry path against the
  repo root and refuses any entry that resolves outside.

If you ever see a security-tool alert about these patterns, **first verify**
the defenses are still in place (recent template merges have occasionally
required re-applying these checks if a client clone wasn't on the current
template). The `readRedirectsCsv` function and the zip-slip guard in
`unpack-deliverable.ts` are the lines to check.

If an alert fires and the defenses are intact, the alert is almost certainly
a false positive from the alerting tool's pattern matcher — but worth a
manual diff against template main to confirm.

---

## Vercel deploy build fails on validate

**Symptoms.** PR or push fails CI with `npm run validate` failing.

**Most common causes:**

1. **A page's frontmatter is missing or malformed.** Validate emits the page
   filename + the Zod error message. Fix the frontmatter, push again.
2. **An image referenced in `content/pages/*.md` doesn't exist** in
   `public/content-assets/`. Validate's image-resolve check catches this with
   a warning (not an error) — but a *missing* required file (e.g. `home.md`)
   does fail the build.
3. **Filename round-trip mismatch.** Rare — usually means someone hand-edited
   a filename to include characters the URL converter doesn't handle (triple
   dashes, leading/trailing `--`, etc.).

Fix and re-push. The error message in CI tells you the specific page.

---

## Stale content after a deploy

**Symptoms.** A page was updated, deploy succeeded, but live site still shows
the old content.

**Diagnose:**

1. **Vercel deploy log** — confirm the build actually rebuilt the page. The
   route table at the end shows `◐ Partial Prerender` for most pages; PPR
   pages prerender at build, so a fresh build *should* have new content.
2. **CDN edge cache** — Vercel caches aggressively. The dashboard's "Redeploy"
   button has a "Use existing build cache" option; uncheck it for a clean
   rebuild. Or trigger a fresh deploy from a clean commit.
3. **Browser cache** — incognito or `?_v=1` query param to bypass.
4. **`'use cache'` boundaries** — the data loaders for brand/nav/theme/page
   are all `cacheLife('max')`, which means **they're treated as build-time
   data and won't refresh until the next build**. A redeploy is mandatory
   after content changes; there is no `revalidate` path.

Most often: it's the browser cache. Second-most-often: a Vercel deploy used
the existing build cache instead of rebuilding.

---

## When in doubt

If you're not sure what fired or why, the path is always:

1. **Function logs** (Vercel dashboard → Logs) — the `[contact]`
   and `[next.config]` log prefixes make filtering easy.
2. **Browser console + Network tab** for client-side symptoms.
3. **`git log -p` of recent template changes** if the timing correlates with
   a sync.
4. **`docs/architecture.md`** for the design rationale behind each defense.
