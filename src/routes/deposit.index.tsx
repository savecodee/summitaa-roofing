import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Checkout, CheckoutElement, WhopElements } from '@whop/elements-react'
import type { WhopLoad } from '@whop/elements'

import { Header } from '../components/site/Header'
import { Footer } from '../components/site/ContactFooter'
import { ButtonLink, Container, Eyebrow, SampleTag } from '../components/site/primitives'
import { ArrowRight, Info, Mail, Phone } from '../components/site/icons'
import { PaymentErrorBoundary } from '../components/site/PaymentErrorBoundary'
import { siteConfig, whopPublicConfig } from '@/config'
import {
  checkoutPlanByKey,
  isCheckoutPlanKey,
  type CheckoutPlanKey,
} from '@/lib/checkout-plans'
import { makeCustomerProjectRef, readCustomerSession, writeCustomerSession } from '@/lib/customer'
import {
  buildDepositMetadata,
  buildDepositReturnUrl,
  makeDepositAttemptId,
  type PublicDepositConfig,
} from '@/lib/deposit'
import { normalizeProjectRef } from '@/lib/project'
import { trackDepositStarted } from '@/lib/tracking'

type DepositSearch = { project?: string; plan?: string; sandbox?: string; live?: string }

export const Route = createFileRoute('/deposit/')({
  validateSearch: (search: Record<string, unknown>): DepositSearch => ({
    project: typeof search.project === 'string' ? search.project : undefined,
    plan: typeof search.plan === 'string' ? search.plan : undefined,
    sandbox: typeof search.sandbox === 'string' ? search.sandbox : undefined,
    live: typeof search.live === 'string' ? search.live : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Project Deposit | ${siteConfig.name}` },
      {
        name: 'description',
        content: `Pay an approved ${siteConfig.name} project deposit through the secure Whop payment form linked to your written proposal.`,
      },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: DepositPage,
})

type ConfigState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; config: PublicDepositConfig }
  | { status: 'error' }

function DepositPage() {
  const { project, plan } = Route.useSearch()
  const navigate = Route.useNavigate()
  const requestedPlanKey = isCheckoutPlanKey(plan) ? plan : null
  const searchProjectRef = normalizeProjectRef(project)
  const planConfig = requestedPlanKey ? checkoutPlanByKey(requestedPlanKey) : null

  const [projectRef, setProjectRef] = useState(searchProjectRef)
  const [state, setState] = useState<ConfigState>({ status: 'idle' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!requestedPlanKey) return

    if (searchProjectRef) {
      setProjectRef(searchProjectRef)
      writeCustomerSession({ planKey: requestedPlanKey, projectRef: searchProjectRef })
      return
    }

    const session = readCustomerSession()
    const nextProjectRef = session.projectRef ?? makeCustomerProjectRef()
    setProjectRef(nextProjectRef)
    writeCustomerSession({ planKey: requestedPlanKey, projectRef: nextProjectRef })
    navigate({
      to: '/deposit',
      search: { plan: requestedPlanKey, project: nextProjectRef },
      replace: true,
    })
  }, [navigate, requestedPlanKey, searchProjectRef])

  useEffect(() => {
    if (!projectRef) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })

    const query = requestedPlanKey
      ? `?plan=${encodeURIComponent(requestedPlanKey)}`
      : ''
    fetch(`/api/whop/deposit-config${query}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('config_unavailable')
        const body: unknown = await response.json().catch(() => null)
        if (typeof body !== 'object' || body === null) throw new Error('config_invalid')
        return body as PublicDepositConfig
      })
      .then((config) => {
        if (controller.signal.aborted) return
        setState({ status: 'ready', config })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [projectRef, requestedPlanKey, reloadKey])

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
          <Container className="relative py-14 sm:py-16 lg:py-20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Eyebrow>{planConfig ? 'Secure checkout' : 'Project deposit'}</Eyebrow>
              <span className="inline-flex items-center gap-2 border border-ink/15 bg-paper px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate">
                <span className="size-1.5 bg-copper" aria-hidden="true" />
                Secure payment by Whop
              </span>
            </div>
            <h1 className="mt-5 max-w-[760px] font-display text-[clamp(2.5rem,4.8vw,4.4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance">
              {planConfig ? `Complete your ${planConfig.name}.` : 'Reserve your project slot.'}
            </h1>
            <p className="mt-6 max-w-[620px] text-[14.5px] leading-[1.85] text-slate pretty">
              {planConfig
                ? 'Pay securely through Whop. No account, password, or Whop sign-in is required — your email is used for the confirmation and receipt.'
                : 'A deposit is requested only after you approve a written proposal. Use the project link sent with that proposal — the reference connects the payment to your project.'}
            </p>
          </Container>
        </section>

        <section className="bg-paper">
          <Container className="py-12 sm:py-16 lg:py-20">
            {!projectRef ? (
              requestedPlanKey ? (
                <LoadingCard />
              ) : (
                <MissingProject />
              )
            ) : state.status === 'loading' || state.status === 'idle' ? (
              <LoadingCard />
            ) : state.status === 'error' ? (
              <ErrorCard onRetry={() => setReloadKey((key) => key + 1)} />
            ) : !state.config.configured ||
              !state.config.accountId ||
              !state.config.planId ||
              !state.config.amountCents ||
              !state.config.amountLabel ? (
              <UnconfiguredCard projectRef={projectRef} />
            ) : (
              <ConfiguredDeposit
                projectRef={projectRef}
                planId={state.config.planId}
                planKey={state.config.planKey}
                planName={state.config.planName}
                amountCents={state.config.amountCents}
                amountLabel={state.config.amountLabel}
              />
            )}
          </Container>
        </section>
      </main>

      <Footer />
    </>
  )
}

function ContactCard() {
  return (
    <div className="mt-7 border border-line bg-cream p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate">Need help?</p>
        <SampleTag>Sample</SampleTag>
      </div>
      <a
        href={siteConfig.phone.href}
        className="mt-4 flex items-center gap-3 text-ink transition-colors hover:text-copper"
      >
        <span className="grid size-9 place-items-center border border-copper/25 text-copper">
          <Phone className="size-4" />
        </span>
        <span>
          <span className="block text-[14px] font-bold">{siteConfig.phone.display}</span>
          <span className="mt-0.5 block text-[10px] text-slate">
            Sample phone number — replace before launch
          </span>
        </span>
      </a>
      <a
        href={siteConfig.email.href}
        className="mt-4 flex items-center gap-3 border-t border-line pt-4 text-[12px] text-slate transition-colors hover:text-copper"
      >
        <Mail className="size-3.5 text-copper" />
        {siteConfig.email.display}
        <span className="text-[9px] uppercase tracking-[0.12em] text-slate">sample</span>
      </a>
    </div>
  )
}

function MissingProject() {
  return (
    <div className="mx-auto max-w-[680px] border border-ink/12 bg-cream p-6 shadow-card sm:p-9">
      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">Deposit link</p>
      <h2 className="mt-3 font-display text-[clamp(2rem,3.4vw,2.7rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink">
        This page needs your project reference.
      </h2>
      <p className="mt-4 text-[13px] leading-[1.8] text-slate">
        Deposit links include a project reference so a payment can be matched to the right
        project. Open the link in your written proposal or contact the office for a new one. No
        payment can be taken from this page without that reference.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/#start" className="w-full sm:w-auto">
          Start with your email
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" className="w-full sm:w-auto">
          Back to the homepage
        </ButtonLink>
      </div>
      <ContactCard />
    </div>
  )
}

function LoadingCard() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-[680px] border border-ink/12 bg-cream p-8 text-center"
    >
      <span className="mx-auto block size-6 animate-spin border-2 border-copper/30 border-t-copper" />
      <p className="mt-4 text-[12px] font-semibold text-ink">Checking deposit configuration…</p>
      <p className="mt-2 text-[11px] text-slate">No payment has been taken.</p>
    </div>
  )
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-[680px] border border-error/30 bg-[#fbf0ec] p-6 sm:p-8" role="alert">
      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-error">Deposit</p>
      <h2 className="mt-3 font-display text-[28px] font-medium leading-tight tracking-[-0.02em] text-ink">
        We couldn&apos;t check the deposit setup.
      </h2>
      <p className="mt-3 text-[13px] leading-[1.8] text-slate">
        No payment has been taken. This is usually temporary. Try again, and contact the office if
        it keeps happening.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 border border-ink bg-ink px-5 py-3 text-[12px] font-semibold text-cream transition-colors hover:bg-ink-soft"
      >
        Try again
        <ArrowRight className="size-3.5" />
      </button>
      <ContactCard />
    </div>
  )
}

function UnconfiguredCard({ projectRef }: { projectRef: string }) {
  return (
    <div className="mx-auto max-w-[680px] border border-copper/30 bg-cream p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">
          Online deposit
        </p>
        <span className="border border-copper/30 px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.16em] text-copper">
          Not connected
        </span>
      </div>
      <h2 className="mt-3 font-display text-[28px] font-medium leading-tight tracking-[-0.02em] text-ink">
        Online deposit payments are not enabled yet.
      </h2>
      <p className="mt-3 text-[13px] leading-[1.8] text-slate">
        The payment form cannot be shown until the office finishes connecting its Whop deposit
        plan and server credentials. No payment has been taken. Please contact the office and
        reference{' '}
        <span className="font-semibold text-ink">{projectRef}</span> to arrange the deposit.
      </p>
      <div className="mt-6 flex gap-3 border border-line bg-paper p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-copper" />
        <p className="text-[11px] leading-[1.7] text-slate">
          This page never asks for card details itself. When enabled, payment fields are rendered
          by Whop in PCI-isolated frames and the card number never reaches this site.
        </p>
      </div>
      <ContactCard />
    </div>
  )
}

type ConfiguredProps = {
  projectRef: string
  planId: string
  planKey: CheckoutPlanKey | null
  planName: string | null
  amountCents: number
  amountLabel: string
}

function ConfiguredDeposit({
  projectRef,
  planId,
  planKey,
  planName,
  amountCents,
  amountLabel,
}: ConfiguredProps) {
  const isSelfServe = planKey !== null
  const isDepositPlan = planKey === 'deposit'

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
      <aside className="flex flex-col">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate">
          {isSelfServe ? 'Your plan' : 'Your deposit'}
        </p>
        <div className="mt-4 border border-ink/12 bg-cream p-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate">
            Amount due now
          </p>
          <p className="mt-3 font-display text-[52px] leading-none tracking-[-0.045em] text-ink">
            {amountLabel}
          </p>
          <p className="mt-3 text-[11px] leading-[1.7] text-slate">
            {isSelfServe
              ? 'The plan price is set by the plan you selected. No account or password is created.'
              : 'Example deposit configured for this site. The amount that applies to your project is the one in your written proposal.'}
          </p>
          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-[11.5px]">
            {planName ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate">Plan</dt>
                <dd className="font-semibold text-ink">{planName}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate">Reference</dt>
              <dd className="font-semibold text-ink">{projectRef}</dd>
            </div>
            {isDepositPlan ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate">Applied to project total</dt>
                <dd className="font-semibold text-ink">Per written agreement</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate">Processed by</dt>
              <dd className="font-semibold text-ink">Whop</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex gap-3 border border-copper/20 bg-copper/[0.05] p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-copper" />
          <p className="text-[11px] leading-[1.7] text-slate">
            {isSelfServe
              ? 'No account is needed. Your email is used for the confirmation and the Whop receipt. The plan price and scope are confirmed in writing before any work begins.'
              : 'Pay only after your proposal is approved. The deposit and cancellation terms are the ones in that written agreement. This page does not create an agreement or book a date by itself.'}
          </p>
        </div>

        {isDepositPlan ? (
          <div className="mt-4 border border-line bg-paper p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate">
              Card on file
            </p>
            <p className="mt-2 text-[11px] leading-[1.7] text-slate">
              Whop can save this card for the remaining project balance. Nothing else is charged
              today. The office sends a final invoice, and the saved card is not charged without
              your approval or the terms in your signed agreement.
            </p>
          </div>
        ) : null}

        <p className="mt-5 text-[10.5px] leading-[1.7] text-slate">
          {amountCents > 0
            ? 'A receipt is emailed by Whop after a successful payment.'
            : 'Payment amount is set by the office.'}
        </p>
        <ContactCard />
      </aside>

      <DepositCheckout
        projectRef={projectRef}
        planId={planId}
        planKey={planKey}
        amountLabel={amountLabel}
      />
    </div>
  )
}

function DepositCheckout({
  projectRef,
  planId,
  planKey,
  amountLabel,
}: {
  projectRef: string
  planId: string
  planKey: CheckoutPlanKey | null
  amountLabel: string
}) {
  const [elements, setElements] = useState<WhopLoad | null>(null)
  const [sdkError, setSdkError] = useState<string | null>(null)
  const [elementError, setElementError] = useState<string | null>(null)
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null)
  const checkoutAttemptId = useMemo(() => makeDepositAttemptId(), [])

  useEffect(() => {
    // sessionStorage exists only in the browser. Reading it after mount keeps
    // the server HTML and first client render identical; the checkout stays
    // unmounted until the value (possibly empty) is known.
    setBuyerEmail(readCustomerSession().email)
  }, [])

  useEffect(() => {
    let active = true

    import('@whop/elements')
      .then(({ loadWhop }) => {
        if (active) setElements(loadWhop())
      })
      .catch(() => {
        if (active) setSdkError('The secure payment library could not be loaded.')
      })

    return () => {
      active = false
    }
  }, [])

  const returnUrl = useMemo(
    () =>
      typeof window === 'undefined'
        ? null
        : buildDepositReturnUrl(window.location.origin, projectRef, planKey ?? undefined),
    [planKey, projectRef],
  )

  const metadata = useMemo(
    () => buildDepositMetadata(projectRef, checkoutAttemptId, planKey ?? undefined),
    [checkoutAttemptId, planKey, projectRef],
  )

  // Track deposit_started when the checkout loads (user is about to pay)
  useEffect(() => {
    if (elements) {
      trackDepositStarted(projectRef, planId)
    }
  }, [elements, projectRef, planId])

  if (!returnUrl) {
    return (
      <div className="border border-error/30 bg-[#fbf0ec] p-6" role="alert">
        <p className="text-[12px] font-bold text-error">Payments cannot start from this address.</p>
        <p className="mt-2 text-[11.5px] leading-[1.7] text-slate">
          Open the checkout link again, or contact the office. No payment has been taken.
        </p>
      </div>
    )
  }

  return (
    <div className="relative border border-ink/12 bg-cream p-5 shadow-card sm:p-7">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-copper" aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">
            Secure checkout
          </p>
          <h2 className="mt-2 font-display text-[27px] font-medium leading-none tracking-[-0.02em] text-ink">
            Pay {amountLabel}
          </h2>
        </div>
        <SampleTag>Whop Elements</SampleTag>
      </div>

      {sdkError ? (
        <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
          <p className="text-[12px] font-bold text-error">{sdkError}</p>
          <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
            No payment has been taken. Check your connection and reload the page.
          </p>
        </div>
      ) : elementError ? (
        <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
          <p className="text-[12px] font-bold text-error">
            The secure payment form could not be displayed.
          </p>
          <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
            No payment has been taken. Reload the page to try again, and contact the office if it
            keeps happening.
          </p>
          <p className="mt-2 font-mono text-[10px] leading-[1.6] text-slate">{elementError}</p>
        </div>
      ) : !elements || buyerEmail === null ? (
        <div className="mt-5 flex items-center gap-3 border border-line bg-paper p-4" role="status">
          <span className="size-5 animate-spin border-2 border-copper/30 border-t-copper" />
          <p className="text-[11.5px] text-slate">Loading the secure payment form…</p>
        </div>
      ) : (
        <PaymentErrorBoundary>
          <WhopElements
            elements={elements}
            environment={whopPublicConfig.environment}
            onLoadError={() => {
              setSdkError('The secure payment library could not be loaded.')
            }}
          >
            {/*
              CheckoutElement is the entire checkout surface: price summary,
              email, payment methods, express wallets, and the Whop terms.
              Whop Elements does not allow ExpressCheckoutElement beside it
              (the two share one entry slot), and BrandingElement is a Payments
              element that throws outside <Payments>. Both are composed inside
              CheckoutElement by Whop, so mounting them here would crash the form.
            */}
            <Checkout
              plan={planId}
              returnUrl={returnUrl}
              metadata={metadata}
              fallback={
                <div
                  className="mt-5 flex items-center gap-3 border border-line bg-paper p-4"
                  role="status"
                >
                  <span className="size-5 animate-spin border-2 border-copper/30 border-t-copper" />
                  <p className="text-[11.5px] text-slate">Loading the secure payment form…</p>
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
      )}
    </div>
  )
}
