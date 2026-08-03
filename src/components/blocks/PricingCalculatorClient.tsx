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
// calculator auto-matches each client's generated brand. No hardcoded colors
// (the white toggle/slider knob is an intentional neutral, like Section's
// text-white on action backgrounds).

function useCurrency(currency: string) {
  return useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    } catch {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    }
  }, [currency])
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
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

// Non-interactive toggle visual — the parent card/row owns the click, so this
// is a <span> (never a nested button) that just reflects state.
function ToggleVisual({ on }: { on: boolean }) {
  return (
    <span
      className={[
        'relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full transition-colors duration-200',
        on ? 'bg-primary' : 'bg-foreground/15',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
          on ? 'translate-x-[26px]' : 'translate-x-1',
        ].join(' ')}
      />
    </span>
  )
}

// A range slider that snaps across discrete tiers; the native input drives
// keyboard + drag while the custom track/thumb render the brand look.
function TierSlider({
  tiers,
  valueId,
  onChange,
}: {
  tiers: { id: string; label: string }[]
  valueId: string | null
  onChange: (id: string) => void
}) {
  const idx = Math.max(0, tiers.findIndex(t => t.id === valueId))
  const n = tiers.length
  const pct = n > 1 ? (idx / (n - 1)) * 100 : 0
  const current = tiers[idx]

  return (
    <div>
      <div className="mb-4">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 font-heading text-sm font-semibold text-primary">
          {current?.label}
        </span>
      </div>
      <div className="relative flex h-6 items-center">
        <div className="absolute inset-x-0 h-2 rounded-full bg-foreground/10" />
        <div className="absolute h-2 rounded-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
        {tiers.map((t, i) => (
          <span
            key={t.id}
            aria-hidden
            className="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-card bg-foreground/25"
            style={{ left: `${n > 1 ? (i / (n - 1)) * 100 : 0}%` }}
          />
        ))}
        <div
          aria-hidden
          className="absolute h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-primary bg-white shadow-[var(--shadow-card)] transition-[left] duration-150"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={Math.max(0, n - 1)}
          step={1}
          value={idx}
          onChange={e => { const t = tiers[Number(e.target.value)]; if (t) onChange(t.id) }}
          aria-label="Business size"
          aria-valuetext={current?.label}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="mt-2.5 flex justify-between text-xs font-medium text-foreground/50">
        <span>Smaller</span>
        <span>Larger</span>
      </div>
    </div>
  )
}

function SegmentedControl({
  options,
  valueId,
  onChange,
}: {
  options: { id: string; label: string }[]
  valueId: string | null
  onChange: (id: string) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1">
      {options.map(o => {
        const on = valueId === o.id
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={[
              'rounded-full px-5 py-2 text-sm font-body font-semibold transition-all duration-150 cursor-pointer',
              on ? 'bg-primary text-primary-foreground shadow-[var(--shadow-card)]' : 'text-foreground/70 hover:text-foreground',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground text-xl leading-none transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground cursor-pointer'
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Decrease ${label}`} className={btn} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>−</button>
      <input
        type="number"
        min={0}
        aria-label={label}
        value={value}
        onChange={e => onChange(Math.max(0, Math.floor(Number(e.target.value)) || 0))}
        className="w-12 rounded-lg border border-border bg-background py-1.5 text-center font-heading font-semibold text-foreground focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" aria-label={`Increase ${label}`} className={btn} onClick={() => onChange(value + 1)}>+</button>
    </div>
  )
}

export function PricingCalculatorClient({ config }: { config: PricingCalculatorConfig }) {
  const [selection, setSelection] = useState<PricingSelection>(() => initialSelection(config))
  const fmt = useCurrency(config.currency)
  const estimate = useMemo(() => computeEstimate(config, selection), [config, selection])

  const anyService = Object.values(selection.services).some(Boolean)
  const period = config.billingPeriod === 'year' ? 'yr' : 'mo'
  const periodLong = config.billingPeriod === 'year' ? 'per year' : 'per month'

  const toggleService = (id: string) => setSelection(s => ({ ...s, services: { ...s.services, [id]: !s.services[id] } }))
  const setAddOn = (id: string, value: number) => setSelection(s => ({ ...s, addOns: { ...s.addOns, [id]: value } }))

  let step = 0
  const estimateLabel = anyService ? `${fmt.format(estimate.low)}–${fmt.format(estimate.high)}` : null
  const ctaHref = estimateLabel
    ? `${config.cta.url}${config.cta.url.includes('?') ? '&' : '?'}estimate=${encodeURIComponent(`${estimateLabel}/${period}`)}`
    : config.cta.url

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-10">
      {/* Inputs */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="space-y-10">
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
                      'group relative flex flex-col rounded-xl border p-5 text-left transition-all duration-200 cursor-pointer',
                      on
                        ? 'border-primary bg-primary/[0.06] shadow-[var(--shadow-card)]'
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-[var(--shadow-card-hover)]',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-heading font-semibold leading-tight text-foreground">{line.label}</span>
                      <ToggleVisual on={on} />
                    </div>
                    {line.description && <p className="mt-2 text-sm leading-snug text-foreground/60">{line.description}</p>}
                    <span className="mt-3 inline-flex w-fit items-center rounded-full bg-foreground/[0.05] px-2.5 py-1 text-xs font-semibold text-foreground/80">
                      from {fmt.format(line.baseRate)}/{period}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Size (slider) */}
          {config.sizeTiers.length > 0 && (
            <fieldset>
              <StepHeading n={(step += 1)}>How big is your business?</StepHeading>
              <TierSlider
                tiers={config.sizeTiers}
                valueId={selection.sizeTierId}
                onChange={id => setSelection(s => ({ ...s, sizeTierId: id }))}
              />
            </fieldset>
          )}

          {/* Complexity (segmented) */}
          {config.complexityLevels.length > 0 && (
            <fieldset>
              <StepHeading n={(step += 1)}>How complex are your needs?</StepHeading>
              <SegmentedControl
                options={config.complexityLevels}
                valueId={selection.complexityId}
                onChange={id => setSelection(s => ({ ...s, complexityId: id }))}
              />
            </fieldset>
          )}

          {/* Add-ons */}
          {config.addOns.length > 0 && (
            <fieldset>
              <StepHeading n={(step += 1)}>Anything else?</StepHeading>
              <div className="space-y-2.5">
                {config.addOns.map(addOn => {
                  if (addOn.type === 'flat') {
                    const on = !!selection.addOns[addOn.id]
                    return (
                      <button
                        key={addOn.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setAddOn(addOn.id, on ? 0 : 1)}
                        className={[
                          'flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors cursor-pointer',
                          on ? 'border-primary bg-primary/[0.05]' : 'border-border bg-card hover:border-primary/50',
                        ].join(' ')}
                      >
                        <span
                          aria-hidden
                          className={[
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                            on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent',
                          ].join(' ')}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-body font-medium text-foreground">{addOn.label}</span>
                          <span className="ml-2 text-xs text-foreground/50">{fmt.format(addOn.flatRate)}/{period}</span>
                        </span>
                      </button>
                    )
                  }
                  return (
                    <div key={addOn.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-body font-medium text-foreground">{addOn.label}</p>
                        <p className="text-xs text-foreground/50">{fmt.format(addOn.unitRate)} per {addOn.unitLabel}/{period}</p>
                      </div>
                      <Stepper value={selection.addOns[addOn.id] || 0} onChange={v => setAddOn(addOn.id, v)} label={`${addOn.label} — number of ${addOn.unitLabel}s`} />
                    </div>
                  )
                })}
              </div>
            </fieldset>
          )}
        </div>
      </div>

      {/* Estimate */}
      <aside className="lg:sticky lg:top-24 h-fit space-y-4">
        <div className="overflow-hidden rounded-2xl bg-primary p-7 text-primary-foreground shadow-[var(--shadow-lg)]">
          <p className="text-xs font-body font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">Estimated cost</p>
          {estimateLabel ? (
            <p className="mt-2 font-heading text-4xl font-bold leading-none text-[color:var(--color-action,theme(colors.cyan.400))]">
              ~{estimateLabel}
              <span className="ml-1 align-baseline text-lg font-semibold text-primary-foreground/70">/{period}</span>
            </p>
          ) : (
            <p className="mt-2 font-heading text-2xl font-bold leading-tight text-primary-foreground">Select a service</p>
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
            <p className="text-xs font-body font-semibold uppercase tracking-[0.14em] text-muted-foreground">{config.implementationFee.label}</p>
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
