import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Checkout, CheckoutElement, WhopElements } from '@whop/elements-react'
import type { WhopLoad } from '@whop/elements'

import { Header } from '../components/site/Header'
import { Footer } from '../components/site/ContactFooter'
import {
  ButtonLink,
  Container,
  Eyebrow,
  SampleTag,
} from '../components/site/primitives'
import { Check, Info } from '../components/site/icons'
import { PaymentErrorBoundary } from '../components/site/PaymentErrorBoundary'
import { pricingPlans, siteConfig } from '@/config'
import { SANDBOX_WHOP_CONFIG } from '@/config/whop'
import { isCheckoutPlanKey, type CheckoutPlanKey } from '@/lib/checkout-plans'
import { readCustomerSession } from '@/lib/customer'
import { formatCents, isPaymentId } from '@/lib/deposit'

/**
 * Whop sandbox checkout.
 *
 * Production and sandbox are separate Whop environments with separate accounts,
 * plans, API keys, and webhooks. Whop's CLI only deploys to production, so this
 * route lives on the hosted production origin but mounts Elements with
 * `environment="sandbox"` and sandbox plan IDs. The production `/deposit`
 * route is unchanged.
 *
 * Docs:
 * - Sandbox guide: https://docs.whop.com/developer/guides/sandbox
 * - Elements environment: https://docs.whop.com/elements/latest/getting-started#global-configuration
 */

type SandboxSearch = { plan?: string; status?: string; payment?: string }

export const Route = createFileRoute('/sandbox/deposit')({
  validateSearch: (search: Record<string, unknown>): SandboxSearch => ({
    plan: typeof search.plan === 'string' ? search.plan : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
    payment: typeof search.payment === 'string' ? search.payment : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Project Deposit | ${siteConfig.name}` },
      {
        name: 'description',
        content:
          'Whop sandbox checkout for the Summitaa Roofing plans. Test cards only; no real money moves.',
      },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: SandboxDepositPage,
})

type SandboxPlan = {
  key: CheckoutPlanKey
  name: string
  amountCents: number
  planId: string
}

const sandboxPlans: ReadonlyArray<SandboxPlan> = pricingPlans.map((plan) => ({
  key: plan.key,
  name: plan.name,
  amountCents: Math.round(plan.amountUsd * 100),
  planId: SANDBOX_WHOP_CONFIG.plans[plan.key],
}))

function sandboxPlanByKey(value: unknown): SandboxPlan | null {
  if (!isCheckoutPlanKey(value)) return null
  return sandboxPlans.find((plan) => plan.key === value) ?? null
}

function SandboxDepositPage() {
  const { plan, status, payment } = Route.useSearch()
  const selectedPlan = sandboxPlanByKey(plan) ?? sandboxPlans[0]
  const paymentId = isPaymentId(payment) ? payment : null

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-copper focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-cream"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main">
        <section className="relative overflow-hidden border-b border-line bg-cream">
          <div
            className="blueprint-grid pointer-events-none absolute inset-0 opacity-60"
            aria-hidden="true"
          />
          <Container className="relative py-12 sm:py-14 lg:py-16">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Eyebrow>Secure checkout</Eyebrow>
              <span className="inline-flex items-center gap-2 border border-ink/15 bg-paper px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate">
                <span className="size-1.5 bg-copper" aria-hidden="true" />
                Secure payment by Whop
              </span>
            </div>
            <h1 className="mt-5 max-w-[760px] font-display text-[clamp(2.35rem,4.5vw,4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance">
              Complete your roofing plan.
            </h1>
            <p className="mt-5 max-w-[640px] text-[14px] leading-[1.85] text-slate pretty">
              Pay securely through Whop. No account, password, or Whop sign-in is required —
              your email is used for the confirmation and receipt. Apple Pay and Google Pay
              appear automatically when supported.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {sandboxPlans.map((option) => {
                const active = option.key === selectedPlan.key
                return (
                  <a
                    key={option.key}
                    href={`/sandbox/deposit?plan=${option.key}`}
                    className={`inline-flex min-h-10 items-center gap-2 border px-4 py-2 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'border-ink bg-ink text-cream'
                        : 'border-ink/15 bg-paper text-ink hover:border-copper hover:text-copper'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {formatCents(option.amountCents)} {option.name}
                  </a>
                )
              })}
            </div>
          </Container>
        </section>

        <section className="bg-paper">
          <Container className="py-10 sm:py-14 lg:py-16">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
              <aside>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate">
                  Your plan
                </p>
                <div className="mt-4 border border-ink/12 bg-cream p-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate">
                    Amount due now
                  </p>
                  <p className="mt-3 font-display text-[52px] leading-none tracking-[-0.045em] text-ink">
                    {formatCents(selectedPlan.amountCents)}
                  </p>
                  <p className="mt-3 text-[11px] leading-[1.7] text-slate">
                    The plan price is set by the plan you selected. No account or
                    password is required.
                  </p>
                  <dl className="mt-6 space-y-3 border-t border-line pt-5 text-[11.5px]">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate">Plan</dt>
                      <dd className="font-semibold text-ink">{selectedPlan.name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate">Processed by</dt>
                      <dd className="font-semibold text-ink">Whop</dd>
                    </div>
                  </dl>
                </div>
              </aside>

              <div className="relative border border-ink/12 bg-cream p-5 shadow-card sm:p-7">
                <span className="absolute inset-x-0 top-0 h-0.5 bg-copper" aria-hidden="true" />
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">
                      Secure checkout
                    </p>
                    <h2 className="mt-2 font-display text-[27px] font-medium leading-none tracking-[-0.02em] text-ink">
                      Pay {formatCents(selectedPlan.amountCents)}
                    </h2>
                  </div>
                  <SampleTag>Whop Elements</SampleTag>
                </div>

                {status === 'succeeded' ? (
                  <SandboxResult
                    kind="succeeded"
                    paymentId={paymentId}
                    plan={selectedPlan}
                  />
                ) : status === 'failed' || status === 'canceled' ? (
                  <SandboxResult kind="failed" paymentId={paymentId} plan={selectedPlan} />
                ) : selectedPlan.planId ? (
                  <SandboxCheckout key={selectedPlan.key} plan={selectedPlan} />
                ) : (
                  <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
                    <p className="text-[12px] font-bold text-error">
                      The sandbox plan is not configured.
                    </p>
                    <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
                      Add the sandbox plan ID in <span className="font-mono">src/config/whop.ts</span>.
                      No payment can start.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  )
}

function SandboxCheckout({ plan }: { plan: SandboxPlan }) {
  const [elements, setElements] = useState<WhopLoad | null>(null)
  const [sdkError, setSdkError] = useState<string | null>(null)
  const [elementError, setElementError] = useState<string | null>(null)
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null)
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    import('@whop/elements')
      .then(({ loadWhop }) => {
        if (active) setElements(loadWhop())
      })
      .catch(() => {
        if (active) setSdkError('The secure sandbox payment library could not be loaded.')
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    // Prefill what this browser tab already collected. Reading sessionStorage
    // after mount keeps the server HTML and first client render identical.
    setBuyerEmail(readCustomerSession().email)
  }, [])

  const returnUrl = useMemo(() => {
    if (typeof window === 'undefined') return null
    const url = new URL('/sandbox/deposit', window.location.origin)
    url.searchParams.set('plan', plan.key)
    return url.toString()
  }, [plan.key])

  const metadata = useMemo(
    () => ({
      source: 'summitaa_roofing_sandbox',
      plan_key: plan.key,
      test: 'true',
    }),
    [plan.key],
  )

  if (sdkError) {
    return (
      <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
        <p className="text-[12px] font-bold text-error">{sdkError}</p>
        <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
          No payment has been taken. Check your connection and reload the page.
        </p>
      </div>
    )
  }

  if (elementError) {
    return (
      <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
        <p className="text-[12px] font-bold text-error">
          The sandbox payment form could not be displayed.
        </p>
        <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
          No payment has been taken. Reload the page to try again.
        </p>
        <p className="mt-2 font-mono text-[10px] leading-[1.6] text-slate">{elementError}</p>
      </div>
    )
  }

  if (!elements || buyerEmail === null) {
    return (
      <div className="mt-5 flex items-center gap-3 border border-line bg-paper p-4" role="status">
        <span className="size-5 animate-spin border-2 border-copper/30 border-t-copper" />
        <p className="text-[11.5px] text-slate">Loading the secure sandbox payment form…</p>
      </div>
    )
  }

  // `window` does not exist during SSR. The loading branch above runs first on
  // both server and client, so this branch is only reached after hydration.
  if (!returnUrl) {
    return (
      <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
        <p className="text-[12px] font-bold text-error">
          The sandbox checkout cannot start from this address.
        </p>
      </div>
    )
  }

  return (
    <>
      {completedPaymentId ? (
        <div className="mt-5 border border-[#2f7d5b]/35 bg-[#f1f8f4] p-4" role="status">
          <p className="text-[12px] font-bold text-[#2f7d5b]">
            Sandbox payment completed: {completedPaymentId}
          </p>
          <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
            No real money moved. Whop redirects to the return URL below.
          </p>
        </div>
      ) : null}

      <PaymentErrorBoundary
        title="The secure sandbox payment form could not be displayed."
        description="No payment has been taken. Reload the page to try again."
      >
        <WhopElements
          elements={elements}
          environment="sandbox"
          onLoadError={() => {
            setSdkError('The secure sandbox payment library could not be loaded.')
          }}
        >
          {/*
            CheckoutElement already composes the express wallet row
            (`.whop-CheckoutExpress*`) and the Whop terms disclosure
            (`.whop-CheckoutTerms`), which is why ExpressCheckoutElement and
            BrandingElement are not mounted explicitly here. The docs make
            CheckoutElement and ExpressCheckoutElement mutually exclusive:
            https://docs.whop.com/elements/latest/checkout/checkout#exclusive
          */}
          <Checkout
            plan={plan.planId}
            returnUrl={returnUrl}
            metadata={metadata}
            onComplete={(result) => {
              if (result.result === 'payment') setCompletedPaymentId(result.paymentId)
            }}
            fallback={
              <div
                className="mt-5 flex items-center gap-3 border border-line bg-paper p-4"
                role="status"
              >
                <span className="size-5 animate-spin border-2 border-copper/30 border-t-copper" />
                <p className="text-[11.5px] text-slate">Loading the secure sandbox form…</p>
              </div>
            }
          >
            <CheckoutElement
              buyerEmail={buyerEmail}
              onError={(event) => {
                setElementError(event.message)
              }}
            />
          </Checkout>
        </WhopElements>
      </PaymentErrorBoundary>
    </>
  )
}

function SandboxResult({
  kind,
  paymentId,
  plan,
}: {
  kind: 'succeeded' | 'failed'
  paymentId: string | null
  plan: SandboxPlan
}) {
  const succeeded = kind === 'succeeded'

  return (
    <div
      className={`mt-5 border p-5 ${
        succeeded ? 'border-[#2f7d5b]/35 bg-[#f1f8f4]' : 'border-error/30 bg-[#fbf0ec]'
      }`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid size-8 shrink-0 place-items-center border ${
            succeeded
              ? 'border-[#2f7d5b]/35 text-[#2f7d5b]'
              : 'border-error/30 text-error'
          }`}
        >
          {succeeded ? <Check className="size-4" /> : <Info className="size-4" />}
        </span>
        <div>
          <p className="text-[13px] font-bold text-ink">
            {succeeded
              ? 'Sandbox payment succeeded.'
              : 'The sandbox payment did not complete.'}
          </p>
          <p className="mt-2 text-[11.5px] leading-[1.75] text-slate">
            {succeeded
              ? 'Whop confirms the sandbox checkout completed. No real money moved and no production order was created.'
              : 'Whop returned a failed or canceled result. Nothing was charged. Use the success test card and try again.'}
          </p>
          {paymentId ? (
            <p className="mt-2 font-mono text-[10px] leading-[1.6] text-slate">
              Sandbox payment: {paymentId}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={`/sandbox/deposit?plan=${plan.key}`} className="w-full sm:w-auto">
          Run the {formatCents(plan.amountCents)} sandbox checkout again
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" className="w-full sm:w-auto">
          Back to the homepage
        </ButtonLink>
      </div>
    </div>
  )
}
