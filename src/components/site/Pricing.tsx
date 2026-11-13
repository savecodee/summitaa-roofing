import { copy, pricingPlans, type ServiceValue } from '@/config'
import type { CheckoutPlanKey } from '../../lib/checkout-plans'
import { customerPlanHref } from '../../lib/customer'
import { Check, Info } from './icons'
import { ButtonLink, Container, Eyebrow, SampleTag } from './primitives'

export function Pricing({
  email,
  selectedPlanKey,
  projectRef,
  onSelectPlan,
  onRequestService,
}: {
  email: string
  selectedPlanKey: CheckoutPlanKey | null
  projectRef: string | null
  onSelectPlan: (planKey: CheckoutPlanKey) => void
  onRequestService: (service: ServiceValue) => void
}) {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="relative overflow-hidden bg-ink">
      <div
        className="roof-shingle-lines pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-40"
        aria-hidden="true"
      />
      <Container className="relative py-20 sm:py-24 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end lg:gap-16">
          <div>
            <Eyebrow tone="light">{copy.pricing.eyebrow}</Eyebrow>
            <h2
              id="pricing-heading"
              className="mt-5 max-w-[690px] font-display text-[clamp(2.5rem,4.6vw,4.3rem)] font-medium leading-[1.02] tracking-[-0.035em] text-cream balance"
            >
              {copy.pricing.title}
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <SampleTag tone="dark">{copy.pricing.sampleTag}</SampleTag>
            <p className="mt-4 max-w-sm text-[12px] leading-[1.75] text-cream/55">
              {copy.pricing.sampleNote}
            </p>
            {!email ? (
              <p className="mt-4 max-w-sm border border-cream/20 bg-cream/[0.04] px-3 py-2.5 text-[11px] leading-[1.65] text-cream/75">
                Save your email above to continue to secure checkout. All three plans stay visible
                and selectable.
              </p>
            ) : (
              <p className="mt-4 max-w-sm border border-cream/20 bg-cream/[0.04] px-3 py-2.5 text-[11px] leading-[1.65] text-cream/75">
                Your email is saved for this visit. Choose a plan to continue to Whop checkout —
                no account or password needed.
              </p>
            )}
          </div>
        </div>

        <div className="mt-11 grid gap-4 lg:grid-cols-3 lg:mt-14 lg:gap-5">
          {pricingPlans.map((plan) => {
            const isFeatured = plan.featured
            const isSelected = selectedPlanKey === plan.key
            const checkoutHref = email
              ? projectRef
                ? customerPlanHref(plan.key, projectRef)
                : `/deposit?plan=${encodeURIComponent(plan.key)}`
              : '#start'

            return (
              <article
                key={plan.number}
                className={`relative flex flex-col border p-6 sm:p-7 ${
                  isFeatured
                    ? 'border-copper bg-copper-deep text-cream'
                    : 'border-cream/15 bg-paper text-ink'
                } ${isSelected ? 'ring-2 ring-cream ring-offset-2 ring-offset-ink' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-[0.24em] ${
                      isFeatured ? 'text-cream/80' : 'text-slate'
                    }`}
                  >
                    {plan.number} / Service
                  </span>
                  <span
                    className={`border px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.18em] ${
                      isFeatured
                        ? 'border-cream/40 text-cream'
                        : 'border-ink/15 text-slate'
                    }`}
                  >
                    {isSelected ? 'Selected' : plan.badge}
                  </span>
                </div>

                <h3
                  className={`mt-8 min-h-[2.6em] font-display text-[clamp(1.7rem,2.3vw,2.15rem)] font-medium leading-[1.05] tracking-[-0.025em] ${
                    isFeatured ? 'text-cream' : 'text-ink'
                  }`}
                >
                  {plan.name}
                </h3>

                <div className="mt-6 flex items-end gap-1.5">
                  <span
                    className={`pb-2 font-display text-xl ${
                      isFeatured ? 'text-cream/80' : 'text-slate'
                    }`}
                  >
                    $
                  </span>
                  <span
                    className={`font-display text-[58px] leading-none tracking-[-0.05em] sm:text-[62px] ${
                      isFeatured ? 'text-cream' : 'text-ink'
                    }`}
                  >
                    {plan.amountUsd}
                  </span>
                </div>
                <p
                  className={`mt-3 border-b pb-5 text-[9.5px] font-bold uppercase tracking-[0.16em] ${
                    isFeatured ? 'border-cream/20 text-cream/80' : 'border-line text-slate'
                  }`}
                >
                  {plan.priceNote}
                </p>

                <p
                  className={`mt-5 text-[12.5px] leading-[1.75] ${
                    isFeatured ? 'text-cream/85' : 'text-slate'
                  }`}
                >
                  {plan.summary}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2.5 text-[11.5px] leading-[1.55] ${
                        isFeatured ? 'text-cream/90' : 'text-ink/70'
                      }`}
                    >
                      <Check
                        className={`mt-0.5 size-3.5 shrink-0 ${
                          isFeatured ? 'text-cream' : 'text-copper'
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <ButtonLink
                    href={checkoutHref}
                    onClick={() => onSelectPlan(plan.key)}
                    variant={isFeatured ? 'light' : 'secondary'}
                    className="w-full"
                    aria-label={
                      email
                        ? `Continue to secure checkout for ${plan.name}`
                        : `Enter your email to choose ${plan.name}`
                    }
                  >
                    {email ? 'Continue to secure checkout' : 'Enter email to continue'}
                  </ButtonLink>
                  <a
                    href="#estimate"
                    onClick={() => onRequestService(plan.service)}
                    className={`mt-4 block text-center text-[10.5px] font-semibold uppercase tracking-[0.14em] underline decoration-1 underline-offset-4 transition-colors ${
                      isFeatured
                        ? 'text-cream/70 hover:text-cream'
                        : 'text-slate hover:text-ink'
                    }`}
                  >
                    Ask about this plan
                  </a>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 border-t border-cream/15 pt-6 sm:flex-row sm:justify-between">
          <p className="text-[11px] text-cream/65">
            Sandbox / test payment (no real money): pay with a Whop test Visa card.
          </p>
          <ButtonLink href="/sandbox/deposit?plan=inspection" variant="light" className="w-full sm:w-auto">
            Test payment (Visa)
          </ButtonLink>
        </div>

        <div className="mt-8 grid gap-5 border-t border-cream/15 pt-6 lg:grid-cols-[1.35fr_0.65fr] lg:gap-12">
          <div className="flex gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-copper-light" />
            <p className="max-w-[780px] text-[11px] leading-[1.8] text-cream/65">
              {copy.pricing.disclaimer}
            </p>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/65 lg:text-right">
            {copy.pricing.depositNote}
          </p>
        </div>
      </Container>
    </section>
  )
}
