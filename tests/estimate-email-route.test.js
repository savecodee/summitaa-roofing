import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { Route } from '../src/routes/api/estimate-email.ts'
import { resetRateLimits } from '../src/server/rate-limit.ts'

const ORIGIN = 'https://summitaa.whop.site'

const savedEnv = {
  resend: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
  base: process.env.RESEND_API_BASE_URL,
}

const realFetch = globalThis.fetch
let emailRequests = []

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

function requestFor(body, options = {}) {
  return new Request(`${ORIGIN}/api/estimate-email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      origin: options.origin ?? ORIGIN,
      'x-forwarded-for': options.ip ?? '203.0.113.20',
    },
    body: JSON.stringify(body),
  })
}

async function postEmail(body, options = {}) {
  const response = await Route.options.server.handlers.POST({
    request: requestFor(body, options),
  })
  const payload = await response.json().catch(() => null)
  return { response, body: payload }
}

beforeEach(() => {
  delete process.env.RESEND_API_KEY
  delete process.env.EMAIL_FROM
  delete process.env.RESEND_API_BASE_URL
  resetRateLimits()
  emailRequests = []

  globalThis.fetch = async (input, init = {}) => {
    emailRequests.push({ url: String(input), init })
    return jsonResponse({ id: 'email_test_123' })
  }
})

afterEach(() => {
  globalThis.fetch = realFetch
  restoreEnv('RESEND_API_KEY', savedEnv.resend)
  restoreEnv('EMAIL_FROM', savedEnv.from)
  restoreEnv('RESEND_API_BASE_URL', savedEnv.base)
})

describe('email-first journey route', () => {
  test('saves the email and reports sent:false when Resend is not configured', async () => {
    const { response, body } = await postEmail({
      email: '  Customer@Example.com ',
      planKey: 'inspection',
    })

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      sent: false,
      configured: false,
      planKey: 'inspection',
    })
    expect(body.message).toContain('not configured')
    expect(emailRequests).toHaveLength(0)
  })

  test('sends through Resend when configured and never returns the API key', async () => {
    process.env.RESEND_API_KEY = 're_test_route_key'
    process.env.EMAIL_FROM = 'Summitaa Roofing <estimates@example.com>'

    const { response, body } = await postEmail({
      email: 'customer@example.com',
      planKey: 'repair',
    })

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, sent: true, configured: true, planKey: 'repair' })
    expect(JSON.stringify(body)).not.toContain('re_test_route_key')

    expect(emailRequests).toHaveLength(1)
    expect(emailRequests[0].url).toBe('https://api.resend.com/emails')
    expect(new Headers(emailRequests[0].init.headers).get('authorization')).toBe(
      'Bearer re_test_route_key',
    )
  })

  test('ignores an unknown plan key instead of trusting it', async () => {
    const { response, body } = await postEmail({
      email: 'customer@example.com',
      planKey: 'plan_3T6dfuJFNyOLG',
    })

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, planKey: null })
  })

  test('rejects an invalid email', async () => {
    const { response, body } = await postEmail({ email: 'not-an-email' })

    expect(response.status).toBe(400)
    expect(body?.ok).toBe(false)
    expect(body?.code).toBe('invalid_input')
    expect(emailRequests).toHaveLength(0)
  })

  test('rejects a cross-origin request', async () => {
    const { response } = await postEmail(
      { email: 'customer@example.com' },
      { origin: 'https://evil.example.com' },
    )

    expect(response.status).toBe(403)
    expect(emailRequests).toHaveLength(0)
  })

  test('limits repeated attempts from one address', async () => {
    for (let index = 0; index < 5; index += 1) {
      const { response } = await postEmail(
        { email: `customer${index}@example.com` },
        { ip: '198.51.100.9' },
      )
      expect(response.status).toBe(200)
    }

    const { response, body } = await postEmail(
      { email: 'customer5@example.com' },
      { ip: '198.51.100.9' },
    )

    expect(response.status).toBe(429)
    expect(body?.code).toBe('rate_limited')
    expect(response.headers.get('retry-after')).toMatch(/^\d+$/)
  })
})
