import { isCheckoutPlanKey, type CheckoutPlanKey } from './checkout-plans'
import { normalizeProjectRef } from './project'

export type PublicDepositConfig = {
  configured: boolean
  accountId: string | null
  planId: string | null
  planKey: CheckoutPlanKey | null
  planName: string | null
  amountCents: number | null
  amountLabel: string | null
  currency: string
  issues: string[]
}

export const PAYMENT_STATUSES = [
  'requires_confirmation',
  'requires_action',
  'requires_capture',
  'confirming',
  'processing',
  'succeeded',
  'canceled',
  'failed',
  'paid',
  'open',
  'pending',
  'void',
  'uncollectible',
  'unknown',
] as const

export type NormalizedPaymentStatus = (typeof PAYMENT_STATUSES)[number]

export function normalizePaymentStatus(value: unknown): NormalizedPaymentStatus {
  if (typeof value !== 'string') return 'unknown'

  const normalized = value.trim().toLowerCase()
  return (PAYMENT_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as NormalizedPaymentStatus)
    : 'unknown'
}

export const DEPOSIT_ATTEMPT_PATTERN = /^att_[A-Za-z0-9_-]{8,80}$/
export const CONFIRMATION_TOKEN_PATTERN = /^ctok_[A-Za-z0-9_-]{8,400}$/
export const PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9]{6,120}$/

/**
 * A Whop payment reference. Shared so the browser-facing return page and the
 * server-side invoice gate accept exactly the same identifier shape.
 */
export function isPaymentId(value: unknown): value is string {
  return typeof value === 'string' && PAYMENT_ID_PATTERN.test(value)
}

function randomToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

/**
 * One idempotency key per payment attempt. The value is generated before the
 * first server call and reused if that call's outcome is unknown, so a network
 * retry cannot create a second charge.
 */
export function makeDepositAttemptId(): string {
  return `att_${randomToken()}`.slice(0, 80)
}

export function isDepositAttemptId(value: unknown): value is string {
  return typeof value === 'string' && DEPOSIT_ATTEMPT_PATTERN.test(value)
}

export function isConfirmationToken(value: unknown): value is string {
  return typeof value === 'string' && CONFIRMATION_TOKEN_PATTERN.test(value)
}

export function isPaidStatus(value: unknown): boolean {
  const status = normalizePaymentStatus(value)
  return status === 'paid' || status === 'succeeded'
}

export function isFailedStatus(value: unknown): boolean {
  const status = normalizePaymentStatus(value)
  return (
    status === 'failed' ||
    status === 'canceled' ||
    status === 'void' ||
    status === 'uncollectible'
  )
}

export function isPendingStatus(value: unknown): boolean {
  return !isPaidStatus(value) && !isFailedStatus(value)
}

export function formatCents(cents: number, currency = 'usd'): string {
  const safeCents = Number.isFinite(cents) ? Math.round(cents) : 0

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(safeCents / 100)
  } catch {
    return `${(safeCents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

export function centsToMajorUnits(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * The return URL must be an absolute https URL (http is accepted only for
 * local development). It carries the project reference, but no customer data.
 */
export function buildDepositReturnUrl(
  baseUrl: string,
  projectRef: string,
  planKey?: unknown,
): string | null {
  const project = normalizeProjectRef(projectRef)
  if (!project) return null

  try {
    const base = new URL(baseUrl)
    const isLocal =
      base.protocol === 'http:' &&
      (base.hostname === 'localhost' || base.hostname === '127.0.0.1')

    if (base.protocol !== 'https:' && !isLocal) return null

    const returnUrl = new URL('/deposit/return', base.origin)
    returnUrl.searchParams.set('project', project)
    if (isCheckoutPlanKey(planKey)) returnUrl.searchParams.set('plan', planKey)
    return returnUrl.toString()
  } catch {
    return null
  }
}

export function depositIdempotencyKey(
  projectRef: string,
  requestId: string,
  planKey?: unknown,
): string {
  const planSuffix = isCheckoutPlanKey(planKey) ? `-${planKey}` : ''
  return `deposit-${projectRef}-${requestId}${planSuffix}`.slice(0, 200)
}

/**
 * Whop charges the configured plan, not the amount shown in the UI. Before the
 * return page can call a payment received, the processor total must match the
 * configured deposit in both amount and currency. A missing total is treated as
 * a mismatch: no success is ever inferred from incomplete data.
 */
export function depositAmountMatches(input: {
  actualCents: number | null
  actualCurrency: string | null
  expectedCents: number | null
  expectedCurrency: string
}): boolean {
  if (input.actualCents === null || input.expectedCents === null) return false
  if (input.actualCents !== input.expectedCents) return false
  if (!input.actualCurrency || !input.expectedCurrency) return false

  return (
    input.actualCurrency.trim().toLowerCase() === input.expectedCurrency.trim().toLowerCase()
  )
}

/**
 * Payment metadata is the only project linkage sent to Whop. It deliberately
 * excludes names, emails, phone numbers, addresses, and payment details.
 */
export function buildDepositMetadata(
  projectRef: string,
  requestId: string,
  planKey?: unknown,
) {
  return {
    project_ref: projectRef,
    request_id: requestId,
    source: 'summitaa_roofing_deposit',
    site: 'summitaa-roofing',
    ...(isCheckoutPlanKey(planKey) ? { plan_key: planKey } : {}),
  } as const
}

export function publicDepositConfig(input: {
  accountId: string | null
  planId: string | null
  planKey?: CheckoutPlanKey | null
  planName?: string | null
  amountCents: number | null
  currency: string
  issues: string[]
}): PublicDepositConfig {
  // `configured` means the server can actually start a charge, not merely that
  // the public IDs are present. A missing API key must keep the payment form
  // hidden instead of letting a customer enter card details for a request that
  // is guaranteed to fail.
  const configured = Boolean(
    input.issues.length === 0 &&
      input.accountId &&
      input.planId &&
      input.amountCents &&
      input.amountCents > 0,
  )

  return {
    configured,
    accountId: configured ? input.accountId : null,
    planId: configured ? input.planId : null,
    planKey: configured ? input.planKey ?? null : null,
    planName: configured ? input.planName ?? null : null,
    amountCents: configured ? input.amountCents : null,
    amountLabel:
      configured && input.amountCents ? formatCents(input.amountCents, input.currency) : null,
    currency: input.currency,
    issues: configured ? [] : input.issues,
  }
}
