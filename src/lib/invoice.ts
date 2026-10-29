import { centsToMajorUnits } from './deposit'
import { isValidEmail, sanitizeText } from './estimate'
import { normalizeProjectRef } from './project'

/**
 * Final-invoice math.
 *
 * The deposit is applied exactly once and only when the operator explicitly
 * supplies `depositCreditCents` after reconciling the deposit payment in Whop.
 * The site never infers that a deposit was paid.
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
): string {
  return `invoice-${projectRef}-${projectTotalCents}-${depositCreditCents}`.slice(0, 200)
}

export function validateFinalInvoice(
  raw: unknown,
  options: { currency: string; now?: Date },
): FinalInvoiceResult {
  if (!isRecord(raw)) {
    return { ok: false, code: 'invalid_input', message: 'Invalid invoice request.' }
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

  const depositCreditCents = toInteger(raw.depositCreditCents ?? 0)
  if (depositCreditCents === null) {
    fields.depositCreditCents = 'Enter the deposit credit in cents.'
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

  if (
    Object.keys(fields).length > 0 ||
    !projectRef ||
    projectTotalCents === null ||
    depositCreditCents === null
  ) {
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

  if (depositCreditCents < 0 || depositCreditCents > INVOICE_LIMITS.maximumDepositCreditCents) {
    return {
      ok: false,
      code: 'amount_out_of_range',
      message: 'The deposit credit is outside the allowed range.',
      fields: { depositCreditCents: 'Enter a valid deposit credit.' },
    }
  }

  if (depositCreditCents > projectTotalCents) {
    return {
      ok: false,
      code: 'credit_exceeds_total',
      message: 'The deposit credit cannot exceed the project total.',
      fields: { depositCreditCents: 'Credit exceeds the project total.' },
    }
  }

  const balanceDueCents = projectTotalCents - depositCreditCents
  if (balanceDueCents < INVOICE_LIMITS.minimumChargeCents) {
    return {
      ok: false,
      code: 'nothing_due',
      message: 'The remaining balance is below the minimum chargeable amount.',
      fields: { depositCreditCents: 'Leave a balance that can be invoiced.' },
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
      depositCreditCents,
      balanceDueCents,
      currency,
      dueDate: dueDateFromDays(dueInDays ?? INVOICE_LIMITS.defaultDueDays, options.now),
      lineItems,
      idempotencyKey: invoiceIdempotencyKey(
        projectRef,
        projectTotalCents,
        depositCreditCents,
      ),
    },
  }
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
