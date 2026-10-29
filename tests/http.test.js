import { describe, expect, test } from 'bun:test'

import {
  isSameOriginRequest,
  jsonResponse,
  readBearerToken,
  readJsonBody,
  readRawBody,
  timingSafeEqualString,
} from '../src/server/http.ts'

function jsonRequest(body, init = {}) {
  return new Request('https://summitaa.example/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    ...init,
  })
}

describe('JSON responses', () => {
  test('sets a JSON content type and no-store caching', async () => {
    const response = jsonResponse({ ok: true })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await response.json()).toEqual({ ok: true })
  })

  test('honours a custom status and extra headers', async () => {
    const response = jsonResponse({ ok: false }, { status: 422, headers: { 'x-test': '1' } })
    expect(response.status).toBe(422)
    expect(response.headers.get('x-test')).toBe('1')
    expect(await response.json()).toEqual({ ok: false })
  })
})

describe('JSON body parsing', () => {
  test('accepts a JSON object', async () => {
    const result = await readJsonBody(jsonRequest(JSON.stringify({ a: 1 })))
    expect(result).toEqual({ ok: true, value: { a: 1 } })
  })

  test('rejects a non-JSON content type without reading it', async () => {
    const request = new Request('https://summitaa.example/api/test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    })
    const result = await readJsonBody(request)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(415)
    expect(result.code).toBe('unsupported_media_type')
  })

  test('rejects empty, malformed, and oversized bodies', async () => {
    const empty = await readJsonBody(jsonRequest(''))
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.status).toBe(400)

    const malformed = await readJsonBody(jsonRequest('{'))
    expect(malformed.ok).toBe(false)
    if (!malformed.ok) {
      expect(malformed.status).toBe(400)
      expect(malformed.code).toBe('invalid_body')
    }

    const oversized = await readJsonBody(jsonRequest(JSON.stringify({ a: 'x'.repeat(100) })), 20)
    expect(oversized.ok).toBe(false)
    if (!oversized.ok) {
      expect(oversized.status).toBe(413)
      expect(oversized.code).toBe('body_too_large')
    }
  })

  test('rejects an oversized declared content-length before reading', async () => {
    const request = new Request('https://summitaa.example/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '999999' },
      body: '{}',
    })
    const result = await readJsonBody(request, 100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(413)
  })
})

describe('raw body parsing', () => {
  test('returns the exact bytes for signature verification', async () => {
    const payload = '{"a":1,  "b":"two"}'
    const result = await readRawBody(jsonRequest(payload))
    expect(result).toEqual({ ok: true, text: payload })
  })

  test('rejects an empty body and enforces the size limit', async () => {
    const empty = await readRawBody(
      new Request('https://summitaa.example/api/webhook', { method: 'POST', body: '' }),
    )
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.status).toBe(400)

    const oversized = await readRawBody(jsonRequest('x'.repeat(50)), 10)
    expect(oversized.ok).toBe(false)
    if (!oversized.ok) expect(oversized.status).toBe(413)
  })

  test('does not require a JSON content type', async () => {
    const request = new Request('https://summitaa.example/api/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/webhook+json' },
      body: 'payload',
    })
    expect(await readRawBody(request)).toEqual({ ok: true, text: 'payload' })
  })
})

describe('same-origin checks', () => {
  test('allows a matching origin', () => {
    const request = new Request('https://summitaa.example/api/test', {
      method: 'POST',
      headers: { origin: 'https://summitaa.example' },
    })
    expect(isSameOriginRequest(request)).toBe(true)
  })

  test('rejects a mismatched or malformed origin', () => {
    const crossOrigin = new Request('https://summitaa.example/api/test', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    })
    expect(isSameOriginRequest(crossOrigin)).toBe(false)

    const malformed = new Request('https://summitaa.example/api/test', {
      method: 'POST',
      headers: { origin: 'not a url' },
    })
    expect(isSameOriginRequest(malformed)).toBe(false)
  })

  test('allows requests with no origin so webhooks and curl can call', () => {
    const request = new Request('https://summitaa.example/api/webhook', { method: 'POST' })
    expect(isSameOriginRequest(request)).toBe(true)
  })

  test('compares scheme and port, not just the host name', () => {
    const wrongPort = new Request('https://summitaa.example:8443/api/test', {
      method: 'POST',
      headers: { origin: 'https://summitaa.example' },
    })
    expect(isSameOriginRequest(wrongPort)).toBe(false)
  })
})

describe('operator token handling', () => {
  test('compares equal strings', async () => {
    expect(await timingSafeEqualString('token-abc', 'token-abc')).toBe(true)
  })

  test('rejects different values and lengths', async () => {
    expect(await timingSafeEqualString('token-abc', 'token-abd')).toBe(false)
    expect(await timingSafeEqualString('token-abc', 'token-abc-longer')).toBe(false)
    expect(await timingSafeEqualString('', 'x')).toBe(false)
  })

  test('reads a bearer token case-insensitively and trims it', () => {
    expect(
      readBearerToken(
        new Request('https://summitaa.example/api/test', {
          headers: { authorization: 'Bearer operator-token' },
        }),
      ),
    ).toBe('operator-token')

    expect(
      readBearerToken(
        new Request('https://summitaa.example/api/test', {
          headers: { authorization: 'bearer   spaced  ' },
        }),
      ),
    ).toBe('spaced')

    expect(
      readBearerToken(
        new Request('https://summitaa.example/api/test', {
          headers: { authorization: 'Basic abc' },
        }),
      ),
    ).toBeNull()

    expect(readBearerToken(new Request('https://summitaa.example/api/test'))).toBeNull()
  })
})
