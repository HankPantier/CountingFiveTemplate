'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, Mail, Phone } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { BookingEmbed } from '@/components/blocks/BookingEmbed'
import { useContactSubmit } from '@/lib/forms/use-contact-submit'

export type ContactDrawerConfig = {
  firmName: string
  phone?: string
  email?: string
  booking: { provider: 'calendly' | 'iframe' | 'none'; url: string }
}

type DrawerView = 'call' | 'message'

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`
}

export function ContactDrawer({
  open,
  view,
  onViewChange,
  onOpenChange,
  config,
}: {
  open: boolean
  view: DrawerView
  onViewChange: (v: DrawerView) => void
  onOpenChange: (o: boolean) => void
  config: ContactDrawerConfig
}) {
  const hasBooking = config.booking.provider !== 'none' && !!config.booking.url

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetTitle className="sr-only">Contact {config.firmName}</SheetTitle>

        {/* Header: phone (click-to-call) on the left; Sheet's close X sits top-right */}
        <div className="flex items-center gap-2 border-b border-border px-6 py-4 pr-14">
          {config.phone ? (
            <a
              href={telHref(config.phone)}
              className="flex items-center gap-2 font-heading text-lg font-bold text-primary transition-opacity hover:opacity-80"
            >
              <Phone className="h-5 w-5" />
              {config.phone}
            </a>
          ) : (
            <span className="font-heading text-lg font-bold text-foreground">{config.firmName}</span>
          )}
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Contact options" className="grid grid-cols-2 border-b border-border">
          <Tab active={view === 'call'} onClick={() => onViewChange('call')} icon={<CalendarClock className="h-4 w-4" />}>
            Book a Call
          </Tab>
          <Tab active={view === 'message'} onClick={() => onViewChange('message')} icon={<Mail className="h-4 w-4" />}>
            Send a Message
          </Tab>
        </div>

        <div className="flex-1 px-6 py-7">
          <header className="mb-6 text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
              {view === 'call' ? 'Reserve a time to chat' : 'Send us a message'}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {view === 'call'
                ? 'Schedule a complimentary consultation with our team at a time that works for you.'
                : "Tell us what you need and we'll get back to you by email."}
            </p>
          </header>

          {view === 'call' ? <CallView config={config} hasBooking={hasBooking} /> : <DrawerContactForm firmName={config.firmName} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Tab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 border-b-2 px-4 py-4 font-heading text-sm font-semibold transition-colors',
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function CallView({ config, hasBooking }: { config: ContactDrawerConfig; hasBooking: boolean }) {
  if (hasBooking) {
    return (
      <div className="-mx-2">
        <BookingEmbed provider={config.booking.provider} url={config.booking.url} height={620} />
      </div>
    )
  }
  if (config.phone) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Call us at</p>
        <a href={telHref(config.phone)} className="mt-1 block font-heading text-2xl font-bold text-primary">
          {config.phone}
        </a>
        <Button asChild variant="cta" size="lg" className="mt-4 w-full">
          <a href={telHref(config.phone)}>Call now</a>
        </Button>
      </div>
    )
  }
  return <p className="text-center text-sm text-muted-foreground">No scheduling option is configured yet.</p>
}

const DEFAULT_SUCCESS = "Thank you! We'll be in touch shortly."

function DrawerContactForm({ firmName }: { firmName: string }) {
  const { submitting, submitted, generalError, fieldErrors, submit } = useContactSubmit()
  const [honeypot, setHoneypot] = useState('')
  const mountedAt = useRef(0)
  useEffect(() => {
    mountedAt.current = Date.now()
  }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    for (const [k, v] of fd.entries()) {
      if (k === 'website') continue
      fields[k] = typeof v === 'string' ? v : ''
    }
    await submit('contact', fields, { hp: honeypot, t: mountedAt.current })
  }

  if (submitted) {
    return (
      <div role="status" aria-live="polite" className="rounded-lg border border-border bg-muted/40 p-6 text-center">
        <p className="font-medium text-foreground">{DEFAULT_SUCCESS}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label={`Contact ${firmName}`} noValidate>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={e => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-px w-px opacity-0"
        aria-hidden="true"
      />
      <Field id="cd-name" name="name" label="Name" required autoComplete="name" placeholder="Jane Smith" error={fieldErrors.name} disabled={submitting} />
      <Field id="cd-email" name="email" type="email" label="Email" required autoComplete="email" inputMode="email" placeholder="jane@example.com" error={fieldErrors.email} disabled={submitting} />
      <Field id="cd-phone" name="phone" type="tel" label="Phone" autoComplete="tel" placeholder="(555) 000-0000" error={fieldErrors.phone} disabled={submitting} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cd-message">Message *</Label>
        <Textarea
          id="cd-message"
          name="message"
          rows={4}
          required
          aria-required="true"
          aria-invalid={!!fieldErrors.message || undefined}
          aria-describedby={fieldErrors.message ? 'cd-message-error' : undefined}
          placeholder="How can we help?"
          disabled={submitting}
        />
        {fieldErrors.message && (
          <p id="cd-message-error" className="text-xs text-destructive" role="alert">
            {fieldErrors.message}
          </p>
        )}
      </div>
      <Button type="submit" variant="cta" size="lg" disabled={submitting} className="w-full">
        {submitting ? 'Sending…' : 'Send message'}
      </Button>
      {generalError && (
        <p className="text-sm text-destructive" role="alert">
          {generalError}
        </p>
      )}
    </form>
  )
}

function Field({
  id,
  name,
  label,
  type = 'text',
  required,
  autoComplete,
  inputMode,
  placeholder,
  error,
  disabled,
}: {
  id: string
  name: string
  label: string
  type?: string
  required?: boolean
  autoComplete?: string
  inputMode?: 'email' | 'tel' | 'text' | 'numeric'
  placeholder?: string
  error?: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && ' *'}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        aria-required={required || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        disabled={disabled}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
