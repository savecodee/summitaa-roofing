import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { Route } from '../src/routes/api/whop/webhook.ts'

const SECRET = 'ws_test_secret_value_1234567890'
const ACCOUNT_ID = 'biz_wHs7ScZ5eHIZrH'
const WEBHOOK_ID = 'msg_bQPHmO2eBnHYtWWuxAN9K3Xd'

const savedEnv = {
  secret: process.env.WHOP_WEBHOOK_SECRET,
  fulfillmentUrl: process.env.WHOP_FULFILLMENT_WEBHOOK_URL,
  fulfillmentSecret: process.env.WHOP_FULFILLMENT_WEBHOOK_SECRET,
}

const realFetch = globalThis.fetch
let forwardRequests = []

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

async function sign(secret, id, timestamp, payload) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${id}.${timestamp}.${payload}`),
  )
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(signature)))}`
}

async function headersFor(payload, options = {}) {
  const id = options.id ?? WEBHOOK_ID
  const timestamp = String(Math.floor((options.now ?? Date.now()) / 1000))
  return {
    'webhook-id': id,
    'webhook-timestamp': timestamp,
    'webhook-signature': await sign(SECRET, id, timestamp, payload),
  }
}

function requestFor(payload, headers = {}) {
  return new Request('https://summitaa.whop.site/api/whop/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: payload,
  })
}

async function post(payload, headers = {}) {
  const response = await Route.options.server.handlers.POST({
    request: requestFor(payload, headers),
  })
  const body = await response.json().catch(() => null)
  return { response, body }
}

function sampleEvent(type = 'payment.succeeded', accountId = ACCOUNT_ID) {
  return JSON.stringify({
    id: WEBHOOK_ID,
    type,
    account_id: accountId,
    data: { id: 'pay_test_1234567890' },
  })
}

beforeEach(() => {
  process.env.WHOP_WEBHOOK_SECRET = SECRET
  delete process.env.WHOP_FULFILLMENT_WEBHOOK_URL
  delete process.env.WHOP_FULFILLMENT_WEBHOOK_SECRET

  forwardRequests = []
  globalThis.fetch = async (input, init = {}) => {
    forwardRequests.push({
      url: String(input),
      method: init.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      body: init.body,
    })
    return new Response(null, { status: 204 })
  }
})

afterEach(() => {
  globalThis.fetch = realFetch
  restoreEnv('WHOP_WEBHOOK_SECRET', savedEnv.secret)
  restoreEnv('WHOP_FULFILLMENT_WEBHOOK_URL', savedEnv.fulfillmentUrl)
  restoreEnv('WHOP_FULFILLMENT_WEBHOOK_SECRET', savedEnv.fulfillmentSecret)
})

describe('webhook route configuration', () => {
  test('returns 503 until the signing secret is configured', async () => {
    delete process.env.WHOP_WEBHOOK_SECRET

    const { response, body } = await post(sampleEvent())

    expect(response.status).toBe(503)
    expect(body).toEqual({
      ok: false,
      code: 'not_configured',
      message: 'Webhook verification is not configured.',
    })
  })
})

describe('webhook route signature handling', () => {
  test('rejects an unsigned request with 401 before parsing the event', async () => {
    const { response, body } = await post(sampleEvent())

    expect(response.status).toBe(401)
    expect(body?.ok).toBe(false)
    expect(body?.code).toBe('invalid_signature')
  })

  test('rejects a tampered payload with a valid-looking header', async () => {
    const original = sampleEvent()
    const headers = await headersFor(original)
    const tampered = original.replace('payment.succeeded', 'payment.failed')

    const { response, body } = await post(tampered, headers)

    expect(response.status).toBe(401)
    expect(body?.code).toBe('invalid_signature')
  })

  test('rejects a signed body that is not valid JSON', async () => {
    const payload = 'not-json'
    const headers = await headersFor(payload)

    const { response, body } = await post(payload, headers)

    expect(response.status).toBe(400)
    expect(body).toEqual({
      ok: false,
      code: 'invalid_event',
      message: 'Webhook event is not valid.',
    })
  })
})

describe('webhook official test events', () => {
  test('accepts a signed payment.succeeded test event without forwarding it', async () => {
    const payload = sampleEvent()
    const headers = await headersFor(payload)

    const { response, body } = await post(payload, headers)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      forwarded: false,
      eventType: 'payment.succeeded',
    })
    expect(forwardRequests).toHaveLength(0)
  })

  test('accepts every handled payment and setup-intent test event type', async () => {
    for (const type of [
      'payment.succeeded',
      'payment.failed',
      'payment.requires_action',
      'setup_intent.succeeded',
      'setup_intent.canceled',
      'setup_intent.requires_action',
    ]) {
      const payload = sampleEvent(type)
      const headers = await headersFor(payload)
      const { response, body } = await post(payload, headers)

      expect(response.status).toBe(200)
      expect(body).toEqual({ ok: true, forwarded: false, eventType: type })
    }
  })

  test('ignores a test event for another account without forwarding it', async () => {
    const payload = sampleEvent('payment.succeeded', 'biz_someone_else')
    const headers = await headersFor(payload)

    const { response, body } = await post(payload, headers)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      ignored: true,
      reason: 'account_mismatch',
    })
    expect(forwardRequests).toHaveLength(0)
  })

  test('ignores an event type this site does not handle', async () => {
    const payload = sampleEvent('membership.activated')
    const headers = await headersFor(payload)

    const { response, body } = await post(payload, headers)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      ignored: true,
      reason: 'unhandled_event_type',
    })
    expect(forwardRequests).toHaveLength(0)
  })
})

describe('webhook forwarding', () => {
  test('forwards a verified event with the delivery id preserved', async () => {
    process.env.WHOP_FULFILLMENT_WEBHOOK_URL = 'https://operator.example/whop'

    const payload = sampleEvent()
    const headers = await headersFor(payload)
    const { response, body } = await post(payload, headers)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      forwarded: true,
      eventType: 'payment.succeeded',
    })
    expect(forwardRequests).toHaveLength(1)
    expect(forwardRequests[0].url).toBe('https://operator.example/whop')
    expect(forwardRequests[0].headers['x-summitaa-delivery']).toBe(WEBHOOK_ID)
    expect(forwardRequests[0].headers['x-summitaa-event']).toBe('payment.succeeded')
    expect(forwardRequests[0].body).toBe(payload)
  })

  test('returns 502 when the configured forwarding endpoint is not an allowed https URL', async () => {
    process.env.WHOP_FULFILLMENT_WEBHOOK_URL = 'http://operator.example/whop'

    const payload = sampleEvent()
    const headers = await headersFor(payload)
    const { response, body } = await post(payload, headers)

    expect(response.status).toBe(502)
    expect(body?.code).toBe('fulfillment_forward_failed')
    expect(forwardRequests).toHaveLength(0)
  })

  test('returns 502 when the forwarding endpoint rejects the event so Whop retries', async () => {
    process.env.WHOP_FULFILLMENT_WEBHOOK_URL = 'https://operator.example/whop'
    globalThis.fetch = async () => new Response('nope', { status: 500 })

    const payload = sampleEvent()
    const headers = await headersFor(payload)
    const { response, body } = await post(payload, headers)

    expect(response.status).toBe(502)
    expect(body?.code).toBe('fulfillment_forward_failed')
  })
})
