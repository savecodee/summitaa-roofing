import '@tanstack/react-start/server-only'

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...init.headers,
    },
  })
}

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: number; code: string; message: string }

export type RawBodyResult =
  | { ok: true; text: string }
  | { ok: false; status: number; code: string; message: string }

function declaredLengthTooLarge(request: Request, maxBytes: number): boolean {
  const header = request.headers.get('content-length')
  if (!header || !/^\d+$/.test(header)) return false
  return Number(header) > maxBytes
}

/**
 * Reads the exact request bytes for signature verification. The body must be
 * read before any JSON parsing, because parsing changes the bytes that were
 * signed.
 */
export async function readRawBody(request: Request, maxBytes = 1_000_000): Promise<RawBodyResult> {
  if (declaredLengthTooLarge(request, maxBytes)) {
    return { ok: false, status: 413, code: 'body_too_large', message: 'Request body is too large.' }
  }

  let text: string
  try {
    text = await request.text()
  } catch {
    return { ok: false, status: 400, code: 'invalid_body', message: 'Could not read the request.' }
  }

  if (text.length === 0) {
    return { ok: false, status: 400, code: 'invalid_body', message: 'Empty request body.' }
  }

  if (text.length > maxBytes) {
    return { ok: false, status: 413, code: 'body_too_large', message: 'Request body is too large.' }
  }

  return { ok: true, text }
}

export async function readJsonBody(
  request: Request,
  maxBytes = 20_000,
): Promise<JsonBodyResult> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return {
      ok: false,
      status: 415,
      code: 'unsupported_media_type',
      message: 'Send a JSON request body.',
    }
  }

  if (declaredLengthTooLarge(request, maxBytes)) {
    return { ok: false, status: 413, code: 'body_too_large', message: 'Request body is too large.' }
  }

  let text: string
  try {
    text = await request.text()
  } catch {
    return { ok: false, status: 400, code: 'invalid_body', message: 'Could not read the request.' }
  }

  if (text.length === 0) {
    return { ok: false, status: 400, code: 'invalid_body', message: 'Empty request body.' }
  }

  if (text.length > maxBytes) {
    return { ok: false, status: 413, code: 'body_too_large', message: 'Request body is too large.' }
  }

  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, status: 400, code: 'invalid_body', message: 'Invalid JSON body.' }
  }
}

/**
 * Browsers always send `Origin` on cross-origin POSTs. Reject a present but
 * mismatched origin; allow requests with no Origin (webhooks, curl, native
 * forms) so server-to-server callers still work.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return new Uint8Array(digest)
}

/**
 * Compare two strings without leaking which byte differed. SHA-256 first makes
 * the buffers equal length, so the comparison is independent of token length.
 */
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([sha256(a), sha256(b)])

  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index]
  }

  return difference === 0
}

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null

  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}
