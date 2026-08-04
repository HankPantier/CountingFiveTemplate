import { NextResponse } from 'next/server'
import { checkBotId } from 'botid/server'
import { Resend } from 'resend'
import { getBrandConfig } from '@/lib/brand/get-brand-config'
import { siteConfig } from '../../../../site.config'
import {
  contactFormSchema,
  quoteFormSchema,
  newsletterFormSchema,
  buildCustomFormSchema,
} from '@/lib/forms/schemas'
import {
  isHoneypotFilled,
  isSubmittedTooFast,
  scoreContent,
} from '@/lib/forms/spam'
import { buildEmailSubject, buildEmailBody } from '@/lib/forms/email-template'
import type { FormSubmitResponse, FormSubmitPayload, FieldDef, FormVariant, ContactContext } from '@/lib/forms/types'

// `context` is attacker-controllable (client sends it) and only ever lands in
// the plain-text email body. Bound it hard and strip control chars so it can
// never bloat the email or inject structure. Returns undefined when nothing
// usable remains.
const MAX_CONTEXT_LINES = 15
const MAX_CONTEXT_FIELD = 200

function sanitizeContext(raw: unknown): ContactContext | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as { title?: unknown; lines?: unknown }
  if (!Array.isArray(obj.lines)) return undefined
  const clean = (s: unknown) =>
    (typeof s === 'string' ? s : '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_CONTEXT_FIELD)
  const lines = obj.lines
    .slice(0, MAX_CONTEXT_LINES)
    .map((l) => {
      const item = (l ?? {}) as { label?: unknown; value?: unknown }
      return { label: clean(item.label), value: clean(item.value) }
    })
    .filter((l) => l.label && l.value)
  if (lines.length === 0) return undefined
  return { title: clean(obj.title) || 'Details', lines }
}

// Resend's SDK uses node fetch under the hood — Edge runtime won't work.
// Under cacheComponents: true the runtime is implicit (Node is default);
// an explicit `runtime` export is rejected at build time.

// Form schemas top out around 6 KB of legitimate input. 64 KB leaves headroom
// for the largest custom-form payload while rejecting abuse early.
const MAX_BODY_BYTES = 64 * 1024

/**
 * Form submission endpoint. Validates the request body with the same Zod
 * schema the client uses, then emails the firm via Resend. The recipient
 * is brand.contact.email (server-side from content/brand.json — visitors
 * never see the firm's email address in network requests, only in the
 * brand-data-driven contact-info block).
 *
 * Returns:
 *   200 { ok: true }                                 — sent
 *   400 { ok: false, error, fieldErrors }            — schema failed
 *   500 { ok: false, error }                         — unexpected
 *   502 { ok: false, error }                         — Resend rejected
 *   503 { ok: false, error: 'email not configured' } — RESEND_API_KEY missing
 *
 * The 503 path is the signal for the client to fall back to mailto:
 * — the form stays functional on deploys where Resend isn't wired yet.
 */

function jsonError(
  status: number,
  error: string,
  fieldErrors?: Record<string, string>
): NextResponse<FormSubmitResponse> {
  return NextResponse.json({ ok: false, error, fieldErrors }, { status })
}

/**
 * Covert success: returned when a spam heuristic (honeypot / timing / link
 * flood) trips. We respond exactly like a real success but send no email, so
 * the spammer gets no signal that the submission was dropped.
 */
function covertOk(): NextResponse<FormSubmitResponse> {
  return NextResponse.json({ ok: true })
}

function flattenFieldErrors(formatted: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(formatted)) {
    if (v && v.length > 0) out[k] = v[0]
  }
  return out
}

export async function POST(req: Request): Promise<NextResponse<FormSubmitResponse>> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Signal to the client that email isn't configured. The Form component
    // will fall back to a mailto: link — the form is still usable.
    return jsonError(503, 'Email service not configured')
  }

  const declaredLength = Number(req.headers.get('content-length') ?? '0')
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonError(413, 'Payload too large')
  }

  let payload: FormSubmitPayload
  try {
    payload = (await req.json()) as FormSubmitPayload
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }

  const { variant, fields, fieldDefs } = payload ?? {}
  if (!variant || typeof fields !== 'object' || fields === null) {
    return jsonError(400, 'Missing variant or fields')
  }
  // Non-field recap (e.g. pricing-calculator selections). Never enters `fields`
  // / Zod / the spam scorer — appended to the email body only, sanitized.
  const context = sanitizeContext((payload as { context?: unknown } | null)?.context)

  // Anti-spam layers 1 + 2 (free, local): honeypot + timing trap. A real
  // browser leaves the honeypot empty and takes longer than MIN_SUBMIT_MS to
  // fill the form. On a trip we return a covert success (no email) rather than
  // an error, so the bot gets nothing to adapt against.
  // Check both vectors: our client's top-level `hp`, and a `website` key inside
  // `fields` (the hidden input's name) that a form-scraping bot would fill. Our
  // real client strips `website` from `fields`, so its presence is itself a tell.
  const websiteField = (fields as Record<string, unknown>).website
  if (
    isHoneypotFilled(payload.hp) ||
    isHoneypotFilled(typeof websiteField === 'string' ? websiteField : undefined)
  ) {
    console.warn('[contact] Honeypot tripped; dropping submission')
    return covertOk()
  }
  if (isSubmittedTooFast(payload.t, Date.now())) {
    console.warn('[contact] Submission faster than a human; dropping')
    return covertOk()
  }

  // Pick the right schema for the variant
  let parseResult: { success: true; data: Record<string, unknown> } | { success: false; fieldErrors: Record<string, string> }
  if (variant === 'custom') {
    if (!Array.isArray(fieldDefs) || fieldDefs.length === 0) {
      return jsonError(400, 'Missing fieldDefs for custom variant')
    }
    const schema = buildCustomFormSchema(fieldDefs as FieldDef[])
    const r = schema.safeParse(fields)
    parseResult = r.success
      ? { success: true, data: r.data as Record<string, unknown> }
      : { success: false, fieldErrors: flattenFieldErrors(r.error.flatten().fieldErrors) }
  } else if (variant === 'contact' || variant === 'quote' || variant === 'newsletter') {
    const schema =
      variant === 'contact'
        ? contactFormSchema
        : variant === 'quote'
        ? quoteFormSchema
        : newsletterFormSchema
    const r = schema.safeParse(fields)
    parseResult = r.success
      ? { success: true, data: r.data as Record<string, unknown> }
      : { success: false, fieldErrors: flattenFieldErrors(r.error.flatten().fieldErrors) }
  } else {
    console.error('[contact] Unknown form variant:', variant)
    return jsonError(400, 'Invalid request')
  }

  if (!parseResult.success) {
    return jsonError(400, 'Validation failed', parseResult.fieldErrors)
  }

  const brand = await getBrandConfig()
  // Prefer the per-client override in site.config.ts; fall back to the
  // firm's public contact address in brand.json.
  const recipient = siteConfig.forms.toEmail || brand.contact.email
  if (!recipient) {
    return jsonError(500, 'Firm email not configured (siteConfig.forms.toEmail or brand.contact.email)')
  }

  const validated = parseResult.data
  const submitterName = typeof validated.name === 'string' ? validated.name : undefined

  // Anti-spam layer 3 (free, local): content heuristics. A link flood is
  // hard-dropped covertly; anything else suspicious is flagged but still
  // delivered (subject prefix + body note) so the firm never loses a real lead
  // to a false positive.
  const content = scoreContent(validated)
  if (content.drop) {
    console.warn('[contact] Content hard-drop:', content.reasons.join('; '))
    return covertOk()
  }

  // Coerce values to strings for the email body
  const stringFields: Record<string, string> = {}
  for (const [k, v] of Object.entries(validated)) {
    if (v === undefined || v === null) continue
    stringFields[k] = typeof v === 'string' ? v : String(v)
  }

  const baseSubject = buildEmailSubject(variant as FormVariant, brand.firm.name, submitterName)
  const subject = content.flag ? `[likely spam] ${baseSubject}` : baseSubject
  let text = buildEmailBody(stringFields, variant === 'custom' ? (fieldDefs as FieldDef[]) : undefined, context)
  if (content.flag) {
    text = `⚠ Flagged by spam heuristics: ${content.reasons.join('; ')}\n\n${text}`
  }
  // Zod's .email() accepts the address shape but does not reject CR/LF, which
  // an attacker could use to inject mail headers (Bcc:, Subject:) downstream.
  // Strip them defensively before handing off to Resend.
  const replyTo =
    typeof validated.email === 'string'
      ? validated.email.replace(/[\r\n]+/g, '').trim()
      : undefined

  // Anti-spam layer 4 (strongest): Vercel BotID invisible challenge. Runs last
  // so the free local checks reject obvious spam before any (potentially
  // billable) Deep Analysis call. Inert in local dev / off-Vercel (isBot:false).
  const verification = await checkBotId()
  if (verification.isBot) {
    console.warn('[contact] BotID classified request as a bot')
    return jsonError(403, 'Request blocked')
  }

  const resend = new Resend(apiKey)
  try {
    const result = await resend.emails.send({
      from: siteConfig.forms.fromEmail || 'onboarding@resend.dev',
      to: recipient,
      subject,
      text,
      ...(replyTo ? { replyTo } : {}),
    })
    if (result.error) {
      console.error('[contact] Resend rejected:', result.error)
      return jsonError(502, 'Email service rejected the message')
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact] Unexpected error sending email:', err)
    return jsonError(500, 'Unexpected error sending email')
  }
}
