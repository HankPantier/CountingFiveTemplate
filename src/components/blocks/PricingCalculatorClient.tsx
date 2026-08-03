'use client'

import { useMemo, useState } from 'react'
import {
  computeEstimate,
  initialSelection,
  type PricingCalculatorConfig,
  type PricingSelection,
} from '@/lib/content/pricing-calculator-types'

// All styling uses theme tokens (bg-primary, bg-card, text-foreground,
// var(--color-action), the brand-tinted --shadow-* set, rounded-*) so the
// calculator auto-matches each client's generated brand. No hardcoded colors.

function useCurrency(currency: string) {
  return useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      })
    } catch {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    }
  }, [currency])
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StepHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">
        {n}
      </span>
      <h3 className="font-heading text-lg font-semibold text-foreground">{children}</h3>
    </div>
  )
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer',
        on ? 'bg-primary' : 'bg-foreground/15',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
          on ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const btn =
    'flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground text-lg leading-none transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground cursor-pointer'
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Decrease ${label}`} className={btn} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
        −
      </button>
      <input
        type="number"
        min={0}
        aria-label={label}
        value={value}
        onChange={e => onChange(Math.max(0, Math.floor(Number(e.target.value)) || 0))}
        className="w-12 rounded-lg border border-border bg-background px-0 py-1.5 text-center font-heading font-semibold text-foreground focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" aria-label={`Increase ${label}`} className={btn} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

const segBtn = 'rounded-full border px-5 py-2.5 text-sm font-body font-medium transition-all cursor-pointer'

export function PricingCalculatorClient({ config }: { config: PricingCalculatorConfig }) {
  const [selection, setSelection] = useState<PricingSelection>(() => initialSelection(config))
  const fmt = useCurrency(config.currency)
  const estimate = useMemo(() => computeEstimate(config, selection), [config, selection])

  const anyService = Object.values(selection.services).some(Boolean)
  const period = config.billingPeriod === 'year' ? 'yr' : 'mo'
  const periodLong = config.billingPeriod === 'year' ? 'per year' : 'per month'

  function toggleService(id: string) {
    setSelection(s => ({ ...s, services: { ...s.services, [id]: !s.services[id] } }))
  }
  function setSize(id: string) {
    setSelection(s => ({ ...s, sizeTierId: id }))
  }
  function setComplexity(id: string) {
    setSelection(s => ({ ...s, complexityId: id }))
  }
  function setAddOn(id: string, value: number) {
    setSelection(s => ({ ...s, addOns: { ...s.addOns, [id]: value } }))
  }

  // Numbered steps only for the sections that exist.
  let step = 0
  const estimateLabel = anyService ? `${fmt.format(estimate.low)}–${fmt.format(estimate.high)}` : null
  const ctaHref = estimateLabel
    ? `${config.cta.url}${config.cta.url.includes('?') ? '&' : '?'}estimate=${encodeURIComponent(`${estimateLabel}/${period}`)}`
    : config.cta.url

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-10">
      {/* Inputs */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="space-y-9">
          {/* Services */}
          <fieldset>
            <StepHeading n={(step += 1)}>Which services do you need?</StepHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              {config.serviceLines.map(line => {
                const on = !!selection.services[line.id]
                return (
                  <button
                    key={line.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleService(line.id)}
                    className={[
                      'group flex flex-col rounded-xl border p-5 text-left transition-all cursor-pointer',
                      on
                        ? 'border-primary bg-primary/[0.06] shadow-[var(--shadow-card)]'
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-[var(--shadow-card-hover)]',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-heading font-semibold text-foreground">{line.label}</span>
                      <span
                        aria-hidden
                        className={[
                          'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent group-hover:border-primary/50',
                        ].join(' ')}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    {line.description && (
                      <p className="mt-1.5 text-sm leading-snug text-foreground/60">{line.description}</p>
                    )}
                    <span className="mt-3 inline-flex w-fit items-center rounded-full bg-foreground/[0.04] px-2.5 py-1 text-xs font-semibold text-foreground/80">
                      from {fmt.format(line.baseRate)}/{period}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Size */}
          {config.sizeTiers.length > 0 && (
            <fieldset>
              <StepHeading n={(step += 1)}>How big is your business?</StepHeading>
              <div className="flex flex-wrap gap-2.5">
                {config.sizeTiers.map(tier => {
                  const on = selection.sizeTierId === tier.id
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSize(tier.id)}
                      className={[
                        segBtn,
                        on
                          ? 'border-primary bg-primary text-primary-foreground shadow-[var(--shadow-card)]'
                          : 'border-border bg-card text-foreground hover:border-primary/50',
                      ].join(' ')}
                    >
                      {tier.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          {/* Complexity */}
          {config.complexityLevels.length > 0 && (
            <fieldset>
              <StepHeading n={(step += 1)}>How complex are your needs?</StepHeading>
              <div className="flex flex-wrap gap-2.5">
                {config.complexityLevels.map(level => {
                  const on = selection.complexityId === level.id
                  return (
                    <button
                      key={level.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setComplexity(level.id)}
                      className={[
                        segBtn,
                        on
                          ? 'border-primary bg-primary text-primary-foreground shadow-[var(--shadow-card)]'
                          : 'border-border bg-card text-foreground hover:border-primary/50',
                      ].join(' ')}
                    >
                      {level.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          {/* Add-ons */}
          {config.addOns.length > 0 && (
            <fieldset>
              <StepHeading n={(step += 1)}>Anything else?</StepHeading>
              <div className="space-y-2.5">
                {config.addOns.map(addOn => (
                  <div
                    key={addOn.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-body font-medium text-foreground">{addOn.label}</p>
                      <p className="text-xs text-foreground/50">
                        {addOn.type === 'flat'
                          ? `${fmt.format(addOn.flatRate)}/${period}`
                          : `${fmt.format(addOn.unitRate)} per ${addOn.unitLabel}/${period}`}
                      </p>
                    </div>
                    {addOn.type === 'flat' ? (
                      <Switch
                        on={!!selection.addOns[addOn.id]}
                        onClick={() => setAddOn(addOn.id, selection.addOns[addOn.id] ? 0 : 1)}
                        label={addOn.label}
                      />
                    ) : (
                      <Stepper
                        value={selection.addOns[addOn.id] || 0}
                        onChange={v => setAddOn(addOn.id, v)}
                        label={`${addOn.label} — number of ${addOn.unitLabel}s`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </div>

      {/* Estimate */}
      <aside className="lg:sticky lg:top-24 h-fit space-y-4">
        <div className="overflow-hidden rounded-2xl bg-primary p-7 text-primary-foreground shadow-[var(--shadow-lg)]">
          <p className="text-xs font-body font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
            Estimated cost
          </p>
          {estimateLabel ? (
            <p className="mt-2 font-heading text-4xl font-bold leading-none text-[color:var(--color-action,theme(colors.cyan.400))]">
              ~{estimateLabel}
              <span className="ml-1 align-baseline text-lg font-semibold text-primary-foreground/70">/{period}</span>
            </p>
          ) : (
            <p className="mt-2 font-heading text-2xl font-bold leading-tight text-primary-foreground">
              Select a service
            </p>
          )}
          <p className="mt-1 text-sm text-primary-foreground/60">{estimateLabel ? periodLong : 'to see your estimate'}</p>

          <div className="my-5 h-px w-full bg-primary-foreground/15" />

          <p className="text-xs leading-relaxed text-primary-foreground/60">{config.disclaimer}</p>

          <a
            href={ctaHref}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--color-action,theme(colors.cyan.500))] px-6 py-3.5 font-heading font-semibold text-[color:var(--color-action-foreground,#fff)] shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
          >
            {config.cta.label}
          </a>
        </div>

        {config.implementationFee && (
          <div className="rounded-2xl border border-border bg-muted p-6">
            <p className="text-xs font-body font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {config.implementationFee.label}
            </p>
            <p className="mt-1.5 font-heading text-2xl font-bold text-foreground">
              {fmt.format(config.implementationFee.amount)}
              <span className="ml-1 text-sm font-medium text-foreground/50">one-time</span>
            </p>
            {config.implementationFee.weeks && (
              <p className="mt-1 text-sm text-foreground/60">Onboarding takes about {config.implementationFee.weeks} weeks.</p>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
