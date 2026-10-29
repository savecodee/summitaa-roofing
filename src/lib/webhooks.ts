/**
 * Whop webhook verification (Standard Webhooks).
 *
 * Whop signs `{webhook-id}.{webhook-timestamp}.{raw body}` with HMAC-SHA256,
 * using the literal UTF-8 bytes of the full `ws_...` secret as the key. This is
 * intentionally not base64-decoded: Whop's own SDK base64-encodes the secret to
 * cancel out the Standard Webhooks library's decode step.
 *
 * The raw request body must be verified before any JSON parsing.
 */

export const WEBHOOK_TOLERANCE_SECONDS = 300

export type WebhookSignatureHeaders = {
  id: string
  timestamp: string
  signature: string
}

export type WebhookVerificationResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'missing_secret'
        | 'missing_headers'
        | 'invalid_timestamp'
        | 'stale_timestamp'
        | 'invalid_signature'
    }

const TIMESTAMP_PATTERN = /^\d{1,12}$/

export function readWebhookHeaders(headers: Headers): WebhookSignatureHeaders | null {
  const id = headers.get('webhook-id')?.trim()
  const timestamp = headers.get('webhook-timestamp')?.trim()
  const signature = headers.get('webhook-signature')?.trim()

  if (!id || !timestamp || !signature) return null
  return { id, timestamp, signature }
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(new ArrayBuffer(binary.length))
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

function parseSignatures(header: string): Uint8Array<ArrayBuffer>[] {
  const signatures: Uint8Array<ArrayBuffer>[] = []

  for (const part of header.split(/\s+/)) {
    if (!part.startsWith('v1,')) continue

    const encoded = part.slice(3)
    if (!encoded) continue

    const decoded = decodeBase64(encoded)
    if (decoded) signatures.push(decoded)
  }

  return signatures
}

export async function verifyWhopWebhook(input: {
  secret: string | null | undefined
  payload: string
  headers: WebhookSignatureHeaders | null
  now?: number
  toleranceSeconds?: number
}): Promise<WebhookVerificationResult> {
  if (!input.secret) return { ok: false, reason: 'missing_secret' }
  if (!input.headers) return { ok: false, reason: 'missing_headers' }

  const { id, timestamp } = input.headers
  if (!id || !TIMESTAMP_PATTERN.test(timestamp)) {
    return { ok: false, reason: 'invalid_timestamp' }
  }

  const tolerance = input.toleranceSeconds ?? WEBHOOK_TOLERANCE_SECONDS
  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000)
  if (Math.abs(nowSeconds - Number(timestamp)) > tolerance) {
    return { ok: false, reason: 'stale_timestamp' }
  }

  const signatures = parseSignatures(input.headers.signature)
  if (signatures.length === 0) return { ok: false, reason: 'invalid_signature' }

  const encoder = new TextEncoder()

  let key: CryptoKey
  try {
    key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(input.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
  } catch {
    return { ok: false, reason: 'missing_secret' }
  }

  const signedPayload = encoder.encode(`${id}.${timestamp}.${input.payload}`)

  for (const signature of signatures) {
    try {
      const valid = await crypto.subtle.verify('HMAC', key, signature, signedPayload)
      if (valid) return { ok: true }
    } catch {
      // Try the next signature; a malformed one never authenticates.
    }
  }

  return { ok: false, reason: 'invalid_signature' }
}

export type WebhookEnvelope = {
  id: string
  type: string
  accountId: string | null
  data: Record<string, unknown>
}

export function parseWebhookEnvelope(payload: string): WebhookEnvelope | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(payload)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

  const record = parsed as Record<string, unknown>
  const type = record.type
  const data = record.data

  if (typeof type !== 'string' || type.length === 0 || type.length > 120) return null
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null

  const accountId =
    typeof record.account_id === 'string'
      ? record.account_id
      : typeof record.company_id === 'string'
        ? record.company_id
        : null

  return {
    id: typeof record.id === 'string' ? record.id : '',
    type,
    accountId,
    data: data as Record<string, unknown>,
  }
}

export const PAYMENT_WEBHOOK_TYPES = [
  'payment.succeeded',
  'payment.failed',
  'payment.requires_action',
] as const

export type PaymentWebhookType = (typeof PAYMENT_WEBHOOK_TYPES)[number]

export function isPaymentWebhookType(type: string): type is PaymentWebhookType {
  return (PAYMENT_WEBHOOK_TYPES as readonly string[]).includes(type)
}
