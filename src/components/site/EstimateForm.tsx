import { useEffect, useRef, useState, type FormEvent } from 'react'
import { serviceOptions, siteConfig, type ServiceValue } from '../../config/site'
import {
  ESTIMATE_FIELD_LABELS,
  ESTIMATE_LIMITS,
  makeEstimateRequestId,
  validateEstimate,
  validateEstimateField,
  type EstimateErrors,
  type EstimateValues,
} from '../../lib/estimate'
import { trackEstimateRequested } from '../../lib/tracking'
import { ArrowRight, Check, ClipboardCheck, Info, Mail, Phone } from './icons'
import { Container, Eyebrow, SampleTag } from './primitives'

const initialValues: EstimateValues = {
  name: '',
  email: '',
  phone: '',
  zip: '',
  service: '',
  details: '',
}

const fieldLabels = ESTIMATE_FIELD_LABELS

const inputBase =
  'w-full rounded-[2px] border bg-white px-4 py-3.5 text-[14px] text-ink placeholder:text-slate/60 transition-[border-color,box-shadow] duration-150 focus:border-copper focus:outline-none focus:ring-2 focus:ring-copper/30'

function fieldClass(hasError: boolean) {
  return `${inputBase} ${hasError ? 'border-error bg-[#fdf6f3]' : 'border-ink/15'}`
}

type ConnectionState = 'checking' | 'ready' | 'unavailable' | 'unknown'

type AuthState = 'checking' | 'signed-out' | 'signed-in'

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; requestId: string }
  | { kind: 'error'; message: string }

const ESTIMATE_DRAFT_KEY = 'summitaa.estimate.draft'

const nextSteps = [
  {
    number: '01',
    title: 'We review your request.',
    detail: 'Your ZIP code and project notes help us understand the property and the service you need.',
  },
  {
    number: '02',
    title: 'We confirm coverage and availability.',
    detail: 'If the property is within the service area, the next step is arranging an inspection.',
  },
  {
    number: '03',
    title: 'You receive a written scope.',
    detail: 'After the inspection, findings and recommended next steps are put in writing for review.',
  },
] as const

function connectionBadge(connection: ConnectionState) {
  switch (connection) {
    case 'ready':
      return { label: 'Online submission on', dot: 'bg-[#2f7d5b]' }
    case 'unavailable':
      return { label: 'Online submission off', dot: 'bg-copper' }
    case 'checking':
      return { label: 'Checking connection', dot: 'bg-slate' }
    default:
      return { label: 'Connection unconfirmed', dot: 'bg-slate' }
  }
}

export function EstimateSection({
  preselectedService,
  selectionId,
}: {
  preselectedService: ServiceValue
  selectionId: number
}) {
  return (
    <section
      id="estimate"
      aria-labelledby="estimate-heading"
      className="relative overflow-hidden border-b border-line bg-cream"
    >
      <div className="blueprint-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <Container className="relative py-20 sm:py-24 lg:py-28">
        <div className="max-w-[720px]">
          <Eyebrow>Request an estimate</Eyebrow>
          <h2
            id="estimate-heading"
            className="mt-5 font-display text-[clamp(2.5rem,4.7vw,4.3rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance"
          >
            Tell us what&apos;s happening up there.
          </h2>
          <p className="mt-6 max-w-[580px] text-[14.5px] leading-[1.85] text-slate pretty">
            A few details help us understand the property and the service you need. Send a request
            and the office will follow up to confirm coverage and the next step.
          </p>
        </div>

        <div className="mt-11 grid gap-8 lg:mt-14 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
          <aside aria-label="What happens next" className="flex flex-col">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate">
              What happens next
            </p>
            <ol className="mt-5 border-t border-line">
              {nextSteps.map((step) => (
                <li key={step.number} className="flex gap-4 border-b border-line py-5">
                  <span className="font-display text-[16px] leading-none text-copper">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-[13px] font-bold leading-snug text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-[11.5px] leading-[1.7] text-slate">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-7 border border-line bg-paper p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate">
                  Prefer to talk?
                </p>
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
                  <span className="block text-[14px] font-bold tracking-[0.01em]">
                    {siteConfig.phone.display}
                  </span>
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

            <div className="mt-6 flex gap-3 border border-copper/20 bg-copper/[0.05] p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-copper" />
              <p className="text-[11px] leading-[1.7] text-slate">
                A real estimate is based on an inspection and a written agreement — never a form
                alone. No pricing is confirmed by this request, and no payment is collected here.
              </p>
            </div>
          </aside>

          <EstimateForm
            preselectedService={preselectedService}
            selectionId={selectionId}
          />
        </div>
      </Container>
    </section>
  )
}

function EstimateForm({
  preselectedService,
  selectionId,
}: {
  preselectedService: ServiceValue
  selectionId: number
}) {
  const [values, setValues] = useState<EstimateValues>(initialValues)
  const [errors, setErrors] = useState<EstimateErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof EstimateValues, boolean>>>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [connection, setConnection] = useState<ConnectionState>('checking')
  const [auth, setAuth] = useState<AuthState>('checking')
  const [authName, setAuthName] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' })
  const [company, setCompany] = useState('')

  const requestIdRef = useRef<string | null>(null)
  const startedAtRef = useRef(Date.now())
  const summaryRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  const selectedServiceLabel = serviceOptions.find(
    (option) => option.value === values.service,
  )?.label

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/leads', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        const body: unknown = await response.json().catch(() => null)
        if (typeof body !== 'object' || body === null) return null
        return (body as Record<string, unknown>).configured === true
      })
      .then((configured) => {
        if (configured === null) {
          setConnection('unknown')
          return
        }
        setConnection(configured ? 'ready' : 'unavailable')
      })
      .catch(() => {
        if (!controller.signal.aborted) setConnection('unknown')
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/auth/whop/session', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('auth_unavailable')
        const body: unknown = await response.json().catch(() => null)
        if (typeof body !== 'object' || body === null) throw new Error('auth_invalid')
        const record = body as Record<string, unknown>
        if (record.signedIn === true) {
          setAuth('signed-in')
          setAuthName(typeof record.name === 'string' ? record.name : null)
        } else {
          setAuth('signed-out')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setAuth('signed-out')
      })

    try {
      const raw = sessionStorage.getItem(ESTIMATE_DRAFT_KEY)
      if (raw) {
        sessionStorage.removeItem(ESTIMATE_DRAFT_KEY)
        const draft: unknown = JSON.parse(raw)
        if (typeof draft === 'object' && draft !== null) {
          const saved = draft as Record<string, unknown>
          const text = (key: keyof EstimateValues) =>
            typeof saved[key] === 'string' ? (saved[key] as string) : ''
          setValues({
            name: text('name').slice(0, ESTIMATE_LIMITS.name),
            email: text('email').slice(0, ESTIMATE_LIMITS.email),
            phone: text('phone').slice(0, 40),
            zip: text('zip').slice(0, ESTIMATE_LIMITS.zip),
            service: text('service') as ServiceValue,
            details: text('details').slice(0, ESTIMATE_LIMITS.details),
          })
        }
      }
    } catch {
      // A blocked sessionStorage simply means the draft is not restored.
    }

    return () => controller.abort()
  }, [])

  const startWhopSignIn = () => {
    try {
      sessionStorage.setItem(ESTIMATE_DRAFT_KEY, JSON.stringify(values))
    } catch {
      // The visitor can re-enter the details if storage is blocked.
    }
    window.location.assign(
      `/api/auth/whop/start?returnTo=${encodeURIComponent('/#estimate')}`,
    )
  }

  useEffect(() => {
    if (!preselectedService) return

    setValues((current) => ({ ...current, service: preselectedService }))
    setErrors((current) => ({ ...current, service: undefined }))
    setSubmitState({ kind: 'idle' })
    requestIdRef.current = null
  }, [preselectedService, selectionId])

  const updateField = (field: keyof EstimateValues, value: string) => {
    const nextValues = { ...values, [field]: value } as EstimateValues
    setValues(nextValues)

    if (submitState.kind === 'success' || submitState.kind === 'error') {
      setSubmitState({ kind: 'idle' })
      requestIdRef.current = null
      startedAtRef.current = Date.now()
    }

    if (touched[field] || errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: validateEstimateField(field, nextValues),
      }))
    }
  }

  const handleBlur = (field: keyof EstimateValues) => {
    setTouched((current) => ({ ...current, [field]: true }))
    setErrors((current) => ({
      ...current,
      [field]: validateEstimateField(field, values),
    }))
  }

  const resetForm = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setAttemptedSubmit(false)
    setCompany('')
    setSubmitState({ kind: 'idle' })
    requestIdRef.current = null
    startedAtRef.current = Date.now()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitState.kind === 'submitting') return

    const nextErrors = validateEstimate(values)
    setErrors(nextErrors)
    setAttemptedSubmit(true)
    setTouched({
      name: true,
      email: true,
      phone: true,
      zip: true,
      service: true,
      details: true,
    })

    if (Object.values(nextErrors).some(Boolean)) {
      setSubmitState({ kind: 'idle' })
      window.requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    if (connection === 'unavailable') {
      setSubmitState({
        kind: 'error',
        message:
          'Online estimate requests are not connected right now. Nothing was sent. Please call the office instead.',
      })
      window.requestAnimationFrame(() => statusRef.current?.focus())
      return
    }

    const requestId = requestIdRef.current ?? makeEstimateRequestId()
    requestIdRef.current = requestId

    // The custom pixel event fires at submission time. If Whop sign-in is
    // still required, the visitor is sent through OAuth first and the draft is
    // restored on return.
    trackEstimateRequested(requestId)

    if (auth !== 'signed-in') {
      startWhopSignIn()
      return
    }

    setSubmitState({ kind: 'submitting' })

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          ...values,
          requestId,
          startedAt: startedAtRef.current,
          sourcePath: window.location.pathname,
          company,
        }),
      })

      const body: unknown = await response.json().catch(() => null)
      const record =
        typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null

      if (response.status === 401 && record?.code === 'sign_in_required') {
        setAuth('signed-out')
        startWhopSignIn()
        return
      }

      if (response.ok && record?.ok === true) {
        const returnedId =
          typeof record.requestId === 'string' ? record.requestId : requestId
        setSubmitState({ kind: 'success', requestId: returnedId })
        window.requestAnimationFrame(() => successRef.current?.focus())
        return
      }

      if (record?.errors && typeof record.errors === 'object') {
        setErrors(record.errors as EstimateErrors)
      }

      if (record?.code === 'not_configured') {
        setConnection('unavailable')
      }

      const message =
        typeof record?.message === 'string' && record.message.length > 0
          ? record.message
          : 'We could not record your request just now. Nothing was confirmed. Please try again or call the office.'

      setSubmitState({ kind: 'error', message })
      window.requestAnimationFrame(() => statusRef.current?.focus())
    } catch {
      setSubmitState({
        kind: 'error',
        message:
          'We could not reach the server. Nothing was confirmed. Please try again or call the office.',
      })
      window.requestAnimationFrame(() => statusRef.current?.focus())
    }
  }

  const errorEntries = (Object.keys(errors) as Array<keyof EstimateValues>).filter(
    (field) => errors[field],
  )
  const badge = connectionBadge(connection)
  const isSubmitting = submitState.kind === 'submitting'
  const isSuccess = submitState.kind === 'success'
  const submitDisabled = isSubmitting || connection === 'unavailable'

  return (
    <div className="relative border border-ink/12 bg-paper p-5 shadow-[0_30px_70px_-54px_rgba(8,23,32,0.55)] sm:p-8 lg:p-10">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-copper" aria-hidden="true" />

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">
            Estimate request
          </p>
          <h3
            id="estimate-form-heading"
            className="mt-2 font-display text-[28px] font-medium leading-none tracking-[-0.02em] text-ink"
          >
            Start with the basics.
          </h3>
        </div>
        <span className="inline-flex items-center gap-2 border border-ink/15 bg-cream px-2.5 py-1.5 text-[8.5px] font-bold uppercase tracking-[0.16em] text-slate">
          <span className={`size-1.5 ${badge.dot}`} aria-hidden="true" />
          {badge.label}
        </span>
      </div>

      <div
        className={`mt-5 flex gap-3 border p-3.5 ${
          connection === 'unavailable'
            ? 'border-copper/40 bg-copper/[0.07]'
            : 'border-copper/25 bg-copper/[0.05]'
        }`}
      >
        <Info className="mt-0.5 size-4 shrink-0 text-copper" />
        {connection === 'unavailable' ? (
          <p className="text-[11px] leading-[1.7] text-slate">
            <strong className="font-bold text-ink">Online requests are not connected yet.</strong>{' '}
            Nothing can be submitted from this form right now. Please call{' '}
            <a
              href={siteConfig.phone.href}
              className="font-semibold text-ink underline decoration-copper/40 underline-offset-2"
            >
              {siteConfig.phone.display}
            </a>{' '}
            (sample number) or use the contact details in the footer once verified.
          </p>
        ) : (
          <p className="text-[11px] leading-[1.7] text-slate">
            <strong className="font-bold text-ink">Online request.</strong> Your details are
            recorded in Whop Leads so the office can respond. They are not sent to analytics, and
            no payment is collected on this form.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border border-ink/12 bg-cream px-3.5 py-3">
        {auth === 'signed-in' ? (
          <>
            <span className="size-1.5 shrink-0 bg-[#2f7d5b]" aria-hidden="true" />
            <p className="text-[10.5px] leading-[1.6] text-slate">
              <strong className="font-bold text-ink">Verified with Whop</strong>
              {authName ? ` as ${authName}` : ''}. This request will be recorded as your lead.
            </p>
          </>
        ) : auth === 'signed-out' ? (
          <>
            <span className="size-1.5 shrink-0 bg-copper" aria-hidden="true" />
            <p className="min-w-[180px] flex-1 text-[10.5px] leading-[1.6] text-slate">
              <strong className="font-bold text-ink">Whop verification required.</strong> Whop
              sign-in confirms the lead is yours before it is recorded.
            </p>
            <button
              type="button"
              onClick={startWhopSignIn}
              className="text-[10px] font-bold uppercase tracking-[0.14em] text-copper underline decoration-copper/40 underline-offset-4 transition-colors hover:text-copper-deep"
            >
              Sign in with Whop
            </button>
          </>
        ) : (
          <p className="text-[10.5px] text-slate">Checking Whop sign-in…</p>
        )}
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-6"
        aria-labelledby="estimate-form-heading"
        aria-busy={isSubmitting}
      >
        {attemptedSubmit && errorEntries.length > 0 ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="mb-6 border border-error/30 bg-[#fbf0ec] p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
          >
            <p className="text-[12px] font-bold text-error">
              Please check the highlighted fields before sending.
            </p>
            <ul className="mt-2 space-y-1">
              {errorEntries.map((field) => (
                <li key={field}>
                  <a
                    href={`#estimate-${field}`}
                    onClick={(event) => {
                      event.preventDefault()
                      document.getElementById(`estimate-${field}`)?.focus()
                    }}
                    className="text-[11px] leading-relaxed text-error underline decoration-error/40 underline-offset-2 hover:decoration-error"
                  >
                    {fieldLabels[field]}: {errors[field]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="estimate-name" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
              Full name <span className="text-copper" aria-hidden="true">*</span>
            </label>
            <input
              id="estimate-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Jordan Miller"
              value={values.name}
              onChange={(event) => updateField('name', event.target.value)}
              onBlur={() => handleBlur('name')}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'estimate-name-error' : undefined}
              className={`mt-2 ${fieldClass(Boolean(errors.name))}`}
            />
            {errors.name ? (
              <p id="estimate-name-error" className="mt-2 text-[11px] font-medium text-error">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="estimate-email" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
              Email address <span className="text-copper" aria-hidden="true">*</span>
            </label>
            <input
              id="estimate-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={(event) => updateField('email', event.target.value)}
              onBlur={() => handleBlur('email')}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'estimate-email-error' : undefined}
              className={`mt-2 ${fieldClass(Boolean(errors.email))}`}
            />
            {errors.email ? (
              <p id="estimate-email-error" className="mt-2 text-[11px] font-medium text-error">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="estimate-phone" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
              Phone number <span className="text-copper" aria-hidden="true">*</span>
            </label>
            <input
              id="estimate-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="(555) 000-0000"
              value={values.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              onBlur={() => handleBlur('phone')}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={
                errors.phone ? 'estimate-phone-error' : 'estimate-phone-hint'
              }
              className={`mt-2 ${fieldClass(Boolean(errors.phone))}`}
            />
            {errors.phone ? (
              <p id="estimate-phone-error" className="mt-2 text-[11px] font-medium text-error">
                {errors.phone}
              </p>
            ) : (
              <p id="estimate-phone-hint" className="mt-2 text-[10.5px] text-slate">
                Include the best number for a callback.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="estimate-zip" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
              Property ZIP code <span className="text-copper" aria-hidden="true">*</span>
            </label>
            <input
              id="estimate-zip"
              name="zip"
              type="text"
              required
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={ESTIMATE_LIMITS.zip}
              placeholder="12345"
              value={values.zip}
              onChange={(event) => updateField('zip', event.target.value)}
              onBlur={() => handleBlur('zip')}
              aria-invalid={errors.zip ? true : undefined}
              aria-describedby={errors.zip ? 'estimate-zip-error' : 'estimate-zip-hint'}
              className={`mt-2 ${fieldClass(Boolean(errors.zip))}`}
            />
            {errors.zip ? (
              <p id="estimate-zip-error" className="mt-2 text-[11px] font-medium text-error">
                {errors.zip}
              </p>
            ) : (
              <p id="estimate-zip-hint" className="mt-2 text-[10.5px] text-slate">
                Used only to confirm service coverage.
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="estimate-service" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
              Service needed <span className="text-copper" aria-hidden="true">*</span>
            </label>
            <select
              id="estimate-service"
              name="service"
              required
              value={values.service}
              onChange={(event) => updateField('service', event.target.value as ServiceValue)}
              onBlur={() => handleBlur('service')}
              aria-invalid={errors.service ? true : undefined}
              aria-describedby={errors.service ? 'estimate-service-error' : undefined}
              className={`mt-2 appearance-none bg-[length:18px_18px] bg-[right_1rem_center] bg-no-repeat pr-11 ${fieldClass(
                Boolean(errors.service),
              )}`}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2350616a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
              }}
            >
              <option value="" disabled>
                Select a service
              </option>
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.service ? (
              <p id="estimate-service-error" className="mt-2 text-[11px] font-medium text-error">
                {errors.service}
              </p>
            ) : null}
            <p className="sr-only" aria-live="polite">
              {selectedServiceLabel ? `Service selected: ${selectedServiceLabel}.` : ''}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="estimate-details" className="flex items-baseline gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
              Project details <span className="text-[9px] font-medium normal-case tracking-normal text-slate">Optional</span>
            </label>
            <textarea
              id="estimate-details"
              name="details"
              rows={4}
              maxLength={ESTIMATE_LIMITS.details}
              placeholder="What are you noticing? A leak, missing shingles, the age of the roof, recent storm damage — anything helpful."
              value={values.details}
              onChange={(event) => updateField('details', event.target.value)}
              onBlur={() => handleBlur('details')}
              className={`mt-2 resize-y ${fieldClass(false)}`}
            />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        >
          <label htmlFor="estimate-company">Company</label>
          <input
            id="estimate-company"
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </div>

        {isSuccess ? (
          <div
            ref={successRef}
            tabIndex={-1}
            role="status"
            className="mt-7 border border-[#2f7d5b]/35 bg-[#f1f8f4] p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7d5b]/40"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center border border-[#2f7d5b]/35 text-[#2f7d5b]">
                <Check className="size-4" />
              </span>
              <div>
                <p className="font-display text-[24px] font-medium leading-tight tracking-[-0.02em] text-ink">
                  Request received.
                </p>
                <p className="mt-2 text-[12px] leading-[1.75] text-slate">
                  Your reference is{' '}
                  <span className="font-semibold text-ink">{submitState.requestId}</span>. The
                  office will use the contact details you provided to follow up. This is a request
                  only — it is not an inspection booking, a price, or a payment.
                </p>
                <p className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2f7d5b]">
                  <ClipboardCheck className="size-3.5" />
                  Recorded in Whop Leads
                </p>
                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-4 text-[11px] font-semibold text-ink underline decoration-copper/40 underline-offset-4 transition-colors hover:text-copper"
                >
                  Submit another request
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button
              type="submit"
              disabled={submitDisabled}
              aria-disabled={submitDisabled}
              className="group mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[2px] border border-copper bg-copper px-6 py-3.5 text-sm font-semibold text-cream transition-colors duration-200 hover:border-copper-deep hover:bg-copper-deep disabled:cursor-not-allowed disabled:border-ink/20 disabled:bg-ink/20 disabled:text-cream"
            >
              {isSubmitting
                ? 'Sending request…'
                : auth === 'signed-in'
                  ? 'Send Estimate Request'
                  : auth === 'checking'
                    ? 'Checking Whop sign-in…'
                    : 'Verify with Whop & Send'}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <p className="mt-3 text-center text-[10.5px] leading-relaxed text-slate">
              {connection === 'unavailable'
                ? 'Online requests are unavailable in this environment. Please call the office.'
                : 'No payment is collected here. Submitting does not book an inspection or confirm a price.'}
            </p>
          </>
        )}

        {submitState.kind === 'error' ? (
          <div
            ref={statusRef}
            tabIndex={-1}
            role="alert"
            className="mt-5 border border-error/30 bg-[#fbf0ec] p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
          >
            <p className="text-[12px] font-bold text-error">Your request was not confirmed.</p>
            <p className="mt-1.5 text-[11.5px] leading-[1.7] text-slate">{submitState.message}</p>
            <a
              href={siteConfig.phone.href}
              className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-ink underline decoration-copper/40 underline-offset-2"
            >
              <Phone className="size-3.5 text-copper" />
              Call {siteConfig.phone.display} (sample)
            </a>
          </div>
        ) : null}
      </form>
    </div>
  )
}
