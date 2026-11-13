import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Header } from '../components/site/Header'
import { Footer } from '../components/site/ContactFooter'
import { ButtonLink, Container, Eyebrow, SampleTag } from '../components/site/primitives'
import { Check, Info, Mail, Phone } from '../components/site/icons'
import { siteConfig } from '@/config'
import { normalizeProjectRef } from '../lib/project'

type ReturnSearch = {
  project?: string
  payment?: string
  status?: string
  plan?: string
}

export const Route = createFileRoute('/deposit/return')({
  validateSearch: (search: Record<string, unknown>): ReturnSearch => ({
    project: typeof search.project === 'string' ? search.project : undefined,
    payment: typeof search.payment === 'string' ? search.payment : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
    plan: typeof search.plan === 'string' ? search.plan : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Deposit Status | ${siteConfig.name}` },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: DepositReturnPage,
})

type VerifiedStatus = {
  status: string
  paid: boolean
  failed: boolean
  pending: boolean
  planKey: string | null
  planName: string | null
  amountLabel: string | null
  currency: string
}

type ReturnState =
  | { kind: 'loading' }
  | { kind: 'result'; payment: VerifiedStatus }
  | { kind: 'missing' }
  | { kind: 'error' }

const PAYMENT_PATTERN = /^pay_[A-Za-z0-9]{6,120}$/

function DepositReturnPage() {
  const { project, payment, plan } = Route.useSearch()
  const projectRef = normalizeProjectRef(project)
  const requestedPlan = typeof plan === 'string' ? plan : null
  const paymentId =
    typeof payment === 'string' && PAYMENT_PATTERN.test(payment) ? payment : null
  const [state, setState] = useState<ReturnState>({ kind: 'loading' })

  useEffect(() => {
    if (!projectRef || !paymentId) {
      setState({ kind: 'missing' })
      return
    }

    let cancelled = false
    let timer: number | undefined
    let attempts = 0

    const check = async () => {
      attempts += 1

      try {
        const params = new URLSearchParams({ project: projectRef, payment: paymentId })
        const response = await fetch(`/api/whop/payment-status?${params.toString()}`, {
          headers: { accept: 'application/json' },
        })
        const body: unknown = await response.json().catch(() => null)

        if (cancelled) return

        if (!response.ok || typeof body !== 'object' || body === null) {
          if (attempts === 1) setState({ kind: 'error' })
          return
        }

        const record = body as Record<string, unknown>
        if (record.ok !== true) {
          if (attempts === 1) setState({ kind: 'error' })
          return
        }

        const verified: VerifiedStatus = {
          status: typeof record.status === 'string' ? record.status : 'unknown',
          paid: record.paid === true,
          failed: record.failed === true,
          pending: record.pending === true,
          planKey: typeof record.planKey === 'string' ? record.planKey : null,
          planName: typeof record.planName === 'string' ? record.planName : null,
          amountLabel: typeof record.amountLabel === 'string' ? record.amountLabel : null,
          currency: typeof record.currency === 'string' ? record.currency.toUpperCase() : 'USD',
        }

        setState({ kind: 'result', payment: verified })

        if (!verified.paid && !verified.failed && attempts < 6) {
          timer = window.setTimeout(check, 5000)
        }
      } catch {
        if (!cancelled && attempts === 1) setState({ kind: 'error' })
      }
    }

    void check()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [projectRef, paymentId])

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
        <section className="border-b border-line bg-cream">
          <Container className="py-14 sm:py-16 lg:py-20">
            <Eyebrow>Deposit status</Eyebrow>
            <h1 className="mt-5 max-w-[720px] font-display text-[clamp(2.4rem,4.4vw,3.9rem)] font-medium leading-[1.03] tracking-[-0.03em] text-ink balance">
              Checking your payment with Whop.
            </h1>
            <p className="mt-5 max-w-[600px] text-[14px] leading-[1.85] text-slate pretty">
              This page reads the payment status from the payment processor. A URL parameter alone
              is never treated as proof that a payment succeeded.
            </p>
          </Container>
        </section>

        <section className="bg-paper">
          <Container className="py-12 sm:py-16">
            <div className="mx-auto max-w-[720px]">
              {state.kind === 'loading' ? <LoadingStatus /> : null}
              {state.kind === 'missing' ? (
                <MissingReference projectRef={projectRef} />
              ) : null}
              {state.kind === 'error' ? (
                <LookupError projectRef={projectRef} />
              ) : null}
              {state.kind === 'result' ? (
                <VerifiedResult
                  payment={state.payment}
                  projectRef={projectRef ?? ''}
                  paymentId={paymentId ?? ''}
                  requestedPlan={requestedPlan}
                />
              ) : null}
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  )
}

function StatusShell({
  tone,
  label,
  title,
  children,
}: {
  tone: 'success' | 'warning' | 'error' | 'pending'
  label: string
  title: string
  children: React.ReactNode
}) {
  const toneClasses =
    tone === 'success'
      ? 'border-[#2f7d5b]/35 bg-[#f1f8f4]'
      : tone === 'error'
        ? 'border-error/30 bg-[#fbf0ec]'
        : 'border-copper/30 bg-cream'

  const labelClasses =
    tone === 'success'
      ? 'text-[#2f7d5b]'
      : tone === 'error'
        ? 'text-error'
        : 'text-copper'

  return (
    <div className={`border p-6 shadow-card-tight sm:p-8 ${toneClasses}`}>
      <p className={`text-[9px] font-bold uppercase tracking-[0.24em] ${labelClasses}`}>{label}</p>
      <h2 className="mt-3 font-display text-[clamp(1.9rem,3.2vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink">
        {title}
      </h2>
      <div className="mt-4 text-[13px] leading-[1.8] text-slate">{children}</div>
    </div>
  )
}

function LoadingStatus() {
  return (
    <div className="border border-ink/12 bg-cream p-8 text-center" role="status" aria-live="polite">
      <span className="mx-auto block size-6 animate-spin border-2 border-copper/30 border-t-copper" />
      <p className="mt-4 text-[12px] font-semibold text-ink">Verifying payment status…</p>
      <p className="mt-2 text-[11px] text-slate">This can take a few seconds.</p>
    </div>
  )
}

function MissingReference({ projectRef }: { projectRef: string | null }) {
  return (
    <>
      <StatusShell tone="warning" label="Verification needed" title="We need the full payment reference.">
        <p>
          Open the return link exactly as it was provided after payment, or contact the office.
          Do not pay again until the status is confirmed.
        </p>
        {projectRef ? (
          <p className="mt-3">
            Project reference:{' '}
            <span className="font-semibold text-ink">{projectRef}</span>
          </p>
        ) : null}
      </StatusShell>
      <ContactBlock />
    </>
  )
}

function LookupError({ projectRef }: { projectRef: string | null }) {
  return (
    <>
      <StatusShell tone="error" label="Status unavailable" title="We couldn't verify the payment.">
        <p>
          The payment processor could not be reached or returned an unexpected response. No
          success is being claimed. Do not pay again — contact the office so the payment can be
          checked first.
        </p>
        {projectRef ? (
          <p className="mt-3">
            Project reference:{' '}
            <span className="font-semibold text-ink">{projectRef}</span>
          </p>
        ) : null}
      </StatusShell>
      <ContactBlock />
    </>
  )
}

function VerifiedResult({
  payment,
  projectRef,
  paymentId,
  requestedPlan,
}: {
  payment: VerifiedStatus
  projectRef: string
  paymentId: string
  requestedPlan: string | null
}) {
  const isDepositPlan =
    payment.planKey === 'deposit' || payment.planKey === 'legacy-deposit'
  const retryPlan = payment.planKey ?? requestedPlan
  const retryHref = retryPlan
    ? `/deposit?plan=${encodeURIComponent(retryPlan)}&project=${encodeURIComponent(projectRef)}`
    : `/deposit?project=${encodeURIComponent(projectRef)}`

  if (payment.paid) {
    return (
      <>
        <StatusShell
          tone="success"
          label="Verified by Whop"
          title={isDepositPlan ? 'Deposit received.' : 'Payment received.'}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center border border-[#2f7d5b]/35 text-[#2f7d5b]">
              <Check className="size-4" />
            </span>
            <div>
              <p>
                Whop reports this payment as paid
                {payment.amountLabel ? (
                  <>
                    {' '}
                    for <span className="font-semibold text-ink">{payment.amountLabel}</span>
                  </>
                ) : null}
                . Keep this page or your payment reference for your records.
              </p>
              <p className="mt-3">
                {isDepositPlan
                  ? 'The deposit is applied to the project total only as stated in your written agreement. This page does not replace a receipt from Whop or a signed contract.'
                  : 'The plan is confirmed in the processor record. This page does not replace a receipt from Whop or the written scope for the work.'}
              </p>
            </div>
          </div>
          <dl className="mt-5 space-y-2 border-t border-[#2f7d5b]/20 pt-4 text-[11.5px]">
            {payment.planName ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-slate">Plan</dt>
                <dd className="font-semibold text-ink">{payment.planName}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-slate">Reference</dt>
              <dd className="font-semibold text-ink">{projectRef}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-slate">Payment reference</dt>
              <dd className="font-mono text-[11px] font-semibold text-ink">{paymentId}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-slate">Processor status</dt>
              <dd className="font-semibold text-ink">{payment.status}</dd>
            </div>
          </dl>
        </StatusShell>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" className="w-full sm:w-auto">
            Back to the homepage
          </ButtonLink>
          {isDepositPlan ? (
            <ButtonLink href="/deposit/save-card" variant="secondary" className="w-full sm:w-auto">
              Save a card for the final balance
            </ButtonLink>
          ) : null}
        </div>
      </>
    )
  }

  if (payment.failed) {
    return (
      <>
        <StatusShell
          tone="error"
          label="Payment not completed"
          title="The payment was not completed."
        >
          <p>
            Whop reports this payment as <span className="font-semibold text-ink">{payment.status}</span>.
            No completion is being claimed. If your bank shows a charge, contact the office with
            the payment reference before trying again.
          </p>
          <p className="mt-3">
            Reference: <span className="font-semibold text-ink">{projectRef}</span>
            <br />
            Payment reference: <span className="font-mono text-[11px]">{paymentId}</span>
          </p>
        </StatusShell>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={retryHref} className="w-full sm:w-auto">
            Return to checkout
          </ButtonLink>
        </div>
        <ContactBlock />
      </>
    )
  }

  return (
    <>
      <StatusShell tone="pending" label="Still processing" title="Your payment is not final yet.">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center border border-copper/30 text-copper">
            <Info className="size-4" />
          </span>
          <div>
            <p>
              Whop reports this payment as{' '}
              <span className="font-semibold text-ink">{payment.status}</span>. That is not a
              confirmed success. Do not pay again — the office will verify the payment and follow
              up.
            </p>
            <p className="mt-3">
              Project reference: <span className="font-semibold text-ink">{projectRef}</span>
              <br />
              Payment reference: <span className="font-mono text-[11px]">{paymentId}</span>
            </p>
          </div>
        </div>
      </StatusShell>
      <ContactBlock />
    </>
  )
}

function ContactBlock() {
  return (
    <div className="mt-6 border border-line bg-cream p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate">Need help?</p>
        <SampleTag>Sample</SampleTag>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href={siteConfig.phone.href}
          className="flex items-center gap-3 text-[12.5px] text-ink transition-colors hover:text-copper"
        >
          <Phone className="size-4 text-copper" />
          {siteConfig.phone.display}
        </a>
        <a
          href={siteConfig.email.href}
          className="flex items-center gap-3 text-[12.5px] text-slate transition-colors hover:text-copper"
        >
          <Mail className="size-4 text-copper" />
          {siteConfig.email.display}
        </a>
      </div>
      <p className="mt-3 text-[10px] leading-[1.7] text-slate">
        Contact details are sample placeholders and must be replaced before launch.
      </p>
    </div>
  )
}
