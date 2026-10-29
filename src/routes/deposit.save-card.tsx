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
import { ArrowRight, Check, Info } from '../components/site/icons'
import { whopPublicConfig } from '../config/whop'
import { makeDepositAttemptId } from '../lib/deposit'
import { buildSaveCardReturnUrl, isSetupIntentId } from '../lib/save-card'

type SaveCardSearch = {
  setup?: string
  status?: string
}

export const Route = createFileRoute('/deposit/save-card')({
  validateSearch: (search: Record<string, unknown>): SaveCardSearch => ({
    setup: typeof search.setup === 'string' ? search.setup : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Save a Card for the Final Balance | Summitaa Roofing' },
      {
        name: 'description',
        content:
          'Save a card with Whop for the remaining project balance. Saving a card does not charge it.',
      },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: SaveCardPage,
})

type SaveResponse = {
  ok?: boolean
  code?: string
  message?: string
  setupIntentId?: string
  status?: string
  clientSecret?: string | null
  saved?: boolean
  canceled?: boolean
}

type Verification = {
  status: string
  succeeded: boolean
  canceled: boolean
  processing: boolean
}

type PageResult =
  | { kind: 'saved'; setupIntentId: string; status: string }
  | { kind: 'pending'; setupIntentId: string; status: string }
  | { kind: 'failed'; setupIntentId: string; status: string }

function readErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const code = (error as Record<string, unknown>).code
  return typeof code === 'string' ? code : null
}

function SaveCardPage() {
  const { setup } = Route.useSearch()
  const [elements, setElements] = useState<WhopLoad | null>(null)
  const [sdkError, setSdkError] = useState<string | null>(null)
  const [verification, setVerification] = useState<Verification | null>(null)
  const [verifyError, setVerifyError] = useState(false)

  useEffect(() => {
    let active = true

    import('@whop/elements')
      .then(({ loadWhop }) => {
        if (active) setElements(loadWhop())
      })
      .catch(() => {
        if (active) setSdkError('The secure card library could not be loaded.')
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isSetupIntentId(setup)) return

    let cancelled = false
    fetch(`/api/whop/save-card?setupIntentId=${encodeURIComponent(setup)}`, {
      headers: { accept: 'application/json' },
    })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null)
        if (cancelled) return
        if (!response.ok || typeof body !== 'object' || body === null) {
          setVerifyError(true)
          return
        }
        const record = body as Record<string, unknown>
        if (record.ok !== true) {
          setVerifyError(true)
          return
        }
        setVerification({
          status: typeof record.status === 'string' ? record.status : 'unknown',
          succeeded: record.succeeded === true,
          canceled: record.canceled === true,
          processing: record.processing === true,
        })
      })
      .catch(() => {
        if (!cancelled) setVerifyError(true)
      })

    return () => {
      cancelled = true
    }
  }, [setup])

  const returnUrl = useMemo(
    () =>
      typeof window === 'undefined' ? null : buildSaveCardReturnUrl(window.location.origin),
    [],
  )

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
              <Eyebrow>Card on file</Eyebrow>
              <span className="inline-flex items-center gap-2 border border-ink/15 bg-paper px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate">
                <span className="size-1.5 bg-copper" aria-hidden="true" />
                Saved by Whop
              </span>
            </div>
            <h1 className="mt-5 max-w-[760px] font-display text-[clamp(2.5rem,4.8vw,4.4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance">
              Put a card on file for the final balance.
            </h1>
            <p className="mt-6 max-w-[620px] text-[14.5px] leading-[1.85] text-slate pretty">
              This saves a payment method with Whop without charging it. Use it when the office
              asks for a card for the remaining project balance.
            </p>
          </Container>
        </section>

        <section className="bg-paper">
          <Container className="py-12 sm:py-16 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
              <aside>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate">
                  What this does
                </p>
                <div className="mt-4 border border-ink/12 bg-cream p-6">
                  <ul className="space-y-4 text-[12px] leading-[1.75] text-slate">
                    <li className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-copper" />
                      Saves a card with Whop for the final invoice.
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-copper" />
                      Charges nothing today.
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-copper" />
                      Keeps card details inside Whop&apos;s PCI-isolated fields.
                    </li>
                  </ul>
                </div>

                <div className="mt-5 flex gap-3 border border-copper/20 bg-copper/[0.05] p-4">
                  <Info className="mt-0.5 size-4 shrink-0 text-copper" />
                  <p className="text-[11px] leading-[1.7] text-slate">
                    Saving a card is not a payment and does not approve a charge. The office sends
                    a final invoice for the remaining balance; any automatic charge is used only
                    with your approval or the terms in your signed agreement.
                  </p>
                </div>
              </aside>

              <div className="relative border border-ink/12 bg-cream p-5 shadow-[0_30px_70px_-54px_rgba(8,23,32,0.55)] sm:p-7">
                <span className="absolute inset-x-0 top-0 h-0.5 bg-copper" aria-hidden="true" />
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">
                      Secure card save
                    </p>
                    <h2 className="mt-2 font-display text-[27px] font-medium leading-none tracking-[-0.02em] text-ink">
                      No charge today
                    </h2>
                  </div>
                  <SampleTag>Whop Elements</SampleTag>
                </div>

                {!returnUrl ? (
                  <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
                    <p className="text-[12px] font-bold text-error">
                      Card saving cannot start from this address.
                    </p>
                  </div>
                ) : sdkError ? (
                  <div className="mt-5 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
                    <p className="text-[12px] font-bold text-error">{sdkError}</p>
                  </div>
                ) : !elements ? (
                  <LoadingBlock />
                ) : (
                  <WhopElements
                    elements={elements}
                    onLoadError={() =>
                      setSdkError('The secure card library could not be loaded.')
                    }
                  >
                    <Payments
                      accountId={whopPublicConfig.accountId}
                      mode="setup"
                      currency="usd"
                      setupFutureUsage="off_session"
                      returnUrl={returnUrl}
                      fallback={<LoadingBlock />}
                    >
                      <SaveCardForm
                        returnUrl={returnUrl}
                        verification={verification}
                        verifyError={verifyError}
                      />
                    </Payments>
                  </WhopElements>
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

function LoadingBlock() {
  return (
    <div className="mt-5 flex items-center gap-3 border border-line bg-paper p-4" role="status">
      <span className="size-5 animate-spin border-2 border-copper/30 border-t-copper" />
      <p className="text-[11.5px] text-slate">Loading the secure card form...</p>
    </div>
  )
}

function SaveCardForm({
  returnUrl,
  verification,
  verifyError,
}: {
  returnUrl: string
  verification: Verification | null
  verifyError: boolean
}) {
  const payments = usePayments()
  const whop = useWhop()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PageResult | null>(null)

  const finish = (next: PageResult) => {
    setResult(next)
    setBusy(false)
  }

  const handleSave = async () => {
    if (!payments || !whop || busy || !ready || result) return

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
          ? 'Card saving was cancelled. Nothing was charged or saved.'
          : 'We could not read the card details. Nothing was charged or saved. Please try again.',
      )
      setBusy(false)
      return
    }

    try {
      const response = await fetch('/api/whop/save-card', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ attemptId: attempt, confirmationToken }),
      })

      const data: SaveResponse = await response
        .json()
        .catch(() => ({ ok: false, message: 'Unexpected card response.' }))

      if (!response.ok || data.ok !== true || !data.setupIntentId) {
        setError(data.message ?? 'The card could not be saved. Nothing was charged.')
        setBusy(false)
        return
      }

      if (data.saved) {
        finish({ kind: 'saved', setupIntentId: data.setupIntentId, status: data.status ?? 'succeeded' })
        return
      }

      if (data.canceled) {
        setAttemptId(null)
        setError('The card was not saved. Nothing was charged. You can try again.')
        setBusy(false)
        return
      }

      if (data.clientSecret) {
        const next = await whop.payments.handleNextAction({
          clientSecret: data.clientSecret,
          returnUrl,
        })

        if (next.redirected) return

        if (next.status === 'succeeded' || next.status === 'paid') {
          finish({ kind: 'saved', setupIntentId: data.setupIntentId, status: next.status })
          return
        }

        if (next.status === 'processing' || next.status === 'pending') {
          finish({ kind: 'pending', setupIntentId: data.setupIntentId, status: next.status })
          return
        }

        setAttemptId(null)
        setError(
          next.lastPaymentError?.message
            ? `The card was not saved: ${next.lastPaymentError.message}`
            : 'The card was not saved. Nothing was charged. You can try again.',
        )
        setBusy(false)
        return
      }

      finish({
        kind: 'pending',
        setupIntentId: data.setupIntentId,
        status: data.status ?? 'processing',
      })
    } catch {
      setError(
        'We could not reach the server. The card may still be saving. Do not try again until you check with the office.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="mt-5">
      {verifyError ? (
        <div className="mb-4 border border-copper/30 bg-cream p-4" role="alert">
          <p className="text-[11.5px] font-semibold text-ink">
            We could not verify the saved card yet.
          </p>
          <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
            No charge is being claimed. Contact the office if you are unsure whether the card was
            saved.
          </p>
        </div>
      ) : verification ? (
        <div className="mb-4 border border-[#2f7d5b]/35 bg-[#f1f8f4] p-4" role="status">
          <p className="text-[11.5px] font-semibold text-[#2f7d5b]">
            {verification.succeeded
              ? 'Whop confirms the card is saved.'
              : verification.canceled
                ? 'Whop reports the card was not saved.'
                : 'Whop is still processing the card.'}
          </p>
          <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">
            {verification.succeeded
              ? 'Nothing was charged. The office can use this card only for the final invoice.'
              : verification.canceled
                ? 'Nothing was charged. You can try again with another card.'
                : 'Nothing was charged. The office will confirm the result.'}
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="border border-[#2f7d5b]/35 bg-[#f1f8f4] p-5" role="status">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center border border-[#2f7d5b]/35 text-[#2f7d5b]">
              <Check className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">
                {result.kind === 'saved'
                  ? 'Card saved. Nothing was charged.'
                  : result.kind === 'pending'
                    ? 'Card saved is still processing.'
                    : 'The card was not saved.'}
              </p>
              <p className="mt-2 text-[11.5px] leading-[1.75] text-slate">
                {result.kind === 'saved'
                  ? 'Whop holds the payment method. The office will send the final invoice for the remaining balance; no charge was made now.'
                  : result.kind === 'pending'
                    ? 'Whop is still deciding. The office will confirm before using the card.'
                    : 'Nothing was charged. Contact the office if you need help.'}
              </p>
              <p className="mt-2 font-mono text-[10px] text-slate">{result.setupIntentId}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/" className="w-full sm:w-auto">
              Back to the homepage
            </ButtonLink>
            <ButtonLink href="/#estimate" variant="secondary" className="w-full sm:w-auto">
              Request an estimate
            </ButtonLink>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <EmailElement />
            <PaymentElement onChange={(event) => setReady(event.complete)} />
            <BrandingElement />
          </div>

          {error ? (
            <div className="mt-4 border border-error/30 bg-[#fbf0ec] p-4" role="alert">
              <p className="text-[11.5px] font-semibold text-error">Card not saved</p>
              <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">{error}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={!ready || busy || !payments || !whop}
            aria-disabled={!ready || busy || !payments || !whop}
            className="group mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[2px] border border-copper bg-copper px-6 py-3.5 text-sm font-semibold text-cream transition-colors duration-200 hover:border-copper-deep hover:bg-copper-deep disabled:cursor-not-allowed disabled:border-ink/20 disabled:bg-ink/20"
          >
            {busy ? 'Saving...' : 'Save card — no charge'}
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
          <p className="mt-3 text-center text-[10px] leading-[1.65] text-slate">
            Whop saves the payment method and charges nothing. Card details stay in Whop&apos;s
            PCI-isolated fields and never reach this site.
          </p>
        </>
      )}
    </div>
  )
}
