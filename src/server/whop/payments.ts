import '@tanstack/react-start/server-only'

import { whopPublicConfig } from '@/config'
import { checkoutPlanByKey, type CheckoutPlanKey } from '../../lib/checkout-plans'
import {
  buildDepositMetadata,
  depositIdempotencyKey,
  isFailedStatus,
  isPaidStatus,
  isPaymentId,
  normalizePaymentStatus,
  type NormalizedPaymentStatus,
} from '../../lib/deposit'
import { asRecord, pickNumber, pickString, whopRequest } from './client'
import {
  depositConfigurationIssues,
  getWhopServerConfig,
  planConfigurationIssues,
} from './config'

const PAYMENTS_API_VERSION = '2026-09-22'

// Re-exported for existing callers; the pattern lives in the client-safe lib so
// the invoice gate and the API layer cannot drift apart.
export { isPaymentId }

export type CreatedDepositPayment = {
  id: string
  status: NormalizedPaymentStatus
  clientSecret: string | null
  paid: boolean
  failed: boolean
}

export type DepositPaymentStatus = {
  id: string
  status: NormalizedPaymentStatus
  paid: boolean
  failed: boolean
  pending: boolean
  projectRef: string
  amountMajor: string | null
  amountCents: number | null
  currency: string | null
  displayDecimals: number | null
  accountId: string | null
  planId: string | null
  memberId: string | null
  paymentMethodId: string | null
}

/**
 * Charges one allowlisted plan with a single-use confirmation token.
 *
 * `variant_id` is resolved from the server allowlist; the browser can name a
 * plan key but cannot choose a plan id or an amount. The legacy proposal
 * deposit remains available when no plan key is sent. The idempotency key is
 * stable for the client attempt, so a retried request within Whop's 24-hour
 * window replays the original payment instead of charging twice.
 */
export async function createDepositPayment(input: {
  projectRef: string
  attemptId: string
  confirmationToken: string
  returnUrl: string
  planKey?: CheckoutPlanKey | null
}): Promise<CreatedDepositPayment> {
  const config = getWhopServerConfig()
  const plan = input.planKey ? checkoutPlanByKey(input.planKey) : null

  if (input.planKey && !plan) throw new Error('invalid_plan')
  if (!config.apiConfigured && !config.apiKey) throw new Error('deposit_not_configured')

  if (plan) {
    if (planConfigurationIssues(config).length > 0) {
      throw new Error('deposit_not_configured')
    }
  } else if (!config.depositPlanId || depositConfigurationIssues(config).length > 0) {
    throw new Error('deposit_not_configured')
  }

  const variantId = plan?.planId ?? config.depositPlanId

  const payload = await whopRequest('/payments', {
    method: 'POST',
    apiVersion: PAYMENTS_API_VERSION,
    idempotencyKey: depositIdempotencyKey(input.projectRef, input.attemptId, plan?.key),
    timeoutMs: 20_000,
    body: {
      account_id: whopPublicConfig.accountId,
      confirmation_token: input.confirmationToken,
      variant_id: variantId,
      metadata: buildDepositMetadata(input.projectRef, input.attemptId, plan?.key),
      return_url: input.returnUrl,
    },
  })

  const record = asRecord(payload)
  const id = pickString(record, 'id')
  const rawStatus = pickString(record, 'status')
  if (!id || !isPaymentId(id)) {
    throw new Error('invalid_payment_response')
  }

  const status = normalizePaymentStatus(rawStatus)

  return {
    id,
    status,
    clientSecret: pickString(record, 'client_secret'),
    paid: isPaidStatus(status),
    failed: isFailedStatus(status),
  }
}

/**
 * Reads the authoritative payment state. The return page must use this instead
 * of trusting `status=succeeded` in the URL.
 */
export async function getDepositPayment(paymentId: string): Promise<DepositPaymentStatus> {
  if (!isPaymentId(paymentId)) throw new Error('invalid_payment_id')

  const payload = await whopRequest(`/payments/${encodeURIComponent(paymentId)}`, {
    apiVersion: PAYMENTS_API_VERSION,
    timeoutMs: 12_000,
  })

  const record = asRecord(payload)
  const status = normalizePaymentStatus(pickString(record, 'status'))
  const metadata = asRecord(record.metadata)
  const subtotal = asRecord(record.subtotal)
  const numericSubtotal = pickNumber(subtotal, 'amount')
  const subtotalAmount =
    pickString(subtotal, 'amount') ?? (numericSubtotal === null ? null : String(numericSubtotal))

  return {
    id: pickString(record, 'id') ?? paymentId,
    status,
    paid: isPaidStatus(status),
    failed: isFailedStatus(status),
    pending: !isPaidStatus(status) && !isFailedStatus(status),
    projectRef: pickString(metadata, 'project_ref') ?? '',
    amountMajor: subtotalAmount,
    amountCents:
      subtotalAmount !== null && /^\d+(\.\d+)?$/.test(subtotalAmount)
        ? Math.round(Number(subtotalAmount) * 100)
        : null,
    currency: pickString(subtotal, 'currency'),
    displayDecimals:
      typeof subtotal.display_decimals === 'number' ? subtotal.display_decimals : null,
    accountId: pickString(record, 'account_id'),
    planId: pickString(record, 'variant_id'),
    memberId: pickString(record, 'member_id'),
    paymentMethodId: pickString(record, 'payment_method_id'),
  }
}
