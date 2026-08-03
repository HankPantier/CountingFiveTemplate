'use client'

import { useMemo, useState } from 'react'
import {
  computeEstimate,
  initialSelection,
  type PricingCalculatorConfig,
  type PricingSelection,
} from '@/lib/content/pricing-calculator-types'

// All styling uses theme tokens (bg-card, text-foreground, bg-primary,
// var(--color-action), shadow-card, rounded-*) so the calculator auto-matches
// each client's generated brand. No hardcoded colors.

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

const optionBtn =
  'rounded-full border px-4 py-2 text-sm font-body transition-colors cursor-pointer'

export function PricingCalculatorClient({ config }: { config: PricingCalculatorConfig }) {
  const [selection, setSelection] = useState<PricingSelection>(() => initialSelection(config))
  const fmt = useCurrency(config.currency)
  const estimate = useMemo(() => computeEstimate(config, selection), [config, selection])

  const anyService = Object.values(selection.services).some(Boolean)
  const period = config.billingPeriod === 'year' ? 'yr' : 'mo'

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

  const estimateLabel = anyService
    ? `${fmt.format(estimate.low)}–${fmt.format(estimate.high)}/${period}`
    : 'Select services'
  const ctaHref = anyService
    ? `${config.cta.url}${config.cta.url.includes('?') ? '&' : '?'}estimate=${encodeURIComponent(estimateLabel)}`
    : config.cta.url

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Inputs */}
      <div className="space-y-8">
        {/* Services */}
        <fieldset>
          <legend className="font-heading text-lg font-semibold text-foreground mb-3">
            Which services do you need?
          </legend>
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
                    'text-left rounded-lg border p-4 transition-colors cursor-pointer',
                    on
                      ? 'border-primary bg-primary/5 shadow-card'
                      : 'border-border bg-card hover:border-primary/40',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading font-semibold text-foreground">{line.label}</span>
                    <span
                      aria-hidden
                      className={[
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent',
                      ].join(' ')}
                    >
                      ✓
                    </span>
                  </div>
                  {line.description && (
                    <p className="mt-1 text-sm text-foreground/60 leading-snug">{line.description}</p>
                  )}
                  <p className="mt-2 text-sm font-body text-foreground/80">
                    from {fmt.format(line.baseRate)}/{period}
                  </p>
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Size */}
        {config.sizeTiers.length > 0 && (
          <fieldset>
            <legend className="font-heading text-lg font-semibold text-foreground mb-3">
              How big is your business?
            </legend>
            <div className="flex flex-wrap gap-2">
              {config.sizeTiers.map(tier => {
                const on = selection.sizeTierId === tier.id
                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSize(tier.id)}
                    className={[
                      optionBtn,
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:border-primary/40',
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
            <legend className="font-heading text-lg font-semibold text-foreground mb-3">
              How complex are your needs?
            </legend>
            <div className="flex flex-wrap gap-2">
              {config.complexityLevels.map(level => {
                const on = selection.complexityId === level.id
                return (
                  <button
                    key={level.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setComplexity(level.id)}
                    className={[
                      optionBtn,
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:border-primary/40',
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
            <legend className="font-heading text-lg font-semibold text-foreground mb-3">
              Anything else?
            </legend>
            <div className="space-y-3">
              {config.addOns.map(addOn => (
                <div key={addOn.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                  <div>
                    <span className="font-body text-foreground">{addOn.label}</span>
                    <span className="ml-2 text-sm text-foreground/60">
                      {addOn.type === 'flat'
                        ? `${fmt.format(addOn.flatRate)}/${period}`
                        : `${fmt.format(addOn.unitRate)}/${addOn.unitLabel}/${period}`}
                    </span>
                  </div>
                  {addOn.type === 'flat' ? (
                    <input
                      type="checkbox"
                      aria-label={addOn.label}
                      checked={!!selection.addOns[addOn.id]}
                      onChange={e => setAddOn(addOn.id, e.target.checked ? 1 : 0)}
                      className="h-5 w-5 accent-[color:var(--color-action,theme(colors.cyan.500))]"
                    />
                  ) : (
                    <input
                      type="number"
                      min={0}
                      aria-label={`${addOn.label} — number of ${addOn.unitLabel}s`}
                      value={selection.addOns[addOn.id] || 0}
                      onChange={e => setAddOn(addOn.id, Math.max(0, Number(e.target.value)))}
                      className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {/* Estimate */}
      <aside className="lg:sticky lg:top-24 h-fit rounded-lg border border-border bg-card shadow-card p-6">
        <p className="text-sm font-body uppercase tracking-wide text-foreground/60">Estimated cost</p>
        <p className="mt-2 font-heading text-3xl font-bold text-[color:var(--color-action,theme(colors.cyan.600))]">
          {anyService ? `~${estimateLabel}` : estimateLabel}
        </p>
        {config.implementationFee && (
          <p className="mt-2 text-sm font-body text-foreground/70">
            + {fmt.format(config.implementationFee.amount)} {config.implementationFee.label}
            {config.implementationFee.weeks ? ` (${config.implementationFee.weeks} weeks)` : ''}
          </p>
        )}
        <p className="mt-4 text-xs font-body text-foreground/50 leading-relaxed">{config.disclaimer}</p>
        <a
          href={ctaHref}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 font-heading font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {config.cta.label}
        </a>
      </aside>
    </div>
  )
}
