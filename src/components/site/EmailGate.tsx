import { useEffect, useRef, useState, type FormEvent } from 'react'

import { copy, pricingPlans } from '@/config'
import type { CheckoutPlanKey } from '../../lib/checkout-plans'
import { normalizeCustomerEmail } from '../../lib/customer'
import { ArrowRight, Check, Info, Mail } from './icons'
import { ButtonLink, Container, Eyebrow } from './primitives'

type GateState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; sent: boolean; configured: boolean; message: string }
  | { kind: 'error'; message: string }

type EmailResponse = {
  ok?: boolean
  sent?: boolean
  configured?: boolean
  message?: string
}

export function EmailGate({
  email,
  selectedPlanKey,
  emailSent,
  emailConfigured,
  onSaved,
}: {
  email: string
  selectedPlanKey: CheckoutPlanKey | null
  emailSent: boolean
  emailConfigured: boolean
  onSaved: (email: string, sent: boolean, configured: boolean) => void
}) {
  const [editing, setEditing] = useState(!email)
  const [value, setValue] = useState(email)
  const [state, setState] = useState<GateState>({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(email)
    setEditing(!email)
  }, [email])

  const selectedPlan = selectedPlanKey
    ? pricingPlans.find((plan) => plan.key === selectedPlanKey)
    : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalized = normalizeCustomerEmail(value)
    if (!normalized) {
      setState({ kind: 'error', message: 'Enter a valid email address.' })
      inputRef.current?.focus()
      return
    }

    setState({ kind: 'submitting' })

    try {
      const response = await fetch('/api/estimate-email', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          email: normalized,
          planKey: selectedPlanKey ?? undefined,
        }),
      })
      const body: unknown = await response.json().catch(() => null)
      const record =
        typeof body === 'object' && body !== null ? (body as EmailResponse) : null

      if (!response.ok || record?.ok !== true) {
        setState({
          kind: 'error',
          message:
            typeof record?.message === 'string'
              ? record.message
              : 'Your email could not be saved. Check your connection and try again.',
        })
        return
      }

      const sent = record.sent === true
      const configured = record.configured === true
      const message =
        typeof record.message === 'string'
          ? record.message
          : sent
            ? 'A confirmation email is on its way. You can choose a plan now.'
            : 'Your email is saved for this visit. You can still choose a plan.'

      onSaved(normalized, sent, configured)
      setState({ kind: 'success', sent, configured, message })
      setEditing(false)
    } catch {
      setState({
        kind: 'error',
        message: 'Your email could not be saved. Check your connection and try again.',
      })
    }
  }

  const savedMessage =
    state.kind === 'success'
      ? state.message
      : emailSent
        ? 'A confirmation email was accepted for this address. You can choose any plan below.'
        : emailConfigured
          ? 'Your email is saved. The confirmation could not be sent, but you can still choose a plan.'
          : copy.emailGate.unconfiguredNote

  return (
    <section
      id="start"
      aria-labelledby="email-gate-heading"
      className="relative overflow-hidden border-b border-line bg-paper"
    >
      <div
        className="blueprint-grid pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <Container className="relative py-16 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>{copy.emailGate.eyebrow}</Eyebrow>
            <h2
              id="email-gate-heading"
              className="mt-5 max-w-[660px] font-display text-[clamp(2.4rem,4.4vw,4rem)] font-medium leading-[1.03] tracking-[-0.035em] text-ink balance"
            >
              {copy.emailGate.title}
            </h2>
            <p className="mt-6 max-w-[560px] text-[14.5px] leading-[1.85] text-slate pretty">
              {copy.emailGate.intro}
            </p>

            <ul className="mt-7 grid gap-3 border-t border-line pt-6">
              {copy.emailGate.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[12.5px] text-ink/80">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center border border-copper/30 text-copper">
                    <Check className="size-3" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative border border-ink/12 bg-cream p-5 shadow-card sm:p-7">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-copper" aria-hidden="true" />
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center border border-copper/30 bg-copper/[0.06] text-copper">
                <Mail className="size-5" />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">
                  {email ? copy.emailGate.savedLabel : copy.emailGate.formLabel}
                </p>
                <p className="mt-2 break-all text-[15px] font-semibold text-ink">
                  {email || 'No email saved yet'}
                </p>
              </div>
            </div>

            {selectedPlan ? (
              <div className="mt-5 flex items-center justify-between gap-3 border border-line bg-paper px-4 py-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate">
                  {copy.emailGate.selectedLabel}
                </span>
                <span className="text-right text-[12px] font-semibold text-ink">
                  {selectedPlan.name} · ${selectedPlan.amountUsd}
                </span>
              </div>
            ) : (
              <p className="mt-5 border border-line bg-paper px-4 py-3 text-[11.5px] leading-[1.65] text-slate">
                {copy.emailGate.noPlan}
              </p>
            )}

            {!editing ? (
              <>
                <p className="mt-5 flex gap-3 border border-copper/20 bg-copper/[0.05] p-4 text-[11.5px] leading-[1.7] text-slate">
                  <Info className="mt-0.5 size-4 shrink-0 text-copper" />
                  <span>{savedMessage}</span>
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <ButtonLink href="#pricing" className="w-full">
                    {copy.emailGate.continueLabel}
                  </ButtonLink>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true)
                      setState({ kind: 'idle' })
                      window.setTimeout(() => inputRef.current?.focus(), 0)
                    }}
                    className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate underline decoration-line underline-offset-4 transition-colors hover:text-ink"
                  >
                    {copy.emailGate.changeLabel}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5" noValidate>
                <label
                  htmlFor="journey-email"
                  className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate"
                >
                  {copy.emailGate.label}
                </label>
                <input
                  ref={inputRef}
                  id="journey-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value)
                    if (state.kind === 'error') setState({ kind: 'idle' })
                  }}
                  placeholder={copy.emailGate.placeholder}
                  aria-invalid={state.kind === 'error'}
                  aria-describedby={state.kind === 'error' ? 'journey-email-error' : undefined}
                  className="mt-2 w-full rounded-[2px] border border-ink/15 bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30"
                />

                {state.kind === 'error' ? (
                  <p id="journey-email-error" role="alert" className="mt-2 text-[11.5px] text-error">
                    {state.message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={state.kind === 'submitting'}
                  className="group mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[2px] border border-copper bg-copper px-6 py-3.5 text-sm font-semibold tracking-[0.01em] text-cream shadow-button transition-colors duration-200 hover:border-copper-deep hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {state.kind === 'submitting' ? 'Saving your email…' : copy.emailGate.cta}
                  </span>
                  {state.kind === 'submitting' ? (
                    <span className="size-4 animate-spin border-2 border-cream/30 border-t-cream" />
                  ) : (
                    <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                  )}
                </button>

                <p className="mt-3 text-[10.5px] leading-[1.65] text-slate">
                  {copy.emailGate.privacy}
                </p>
                <p className="mt-1.5 text-[10.5px] leading-[1.65] text-slate">
                  {copy.emailGate.configuredNote}
                </p>

                {email ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false)
                      setValue(email)
                      setState({ kind: 'idle' })
                    }}
                    className="mt-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate underline decoration-line underline-offset-4 transition-colors hover:text-ink"
                  >
                    Keep {email}
                  </button>
                ) : null}
              </form>
            )}

            <p aria-live="polite" className="sr-only">
              {state.kind === 'success' ? state.message : ''}
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
