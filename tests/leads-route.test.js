import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { Route } from '../src/routes/api/leads.ts'
import { createSessionCookie } from '../src/server/whop/oauth.ts'
import { resetRateLimits } from '../src/server/rate-limit.ts'

const ORIGIN = 'https://summitaa.whop.site'
const REQUEST_ID = 'est_1234567890abcdef'

const savedEnv = {
  apiKey: process.env.WHOP_API_KEY,
  apiBaseUrl: process.env.WHOP_API_BASE_URL,
  apiOrigin: process.env.WHOP_API_ORIGIN,
  sessionSecret: process.env.WHOP_SESSION_SECRET,
  resendKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
}

const realFetch = globalThis.fetch
let leadRequests = []
let eventRequests = []

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

function validBody(overrides = {}) {
  return {
    name: 'Jordan Miller',
    email: 'jordan@example.com',
    phone: '(555) 010-2030',
    address: '123 Main Street',
    zip: '12345',
    service: 'roof-repair',
    details: 'A leak above the garage.',
    requestId: REQUEST_ID,
    startedAt: Date.now() - 10_000,
    sourcePath: '/',
    company: '',
    ...overrides,
  }
}

function requestFor(body, options = {}) {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
    origin: ORIGIN,
    'x-forwarded-for': options.ip ?? '203.0.113.10',
  }
  if (options.cookie) headers.cookie = options.cookie

  return new Request(`${ORIGIN}/api/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

async function postLead(body, options = {}) {
  const response = await Route.options.server.handlers.POST({
    request: requestFor(body, options),
  })
  const payload = await response.json().catch(() => null)
  return { response, body: payload }
}

beforeEach(() => {
  process.env.WHOP_API_KEY = 'sk_test_leads_route_only'
  delete process.env.WHOP_API_BASE_URL
  delete process.env.WHOP_API_ORIGIN
  process.env.WHOP_SESSION_SECRET = 'session_test_secret_for_leads_route'
  delete process.env.RESEND_API_KEY
  delete process.env.EMAIL_FROM

  leadRequests = []
  eventRequests = []
  resetRateLimits()

  globalThis.fetch = async (input, init = {}) => {
    const url = input instanceof Request ? input.url : String(input)
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : null

    if (url.endsWith('/leads')) {
      leadRequests.push({ url, body })
      return jsonResponse({ id: 'lead_test_anonymous' })
    }

    if (url.endsWith('/events')) {
      eventRequests.push({ url, body })
      return jsonResponse({ ok: true })
    }

    return jsonResponse({}, 404)
  }
})

afterEach(() => {
  globalThis.fetch = realFetch
  restoreEnv('WHOP_API_KEY', savedEnv.apiKey)
  restoreEnv('WHOP_API_BASE_URL', savedEnv.apiBaseUrl)
  restoreEnv('WHOP_API_ORIGIN', savedEnv.apiOrigin)
  restoreEnv('WHOP_SESSION_SECRET', savedEnv.sessionSecret)
  restoreEnv('RESEND_API_KEY', savedEnv.resendKey)
  restoreEnv('EMAIL_FROM', savedEnv.emailFrom)
})

describe('anonymous estimate leads', () => {
  test('creates a lead without a user_id and includes contact metadata', async () => {
    const { response, body } = await postLead(validBody())

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      requestId: REQUEST_ID,
      leadId: 'lead_test_anonymous',
    })

    expect(leadRequests).toHaveLength(1)
    const payload = leadRequests[0].body
    expect(payload.account_id).toBe('biz_wHs7ScZ5eHIZrH')
    expect(payload.product_id).toBe('prod_UxTHDvkWPVf68')
    expect(payload.referrer).toBe(`${ORIGIN}/`)
    expect(payload).not.toHaveProperty('user_id')
    expect(payload.metadata).toMatchObject({
      name: 'Jordan Miller',
      email: 'jordan@example.com',
      phone: '(555) 010-2030',
      address: '123 Main Street',
      zip: '12345',
      service: 'roof-repair',
      details: 'A leak above the garage.',
      request_id: REQUEST_ID,
    })
  })

  test('fires estimate_requested after the lead is created', async () => {
    const { response } = await postLead(validBody())
    expect(response.status).toBe(200)

    expect(eventRequests).toHaveLength(1)
    expect(eventRequests[0].body).toMatchObject({
      account_id: 'biz_wHs7ScZ5eHIZrH',
      event_name: 'estimate_requested',
      event_id: `evt_${REQUEST_ID}`,
    })
  })

  test('links a signed-in visitor by user_id when a session exists', async () => {
    const request = requestFor(validBody())
    const cookie = await createSessionCookie(request, {
      userId: 'user_abc123456',
      name: 'Jordan Miller',
      email: 'jordan@example.com',
    })

    const { response } = await postLead(validBody(), { cookie })
    expect(response.status).toBe(200)
    expect(leadRequests[0].body.user_id).toBe('user_abc123456')
  })

  test('rejects a sixth submission from the same address with 429', async () => {
    for (let index = 0; index < 5; index += 1) {
      const { response } = await postLead(
        validBody({ requestId: `est_rate_limit_${index}00000000` }),
        { ip: '198.51.100.7' },
      )
      expect(response.status).toBe(200)
    }

    const { response, body } = await postLead(validBody(), { ip: '198.51.100.7' })
    expect(response.status).toBe(429)
    expect(body?.code).toBe('rate_limited')
    expect(response.headers.get('retry-after')).toMatch(/^\d+$/)
    expect(leadRequests).toHaveLength(5)
  })

  test('honeypot submissions return success without creating anything', async () => {
    const { response, body } = await postLead(validBody({ company: 'Spam Co' }))
    expect(response.status).toBe(200)
    expect(body?.ok).toBe(true)
    expect(leadRequests).toHaveLength(0)
    expect(eventRequests).toHaveLength(0)
  })
})
