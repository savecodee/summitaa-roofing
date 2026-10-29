import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { verifyDepositForInvoice } from '../src/lib/invoice.ts'
import { WhopApiError } from '../src/server/whop/client.ts'
import { getDepositPayment } from '../src/server/whop/payments.ts'

const PAYMENT_ID = 'pay_1234567890'
const ACCOUNT_ID = 'biz_wHs7ScZ5eHIZrH'
const PLAN_ID = 'plan_NlxIPUOrmzS6E'

const expected = {
  accountId: ACCOUNT_ID,
  planId: PLAN_ID,
  projectRef: 'SUM-1042',
  amountCents: 50_000,
  currency: 'usd',
}

const savedEnv = {
  apiKey: process.env.WHOP_API_KEY,
  serverApiKey: process.env.WHOP_SERVER_API_KEY,
  apiOrigin: process.env.WHOP_API_ORIGIN,
  apiBaseUrl: process.env.WHOP_API_BASE_URL,
}

const realFetch = globalThis.fetch
let requests = []
let respond = () => jsonResponse({})

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

beforeEach(() => {
  process.env.WHOP_API_KEY = 'sk_test_payment_lookup_only'
  delete process.env.WHOP_SERVER_API_KEY
  delete process.env.WHOP_API_ORIGIN
  delete process.env.WHOP_API_BASE_URL

  requests = []
  respond = () => jsonResponse({})
  globalThis.fetch = async (input, init = {}) => {
    requests.push({
      url: String(input),
      method: init.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init.headers).entries()),
    })
    return respond()
  }
})

afterEach(() => {
  globalThis.fetch = realFetch
  restoreEnv('WHOP_API_KEY', savedEnv.apiKey)
  restoreEnv('WHOP_SERVER_API_KEY', savedEnv.serverApiKey)
  restoreEnv('WHOP_API_ORIGIN', savedEnv.apiOrigin)
  restoreEnv('WHOP_API_BASE_URL', savedEnv.apiBaseUrl)
})

function paidPayload(overrides = {}) {
  return {
    id: PAYMENT_ID,
    status: 'paid',
    account_id: ACCOUNT_ID,
    variant_id: PLAN_ID,
    payment_method_id: 'payt_card_on_file',
    metadata: { project_ref: 'SUM-1042', request_id: 'att_12345678' },
    subtotal: { amount: '500.00', currency: 'usd', display_decimals: 2 },
    ...overrides,
  }
}

describe('authoritative payment lookup', () => {
  test('reads the fields the invoice gate needs from Whop', async () => {
    respond = () => jsonResponse(paidPayload())

    const payment = await getDepositPayment(PAYMENT_ID)

    expect(payment).toEqual({
      id: PAYMENT_ID,
      status: 'paid',
      paid: true,
      failed: false,
      pending: false,
      projectRef: 'SUM-1042',
      amountMajor: '500.00',
      amountCents: 50_000,
      currency: 'usd',
      displayDecimals: 2,
      accountId: ACCOUNT_ID,
      planId: PLAN_ID,
      memberId: null,
      paymentMethodId: 'payt_card_on_file',
    })

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe(`https://api.whop.com/api/v1/payments/${PAYMENT_ID}`)
    expect(requests[0].method).toBe('GET')
    expect(requests[0].headers['api-version-date']).toBe('2026-09-22')
  })

  test('the looked-up paid payment passes the invoice gate', async () => {
    respond = () => jsonResponse(paidPayload())

    const payment = await getDepositPayment(PAYMENT_ID)
    expect(verifyDepositForInvoice({ payment, expected })).toEqual({
      ok: true,
      depositCreditCents: 50_000,
    })
  })

  test('a failed payment fails the gate instead of looking like a credit', async () => {
    respond = () =>
      jsonResponse(
        paidPayload({
          status: 'failed',
          subtotal: { amount: '500.00', currency: 'usd', display_decimals: 2 },
        }),
      )

    const payment = await getDepositPayment(PAYMENT_ID)
    expect(payment.paid).toBe(false)
    expect(payment.failed).toBe(true)
    expect(verifyDepositForInvoice({ payment, expected })).toEqual({
      ok: false,
      code: 'deposit_not_paid',
      message: 'Whop has not confirmed this deposit as paid.',
    })
  })

  test('a payment with missing money fields fails closed', async () => {
    respond = () =>
      jsonResponse({
        id: PAYMENT_ID,
        status: 'paid',
        account_id: ACCOUNT_ID,
        variant_id: PLAN_ID,
        metadata: {},
      })

    const payment = await getDepositPayment(PAYMENT_ID)
    expect(payment.amountCents).toBeNull()
    expect(payment.currency).toBeNull()
    expect(payment.projectRef).toBe('')
    expect(verifyDepositForInvoice({ payment, expected })).toEqual({
      ok: false,
      code: 'deposit_project_mismatch',
      message: 'The deposit is linked to a different project.',
    })
  })

  test('a payment for another account is rejected after the live lookup', async () => {
    respond = () => jsonResponse(paidPayload({ account_id: 'biz_other' }))

    const payment = await getDepositPayment(PAYMENT_ID)
    expect(verifyDepositForInvoice({ payment, expected })).toEqual({
      ok: false,
      code: 'deposit_account_mismatch',
      message: 'The deposit belongs to a different Whop account.',
    })
  })

  test('a missing payment is an upstream 404, not a synthetic success', async () => {
    respond = () =>
      jsonResponse({ error: { code: 'not_found', message: 'Not found' } }, 404)

    await expect(getDepositPayment(PAYMENT_ID)).rejects.toBeInstanceOf(WhopApiError)
  })

  test('an invalid reference never reaches the network', async () => {
    let caught = null
    try {
      await getDepositPayment('sint_not_a_payment')
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(Error)
    expect(caught.message).toBe('invalid_payment_id')
    expect(requests).toHaveLength(0)
  })
})
