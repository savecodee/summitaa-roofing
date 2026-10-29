import { describe, expect, test } from 'bun:test'

import {
  buildLeadMetadata,
  estimateEventId,
  isLikelyAutomated,
  isStaleEstimate,
  makeEstimateRequestId,
  normalizeEstimateValues,
  parseEstimateSubmission,
  sanitizeSourcePath,
  validateEstimate,
} from '../src/lib/estimate.ts'

const validValues = {
  name: 'Jordan Miller',
  email: 'jordan@example.com',
  phone: '(555) 010-2030',
  zip: '12345',
  service: 'roof-repair',
  details: 'A leak above the garage.',
}

describe('estimate validation', () => {
  test('accepts a complete, valid request', () => {
    const values = normalizeEstimateValues(validValues)
    expect(validateEstimate(values)).toEqual({})
  })

  test('rejects malformed contact fields', () => {
    const errors = validateEstimate(
      normalizeEstimateValues({
        ...validValues,
        email: 'not-an-email',
        phone: '123',
        zip: 'abc',
        name: 'J',
        service: 'unknown-service',
      }),
    )

    expect(errors.name).toBeDefined()
    expect(errors.email).toBeDefined()
    expect(errors.phone).toBeDefined()
    expect(errors.zip).toBeDefined()
    expect(errors.service).toBeDefined()
  })

  test('strips control characters and caps lengths', () => {
    const values = normalizeEstimateValues({
      ...validValues,
      name: '  Jordan\u0000 Miller  ',
      details: `line one\r\nline two\u0007\u001f`,
    })

    expect(values.name).toBe('Jordan Miller')
    expect(values.details).toBe('line one\nline two')
  })

  test('unknown service values are cleared rather than trusted', () => {
    const values = normalizeEstimateValues({ ...validValues, service: 'admin' })
    expect(values.service).toBe('')
  })

  test('source paths drop query strings, fragments, and protocol-relative paths', () => {
    expect(sanitizeSourcePath('/services?email=a@example.com#x')).toBe('/services')
    expect(sanitizeSourcePath('//evil.example/path')).toBe('/')
    expect(sanitizeSourcePath('https://evil.example/path')).toBe('/')
  })
})

describe('estimate request parsing and bot controls', () => {
  test('creates a stable-looking request id and event id', () => {
    const requestId = makeEstimateRequestId()
    expect(requestId).toMatch(/^est_[A-Za-z0-9_-]{8,80}$/)
    expect(estimateEventId(requestId)).toBe(`evt_${requestId}`)
  })

  test('rejects a missing or malformed request id', () => {
    const result = parseEstimateSubmission({ ...validValues, startedAt: Date.now() - 10_000 })
    expect(result.ok).toBe(false)

    const malformed = parseEstimateSubmission({
      ...validValues,
      requestId: 'not-a-request',
      startedAt: Date.now() - 10_000,
    })
    expect(malformed.ok).toBe(false)
  })

  test('accepts a complete server submission', () => {
    const result = parseEstimateSubmission({
      ...validValues,
      requestId: 'est_1234567890abcdef',
      startedAt: Date.now() - 10_000,
      sourcePath: '/?email=leak@example.com',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.submission.sourcePath).toBe('/')
    expect(result.submission.requestId).toBe('est_1234567890abcdef')
  })

  test('flags honeypots and instant submits without flagging real stale forms as bots', () => {
    const now = Date.now()
    expect(isLikelyAutomated('Spam Co', now - 10_000, now)).toBe(true)
    expect(isLikelyAutomated('', now - 500, now)).toBe(true)
    expect(isLikelyAutomated('', now - 5_000, now)).toBe(false)

    expect(isStaleEstimate(now - 13 * 60 * 60 * 1000, now)).toBe(true)
    expect(isStaleEstimate(now - 5_000, now)).toBe(false)
  })

  test('lead metadata carries contact details; the event id does not', () => {
    const metadata = buildLeadMetadata(
      normalizeEstimateValues(validValues),
      'est_1234567890abcdef',
      '2026-10-28T12:00:00.000Z',
    )

    expect(metadata.email).toBe('jordan@example.com')
    expect(metadata.phone).toBe('(555) 010-2030')
    expect(metadata.request_id).toBe('est_1234567890abcdef')
    expect(estimateEventId(metadata.request_id)).not.toContain('jordan')
    expect(estimateEventId(metadata.request_id)).not.toContain('555')
  })
})
