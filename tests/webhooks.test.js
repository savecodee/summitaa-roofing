import { describe, expect, test } from 'bun:test'

import {
  HANDLED_WEBHOOK_TYPES,
  isHandledWebhookType,
  isPaymentWebhookType,
  isSetupIntentWebhookType,
  parseWebhookEnvelope,
  PAYMENT_WEBHOOK_TYPES,
  readWebhookHeaders,
  SETUP_INTENT_WEBHOOK_TYPES,
  verifyWhopWebhook,
  WEBHOOK_TOLERANCE_SECONDS,
} from '../src/lib/webhooks.ts'

const SECRET = 'ws_test_secret_value_1234567890'
const WEBHOOK_ID = 'msg_bQPHmO2eBnHYtWWuxAN9K3Xd'
const PAYLOAD = JSON.stringify({
  id: WEBHOOK_ID,
  type: 'payment.succeeded',
  account_id: 'biz_wHs7ScZ5eHIZrH',
  data: { id: 'pay_1234567890' },
})

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

function base64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

async function headersFor(secret = SECRET, id = WEBHOOK_ID, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000))
  return {
    id,
    timestamp,
    signature: await sign(secret, id, timestamp, PAYLOAD),
  }
}

describe('webhook signature verification', () => {
  test('accepts a correctly signed payload', async () => {
    const headers = await headersFor()
    const result = await verifyWhopWebhook({ secret: SECRET, payload: PAYLOAD, headers })
    expect(result).toEqual({ ok: true })
  })

  test('uses the literal secret bytes, not a decoded form', async () => {
    const headers = await headersFor()

    // A stripped/decoded key is what a naive Standard Webhooks adapter uses.
    // Whop signs with the literal `ws_...` bytes, so that variant must fail.
    const decodedSecret = SECRET.replace(/^ws_/, '')
    expect(decodedSecret).not.toBe(SECRET)
    const wrong = await verifyWhopWebhook({
      secret: decodedSecret,
      payload: PAYLOAD,
      headers,
    })
    expect(wrong).toEqual({ ok: false, reason: 'invalid_signature' })
  })

  test('rejects the wrong secret and a modified payload', async () => {
    const headers = await headersFor()

    expect(
      await verifyWhopWebhook({ secret: 'ws_other_secret', payload: PAYLOAD, headers }),
    ).toEqual({ ok: false, reason: 'invalid_signature' })

    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD.replace('succeeded', 'failed'),
        headers,
      }),
    ).toEqual({ ok: false, reason: 'invalid_signature' })
  })

  test('rejects missing or malformed headers', async () => {
    expect(
      await verifyWhopWebhook({ secret: SECRET, payload: PAYLOAD, headers: null }),
    ).toEqual({ ok: false, reason: 'missing_headers' })

    const headers = await headersFor()
    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        headers: { ...headers, signature: 'v2,abc' },
      }),
    ).toEqual({ ok: false, reason: 'invalid_signature' })

    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        headers: { ...headers, signature: 'v1,not-base64!!' },
      }),
    ).toEqual({ ok: false, reason: 'invalid_signature' })

    expect(
      await verifyWhopWebhook({ secret: SECRET, payload: PAYLOAD, headers: undefined }),
    ).toEqual({ ok: false, reason: 'missing_headers' })
  })

  test('rejects stale and malformed timestamps', async () => {
    const now = Date.now()
    const staleTimestamp = String(Math.floor(now / 1000) - WEBHOOK_TOLERANCE_SECONDS - 1)
    const staleSignature = await sign(SECRET, WEBHOOK_ID, staleTimestamp, PAYLOAD)

    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        headers: { id: WEBHOOK_ID, timestamp: staleTimestamp, signature: staleSignature },
        now,
      }),
    ).toEqual({ ok: false, reason: 'stale_timestamp' })

    const futureTimestamp = String(Math.floor(now / 1000) + WEBHOOK_TOLERANCE_SECONDS + 1)
    const futureSignature = await sign(SECRET, WEBHOOK_ID, futureTimestamp, PAYLOAD)
    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        headers: { id: WEBHOOK_ID, timestamp: futureTimestamp, signature: futureSignature },
        now,
      }),
    ).toEqual({ ok: false, reason: 'stale_timestamp' })

    const headers = await headersFor()
    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        headers: { ...headers, timestamp: 'yesterday' },
      }),
    ).toEqual({ ok: false, reason: 'invalid_timestamp' })
  })

  test('accepts the timestamp exactly at the tolerance boundary', async () => {
    const now = Date.now()
    const boundary = String(Math.floor(now / 1000) - WEBHOOK_TOLERANCE_SECONDS)
    const signature = await sign(SECRET, WEBHOOK_ID, boundary, PAYLOAD)

    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        headers: { id: WEBHOOK_ID, timestamp: boundary, signature },
        now,
      }),
    ).toEqual({ ok: true })
  })

  test('accepts any one valid signature from a rotated header', async () => {
    const headers = await headersFor()
    const validPart = headers.signature
    const otherPart = `v1,${base64(new Uint8Array(32).fill(7))}`

    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        headers: { ...headers, signature: `${otherPart} ${validPart}` },
      }),
    ).toEqual({ ok: true })

    expect(
      await verifyWhopWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        headers: { ...headers, signature: `${validPart} ${otherPart}` },
      }),
    ).toEqual({ ok: true })
  })

  test('rejects a missing or empty secret', async () => {
    const headers = await headersFor()

    expect(
      await verifyWhopWebhook({ secret: null, payload: PAYLOAD, headers }),
    ).toEqual({ ok: false, reason: 'missing_secret' })
    expect(
      await verifyWhopWebhook({ secret: '', payload: PAYLOAD, headers }),
    ).toEqual({ ok: false, reason: 'missing_secret' })
  })
})

describe('webhook headers and envelope', () => {
  test('reads the three frozen signature headers', () => {
    const headers = new Headers({
      'webhook-id': ' msg_1 ',
      'webhook-timestamp': ' 1786381404 ',
      'webhook-signature': ' v1,abc ',
    })

    expect(readWebhookHeaders(headers)).toEqual({
      id: 'msg_1',
      timestamp: '1786381404',
      signature: 'v1,abc',
    })

    expect(readWebhookHeaders(new Headers())).toBeNull()
    expect(readWebhookHeaders(new Headers({ 'webhook-id': 'msg_1' }))).toBeNull()
  })

  test('parses account_id and falls back to the legacy company_id', () => {
    const modern = parseWebhookEnvelope(
      JSON.stringify({
        id: 'msg_1',
        type: 'payment.succeeded',
        account_id: 'biz_modern',
        data: { id: 'pay_1' },
      }),
    )
    expect(modern?.accountId).toBe('biz_modern')

    const legacy = parseWebhookEnvelope(
      JSON.stringify({
        id: 'msg_2',
        type: 'payment.failed',
        company_id: 'biz_legacy',
        data: { id: 'pay_2' },
      }),
    )
    expect(legacy?.accountId).toBe('biz_legacy')
    expect(legacy?.id).toBe('msg_2')

    const unknown = parseWebhookEnvelope(
      JSON.stringify({ type: 'payment.failed', data: {} }),
    )
    expect(unknown?.accountId).toBeNull()
    expect(unknown?.id).toBe('')
  })

  test('rejects malformed envelopes', () => {
    expect(parseWebhookEnvelope('not json')).toBeNull()
    expect(parseWebhookEnvelope('[]')).toBeNull()
    expect(parseWebhookEnvelope('null')).toBeNull()
    expect(parseWebhookEnvelope(JSON.stringify({ type: '', data: {} }))).toBeNull()
    expect(parseWebhookEnvelope(JSON.stringify({ type: 'x'.repeat(121), data: {} }))).toBeNull()
    expect(parseWebhookEnvelope(JSON.stringify({ type: 'payment.succeeded' }))).toBeNull()
    expect(
      parseWebhookEnvelope(JSON.stringify({ type: 'payment.succeeded', data: [] })),
    ).toBeNull()
  })

  test('only the three payment events and three setup-intent events are handled', () => {
    for (const type of PAYMENT_WEBHOOK_TYPES) {
      expect(isPaymentWebhookType(type)).toBe(true)
      expect(isHandledWebhookType(type)).toBe(true)
    }
    expect(isPaymentWebhookType('payment.updated')).toBe(false)
    expect(isPaymentWebhookType('membership.created')).toBe(false)

    for (const type of SETUP_INTENT_WEBHOOK_TYPES) {
      expect(isSetupIntentWebhookType(type)).toBe(true)
      expect(isHandledWebhookType(type)).toBe(true)
      expect(isPaymentWebhookType(type)).toBe(false)
    }

    expect(HANDLED_WEBHOOK_TYPES).toHaveLength(6)
    expect(isHandledWebhookType('setup_intent.created')).toBe(false)
    expect(isHandledWebhookType('membership.created')).toBe(false)
  })
})
