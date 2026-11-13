import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { sendEstimateConfirmation, isEmailConfigured, sendJourneyConfirmation } from '../src/server/whop/email.ts'

const savedEnv = {
  resend: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
  base: process.env.RESEND_API_BASE_URL,
}

const realFetch = globalThis.fetch

beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.EMAIL_FROM = 'Summitaa Roofing <estimates@example.com>'
  delete process.env.RESEND_API_BASE_URL
})

afterEach(() => {
  globalThis.fetch = realFetch
  if (savedEnv.resend === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = savedEnv.resend
  if (savedEnv.from === undefined) delete process.env.EMAIL_FROM
  else process.env.EMAIL_FROM = savedEnv.from
  if (savedEnv.base === undefined) delete process.env.RESEND_API_BASE_URL
  else process.env.RESEND_API_BASE_URL = savedEnv.base
})

describe('estimate confirmation email', () => {
  test('returns false when email is not configured', async () => {
    delete process.env.RESEND_API_KEY
    expect(isEmailConfigured()).toBe(false)
    expect(await sendEstimateConfirmation({
      to: 'customer@example.com',
      customerName: 'Jordan Miller',
      requestId: 'est_12345678',
      service: 'roof-repair',
      zip: '12345',
      details: 'Leak near chimney',
    })).toBe(false)
  })

  test('sends a confirmation with an idempotency key', async () => {
    let captured = null
    globalThis.fetch = async (input, init = {}) => {
      captured = { url: String(input), init }
      return new Response(JSON.stringify({ id: 'email_123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const result = await sendEstimateConfirmation({
      to: 'customer@example.com',
      customerName: 'Jordan Miller',
      requestId: 'est_12345678',
      service: 'roof-repair',
      zip: '12345',
      details: 'Leak near chimney',
    })

    expect(result).toBe(true)
    expect(captured.url).toBe('https://api.resend.com/emails')
    expect(new Headers(captured.init.headers).get('idempotency-key')).toBe('estimate-email-est_12345678')
    expect(JSON.parse(captured.init.body).to).toEqual(['customer@example.com'])
  })

  test('returns false when the provider rejects the request', async () => {
    globalThis.fetch = async () => new Response('bad', { status: 422 })
    const result = await sendEstimateConfirmation({
      to: 'customer@example.com',
      customerName: 'Jordan Miller',
      requestId: 'est_12345678',
      service: 'roof-repair',
      zip: '12345',
    })
    expect(result).toBe(false)
  })

  test('returns false for a non-official API base URL', async () => {
    process.env.RESEND_API_BASE_URL = 'https://evil.example.com'
    globalThis.fetch = async () => new Response(JSON.stringify({ id: 'x' }), { status: 200 })
    const result = await sendEstimateConfirmation({
      to: 'customer@example.com',
      customerName: 'Jordan Miller',
      requestId: 'est_12345678',
      service: 'roof-repair',
      zip: '12345',
    })
    expect(result).toBe(false)
  })
})

describe('journey confirmation email', () => {
  test('returns false honestly when Resend is not configured', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    let called = false
    globalThis.fetch = async () => {
      called = true
      return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 })
    }

    expect(
      await sendJourneyConfirmation({
        to: 'customer@example.com',
        requestId: 'est_journey_1234',
        planKey: 'inspection',
        plansUrl: 'https://summitaa.example/#pricing',
      }),
    ).toBe(false)
    expect(called).toBe(false)
  })

  test('sends all three plans and marks the selected one', async () => {
    let captured = null
    globalThis.fetch = async (input, init = {}) => {
      captured = { url: String(input), init }
      return new Response(JSON.stringify({ id: 'email_journey_123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const sent = await sendJourneyConfirmation({
      to: 'customer@example.com',
      requestId: 'est_journey_1234',
      planKey: 'repair',
      plansUrl: 'https://summitaa.example/#pricing',
    })

    expect(sent).toBe(true)
    expect(captured.url).toBe('https://api.resend.com/emails')
    expect(new Headers(captured.init.headers).get('idempotency-key')).toBe(
      'journey-email-est_journey_1234',
    )

    const body = JSON.parse(captured.init.body)
    expect(body.to).toEqual(['customer@example.com'])
    expect(body.subject).toContain('plan selection')
    expect(body.html).toContain('Roof Inspection')
    expect(body.html).toContain('Roofing Project Deposit')
    expect(body.html).toContain('Standard Roof Repair')
    expect(body.html).toContain('(selected)')
    expect(body.html).toContain('https://summitaa.example/#pricing')
    expect(body.html).toContain('No account or password was created')
  })

  test('does not claim a send when the provider rejects the request', async () => {
    globalThis.fetch = async () => new Response('bad', { status: 422 })

    expect(
      await sendJourneyConfirmation({
        to: 'customer@example.com',
        requestId: 'est_journey_1234',
        plansUrl: 'https://summitaa.example/#pricing',
      }),
    ).toBe(false)
  })

  test('refuses a non-official Resend host', async () => {
    process.env.RESEND_API_BASE_URL = 'https://evil.example.com'
    let called = false
    globalThis.fetch = async () => {
      called = true
      return new Response(JSON.stringify({ id: 'x' }), { status: 200 })
    }

    expect(
      await sendJourneyConfirmation({
        to: 'customer@example.com',
        requestId: 'est_journey_1234',
        plansUrl: 'https://summitaa.example/#pricing',
      }),
    ).toBe(false)
    expect(called).toBe(false)
  })
})
