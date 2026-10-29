import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  BrandingElement,
  EmailElement,
  PaymentElement,
  Payments,
  WhopElements,
  usePayments,
  useWhop,
} from '@whop/elements-react'
import type { WhopLoad } from '@whop/elements'

import { Header } from '../components/site/Header'
import { Footer } from '../components/site/ContactFooter'
import { ButtonLink, Container, Eyebrow, SampleTag } from '../components/site/primitives'
import { ArrowRight, Info, Mail, Phone } from '../components/site/icons'
import { siteConfig } from '../config/site'
import {
  buildDepositReturnUrl,
  makeDepositAttemptId,
  type PublicDepositConfig,
} from '../lib/deposit'
import { normalizeProjectRef } from '../lib/project'
import { trackDepositStarted } from '../lib/tracking'

type DepositSearch = { project?: string }

export const Route = createFileRoute('/deposit/')({
  validateSearch: (search: Record<string, unknown>): DepositSearch => ({
    project: typeof search.project === 'string' ? search.project : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Project Deposit | Summitaa Roofing' },
      {
        name: 'description',
        content:
          'Pay an approved Summitaa Roofing project deposit through the secure Whop payment form linked to your written proposal.',
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
  const { project } = Route.useSearch()
  const projectRef = normalizeProjectRef(project)
  const [state, setState] = useState<ConfigState>({ status: 'idle' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!projectRef) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })

    fetch('/api/whop/deposit-config', {
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
  }, [projectRef, reloadKey])

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
              <Eyebrow>Project deposit</Eyebrow>
              <span className="inline-flex items-center gap-2 border border-ink/15 bg-paper px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate">
                <span className="size-1.5 bg-copper" aria-hidden="true" />
                Secure payment by Whop
              </span>
            </div>
            <h1 className="mt-5 max-w-[760px] font-display text-[clamp(2.5rem,4.8vw,4.4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance">
              Reserve your project slot.
            </h1>
            <p className="mt-6 max-w-[620px] text-[14.5px] leading-[1.85] text-slate pretty">
              A deposit is requested only after you approve a written proposal. Use the project
              link sent with that proposal — the reference connects the payment to your project.
            </p>
          </Container>
        </section>

        <section className="bg-paper">
          <Container className="py-12 sm:py-16 lg:py-20">
            {!projectRef ? (
              <MissingProject />
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
                accountId={state.config.accountId}
                planId={state.config.planId}
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
    <div className="mx-auto max-w-[680px] border border-ink/12 bg-cream p-6 shadow-[0_30px_70px_-54px_rgba(8,23,32,0.55)] sm:p-9">
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
        <ButtonLink href="/#estimate" className="w-full sm:w-auto">
          Request an estimate
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
  accountId: string
  planId: string
  amountCents: number
  amountLabel: string
}

function ConfiguredDeposit({
  projectRef,
  accountId,
  planId,
  amountCents,
  amountLabel,
}: ConfiguredProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
      <aside className="flex flex-col">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate">
          Your deposit
        </p>
        <div className="mt-4 border border-ink/12 bg-cream p-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate">
            Amount due now
          </p>
          <p className="mt-3 font-display text-[52px] leading-none tracking-[-0.045em] text-ink">
            {amountLabel}
          </p>
          <p className="mt-3 text-[11px] leading-[1.7] text-slate">
            Example deposit configured for this site. The amount that applies to your project is
            the one in your written proposal.
          </p>
          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-[11.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate">Project reference</dt>
              <dd className="font-semibold text-ink">{projectRef}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate">Applied to project total</dt>
              <dd className="font-semibold text-ink">Per written agreement</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate">Processed by</dt>
              <dd className="font-semibold text-ink">Whop</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex gap-3 border border-copper/20 bg-copper/[0.05] p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-copper" />
          <p className="text-[11px] leading-[1.7] text-slate">
            Pay only after your proposal is approved. The deposit and cancellation terms are the
            ones in that written agreement. This page does not create an agreement or book a date
            by itself.
          </p>
        </div>

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

        <p className="mt-5 text-[10.5px] leading-[1.7] text-slate">
          {amountCents > 0
            ? 'A receipt is emailed by Whop after a successful payment.'
            : 'Payment amount is set by the office.'}
        </p>
        <ContactCard />
      </aside>

      <DepositCheckout
        projectRef={projectRef}
        accountId={accountId}
        planId={planId}
        amountLabel={amountLabel}
      />
    </div>
  )
}

type PaymentResponse = {
  ok?: boolean
  code?: string
  message?: string
  paymentId?: string
  status?: string
  paid?: boolean
  clientSecret?: string | null
}

function readErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const code = (error as Record<string, unknown>).code
  return typeof code === 'string' ? code : null
}

function withPaymentReference(returnUrl: string, paymentId: string): string {
  const url = new URL(returnUrl)
  url.searchParams.set('payment', paymentId)
  return url.toString()
}

function DepositCheckout({
  projectRef,
  accountId,
  planId,
  amountLabel,
}: {
  projectRef: string
  accountId: string
  planId: string
  amountLabel: string
}) {
  const [elements, setElements] = useState<WhopLoad | null>(null)
  const [sdkError, setSdkError] = useState<string | null>(null)

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
        : buildDepositReturnUrl(window.location.origin, projectRef),
    [projectRef],
  )

  if (!returnUrl) {
    return (
      <div className="border border-error/30 bg-[#fbf0ec] p-6" role="alert">
        <p className="text-[12px] font-bold text-error">Payments cannot start from this address.</p>
        <p className="mt-2 text-[11.5px] leading-[1.7] text-slate">
          Open the deposit link from your proposal again, or contact the office. No payment has
          been taken.
        </p>
      </div>
    )
  }

  return (
    <div className="relative border border-ink/12 bg-cream p-5 shadow-[0_30px_70px_-54px_rgba(8,23,32,0.55)] sm:p-7">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-copper" aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">
            Secure deposit
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
      ) : !elements ? (
        <div className="mt-5 flex items-center gap-3 border border-line bg-paper p-4" role="status">
          <span className="size-5 animate-spin border-2 border-copper/30 border-t-copper" />
          <p className="text-[11.5px] text-slate">Loading the secure payment form…</p>
        </div>
      ) : (
        <WhopElements
          elements={elements}
          onLoadError={() => {
            setSdkError('The secure payment library could not be loaded.')
          }}
        >
          <Payments
            accountId={accountId}
            plan={planId}
            setupFutureUsage="off_session"
            returnUrl={returnUrl}
            fallback={
              <div className="mt-5 flex items-center gap-3 border border-line bg-paper p-4" role="status">
                <span className="size-5 animate-spin border-2 border-copper/30 border-t-copper" />
                <p className="text-[11.5px] text-slate">Loading the secure payment form…</p>
              </div>
            }
          >
            <DepositPaymentForm
              projectRef={projectRef}
              planId={planId}
              returnUrl={returnUrl}
              amountLabel={amountLabel}
            />
          </Payments>
        </WhopElements>
      )}
    </div>
  )
}

function DepositPaymentForm({
  projectRef,
  planId,
  returnUrl,
  amountLabel,
}: {
  projectRef: string
  planId: string
  returnUrl: string
  amountLabel: string
}) {
  const payments = usePayments()
  const whop = useWhop()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async () => {
    if (!payments || !whop || busy || !ready) return

    // `deposit_started` means the visitor actually started the deposit (the
    // pay action), not that the page was opened.
    trackDepositStarted(projectRef, planId)

    setBusy(true)
    setError(null)

    const attempt = attemptId ?? makeDepositAttemptId()
    if (!attemptId) setAttemptId(attempt)

    let confirmationToken: string
    try {
      const token = await payments.createConfirmationToken({})
      confirmationToken = token.confirmationToken
    } catch (tokenError) {
      const code = readErrorCode(tokenError)
      setError(
        code === 'payment_request_cancelled'
          ? 'Payment was cancelled before anything was charged. You can try again.'
          : 'We could not read the payment details. No charge was made. Please try again.',
      )
      setBusy(false)
      return
    }

    try {
      const response = await fetch('/api/whop/deposit', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          projectRef,
          attemptId: attempt,
          confirmationToken,
        }),
      })

      const data: PaymentResponse = await response
        .json()
        .catch(() => ({ ok: false, message: 'Unexpected payment response.' }))

      if (!response.ok || data.ok !== true || !data.paymentId) {
        setError(
          data.message ??
            'The payment could not be started. No charge was made. Please try again.',
        )
        setBusy(false)
        return
      }

      if (data.paid) {
        window.location.assign(withPaymentReference(returnUrl, data.paymentId))
        return
      }

      if (data.clientSecret) {
        const result = await whop.payments.handleNextAction({
          clientSecret: data.clientSecret,
          returnUrl,
        })

        if (result.redirected) return

        if (result.status === 'succeeded' || result.status === 'paid') {
          window.location.assign(withPaymentReference(returnUrl, data.paymentId))
          return
        }

        if (result.status === 'processing' || result.status === 'pending') {
          window.location.assign(withPaymentReference(returnUrl, data.paymentId))
          return
        }

        setAttemptId(null)
        setError(
          result.lastPaymentError?.message
            ? `The payment was not completed: ${result.lastPaymentError.message}`
            : 'The payment was not completed. No charge was made. You can try again.',
        )
        setBusy(false)
        return
      }

      if (data.status === 'failed' || data.status === 'canceled') {
        setAttemptId(null)
        setError('The payment was not completed. No charge was made. You can try again.')
        setBusy(false)
        return
      }

      // The processor is still deciding. The return page will read the real
      // status from the server; the URL is never treated as proof of payment.
      window.location.assign(withPaymentReference(returnUrl, data.paymentId))
    } catch {
      setError(
        'We could not reach the server. Your payment may still be processing. Do not pay again — reload this page and check the status first, or contact the office.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="mt-5">
      <div className="space-y-4">
        <EmailElement />
        <PaymentElement onChange={(event) => setReady(event.complete)} />
        <BrandingElement />
      </div>

      {error ? (
        <div className="mt-4 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
          <p className="text-[11.5px] font-semibold text-error">Payment not completed</p>
          <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">{error}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handlePay}
        disabled={!ready || busy || !payments || !whop}
        aria-disabled={!ready || busy || !payments || !whop}
        className="group mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[2px] border border-copper bg-copper px-6 py-3.5 text-sm font-semibold text-cream transition-colors duration-200 hover:border-copper-deep hover:bg-copper-deep disabled:cursor-not-allowed disabled:border-ink/20 disabled:bg-ink/20"
      >
        {busy ? 'Processing…' : `Pay ${amountLabel}`}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
      <p className="mt-3 text-center text-[10px] leading-[1.65] text-slate">
        Payment is processed by Whop. Card details stay in Whop&apos;s PCI-isolated fields and
        never reach this site. The deposit is applied to the project total only as stated in the
        written agreement. Whop will ask you to consent before saving the card for the final
        balance; saving the card does not charge it.
      </p>
    </div>
  )
}
