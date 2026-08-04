'use client'

import { useMemo, useState } from 'react'
import {
  buildContactContext,
  computeEstimate,
  initialSelection,
  nearestSizeTierIndex,
  type PricingCalculatorConfig,
  type PricingSelection,
  type ServiceOptionGroup,
} from '@/lib/content/pricing-calculator-types'
import { useContactDrawer } from '@/components/contact/ContactDrawerProvider'

// All styling uses theme tokens (bg-primary, bg-card, text-foreground,
// var(--color-action), accent-color:var(--color-primary), the brand-tinted
// --shadow-* set, rounded-*) so the calculator auto-matches each client's
// generated brand. The white toggle knob is an intentional neutral.

function useCurrency(currency: string) {
  return useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    } catch {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    }
  }, [currency])
}

// Trailing-slash-insensitive pathname of a nav url (relative or absolute).
function pathnameOf(url: string): string {
  try {
    return new URL(url, 'http://x').pathname.replace(/\/$/, '') || '/'
  } catch {
    return url.replace(/\/$/, '')
  }
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

// Per-service option groups revealed when a service is expanded.
function ServiceOptions({
  serviceId,
  groups,
  selected,
  onChange,
  fmt,
  period,
}: {
  serviceId: string
  groups: ServiceOptionGroup[]
  selected: Record<string, string[]>
  onChange: (groupId: string, choiceIds: string[]) => void
  fmt: Intl.NumberFormat
  period: string
}) {
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {groups.map(group => {
        const chosen = selected[group.id] ?? []
        return (
          <div key={group.id}>
            <p className="mb-2 text-xs font-heading font-semibold uppercase tracking-wide text-foreground/50">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.choices.map(choice => {
                const on = chosen.includes(choice.id)
                const toggle = () => {
                  if (group.kind === 'select') onChange(group.id, [choice.id])
                  else onChange(group.id, on ? chosen.filter(c => c !== choice.id) : [...chosen, choice.id])
                }
                return (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={on}
                    onClick={toggle}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors cursor-pointer',
                      on ? 'border-primary bg-primary/[0.07] text-foreground' : 'border-border bg-card text-foreground/80 hover:border-primary/50',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden
                      className={[
                        'flex h-4 w-4 items-center justify-center border-2 transition-colors',
                        group.kind === 'select' ? 'rounded-full' : 'rounded',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent',
                      ].join(' ')}
                    >
                      <CheckIcon className="h-2.5 w-2.5" />
                    </span>
                    <span className="font-medium">{choice.label}</span>
                    <span className="text-xs text-foreground/45">{choice.addMonthly > 0 ? `+${fmt.format(choice.addMonthly)}/${period}` : 'included'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
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
  const setServiceOption = (serviceId: string, groupId: string, choiceIds: string[]) =>
    setSelection(s => ({
      ...s,
      serviceOptions: { ...s.serviceOptions, [serviceId]: { ...s.serviceOptions[serviceId], [groupId]: choiceIds } },
    }))
  const setAddOn = (id: string, value: number) => setSelection(s => ({ ...s, addOns: { ...s.addOns, [id]: value } }))

  const sizeTiers = config.sizeTiers
  const sizeIdx = nearestSizeTierIndex(sizeTiers, selection.sizePos)

  const { openDrawer } = useContactDrawer()

  let step = 0
  const estimateLabel = anyService ? `${fmt.format(estimate.low)}–${fmt.format(estimate.high)}` : null
  const ctaHref = estimateLabel
    ? `${config.cta.url}${config.cta.url.includes('?') ? '&' : '?'}estimate=${encodeURIComponent(`${estimateLabel}/${period}`)}`
    : config.cta.url

  // When the CTA targets the contact drawer, open it directly with the recap
  // attached (data-no-drawer keeps the generic interceptor from also firing).
  // Otherwise the link navigates normally (keeps the ?estimate= query).
  const ctaTargetsContact = pathnameOf(config.cta.url) === '/contact'
  function handleCtaClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!ctaTargetsContact) return
    e.preventDefault()
    const context = buildContactContext(config, selection, estimate, n => fmt.format(n))
    openDrawer('message', context)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-10">
      {/* Inputs */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="space-y-10">
          {/* Services — accordion */}
          <fieldset>
            <StepHeading n={(step += 1)}>Which services do you need?</StepHeading>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {config.serviceLines.map(line => {
                const on = !!selection.services[line.id]
                const hasOptions = (line.options?.length ?? 0) > 0
                return (
                  <div key={line.id} className={on ? 'bg-primary/[0.03]' : 'bg-card'}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-expanded={on && hasOptions}
                      onClick={() => toggleService(line.id)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors cursor-pointer"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-heading text-base font-semibold text-foreground">{line.label}</span>
                          <span className="text-sm text-foreground/50">from {fmt.format(line.baseRate)}/{period}</span>
                        </span>
                        {line.description && <span className="mt-0.5 block text-sm leading-snug text-foreground/55">{line.description}</span>}
                      </span>
                      <ToggleVisual on={on} />
                    </button>
                    {/* Expanding options panel (grid-rows trick animates height) */}
                    {hasOptions && (
                      <div className={['grid transition-all duration-300 ease-out', on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'].join(' ')}>
                        <div className="overflow-hidden">
                          <div className="px-5 pb-5">
                            <ServiceOptions
                              serviceId={line.id}
                              groups={line.options ?? []}
                              selected={selection.serviceOptions[line.id] ?? {}}
                              onChange={(groupId, ids) => setServiceOption(line.id, groupId, ids)}
                              fmt={fmt}
                              period={period}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </fieldset>

          {/* Size — native range slider (accent-color makes it brand + fully draggable) */}
          {sizeTiers.length > 0 && (
            <fieldset>
              <StepHeading n={(step += 1)}>How big is your business?</StepHeading>
              <div className="mb-4">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 font-heading text-sm font-semibold text-primary">
                  {sizeTiers[sizeIdx]?.label}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={selection.sizePos}
                onChange={e => { const v = Number(e.target.value); setSelection(s => ({ ...s, sizePos: v })) }}
                aria-label="Business size"
                aria-valuetext={sizeTiers[sizeIdx]?.label}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-[var(--color-primary)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[var(--shadow-card)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
              />
              <div className="mt-2.5 flex justify-between text-xs font-medium text-foreground/50">
                <span>Smaller</span>
                <span>Larger</span>
              </div>
            </fieldset>
          )}

          {/* Complexity — segmented control */}
          {config.complexityLevels.length > 0 && (
            <fieldset>
              <StepHeading n={(step += 1)}>How complex are your needs?</StepHeading>
              <div className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1">
                {config.complexityLevels.map(level => {
                  const on = selection.complexityId === level.id
                  return (
                    <button
                      key={level.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelection(s => ({ ...s, complexityId: level.id }))}
                      className={[
                        'rounded-full px-5 py-2 text-sm font-body font-semibold transition-all duration-150 cursor-pointer',
                        on ? 'bg-primary text-primary-foreground shadow-[var(--shadow-card)]' : 'text-foreground/70 hover:text-foreground',
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
            onClick={handleCtaClick}
            data-no-drawer={ctaTargetsContact ? '' : undefined}
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
