'use client'

import { useState } from 'react'
import type { FieldDef, FormVariant } from './types'
import { trackLead } from '@/lib/analytics/track-event'
import {
  buildCustomFormSchema,
  contactFormSchema,
  newsletterFormSchema,
  quoteFormSchema,
} from './schemas'
import { siteConfig } from '../../../site.config'

// Shared contact-submission pipeline for every contact surface (the page Form
// block AND the slide-in contact drawer). Owns the anti-spam + validation +
// Resend/mailto-fallback logic so there is a single source of truth. The
// caller owns its own field/honeypot inputs and passes the assembled values in.

type SubmitMeta = { hp: string; t: number; customFields?: FieldDef[] }

function schemaFor(variant: FormVariant, customFields?: FieldDef[]) {
  return variant === 'contact'
    ? contactFormSchema
    : variant === 'quote'
    ? quoteFormSchema
    : variant === 'newsletter'
    ? newsletterFormSchema
    : buildCustomFormSchema(customFields ?? [])
}

function flattenFieldErrors(formatted: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(formatted)) {
    if (v && v.length > 0) out[k] = v[0]
  }
  return out
}

function humanize(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function openMailtoFallback(fields: Record<string, string>, firmName: string, recipient: string) {
  const name = fields.name ?? ''
  const lines = Object.entries(fields)
    .filter(([k, v]) => k !== 'website' && v && v.trim())
    .map(([k, v]) => `${humanize(k)}: ${v}`)
  const subject = encodeURIComponent(`Inquiry to ${firmName} from ${name || 'website visitor'}`)
  const body = encodeURIComponent(lines.join('\n'))
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`
}

export function useContactSubmit() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Returns true on a completed submission (or honeypot short-circuit), false
  // when the caller should stay on the form (validation / recoverable error).
  async function submit(
    variant: FormVariant,
    fields: Record<string, string>,
    meta: SubmitMeta
  ): Promise<boolean> {
    setGeneralError(null)
    setFieldErrors({})

    // Honeypot — silently "succeed" without sending anything.
    if (meta.hp) {
      setSubmitted(true)
      return true
    }

    const parsed = schemaFor(variant, meta.customFields).safeParse(fields)
    if (!parsed.success) {
      setFieldErrors(flattenFieldErrors(parsed.error.flatten().fieldErrors))
      return false
    }

    setSubmitting(true)
    try {
      // External endpoint override — POST there and call it good.
      if (siteConfig.forms.endpoint) {
        const res = await fetch(siteConfig.forms.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        if (!res.ok) throw new Error('Submit failed')
        setSubmitted(true)
        trackLead({ method: 'form_submit', variant })
        return true
      }

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, fields, fieldDefs: meta.customFields, hp: meta.hp, t: meta.t }),
      })

      // 503 → Resend not configured. 403 → BotID blocked. Either way, a real
      // visitor still reaches the firm via mailto; a bot won't drive a client.
      if (res.status === 503 || res.status === 403) {
        const recipient = document.body.dataset.contactEmail ?? ''
        const firmName = document.body.dataset.firmName ?? 'the team'
        openMailtoFallback(fields, firmName, recipient)
        setSubmitted(true)
        trackLead({ method: 'mailto_fallback', variant })
        return true
      }

      let data: { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | null = null
      try {
        data = await res.json()
      } catch {
        setGeneralError('Network error — please try again.')
        return false
      }

      if (data?.ok) {
        setSubmitted(true)
        trackLead({ method: 'form_submit', variant })
        return true
      }
      if (data?.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        setFieldErrors(data.fieldErrors)
        return false
      }
      setGeneralError(data?.error || 'Submission failed')
      return false
    } catch {
      setGeneralError('Something went wrong — please try again.')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, submitted, setSubmitted, generalError, fieldErrors, submit }
}
