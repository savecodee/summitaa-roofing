import { describe, expect, test } from 'bun:test'

import {
  dueDateFromDays,
  INVOICE_LIMITS,
  invoiceIdempotencyKey,
  lineItemsTotalCents,
  validateFinalInvoice,
} from '../src/lib/invoice.ts'

const NOW = new Date('2026-10-28T12:00:00.000Z')

const validInvoice = {
  projectRef: 'SUM-1042',
  customerName: 'Jordan Miller',
  email: 'jordan@example.com',
  projectTotalCents: 2_000_000,
  depositCreditCents: 50_000,
  currency: 'usd',
  dueInDays: 14,
}

function expectDraft(result) {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.draft
}

describe('final invoice validation', () => {
  test('accepts a balanced invoice and subtracts the explicit deposit credit once', () => {
    const draft = expectDraft(validateFinalInvoice(validInvoice, { currency: 'usd', now: NOW }))

    expect(draft.projectRef).toBe('SUM-1042')
    expect(draft.projectTotalCents).toBe(2_000_000)
    expect(draft.depositCreditCents).toBe(50_000)
    expect(draft.balanceDueCents).toBe(1_950_000)
    expect(draft.currency).toBe('usd')
    expect(draft.lineItems).toHaveLength(2)
    expect(draft.lineItems[1].unit_price).toBe(-500)
    expect(lineItemsTotalCents(draft.lineItems)).toBe(draft.balanceDueCents)
    expect(draft.dueDate).toBe('2026-11-11T12:00:00.000Z')
  })

  test('defaults to no deposit credit and never infers a payment', () => {
    const { depositCreditCents, ...withoutCredit } = validInvoice
    expect(depositCreditCents).toBe(50_000)

    const draft = expectDraft(
      validateFinalInvoice(withoutCredit, { currency: 'usd', now: NOW }),
    )

    expect(draft.depositCreditCents).toBe(0)
    expect(draft.balanceDueCents).toBe(draft.projectTotalCents)
    expect(draft.lineItems).toHaveLength(1)
    expect(lineItemsTotalCents(draft.lineItems)).toBe(draft.projectTotalCents)
  })

  test('rejects a credit larger than the project total', () => {
    const result = validateFinalInvoice(
      { ...validInvoice, projectTotalCents: 50_000, depositCreditCents: 60_000 },
      { currency: 'usd', now: NOW },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('credit_exceeds_total')
  })

  test('rejects a zero remaining balance', () => {
    const result = validateFinalInvoice(
      { ...validInvoice, projectTotalCents: 50_000, depositCreditCents: 50_000 },
      { currency: 'usd', now: NOW },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('nothing_due')
  })

  test('rejects a mismatched currency', () => {
    const result = validateFinalInvoice(
      { ...validInvoice, currency: 'eur' },
      { currency: 'usd', now: NOW },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('currency_mismatch')
  })

  test('rejects totals outside the allowed range', () => {
    for (const projectTotalCents of [0, -1, INVOICE_LIMITS.maximumTotalCents + 1]) {
      const result = validateFinalInvoice(
        { ...validInvoice, projectTotalCents, depositCreditCents: 0 },
        { currency: 'usd', now: NOW },
      )
      expect(result.ok).toBe(false)
      if (result.ok) continue
      expect(result.code).toBe('amount_out_of_range')
    }
  })

  test('requires valid contact and project fields', () => {
    const result = validateFinalInvoice(
      {
        ...validInvoice,
        projectRef: '../../etc/passwd',
        customerName: 'J',
        email: 'not-an-email',
      },
      { currency: 'usd', now: NOW },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('invalid_input')
    expect(result.fields?.projectRef).toBeDefined()
    expect(result.fields?.customerName).toBeDefined()
    expect(result.fields?.email).toBeDefined()
  })

  test('bounds the due date window', () => {
    for (const dueInDays of [0, 1, 90, 91]) {
      const result = validateFinalInvoice(
        { ...validInvoice, dueInDays },
        { currency: 'usd', now: NOW },
      )
      expect(result.ok).toBe(dueInDays >= 1 && dueInDays <= 90)
    }
  })

  test('rejects non-integer amounts instead of rounding them silently', () => {
    const result = validateFinalInvoice(
      { ...validInvoice, projectTotalCents: 1234.5 },
      { currency: 'usd', now: NOW },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('invalid_input')
  })

  test('accepts digit strings from operator tooling', () => {
    const draft = expectDraft(
      validateFinalInvoice(
        {
          ...validInvoice,
          projectTotalCents: '2000000',
          depositCreditCents: '50000',
          dueInDays: '30',
        },
        { currency: 'usd', now: NOW },
      ),
    )

    expect(draft.projectTotalCents).toBe(2_000_000)
    expect(draft.depositCreditCents).toBe(50_000)
    expect(draft.dueDate).toBe('2026-11-27T12:00:00.000Z')
  })
})

describe('invoice idempotency', () => {
  test('is stable for identical invoice terms', () => {
    const first = invoiceIdempotencyKey('SUM-1042', 2_000_000, 50_000)
    const second = invoiceIdempotencyKey('SUM-1042', 2_000_000, 50_000)

    expect(first).toBe(second)
    expect(first.length).toBeLessThanOrEqual(200)
    expect(first).toBe('invoice-SUM-1042-2000000-50000')
  })

  test('changes when any term changes', () => {
    const base = invoiceIdempotencyKey('SUM-1042', 2_000_000, 50_000)

    expect(invoiceIdempotencyKey('SUM-1043', 2_000_000, 50_000)).not.toBe(base)
    expect(invoiceIdempotencyKey('SUM-1042', 2_100_000, 50_000)).not.toBe(base)
    expect(invoiceIdempotencyKey('SUM-1042', 2_000_000, 0)).not.toBe(base)
  })

  test('embedded in the draft and matches the draft terms', () => {
    const draft = expectDraft(validateFinalInvoice(validInvoice, { currency: 'usd', now: NOW }))
    expect(draft.idempotencyKey).toBe(
      invoiceIdempotencyKey(draft.projectRef, draft.projectTotalCents, draft.depositCreditCents),
    )
  })
})

describe('invoice line items', () => {
  test('sums quantities and rounds unit prices to cents', () => {
    expect(
      lineItemsTotalCents([
        { label: 'a', quantity: 2, unit_price: 12.34 },
        { label: 'b', quantity: 1, unit_price: -5 },
      ]),
    ).toBe(1968)
  })

  test('due dates are whole days from the supplied clock', () => {
    expect(dueDateFromDays(1, NOW)).toBe('2026-10-29T12:00:00.000Z')
    expect(dueDateFromDays(90, NOW)).toBe('2027-01-26T12:00:00.000Z')
  })
})
