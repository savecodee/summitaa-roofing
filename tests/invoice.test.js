import { describe, expect, test } from 'bun:test'

import {
  dueDateFromDays,
  INVOICE_LIMITS,
  invoiceIdempotencyKey,
  lineItemsTotalCents,
  validateFinalInvoice,
  verifyDepositForInvoice,
} from '../src/lib/invoice.ts'

const NOW = new Date('2026-10-28T12:00:00.000Z')

const validInvoice = {
  projectRef: 'SUM-1042',
  customerName: 'Jordan Miller',
  email: 'jordan@example.com',
  projectTotalCents: 2_000_000,
  currency: 'usd',
  dueInDays: 14,
}

const validDeposit = {
  paymentId: 'pay_1234567890',
  creditCents: 50_000,
}

const paidPayment = {
  id: 'pay_1234567890',
  status: 'paid',
  accountId: 'biz_wHs7ScZ5eHIZrH',
  planId: 'plan_NlxIPUOrmzS6E',
  projectRef: 'SUM-1042',
  amountCents: 50_000,
  currency: 'usd',
}

const expectedDeposit = {
  accountId: 'biz_wHs7ScZ5eHIZrH',
  planId: 'plan_NlxIPUOrmzS6E',
  projectRef: 'SUM-1042',
  amountCents: 50_000,
  currency: 'usd',
}

function expectDraft(result) {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.draft
}

function expectVerified(result) {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result.depositCreditCents
}

function expectRejected(result, code) {
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error('Expected a rejection')
  expect(result.code).toBe(code)
}

describe('final invoice validation', () => {
  test('accepts a balanced invoice and subtracts the verified deposit once', () => {
    const draft = expectDraft(
      validateFinalInvoice(validInvoice, {
        currency: 'usd',
        now: NOW,
        deposit: validDeposit,
      }),
    )

    expect(draft.projectRef).toBe('SUM-1042')
    expect(draft.projectTotalCents).toBe(2_000_000)
    expect(draft.depositPaymentId).toBe('pay_1234567890')
    expect(draft.depositCreditCents).toBe(50_000)
    expect(draft.balanceDueCents).toBe(1_950_000)
    expect(draft.currency).toBe('usd')
    expect(draft.lineItems).toHaveLength(2)
    expect(draft.lineItems[1].unit_price).toBe(-500)
    expect(lineItemsTotalCents(draft.lineItems)).toBe(draft.balanceDueCents)
    expect(draft.dueDate).toBe('2026-11-11T12:00:00.000Z')
  })

  test('computes the campaign example: $1,499 project minus $500 deposit = $999 due', () => {
    const draft = expectDraft(
      validateFinalInvoice(
        { ...validInvoice, projectTotalCents: 149_900 },
        { currency: 'usd', now: NOW, deposit: validDeposit },
      ),
    )

    expect(draft.depositCreditCents).toBe(50_000)
    expect(draft.balanceDueCents).toBe(99_900)
    expect(draft.lineItems.map((item) => item.unit_price)).toEqual([1499, -500])
    expect(lineItemsTotalCents(draft.lineItems)).toBe(99_900)
  })

  test('defaults to no deposit credit only when no payment was verified', () => {
    const draft = expectDraft(validateFinalInvoice(validInvoice, { currency: 'usd', now: NOW }))

    expect(draft.depositPaymentId).toBeNull()
    expect(draft.depositCreditCents).toBe(0)
    expect(draft.balanceDueCents).toBe(draft.projectTotalCents)
    expect(draft.lineItems).toHaveLength(1)
    expect(lineItemsTotalCents(draft.lineItems)).toBe(draft.projectTotalCents)
  })

  test('rejects a deposit credit supplied by the caller', () => {
    const result = validateFinalInvoice(
      { ...validInvoice, depositCreditCents: 50_000 },
      { currency: 'usd', now: NOW, deposit: validDeposit },
    )

    expectRejected(result, 'client_supplied_credit')
    if (result.ok) return
    expect(result.fields?.depositCreditCents).toBeDefined()
  })

  test('rejects a verified payment with a non-pay reference', () => {
    const result = validateFinalInvoice(validInvoice, {
      currency: 'usd',
      now: NOW,
      deposit: { paymentId: 'ctok_12345678', creditCents: 50_000 },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('invalid_input')
    expect(result.fields?.depositPaymentId).toBeDefined()
  })

  test('rejects a credit larger than the project total', () => {
    const result = validateFinalInvoice(
      { ...validInvoice, projectTotalCents: 50_000 },
      {
        currency: 'usd',
        now: NOW,
        deposit: { paymentId: 'pay_1234567890', creditCents: 60_000 },
      },
    )

    expectRejected(result, 'credit_exceeds_total')
  })

  test('rejects a zero remaining balance', () => {
    const result = validateFinalInvoice(
      { ...validInvoice, projectTotalCents: 50_000 },
      {
        currency: 'usd',
        now: NOW,
        deposit: { paymentId: 'pay_1234567890', creditCents: 50_000 },
      },
    )

    expectRejected(result, 'nothing_due')
  })

  test('rejects a mismatched currency', () => {
    const result = validateFinalInvoice(
      { ...validInvoice, currency: 'eur' },
      { currency: 'usd', now: NOW },
    )

    expectRejected(result, 'currency_mismatch')
  })

  test('rejects totals outside the allowed range', () => {
    for (const projectTotalCents of [0, -1, INVOICE_LIMITS.maximumTotalCents + 1]) {
      const result = validateFinalInvoice(
        { ...validInvoice, projectTotalCents },
        { currency: 'usd', now: NOW },
      )
      expectRejected(result, 'amount_out_of_range')
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
          dueInDays: '30',
        },
        { currency: 'usd', now: NOW, deposit: validDeposit },
      ),
    )

    expect(draft.projectTotalCents).toBe(2_000_000)
    expect(draft.depositCreditCents).toBe(50_000)
    expect(draft.dueDate).toBe('2026-11-27T12:00:00.000Z')
  })
})

describe('deposit verification gate', () => {
  test('accepts a paid payment that matches every configured fact', () => {
    const credit = expectVerified(
      verifyDepositForInvoice({ payment: paidPayment, expected: expectedDeposit }),
    )

    expect(credit).toBe(50_000)
  })

  test('accepts a succeeded status as paid', () => {
    const credit = expectVerified(
      verifyDepositForInvoice({
        payment: { ...paidPayment, status: 'succeeded' },
        expected: expectedDeposit,
      }),
    )

    expect(credit).toBe(50_000)
  })

  test('rejects unpaid, pending, and failed payments', () => {
    for (const status of ['open', 'pending', 'requires_action', 'failed', 'canceled', 'unknown']) {
      expectRejected(
        verifyDepositForInvoice({
          payment: { ...paidPayment, status },
          expected: expectedDeposit,
        }),
        'deposit_not_paid',
      )
    }
  })

  test('rejects a non-payment reference', () => {
    expectRejected(
      verifyDepositForInvoice({
        payment: { ...paidPayment, id: 'sint_12345678' },
        expected: expectedDeposit,
      }),
      'invalid_deposit_payment',
    )
    expectRejected(
      verifyDepositForInvoice({
        payment: { ...paidPayment, id: '' },
        expected: expectedDeposit,
      }),
      'invalid_deposit_payment',
    )
  })

  test('rejects another account, plan, or project', () => {
    expectRejected(
      verifyDepositForInvoice({
        payment: { ...paidPayment, accountId: 'biz_other' },
        expected: expectedDeposit,
      }),
      'deposit_account_mismatch',
    )
    expectRejected(
      verifyDepositForInvoice({
        payment: { ...paidPayment, accountId: null },
        expected: expectedDeposit,
      }),
      'deposit_account_mismatch',
    )
    expectRejected(
      verifyDepositForInvoice({
        payment: { ...paidPayment, planId: 'plan_EFVJjO467EmuD' },
        expected: expectedDeposit,
      }),
      'deposit_plan_mismatch',
    )
    expectRejected(
      verifyDepositForInvoice({
        payment: { ...paidPayment, projectRef: 'SUM-9999' },
        expected: expectedDeposit,
      }),
      'deposit_project_mismatch',
    )
    expectRejected(
      verifyDepositForInvoice({
        payment: { ...paidPayment, projectRef: '' },
        expected: expectedDeposit,
      }),
      'deposit_project_mismatch',
    )
  })

  test('rejects a missing or different amount', () => {
    for (const amountCents of [null, 49_999, 50_001, 0]) {
      expectRejected(
        verifyDepositForInvoice({
          payment: { ...paidPayment, amountCents },
          expected: expectedDeposit,
        }),
        'deposit_amount_mismatch',
      )
    }
  })

  test('rejects a missing or different currency', () => {
    for (const currency of [null, '', 'eur']) {
      expectRejected(
        verifyDepositForInvoice({
          payment: { ...paidPayment, currency },
          expected: expectedDeposit,
        }),
        'deposit_currency_mismatch',
      )
    }
  })

  test('requires the project reference to match exactly', () => {
    expectRejected(
      verifyDepositForInvoice({
        payment: { ...paidPayment, projectRef: 'sum-1042' },
        expected: expectedDeposit,
      }),
      'deposit_project_mismatch',
    )
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

  test('includes the verified payment so a second deposit cannot reuse the key', () => {
    const first = invoiceIdempotencyKey('SUM-1042', 2_000_000, 50_000, 'pay_1234567890')
    const second = invoiceIdempotencyKey('SUM-1042', 2_000_000, 50_000, 'pay_0987654321')

    expect(first).not.toBe(second)
    expect(first).toBe('invoice-SUM-1042-2000000-50000-pay_1234567890')
    expect(first.length).toBeLessThanOrEqual(200)
  })

  test('embedded in the draft and matches the draft terms', () => {
    const draft = expectDraft(
      validateFinalInvoice(validInvoice, {
        currency: 'usd',
        now: NOW,
        deposit: validDeposit,
      }),
    )
    expect(draft.idempotencyKey).toBe(
      invoiceIdempotencyKey(
        draft.projectRef,
        draft.projectTotalCents,
        draft.depositCreditCents,
        draft.depositPaymentId,
      ),
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
