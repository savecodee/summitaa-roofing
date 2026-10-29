import { centsToMajorUnits, isPaidStatus, isPaymentId } from './deposit'
import { isValidEmail, sanitizeText } from './estimate'
import { normalizeProjectRef } from './project'

/**
 * Final-invoice math and the deposit gate.
 *
 * A deposit credit is never accepted from a request body. `validateFinalInvoice`
 * only reads credit from the `deposit` option, and the operator route builds
 * that option from a Whop payment it fetched and verified server-side.
 */

export type InvoiceLineItem = {
  label: string
  quantity: number
  unit_price: number
}

export type FinalInvoiceDraft = {
  projectRef: string
  customerName: string
  email: string
  projectTotalCents: number
  depositPaymentId: string | null
  depositCreditCents: number
  balanceDueCents: number
  currency: string
  dueDate: string
  lineItems: InvoiceLineItem[]
  idempotencyKey: string
}

export type FinalInvoiceErrorCode =
  | 'invalid_input'
  | 'amount_out_of_range'
  | 'credit_exceeds_total'
  | 'nothing_due'
  | 'currency_mismatch'
  | 'client_supplied_credit'

export type FinalInvoiceResult =
  | { ok: true; draft: FinalInvoiceDraft }
  | {
      ok: false
      code: FinalInvoiceErrorCode
      message: string
      fields?: Record<string, string>
    }

export const INVOICE_LIMITS = {
  maximumTotalCents: 50_000_000,
  minimumChargeCents: 50,
  maximumDepositCreditCents: 50_000_000,
  minimumDueDays: 1,
  maximumDueDays: 90,
  defaultDueDays: 14,
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim())
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

export function dueDateFromDays(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function invoiceIdempotencyKey(
  projectRef: string,
  projectTotalCents: number,
  depositCreditCents: number,
  depositPaymentId?: string | null,
): string {
  const base = `invoice-${projectRef}-${projectTotalCents}-${depositCreditCents}`
  return (depositPaymentId ? `${base}-${depositPaymentId}` : base).slice(0, 200)
}

export type VerifiedDepositInput = {
  paymentId: string
  creditCents: number
}

export function validateFinalInvoice(
  raw: unknown,
  options: { currency: string; now?: Date; deposit?: VerifiedDepositInput | null },
): FinalInvoiceResult {
  if (!isRecord(raw)) {
    return { ok: false, code: 'invalid_input', message: 'Invalid invoice request.' }
  }

  // The operator can no longer assert a credit. Only a payment fetched from
  // Whop and verified by `verifyDepositForInvoice` may reduce the balance.
  if ('depositCreditCents' in raw) {
    return {
      ok: false,
      code: 'client_supplied_credit',
      message: 'The deposit credit is derived from a verified Whop payment.',
      fields: {
        depositCreditCents:
          'Remove this field. Send depositPaymentId so the server can verify the payment.',
      },
    }
  }

  const fields: Record<string, string> = {}
  const projectRef = normalizeProjectRef(raw.projectRef)
  if (!projectRef) fields.projectRef = 'Use a valid project reference.'

  const customerName = sanitizeText(raw.customerName, 120)
  if (customerName.length < 2) fields.customerName = 'Enter the customer name.'

  const email = sanitizeText(raw.email, 254)
  if (!isValidEmail(email)) fields.email = 'Enter a valid email address.'

  const projectTotalCents = toInteger(raw.projectTotalCents)
  if (projectTotalCents === null) {
    fields.projectTotalCents = 'Enter the project total in cents.'
  }

  const depositPaymentId = options.deposit?.paymentId ?? null
  const depositCreditCents = options.deposit?.creditCents ?? 0

  if (depositPaymentId !== null && !isPaymentId(depositPaymentId)) {
    fields.depositPaymentId = 'Use a valid Whop payment reference.'
  }

  const dueInDays = toInteger(raw.dueInDays ?? INVOICE_LIMITS.defaultDueDays)
  if (
    dueInDays === null ||
    dueInDays < INVOICE_LIMITS.minimumDueDays ||
    dueInDays > INVOICE_LIMITS.maximumDueDays
  ) {
    fields.dueInDays = `Choose between ${INVOICE_LIMITS.minimumDueDays} and ${INVOICE_LIMITS.maximumDueDays} days.`
  }

  const currency = (typeof raw.currency === 'string' ? raw.currency : options.currency)
    .trim()
    .toLowerCase()
  if (!/^[a-z]{3}$/.test(currency)) {
    fields.currency = 'Use a three-letter currency code.'
  } else if (currency !== options.currency.toLowerCase()) {
    return {
      ok: false,
      code: 'currency_mismatch',
      message: 'The invoice currency must match the configured deposit currency.',
      fields: { currency: 'Currency does not match the deposit configuration.' },
    }
  }

  if (Object.keys(fields).length > 0 || !projectRef || projectTotalCents === null) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'Please check the invoice details.',
      fields,
    }
  }

  if (
    projectTotalCents < 1 ||
    projectTotalCents > INVOICE_LIMITS.maximumTotalCents
  ) {
    return {
      ok: false,
      code: 'amount_out_of_range',
      message: 'The project total is outside the allowed range.',
      fields: { projectTotalCents: 'Enter a positive project total.' },
    }
  }

  if (
    !Number.isSafeInteger(depositCreditCents) ||
    depositCreditCents < 0 ||
    depositCreditCents > INVOICE_LIMITS.maximumDepositCreditCents ||
    (depositPaymentId !== null && depositCreditCents < 1)
  ) {
    return {
      ok: false,
      code: 'amount_out_of_range',
      message: 'The verified deposit credit is outside the allowed range.',
      fields: { depositPaymentId: 'The verified deposit amount is not usable.' },
    }
  }

  if (depositCreditCents > projectTotalCents) {
    return {
      ok: false,
      code: 'credit_exceeds_total',
      message: 'The deposit credit cannot exceed the project total.',
      fields: { projectTotalCents: 'The project total is lower than the verified deposit.' },
    }
  }

  const balanceDueCents = projectTotalCents - depositCreditCents
  if (balanceDueCents < INVOICE_LIMITS.minimumChargeCents) {
    return {
      ok: false,
      code: 'nothing_due',
      message: 'The remaining balance is below the minimum chargeable amount.',
      fields: { projectTotalCents: 'Leave a balance that can be invoiced.' },
    }
  }

  const lineItems: InvoiceLineItem[] = [
    {
      label: `Project total — ${projectRef}`,
      quantity: 1,
      unit_price: centsToMajorUnits(projectTotalCents),
    },
  ]

  if (depositCreditCents > 0) {
    lineItems.push({
      label: `Deposit received — credit (${projectRef})`,
      quantity: 1,
      unit_price: -centsToMajorUnits(depositCreditCents),
    })
  }

  return {
    ok: true,
    draft: {
      projectRef,
      customerName,
      email,
      projectTotalCents,
      depositPaymentId,
      depositCreditCents,
      balanceDueCents,
      currency,
      dueDate: dueDateFromDays(dueInDays ?? INVOICE_LIMITS.defaultDueDays, options.now),
      lineItems,
      idempotencyKey: invoiceIdempotencyKey(
        projectRef,
        projectTotalCents,
        depositCreditCents,
        depositPaymentId,
      ),
    },
  }
}

export type DepositPaymentEvidence = {
  id: string
  status: string
  accountId: string | null
  planId: string | null
  projectRef: string
  amountCents: number | null
  currency: string | null
}

export type DepositVerificationReason =
  | 'invalid_deposit_payment'
  | 'deposit_not_paid'
  | 'deposit_account_mismatch'
  | 'deposit_plan_mismatch'
  | 'deposit_project_mismatch'
  | 'deposit_amount_mismatch'
  | 'deposit_currency_mismatch'

export type DepositVerificationResult =
  | { ok: true; depositCreditCents: number }
  | { ok: false; code: DepositVerificationReason; message: string }

/**
 * Proves a deposit before it can reduce a final invoice.
 *
 * Every fact comes from the payment Whop returned, never from the request:
 * the payment must be paid, belong to the configured account and deposit plan,
 * carry the same project reference, and match the configured amount and
 * currency. Any missing field fails closed.
 */
export function verifyDepositForInvoice(input: {
  payment: DepositPaymentEvidence
  expected: {
    accountId: string
    planId: string
    projectRef: string
    amountCents: number
    currency: string
  }
}): DepositVerificationResult {
  const { payment, expected } = input

  if (!isPaymentId(payment.id)) {
    return {
      ok: false,
      code: 'invalid_deposit_payment',
      message: 'The deposit reference is not a Whop payment.',
    }
  }

  if (!isPaidStatus(payment.status)) {
    return {
      ok: false,
      code: 'deposit_not_paid',
      message: 'Whop has not confirmed this deposit as paid.',
    }
  }

  if (!payment.accountId || payment.accountId !== expected.accountId) {
    return {
      ok: false,
      code: 'deposit_account_mismatch',
      message: 'The deposit belongs to a different Whop account.',
    }
  }

  if (!payment.planId || payment.planId !== expected.planId) {
    return {
      ok: false,
      code: 'deposit_plan_mismatch',
      message: 'The deposit was not paid against the configured deposit plan.',
    }
  }

  const expectedProject = normalizeProjectRef(expected.projectRef)
  const paidProject = normalizeProjectRef(payment.projectRef)
  if (!expectedProject || !paidProject || paidProject !== expectedProject) {
    return {
      ok: false,
      code: 'deposit_project_mismatch',
      message: 'The deposit is linked to a different project.',
    }
  }

  if (
    payment.amountCents === null ||
    !Number.isSafeInteger(payment.amountCents) ||
    payment.amountCents !== expected.amountCents
  ) {
    return {
      ok: false,
      code: 'deposit_amount_mismatch',
      message: 'The deposit amount does not match the configured deposit.',
    }
  }

  const paidCurrency = payment.currency?.trim().toLowerCase() ?? ''
  const expectedCurrency = expected.currency.trim().toLowerCase()
  if (!paidCurrency || !expectedCurrency || paidCurrency !== expectedCurrency) {
    return {
      ok: false,
      code: 'deposit_currency_mismatch',
      message: 'The deposit currency does not match the configured deposit.',
    }
  }

  return { ok: true, depositCreditCents: payment.amountCents }
}

/**
 * The legacy invoice API requires line items to sum to the plan price. This
 * helper is exported so the invariant can be tested without the network.
 */
export function lineItemsTotalCents(lineItems: InvoiceLineItem[]): number {
  return lineItems.reduce(
    (total, item) => total + Math.round(item.unit_price * 100) * (item.quantity ?? 1),
    0,
  )
}
