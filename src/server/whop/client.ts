import '@tanstack/react-start/server-only'

import { getWhopServerConfig } from './config'

export class WhopNotConfiguredError extends Error {
  constructor(public readonly missing: string) {
    super('Whop is not configured')
    this.name = 'WhopNotConfiguredError'
  }
}

export class WhopApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super('Whop API request failed')
    this.name = 'WhopApiError'
  }
}

export class WhopTransportError extends Error {
  constructor() {
    super('Whop API could not be reached')
    this.name = 'WhopTransportError'
  }
}

export type WhopRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  apiVersion?: string
  idempotencyKey?: string
  timeoutMs?: number
}

function extractErrorCode(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return 'upstream_error'

  const error = (payload as Record<string, unknown>).error
  if (typeof error !== 'object' || error === null) return 'upstream_error'

  const record = error as Record<string, unknown>
  const candidate = record.code ?? record.type ?? record.error_code

  if (typeof candidate === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(candidate)) {
    return candidate
  }

  return 'upstream_error'
}

/**
 * Minimal server-side Whop REST client. It deliberately sends only the API key,
 * JSON, and an optional idempotency key; nothing from the browser is forwarded
 * except the values each caller has already validated.
 */
export async function whopRequest(
  path: string,
  options: WhopRequestOptions = {},
): Promise<unknown> {
  if (!path.startsWith('/') || path.includes('..') || path.length > 300) {
    throw new WhopApiError(400, 'invalid_path')
  }

  const config = getWhopServerConfig()
  if (!config.apiConfigured) throw new WhopNotConfiguredError('WHOP_API_ORIGIN')

  const method = options.method ?? 'GET'
  const headers = new Headers({ accept: 'application/json' })

  // The hosted runtime signs calls to WHOP_API_ORIGIN through its outbound
  // proxy, so no key is present in the app. Local development still uses an
  // explicit key from `.dev.vars`.
  if (config.apiKey) headers.set('authorization', `Bearer ${config.apiKey}`)

  if (options.body !== undefined) headers.set('content-type', 'application/json')
  if (options.apiVersion) headers.set('Api-Version-Date', options.apiVersion)
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey.slice(0, 200))

  let response: Response
  try {
    response = await fetch(new URL(`${config.apiBaseUrl}${path}`), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
    })
  } catch {
    throw new WhopTransportError()
  }

  const text = await response.text().catch(() => '')
  let payload: unknown = null
  if (text.length > 0) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const code = extractErrorCode(payload)
    // Never log the response body: it can include customer or payment data.
    console.error('[whop] upstream request failed', { status: response.status, code, method })
    throw new WhopApiError(response.status, code)
  }

  return payload
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function pickString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function pickNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
