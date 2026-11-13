import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { WhopApiError, WhopTransportError } from '../src/server/whop/client.ts'
import {
  createFinalInvoice,
  readCreatedInvoice,
} from '../src/server/whop/invoices.ts'

const ACCOUNT_ID = 'biz_wHs7ScZ5eHIZrH'
const PRODUCT_ID = 'prod_UxTHDvkWPVf68'

const draft = {
  projectRef: 'SUM-1042',
  customerName: 'Jordan Miller',
  email: 'jordan@example.com',
  projectTotalCents: 149_900,
  depositPaymentId: 'pay_1234567890',
  depositCreditCents: 50_000,
  balanceDueCents: 99_900,
  currency: 'usd',
  dueDate: '2026-11-11T12:00:00.000Z',
  lineItems: [
    { label: 'Project total — SUM-1042', quantity: 1, unit_price: 1499 },
    { label: 'Deposit received — credit (SUM-1042)', quantity: 1, unit_price: -500 },
  ],
  idempotencyKey: 'invoice-SUM-1042-149900-50000-pay_1234567890',
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
  process.env.WHOP_API_KEY = 'sk_test_invoice_creation_only'
  delete process.env.WHOP_SERVER_API_KEY
  delete process.env.WHOP_API_ORIGIN
  delete process.env.WHOP_API_BASE_URL

  requests = []
  respond = () => jsonResponse({})
  globalThis.fetch = async (input, init = {}) => {
    const headers = new Headers(init.headers)
    requests.push({
      url: String(input),
      method: init.method ?? 'GET',
      headers: Object.fromEntries(headers.entries()),
      body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
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

describe('legacy invoice response mapping', () => {
  test('reads the documented pay_online_url field', () => {
    expect(
      readCreatedInvoice({
        id: 'inv_abc123',
        status: 'draft',
        pay_online_url: 'https://whop.com/invoice/inv_abc123',
      }),
    ).toEqual({
      id: 'inv_abc123',
      status: 'draft',
      url: 'https://whop.com/invoice/inv_abc123',
      charged: false,
    })
  })

  test('reads a nested invoice envelope', () => {
    expect(
      readCreatedInvoice({
        invoice: {
          id: 'inv_nested',
          status: 'draft',
          pay_online_url: 'https://whop.com/invoice/inv_nested',
        },
      }),
    ).toEqual({
      id: 'inv_nested',
      status: 'draft',
      url: 'https://whop.com/invoice/inv_nested',
      charged: false,
    })
  })

  test('keeps the older link field names as fallbacks', () => {
    for (const [field, value] of [
      ['invoice_url', 'https://example.test/invoice_url'],
      ['hosted_url', 'https://example.test/hosted_url'],
      ['url', 'https://example.test/url'],
    ]) {
      expect(readCreatedInvoice({ id: 'inv_1', status: 'draft', [field]: value })).toEqual({
        id: 'inv_1',
        status: 'draft',
        url: value,
        charged: false,
      })
    }
  })

  test('prefers the official pay_online_url when several fields are present', () => {
    expect(
      readCreatedInvoice({
        id: 'inv_1',
        status: 'draft',
        pay_online_url: 'https://whop.com/official',
        invoice_url: 'https://example.test/legacy',
        hosted_url: 'https://example.test/hosted',
        url: 'https://example.test/url',
      }).url,
    ).toBe('https://whop.com/official')
  })

  test('a missing, empty, or malformed link never throws and returns null', () => {
    expect(readCreatedInvoice({ id: 'inv_1', status: 'draft' })).toEqual({
      id: 'inv_1',
      status: 'draft',
      url: null,
      charged: false,
    })
    expect(
      readCreatedInvoice({
        id: 'inv_1',
        status: 'draft',
        pay_online_url: '',
        invoice_url: '',
        hosted_url: '',
        url: '',
      }).url,
    ).toBeNull()
    expect(readCreatedInvoice(null)).toEqual({ id: null, status: null, url: null, charged: false })
    expect(readCreatedInvoice('not-an-object')).toEqual({
      id: null,
      status: null,
      url: null,
      charged: false,
    })
  })

  test('a nested empty invoice falls back to the top-level object', () => {
    expect(
      readCreatedInvoice({
        id: 'inv_top',
        status: 'draft',
        pay_online_url: 'https://whop.com/top',
        invoice: {},
      }),
    ).toEqual({
      id: 'inv_top',
      status: 'draft',
      url: 'https://whop.com/top',
      charged: false,
    })
  })
})

describe('final invoice creation request', () => {
  test('uses the legacy dated API, a real invoice (not draft), and the official link field', async () => {
    respond = () =>
      jsonResponse({
        id: 'inv_abc123',
        status: 'open',
        pay_online_url: 'https://whop.com/invoice/inv_abc123',
      })

    const created = await createFinalInvoice({ draft })

    expect(created).toEqual({
      id: 'inv_abc123',
      status: 'open',
      url: 'https://whop.com/invoice/inv_abc123',
      charged: false,
    })
    expect(requests).toHaveLength(1)

    const request = requests[0]
    expect(request.url).toBe('https://api.whop.com/api/v1/invoices')
    expect(request.method).toBe('POST')
    expect(request.headers['api-version-date']).toBe('2026-09-22')
    expect(request.headers['idempotency-key']).toBe(draft.idempotencyKey)
    expect(request.headers.authorization).toBe('Bearer sk_test_invoice_creation_only')

    expect(request.body).toEqual({
      account_id: ACCOUNT_ID,
      product_id: PRODUCT_ID,
      collection_method: 'send_invoice',
      save_as_draft: false,
      customer_name: 'Jordan Miller',
      email_address: 'jordan@example.com',
      due_date: '2026-11-11T12:00:00.000Z',
      plan: {
        currency: 'usd',
        plan_type: 'one_time',
        initial_price: 999,
      },
      line_items: [
        { label: 'Project total — SUM-1042', quantity: 1, unit_price: 1499 },
        { label: 'Deposit received — credit (SUM-1042)', quantity: 1, unit_price: -500 },
      ],
    })
    expect(request.body.collection_method).not.toBe('charge_automatically')
    expect(request.body.payment_method_id).toBeUndefined()
    expect(request.body.payment_token_id).toBeUndefined()
  })

  test('a retry of the same operation reuses the same idempotency key', async () => {
    respond = () =>
      jsonResponse({
        id: 'inv_replayed',
        status: 'open',
        pay_online_url: 'https://whop.com/invoice/inv_replayed',
      })

    await createFinalInvoice({ draft })
    await createFinalInvoice({ draft })

    expect(requests).toHaveLength(2)
    expect(requests[0].headers['idempotency-key']).toBe(draft.idempotencyKey)
    expect(requests[1].headers['idempotency-key']).toBe(draft.idempotencyKey)
    expect(requests[0].headers['idempotency-key']).toBe(
      requests[1].headers['idempotency-key'],
    )
  })

  test('a changed operation uses a different idempotency key', async () => {
    await createFinalInvoice({ draft })
    await createFinalInvoice({
      draft: {
        ...draft,
        depositPaymentId: 'pay_0987654321',
        idempotencyKey: 'invoice-SUM-1042-149900-50000-pay_0987654321',
      },
    })

    expect(requests[0].headers['idempotency-key']).not.toBe(
      requests[1].headers['idempotency-key'],
    )
  })

  test('a created invoice with no link still returns its id and status', async () => {
    respond = () => jsonResponse({ id: 'inv_no_link', status: 'open' })

    await expect(createFinalInvoice({ draft })).resolves.toEqual({
      id: 'inv_no_link',
      status: 'open',
      url: null,
      charged: false,
    })
  })

  test('an upstream rejection surfaces as a typed error for the route to map', async () => {
    respond = () =>
      jsonResponse(
        { error: { code: 'parameter_invalid', message: 'Invalid invoice.' } },
        422,
      )

    await expect(createFinalInvoice({ draft })).rejects.toMatchObject({
      name: 'WhopApiError',
      status: 422,
    })
  })

  test('an idempotency conflict surfaces as 409 rather than being retried blindly', async () => {
    respond = () =>
      jsonResponse(
        { error: { code: 'idempotency_conflict', message: 'Key reused.' } },
        409,
      )

    let caught = null
    try {
      await createFinalInvoice({ draft })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(WhopApiError)
    expect(caught.status).toBe(409)
  })

  test('a network failure surfaces as a transport error', async () => {
    globalThis.fetch = async () => {
      throw new Error('network down')
    }

    await expect(createFinalInvoice({ draft })).rejects.toBeInstanceOf(WhopTransportError)
  })
})
