import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { Route } from '../src/routes/api/whop/final-invoice.ts'

const ACCOUNT_ID = 'biz_wHs7ScZ5eHIZrH'
const PLAN_ID = 'plan_NlxIPUOrmzS6E'
const PAYMENT_ID = 'pay_1234567890'
const OPERATOR_TOKEN = 'operator_test_token_only'
const ORIGIN = 'https://summitaa.whop.site'

const savedEnv = {
  apiKey: process.env.WHOP_API_KEY,
  serverApiKey: process.env.WHOP_SERVER_API_KEY,
  apiOrigin: process.env.WHOP_API_ORIGIN,
  apiBaseUrl: process.env.WHOP_API_BASE_URL,
  operatorToken: process.env.WHOP_OPERATOR_TOKEN,
  finalInvoice: process.env.WHOP_ENABLE_FINAL_INVOICE,
  depositPlan: process.env.WHOP_DEPOSIT_PLAN_ID,
  depositAmount: process.env.WHOP_DEPOSIT_AMOUNT_CENTS,
  depositCurrency: process.env.WHOP_DEPOSIT_CURRENCY,
}

const realFetch = globalThis.fetch
let paymentRequests = []
let invoiceRequests = []
let paymentResponder = () => jsonResponse({})
let invoiceResponder = () => jsonResponse({})

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

function paidPayment(overrides = {}) {
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

function invoiceBody(overrides = {}) {
  return {
    projectRef: 'SUM-1042',
    customerName: 'Jordan Miller',
    email: 'jordan@example.com',
    projectTotalCents: 149_900,
    dueInDays: 14,
    currency: 'usd',
    depositPaymentId: PAYMENT_ID,
    ...overrides,
  }
}

function requestFor(body, options = {}) {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
  }
  if (options.origin !== false) headers.origin = ORIGIN
  if (options.authorization !== false) {
    headers.authorization = `Bearer ${options.token ?? OPERATOR_TOKEN}`
  }

  return new Request(`${ORIGIN}/api/whop/final-invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

async function postInvoice(body, options = {}) {
  const response = await Route.options.server.handlers.POST({
    request: requestFor(body, options),
  })
  const payload = await response.json().catch(() => null)
  return { response, body: payload }
}

beforeEach(() => {
  process.env.WHOP_API_KEY = 'sk_test_final_invoice_route_only'
  delete process.env.WHOP_SERVER_API_KEY
  delete process.env.WHOP_API_ORIGIN
  delete process.env.WHOP_API_BASE_URL
  process.env.WHOP_OPERATOR_TOKEN = OPERATOR_TOKEN
  process.env.WHOP_ENABLE_FINAL_INVOICE = 'true'
  process.env.WHOP_DEPOSIT_PLAN_ID = PLAN_ID
  process.env.WHOP_DEPOSIT_AMOUNT_CENTS = '50000'
  process.env.WHOP_DEPOSIT_CURRENCY = 'usd'

  paymentRequests = []
  invoiceRequests = []
  paymentResponder = () => jsonResponse(paidPayment())
  invoiceResponder = () =>
    jsonResponse({
      id: 'inv_route_1',
      status: 'open',
      pay_online_url: 'https://whop.com/invoice/inv_route_1',
    })

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input)
    const headers = Object.fromEntries(new Headers(init.headers).entries())

    if (url.includes('/payments/')) {
      paymentRequests.push({ url, headers })
      return paymentResponder()
    }

    if (url.endsWith('/invoices')) {
      invoiceRequests.push({
        url,
        headers,
        body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
      })
      return invoiceResponder()
    }

    return jsonResponse({ error: { code: 'unexpected_url' } }, 500)
  }
})

afterEach(() => {
  globalThis.fetch = realFetch
  restoreEnv('WHOP_API_KEY', savedEnv.apiKey)
  restoreEnv('WHOP_SERVER_API_KEY', savedEnv.serverApiKey)
  restoreEnv('WHOP_API_ORIGIN', savedEnv.apiOrigin)
  restoreEnv('WHOP_API_BASE_URL', savedEnv.apiBaseUrl)
  restoreEnv('WHOP_OPERATOR_TOKEN', savedEnv.operatorToken)
  restoreEnv('WHOP_ENABLE_FINAL_INVOICE', savedEnv.finalInvoice)
  restoreEnv('WHOP_DEPOSIT_PLAN_ID', savedEnv.depositPlan)
  restoreEnv('WHOP_DEPOSIT_AMOUNT_CENTS', savedEnv.depositAmount)
  restoreEnv('WHOP_DEPOSIT_CURRENCY', savedEnv.depositCurrency)
})

describe('final invoice route end to end (mocked Whop API)', () => {
  test('verifies a paid deposit and creates a real invoice with the official invoice link', async () => {
    const { response, body } = await postInvoice(invoiceBody())

    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      ok: true,
      invoice: {
        id: 'inv_route_1',
        status: 'open',
        url: 'https://whop.com/invoice/inv_route_1',
      },
      depositPaymentId: PAYMENT_ID,
      depositCreditCents: 50_000,
      balanceDueCents: 99_900,
      currency: 'usd',
      autoCharged: false,
    })
    expect(body.note).toContain('Invoice created and sent for manual payment')

    expect(paymentRequests).toHaveLength(1)
    expect(paymentRequests[0].url).toBe(
      `https://api.whop.com/api/v1/payments/${PAYMENT_ID}`,
    )
    expect(paymentRequests[0].headers['api-version-date']).toBe('2026-09-22')

    expect(invoiceRequests).toHaveLength(1)
    const invoiceRequest = invoiceRequests[0]
    expect(invoiceRequest.headers['api-version-date']).toBe('2026-09-22')
    expect(invoiceRequest.headers['idempotency-key']).toBe(
      'invoice-SUM-1042-149900-50000-pay_1234567890',
    )
    expect(invoiceRequest.body).toMatchObject({
      account_id: ACCOUNT_ID,
      product_id: 'prod_UxTHDvkWPVf68',
      collection_method: 'send_invoice',
      save_as_draft: false,
      plan: { currency: 'usd', plan_type: 'one_time', initial_price: 999 },
    })
    expect(invoiceRequest.body.line_items).toEqual([
      { label: 'Project total — SUM-1042', quantity: 1, unit_price: 1499 },
      { label: 'Deposit received — credit (SUM-1042)', quantity: 1, unit_price: -500 },
    ])
  })

  test('a retry of the same operation sends the same idempotency key', async () => {
    const first = await postInvoice(invoiceBody())
    const second = await postInvoice(invoiceBody())

    expect(first.response.status).toBe(201)
    expect(second.response.status).toBe(201)
    expect(invoiceRequests).toHaveLength(2)
    expect(invoiceRequests[0].headers['idempotency-key']).toBe(
      invoiceRequests[1].headers['idempotency-key'],
    )
  })

  test('rejects a client-supplied credit before any Whop lookup', async () => {
    const { response, body } = await postInvoice(
      invoiceBody({ depositCreditCents: 50_000 }),
    )

    expect(response.status).toBe(400)
    expect(body?.code).toBe('client_supplied_credit')
    expect(paymentRequests).toHaveLength(0)
    expect(invoiceRequests).toHaveLength(0)
  })

  test('rejects an unpaid or failed payment without creating an invoice', async () => {
    paymentResponder = () => jsonResponse(paidPayment({ status: 'failed' }))

    const { response, body } = await postInvoice(invoiceBody())

    expect(response.status).toBe(422)
    expect(body).toMatchObject({
      ok: false,
      code: 'deposit_not_verified',
      reason: 'deposit_not_paid',
    })
    expect(invoiceRequests).toHaveLength(0)
  })

  test('rejects a deposit whose project reference does not match the invoice', async () => {
    paymentResponder = () =>
      jsonResponse(paidPayment({ metadata: { project_ref: 'SUM-9999' } }))

    const { response, body } = await postInvoice(invoiceBody())

    expect(response.status).toBe(422)
    expect(body).toMatchObject({
      ok: false,
      code: 'deposit_not_verified',
      reason: 'deposit_project_mismatch',
    })
    expect(invoiceRequests).toHaveLength(0)
  })

  test('rejects a deposit whose amount does not match the configured $500', async () => {
    paymentResponder = () =>
      jsonResponse(
        paidPayment({ subtotal: { amount: '499.00', currency: 'usd', display_decimals: 2 } }),
      )

    const { response, body } = await postInvoice(invoiceBody())

    expect(response.status).toBe(422)
    expect(body).toMatchObject({
      ok: false,
      code: 'deposit_not_verified',
      reason: 'deposit_amount_mismatch',
    })
    expect(invoiceRequests).toHaveLength(0)
  })

  test('a missing payment is a 422 deposit_not_found, not a synthetic credit', async () => {
    paymentResponder = () =>
      jsonResponse({ error: { code: 'not_found', message: 'Not found' } }, 404)

    const { response, body } = await postInvoice(invoiceBody())

    expect(response.status).toBe(422)
    expect(body).toMatchObject({ ok: false, code: 'deposit_not_found' })
    expect(invoiceRequests).toHaveLength(0)
  })

  test('an invoice creation failure is reported and never becomes a 201', async () => {
    invoiceResponder = () =>
      jsonResponse({ error: { code: 'server_error', message: 'Boom' } }, 500)

    const { response, body } = await postInvoice(invoiceBody())

    expect(response.status).toBe(502)
    expect(body).toMatchObject({ ok: false, code: 'invoice_failed' })
  })

  test('an idempotency conflict is surfaced as possible_duplicate', async () => {
    invoiceResponder = () =>
      jsonResponse({ error: { code: 'idempotency_conflict' } }, 409)

    const { response, body } = await postInvoice(invoiceBody())

    expect(response.status).toBe(409)
    expect(body).toMatchObject({ ok: false, code: 'possible_duplicate' })
  })

  test('a created invoice with no hosted link still returns its id and status', async () => {
    invoiceResponder = () => jsonResponse({ id: 'inv_no_link', status: 'open' })

    const { response, body } = await postInvoice(invoiceBody())

    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      ok: true,
      invoice: { id: 'inv_no_link', status: 'open', url: null },
    })
  })
})
