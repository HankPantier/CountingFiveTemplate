'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CalendarClock, MessageSquare, Phone, ArrowLeft } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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

type DrawerView = 'choose' | 'message' | 'call'

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
  const wide = view === 'call' && hasBooking

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col gap-0 overflow-y-auto p-0 w-full',
          wide ? 'sm:max-w-xl' : 'sm:max-w-md'
        )}
      >
        <SheetHeader className="space-y-1 border-b border-border px-6 pb-4 pt-6 text-left">
          {view !== 'choose' && (
            <button
              type="button"
              onClick={() => onViewChange('choose')}
              className="mb-1 inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
          <SheetTitle className="font-heading text-xl">
            {view === 'message' ? 'Send us a message' : view === 'call' ? 'Book a call' : `Contact ${config.firmName}`}
          </SheetTitle>
          <SheetDescription>
            {view === 'message'
              ? "Tell us what you need and we'll get back to you."
              : view === 'call'
              ? 'Pick a time that works for you.'
              : "We'd love to hear from you. How would you like to connect?"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 px-6 py-6">
          {view === 'choose' && (
            <ChooseView config={config} hasBooking={hasBooking} onSelect={onViewChange} />
          )}
          {view === 'message' && <DrawerContactForm firmName={config.firmName} />}
          {view === 'call' && <CallView config={config} hasBooking={hasBooking} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function OptionCard({
  icon,
  title,
  subtitle,
  onClick,
  href,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-heading font-semibold text-foreground">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </>
  )
  const cls =
    'group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-[var(--shadow-card-hover)]'
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

function ChooseView({
  config,
  hasBooking,
  onSelect,
}: {
  config: ContactDrawerConfig
  hasBooking: boolean
  onSelect: (v: DrawerView) => void
}) {
  // With a booking URL → open the embed view. Without one → click-to-call.
  return (
    <div className="space-y-3">
      {hasBooking ? (
        <OptionCard
          icon={<CalendarClock className="h-5 w-5" />}
          title="Book a call"
          subtitle="Schedule a time on our calendar"
          onClick={() => onSelect('call')}
        />
      ) : config.phone ? (
        <OptionCard
          icon={<Phone className="h-5 w-5" />}
          title="Book a call"
          subtitle={config.phone}
          href={telHref(config.phone)}
        />
      ) : null}
      <OptionCard
        icon={<MessageSquare className="h-5 w-5" />}
        title="Send a message"
        subtitle="We'll reply by email"
        onClick={() => onSelect('message')}
      />
    </div>
  )
}

function CallView({ config, hasBooking }: { config: ContactDrawerConfig; hasBooking: boolean }) {
  if (hasBooking) {
    return (
      <div className="-mx-2">
        <BookingEmbed provider={config.booking.provider} url={config.booking.url} height={640} />
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
  return <p className="text-sm text-muted-foreground">No scheduling option is configured yet.</p>
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
