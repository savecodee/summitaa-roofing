import '@tanstack/react-start/server-only'

import { getWhopServerConfig } from './config'

function isAllowedFulfillmentUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    )
  } catch {
    return false
  }
}

async function signPayload(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Optional operator fulfillment forward.
 *
 * The site has no database, so the reliable fulfillment path is to forward the
 * verified webhook to an operator-controlled endpoint. The original
 * `webhook-id` is preserved as `x-summitaa-delivery`; the receiver must treat it
 * as an idempotency key because Whop can retry a delivery.
 */
export async function forwardVerifiedWebhook(input: {
  webhookId: string
  eventType: string
  payload: string
}): Promise<{ forwarded: boolean; ok: boolean; status: number | null }> {
  const config = getWhopServerConfig()
  const url = config.fulfillmentWebhookUrl

  if (!url) return { forwarded: false, ok: true, status: null }
  if (!isAllowedFulfillmentUrl(url)) {
    console.error('[whop] fulfillment webhook URL is not an allowed https URL')
    return { forwarded: false, ok: false, status: null }
  }

  const headers = new Headers({
    'content-type': 'application/json',
    'user-agent': 'summitaa-roofing-whop/1.0',
    'x-summitaa-delivery': input.webhookId.slice(0, 200),
    'x-summitaa-event': input.eventType.slice(0, 120),
  })

  if (config.fulfillmentWebhookSecret) {
    const signature = await signPayload(
      config.fulfillmentWebhookSecret,
      `${input.webhookId}.${input.payload}`,
    )
    headers.set('x-summitaa-signature', `sha256=${signature}`)
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      // Forward the exact verified bytes; the receiver can re-verify if needed.
      body: input.payload,
      signal: AbortSignal.timeout(3_500),
    })

    return { forwarded: true, ok: response.ok, status: response.status }
  } catch {
    return { forwarded: true, ok: false, status: null }
  }
}
