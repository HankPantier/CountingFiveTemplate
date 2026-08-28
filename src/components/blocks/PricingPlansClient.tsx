'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { PricingPlansConfig, PlanTier, PlanAddOn } from '@/lib/content/pricing-plans-types'

function useCurrency(currency: string) {
  return useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    } catch {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    }
  }, [currency])
}

// A numeric price renders formatted; a non-numeric suffix (e.g. "Custom") renders
// as the whole price label with no number.
function TierPrice({
  tier,
  cadence,
  fmt,
}: {
  tier: PlanTier
  cadence: 'monthly' | 'annual'
  fmt: Intl.NumberFormat
}) {
  const amount = cadence === 'annual' ? tier.annualPrice : tier.monthlyPrice
  const suffix = tier.priceSuffix ?? '/mo'
  const numeric = amount > 0
  return (
    <div className="flex items-baseline gap-1">
      <span className={cn('font-heading text-4xl font-bold', tier.isMostPopular ? 'text-primary-foreground' : 'text-foreground')}>
        {numeric ? fmt.format(amount) : suffix}
      </span>
      {numeric && (
        <span className={cn('text-sm', tier.isMostPopular ? 'text-primary-foreground/70' : 'text-foreground/60')}>
          {suffix}
        </span>
      )}
    </div>
  )
}

function AddOnPrice({ addOn, fmt }: { addOn: PlanAddOn; fmt: Intl.NumberFormat }) {
  if (addOn.type === 'flat') {
    const cadence = addOn.cadence === 'once' ? 'one-time' : `/${addOn.cadence === 'year' ? 'yr' : 'mo'}`
    return <span className="font-heading font-semibold text-foreground">{fmt.format(addOn.price)}<span className="text-sm font-normal text-foreground/60"> {cadence}</span></span>
  }
  return <span className="font-heading font-semibold text-foreground">{fmt.format(addOn.unitPrice)}<span className="text-sm font-normal text-foreground/60"> / {addOn.unitLabel}</span></span>
}

export function PricingPlansClient({ config }: { config: PricingPlansConfig }) {
  const fmt = useCurrency(config.currency)
  const [cadence, setCadence] = useState<'monthly' | 'annual'>(config.billing.defaultCadence)

  const tiers = config.tiers
  const colsClass =
    tiers.length >= 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : tiers.length === 2
        ? 'sm:grid-cols-2 max-w-3xl mx-auto'
        : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div>
      {/* Billing toggle */}
      {config.billing.showToggle && (
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={cn('text-sm font-medium', cadence === 'monthly' ? 'text-foreground' : 'text-foreground/50')}>
            {config.billing.monthlyLabel}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={cadence === 'annual'}
            aria-label={`Switch to ${cadence === 'annual' ? config.billing.monthlyLabel : config.billing.annualLabel} billing`}
            onClick={() => setCadence(c => (c === 'monthly' ? 'annual' : 'monthly'))}
            className="relative h-6 w-11 rounded-full bg-[color:var(--color-action,theme(colors.cyan.500))] transition-colors"
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                cadence === 'annual' && 'translate-x-5'
              )}
            />
          </button>
          <span className={cn('text-sm font-medium', cadence === 'annual' ? 'text-foreground' : 'text-foreground/50')}>
            {config.billing.annualLabel}
          </span>
          {config.billing.annualDiscountPct > 0 && (
            <span className="ml-1 rounded-full bg-[color:var(--color-action,theme(colors.cyan.500))]/10 px-2.5 py-0.5 text-xs font-semibold text-[color:var(--color-action,theme(colors.cyan.600))]">
              Save {config.billing.annualDiscountPct}%
            </span>
          )}
        </div>
      )}

      {/* Tier cards */}
      <div className={cn('grid gap-6', colsClass)}>
        {tiers.map(tier => (
          <Card
            key={tier.id}
            className={cn(
              'relative h-full flex flex-col p-6 gap-4',
              tier.isMostPopular
                ? 'border-primary ring-2 ring-primary shadow-lg lg:scale-[1.03] bg-primary text-primary-foreground'
                : 'border-border shadow-card'
            )}
          >
            {tier.isMostPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--color-action,theme(colors.cyan.500))] px-3 py-0.5 text-xs font-semibold text-white shadow">
                Most popular
              </span>
            )}
            <h3 className={cn('font-heading text-xl font-bold', tier.isMostPopular ? 'text-primary-foreground' : 'text-foreground')}>
              {tier.isMostPopular && <span className="sr-only">Recommended plan: </span>}
              {tier.name}
            </h3>

            <TierPrice tier={tier} cadence={cadence} fmt={fmt} />

            {tier.description && (
              <p className={cn('text-sm leading-relaxed', tier.isMostPopular ? 'text-primary-foreground/85' : 'text-foreground/70')}>
                {tier.description}
              </p>
            )}

            <hr className={cn('border-t', tier.isMostPopular ? 'border-primary-foreground/20' : 'border-border')} />

            <ul className="flex-1 space-y-2">
              {tier.features.map(feature => (
                <li key={feature.id} className={cn('flex items-start gap-2', !feature.included && 'opacity-50')}>
                  {feature.included ? (
                    <Check
                      className={cn('mt-0.5 h-4 w-4 shrink-0', tier.isMostPopular ? 'text-primary-foreground' : '')}
                      style={tier.isMostPopular ? undefined : { color: 'var(--color-action, theme(colors.cyan.500))' }}
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  ) : (
                    <X
                      className={cn('mt-0.5 h-4 w-4 shrink-0', tier.isMostPopular ? 'text-primary-foreground/60' : 'text-foreground/40')}
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      'text-sm leading-snug',
                      tier.isMostPopular ? 'text-primary-foreground/90' : 'text-foreground/80',
                      !feature.included && 'line-through'
                    )}
                  >
                    {feature.label}
                  </span>
                </li>
              ))}
            </ul>

            <Button asChild variant={tier.isMostPopular ? 'secondary' : 'default'} className="w-full mt-2">
              <Link href={tier.cta.url}>{tier.cta.label}</Link>
            </Button>
          </Card>
        ))}
      </div>

      {/* All plans include */}
      {config.sharedFeatures.items.length > 0 && (
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 md:p-8">
          <h3 className="font-heading text-lg font-semibold text-foreground text-center">
            {config.sharedFeatures.heading}
          </h3>
          <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {config.sharedFeatures.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: 'var(--color-action, theme(colors.cyan.500))' }}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <span className="text-sm leading-snug text-foreground/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add-ons */}
      {config.addOns.length > 0 && (
        <div className="mt-10">
          <h3 className="font-heading text-lg font-semibold text-foreground text-center mb-5">Add-ons</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {config.addOns.map(addOn => (
              <Card key={addOn.id} className="flex flex-col gap-1 p-5 border-border shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-heading font-semibold text-foreground">{addOn.label}</span>
                  <AddOnPrice addOn={addOn} fmt={fmt} />
                </div>
                {addOn.description && <p className="text-sm text-foreground/60 leading-snug">{addOn.description}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {config.disclaimer && (
        <p className="mt-8 text-center text-xs text-foreground/50">{config.disclaimer}</p>
      )}
    </div>
  )
}
