import { beforeEach, describe, expect, test } from 'bun:test'

import {
  checkRateLimit,
  clientAddress,
  resetRateLimits,
} from '../src/server/rate-limit.ts'

beforeEach(() => {
  resetRateLimits()
})

describe('basic rate limiting', () => {
  test('allows the limit, then blocks until the window resets', () => {
    const options = { limit: 2, windowMs: 1_000, now: 10_000 }

    expect(checkRateLimit('leads:test', options)).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0,
    })
    expect(checkRateLimit('leads:test', options)).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0,
    })
    expect(checkRateLimit('leads:test', options)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 1,
    })
  })

  test('starts a fresh bucket after the window', () => {
    checkRateLimit('leads:reset', { limit: 1, windowMs: 1_000, now: 1_000 })
    expect(
      checkRateLimit('leads:reset', { limit: 1, windowMs: 1_000, now: 1_500 }).allowed,
    ).toBe(false)
    expect(
      checkRateLimit('leads:reset', { limit: 1, windowMs: 1_000, now: 2_100 }).allowed,
    ).toBe(true)
  })

  test('uses separate buckets per key', () => {
    checkRateLimit('leads:a', { limit: 1, windowMs: 1_000, now: 1_000 })
    expect(checkRateLimit('leads:b', { limit: 1, windowMs: 1_000, now: 1_000 }).allowed).toBe(
      true,
    )
  })

  test('reads a valid client address from Whop/Cloudflare headers', () => {
    const request = new Request('https://summitaa.whop.site/api/leads', {
      headers: { 'cf-connecting-ip': '203.0.113.9' },
    })
    expect(clientAddress(request)).toBe('203.0.113.9')

    const forwarded = new Request('https://summitaa.whop.site/api/leads', {
      headers: { 'x-forwarded-for': '198.51.100.4, 10.0.0.1' },
    })
    expect(clientAddress(forwarded)).toBe('198.51.100.4')

    const invalid = new Request('https://summitaa.whop.site/api/leads', {
      headers: { 'cf-connecting-ip': 'not an ip', 'x-forwarded-for': 'evil.example' },
    })
    expect(clientAddress(invalid)).toBe('unknown')
  })
})
