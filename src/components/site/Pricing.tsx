import { pricingPlans, type ServiceValue } from '../../config/site'
import { Check, Info } from './icons'
import { ButtonLink, Container, Eyebrow, SampleTag } from './primitives'

export function Pricing({
  onRequestService,
}: {
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
            <Eyebrow tone="light">Pricing</Eyebrow>
            <h2
              id="pricing-heading"
              className="mt-5 max-w-[690px] font-display text-[clamp(2.5rem,4.6vw,4.3rem)] font-medium leading-[1.02] tracking-[-0.035em] text-cream balance"
            >
              Example pricing, clearly explained.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <SampleTag tone="dark">Sample pricing — not an offer</SampleTag>
            <p className="mt-4 max-w-sm text-[12px] leading-[1.75] text-cream/55">
              These figures are configurable examples for this website preview. Your project price
              is only set after an inspection and a signed written agreement.
            </p>
          </div>
        </div>

        <div className="mt-11 grid gap-4 lg:grid-cols-3 lg:mt-14 lg:gap-5">
          {pricingPlans.map((plan) => {
            const isFeatured = plan.featured

            return (
              <article
                key={plan.number}
                className={`relative flex flex-col border p-6 sm:p-7 ${
                  isFeatured
                    ? 'border-copper bg-copper-deep text-cream'
                    : 'border-cream/15 bg-paper text-ink'
                }`}
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
                    {plan.badge}
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
                    href="#estimate"
                    onClick={() => onRequestService(plan.service)}
                    variant={isFeatured ? 'light' : 'secondary'}
                    className="w-full"
                    aria-label={`${plan.cta} — go to the estimate request form`}
                  >
                    {plan.cta}
                  </ButtonLink>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-8 grid gap-5 border-t border-cream/15 pt-6 lg:grid-cols-[1.35fr_0.65fr] lg:gap-12">
          <div className="flex gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-copper-light" />
            <p className="max-w-[780px] text-[11px] leading-[1.8] text-cream/65">
              All prices on this page are configurable examples, not a quote or an offer. Actual
              project pricing depends on an on-site inspection, the scope of work, roof access,
              materials, and a signed written agreement. The deposit example would apply only after
              you approve a written proposal, and the deposit and cancellation terms must be defined
              in that agreement.
            </p>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/65 lg:text-right">
            Deposits are paid on the secure Whop page, only after a written proposal is approved.
          </p>
        </div>
      </Container>
    </section>
  )
}
