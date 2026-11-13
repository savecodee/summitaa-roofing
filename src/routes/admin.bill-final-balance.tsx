import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Header } from '../components/site/Header'
import { Footer } from '../components/site/ContactFooter'
import { ButtonLink, Container, Eyebrow, SampleTag } from '../components/site/primitives'
import { ArrowRight, Check, Info, Loader2 } from '../components/site/icons'
import { siteConfig } from '@/config'

type BillFinalBalanceState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; result: BillResult }
  | { kind: 'error'; message: string }

type BillResult = {
  invoiceId: string | null
  invoiceUrl: string | null
  autoCharged: boolean
  balanceDueCents: number
  currency: string
  note: string
}

function formatCents(cents: number, currency = 'usd'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

export const Route = createFileRoute('/admin/bill-final-balance')({
  head: () => ({
    meta: [
      { title: `Bill Final Balance | ${siteConfig.name}` },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: BillFinalBalancePage,
})

function BillFinalBalancePage() {
  const [projectRef, setProjectRef] = useState('')
  const [depositPaymentId, setDepositPaymentId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [projectTotalCents, setProjectTotalCents] = useState(0)
  const [dueInDays, setDueInDays] = useState(14)
  const [operatorToken, setOperatorToken] = useState('')
  const [state, setState] = useState<BillFinalBalanceState>({ kind: 'idle' })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState({ kind: 'loading' })

    try {
      const response = await fetch('/api/whop/final-invoice', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          projectRef,
          depositPaymentId,
          customerName,
          email: customerEmail,
          projectTotalCents,
          dueInDays,
        }),
      })

      const data = await response.json().catch(() => ({ ok: false, message: 'Invalid response' }))

      if (!response.ok || data.ok !== true) {
        setState({
          kind: 'error',
          message: data.message ?? 'Failed to create final invoice.',
        })
        return
      }

      setState({
        kind: 'success',
        result: {
          invoiceId: data.invoice?.id ?? null,
          invoiceUrl: data.invoiceUrl ?? data.invoice?.url ?? null,
          autoCharged: data.autoCharged === true,
          balanceDueCents: data.balanceDueCents ?? 0,
          currency: data.currency ?? 'usd',
          note: data.note ?? '',
        },
      })
    } catch {
      setState({
        kind: 'error',
        message: 'Could not reach the server. Check the operator token and try again.',
      })
    }
  }

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
          <div className="blueprint-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
          <Container className="relative py-14 sm:py-16 lg:py-20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Eyebrow>Admin</Eyebrow>
              <SampleTag>Operator only</SampleTag>
            </div>
            <h1 className="mt-5 max-w-[760px] font-display text-[clamp(2.5rem,4.8vw,4.4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance">
              Bill final balance
            </h1>
            <p className="mt-6 max-w-[620px] text-[14.5px] leading-[1.85] text-slate pretty">
              Create a final invoice for the remaining project balance after a verified deposit.
              If a payment method was saved during the deposit flow, the balance will be auto-charged.
              Otherwise, the invoice is sent to the customer for manual payment.
            </p>
          </Container>
        </section>

        <section className="bg-paper">
          <Container className="py-12 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-[720px]">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="border border-ink/12 bg-cream p-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">Authentication</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="operator-token" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                        Operator token <span className="text-copper" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="operator-token"
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="WHOP_OPERATOR_TOKEN value"
                        value={operatorToken}
                        onChange={(e) => setOperatorToken(e.target.value)}
                        className="mt-2 w-full rounded-[2px] border border-ink/15 bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-ink/12 bg-cream p-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">Project & deposit</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="project-ref" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                        Project reference <span className="text-copper" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="project-ref"
                        type="text"
                        required
                        placeholder="PRJ-ABC123"
                        value={projectRef}
                        onChange={(e) => setProjectRef(e.target.value)}
                        className="mt-2 w-full rounded-[2px] border border-ink/15 bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="deposit-payment-id" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                        Deposit payment ID <span className="text-copper" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="deposit-payment-id"
                        type="text"
                        required
                        placeholder="pay_..."
                        value={depositPaymentId}
                        onChange={(e) => setDepositPaymentId(e.target.value)}
                        className="mt-2 w-full rounded-[2px] border border-ink/15 bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-ink/12 bg-cream p-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">Customer & invoice details</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="customer-name" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                        Customer name <span className="text-copper" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="customer-name"
                        type="text"
                        required
                        placeholder="Jordan Miller"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="mt-2 w-full rounded-[2px] border border-ink/15 bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="customer-email" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                        Customer email <span className="text-copper" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="customer-email"
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        placeholder="customer@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="mt-2 w-full rounded-[2px] border border-ink/15 bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="project-total" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                        Project total (cents) <span className="text-copper" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="project-total"
                        type="number"
                        required
                        min="100"
                        step="1"
                        placeholder="1500000"
                        value={projectTotalCents}
                        onChange={(e) => setProjectTotalCents(Number(e.target.value) || 0)}
                        className="mt-2 w-full rounded-[2px] border border-ink/15 bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30"
                      />
                      <p className="mt-1.5 text-[10px] text-slate">Example: 1500000 = $15,000.00</p>
                    </div>
                    <div>
                      <label htmlFor="due-in-days" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                        Due in days
                      </label>
                      <input
                        id="due-in-days"
                        type="number"
                        min="1"
                        max="90"
                        step="1"
                        placeholder="14"
                        value={dueInDays}
                        onChange={(e) => setDueInDays(Number(e.target.value) || 14)}
                        className="mt-2 w-full rounded-[2px] border border-ink/15 bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={state.kind === 'loading'}
                    className="flex-1 inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[2px] border border-copper bg-copper px-6 py-3.5 text-sm font-semibold text-cream transition-colors duration-200 hover:border-copper-deep hover:bg-copper-deep disabled:cursor-not-allowed disabled:border-ink/20 disabled:bg-ink/20"
                  >
                    {state.kind === 'loading' ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating invoice…
                      </>
                    ) : (
                      <>
                        Bill final balance
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                  <ButtonLink href="/" variant="secondary" className="flex-1">
                    Back to homepage
                  </ButtonLink>
                </div>

                {state.kind === 'error' && (
                  <div className="border border-error/30 bg-[#fbf0ec] p-4" role="alert">
                    <p className="text-[12px] font-bold text-error">Invoice creation failed</p>
                    <p className="mt-1.5 text-[11px] leading-[1.7] text-slate">{state.message}</p>
                  </div>
                )}

                {state.kind === 'success' && (
                  <div className="border border-[#2f7d5b]/35 bg-[#f1f8f4] p-5" role="status">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center border border-[#2f7d5b]/35 text-[#2f7d5b]">
                        <Check className="size-4" />
                      </span>
                      <div>
                        <p className="font-display text-[24px] font-medium leading-tight tracking-[-0.02em] text-ink">
                          {state.result.autoCharged ? 'Balance auto-charged' : 'Invoice sent for manual payment'}
                        </p>
                        <p className="mt-2 text-[12px] leading-[1.75] text-slate">{state.result.note}</p>
                        <dl className="mt-4 space-y-2 border-t border-[#2f7d5b]/20 pt-4 text-[11.5px]">
                          {state.result.invoiceId && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <dt className="text-slate">Invoice ID</dt>
                              <dd className="font-mono text-[11px] font-semibold text-ink">{state.result.invoiceId}</dd>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-slate">Balance due</dt>
                            <dd className="font-semibold text-ink">{formatCents(state.result.balanceDueCents, state.result.currency)}</dd>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-slate">Auto-charged</dt>
                            <dd className="font-semibold text-ink">{state.result.autoCharged ? 'Yes' : 'No'}</dd>
                          </div>
                          {state.result.invoiceUrl && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <dt className="text-slate">Invoice URL</dt>
                              <dd className="font-mono text-[10px] text-ink max-w-[300px] truncate">{state.result.invoiceUrl}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3 border border-copper/20 bg-copper/[0.05] p-4">
                  <Info className="mt-0.5 size-4 shrink-0 text-copper" />
                  <p className="text-[11px] leading-[1.7] text-slate">
                    This is a demo admin view. In production, protect this route with proper authentication
                    and authorization. The operator token must match <code className="font-mono text-[10px] bg-ink/5 px-1.5 py-0.5 rounded">WHOP_OPERATOR_TOKEN</code>.
                  </p>
                </div>
              </form>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  )
}