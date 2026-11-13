import { describe, expect, test } from 'bun:test'

import {
  buildDepositMetadata,
  buildDepositReturnUrl,
  centsToMajorUnits,
  depositAmountMatches,
  depositIdempotencyKey,
  formatCents,
  isConfirmationToken,
  isDepositAttemptId,
  isFailedStatus,
  isPaidStatus,
  isPendingStatus,
  makeDepositAttemptId,
  normalizePaymentStatus,
  publicDepositConfig,
} from '../src/lib/deposit.ts'

describe('payment status normalization', () => {
  test('accepts known statuses case-insensitively and trims whitespace', () => {
    expect(normalizePaymentStatus('SUCCEEDED')).toBe('succeeded')
    expect(normalizePaymentStatus('  processing ')).toBe('processing')
    expect(normalizePaymentStatus('requires_action')).toBe('requires_action')
  })

  test('maps anything unknown to unknown instead of guessing', () => {
    expect(normalizePaymentStatus('complete')).toBe('unknown')
    expect(normalizePaymentStatus('')).toBe('unknown')
    expect(normalizePaymentStatus(null)).toBe('unknown')
    expect(normalizePaymentStatus(42)).toBe('unknown')
  })

  test('only succeeded and paid count as paid', () => {
    expect(isPaidStatus('succeeded')).toBe(true)
    expect(isPaidStatus('paid')).toBe(true)
    expect(isPaidStatus('processing')).toBe(false)
    expect(isPaidStatus('requires_action')).toBe(false)
    expect(isPaidStatus('failed')).toBe(false)
  })

  test('failed, canceled, void, and uncollectible count as failures', () => {
    for (const status of ['failed', 'canceled', 'void', 'uncollectible']) {
      expect(isFailedStatus(status)).toBe(true)
    }
    expect(isFailedStatus('processing')).toBe(false)
    expect(isFailedStatus('succeeded')).toBe(false)
  })

  test('everything that is neither paid nor failed is pending', () => {
    expect(isPendingStatus('processing')).toBe(true)
    expect(isPendingStatus('requires_action')).toBe(true)
    expect(isPendingStatus('unknown')).toBe(true)
    expect(isPendingStatus('succeeded')).toBe(false)
    expect(isPendingStatus('failed')).toBe(false)
  })
})

describe('money formatting', () => {
  test('formats minor units as currency', () => {
    expect(formatCents(50_000, 'usd')).toBe('$500.00')
    expect(formatCents(123_456, 'eur')).toContain('1,234.56')
    expect(centsToMajorUnits(19_500_000)).toBe(195_000)
    expect(centsToMajorUnits(12_345)).toBe(123.45)
  })

  test('falls back for an invalid currency code without throwing', () => {
    expect(formatCents(100, 'not-a-currency')).toBe('1.00 NOT-A-CURRENCY')
  })

  test('rounds non-integer cents instead of returning NaN', () => {
    expect(formatCents(Number.NaN)).toBe('$0.00')
    expect(centsToMajorUnits(99.6)).toBeCloseTo(1)
  })
})

describe('deposit return URL', () => {
  test('builds an absolute https return URL with only the project reference', () => {
    expect(buildDepositReturnUrl('https://summitaa.example', 'SUM-1042')).toBe(
      'https://summitaa.example/deposit/return?project=SUM-1042',
    )
  })

  test('allows http only for local development hosts', () => {
    expect(buildDepositReturnUrl('http://localhost:3000', 'SUM-1042')).toBe(
      'http://localhost:3000/deposit/return?project=SUM-1042',
    )
    expect(buildDepositReturnUrl('http://127.0.0.1:3000', 'SUM-1042')).toBe(
      'http://127.0.0.1:3000/deposit/return?project=SUM-1042',
    )
    expect(buildDepositReturnUrl('http://summitaa.example', 'SUM-1042')).toBeNull()
  })

  test('rejects invalid schemes, origins, and project references', () => {
    expect(buildDepositReturnUrl('javascript:alert(1)', 'SUM-1042')).toBeNull()
    expect(buildDepositReturnUrl('https://summitaa.example', '../../etc/passwd')).toBeNull()
    expect(buildDepositReturnUrl('https://summitaa.example', 'ab')).toBeNull()
    expect(buildDepositReturnUrl('not a url', 'SUM-1042')).toBeNull()
  })

  test('never carries customer or payment data in the URL', () => {
    const url = buildDepositReturnUrl('https://summitaa.example', 'SUM-1042')
    expect(url).not.toContain('@')
    expect(url).not.toContain('pay_')
    expect(url).not.toContain('token')
  })

  test('adds only an allowlisted plan key to the return URL', () => {
    expect(
      buildDepositReturnUrl('https://summitaa.example', 'SUM-1042', 'inspection'),
    ).toBe('https://summitaa.example/deposit/return?project=SUM-1042&plan=inspection')
    expect(buildDepositReturnUrl('https://summitaa.example', 'SUM-1042', 'nope')).toBe(
      'https://summitaa.example/deposit/return?project=SUM-1042',
    )
  })
})

describe('deposit amount verification', () => {
  test('accepts the configured amount and currency case-insensitively', () => {
    expect(
      depositAmountMatches({
        actualCents: 50_000,
        actualCurrency: 'USD',
        expectedCents: 50_000,
        expectedCurrency: 'usd',
      }),
    ).toBe(true)
  })

  test('rejects a different amount in either direction', () => {
    for (const actualCents of [0, 49_999, 50_001, 5_000_000]) {
      expect(
        depositAmountMatches({
          actualCents,
          actualCurrency: 'usd',
          expectedCents: 50_000,
          expectedCurrency: 'usd',
        }),
      ).toBe(false)
    }
  })

  test('rejects a different currency', () => {
    expect(
      depositAmountMatches({
        actualCents: 50_000,
        actualCurrency: 'eur',
        expectedCents: 50_000,
        expectedCurrency: 'usd',
      }),
    ).toBe(false)
  })

  test('a missing total or currency is never a match', () => {
    for (const input of [
      { actualCents: null, actualCurrency: 'usd', expectedCents: 50_000 },
      { actualCents: 50_000, actualCurrency: null, expectedCents: 50_000 },
      { actualCents: 50_000, actualCurrency: 'usd', expectedCents: null },
    ]) {
      expect(depositAmountMatches({ ...input, expectedCurrency: 'usd' })).toBe(false)
    }
  })
})

describe('deposit idempotency and metadata', () => {
  test('the idempotency key is stable for the same attempt', () => {
    const first = depositIdempotencyKey('SUM-1042', 'att_12345678')
    const second = depositIdempotencyKey('SUM-1042', 'att_12345678')
    expect(first).toBe(second)
    expect(first).not.toBe(depositIdempotencyKey('SUM-1042', 'att_87654321'))
    expect(first.length).toBeLessThanOrEqual(200)
  })

  test('keeps the legacy idempotency key and separates self-serve plans', () => {
    expect(depositIdempotencyKey('SUM-1042', 'att_12345678')).toBe(
      'deposit-SUM-1042-att_12345678',
    )
    expect(depositIdempotencyKey('SUM-1042', 'att_12345678', 'repair')).toBe(
      'deposit-SUM-1042-att_12345678-repair',
    )
    expect(depositIdempotencyKey('SUM-1042', 'att_12345678', 'nope')).toBe(
      'deposit-SUM-1042-att_12345678',
    )
  })

  test('payment metadata contains only project identifiers', () => {
    const metadata = buildDepositMetadata('SUM-1042', 'att_12345678')
    expect(metadata).toEqual({
      project_ref: 'SUM-1042',
      request_id: 'att_12345678',
      source: 'summitaa_roofing_deposit',
      site: 'summitaa-roofing',
    })

    const serialized = JSON.stringify(metadata)
    expect(serialized).not.toContain('@')
    expect(serialized).not.toContain('name')
    expect(serialized).not.toContain('phone')
  })

  test('adds the plan key to metadata only when it is allowlisted', () => {
    expect(buildDepositMetadata('SUM-1042', 'att_12345678', 'inspection')).toEqual({
      project_ref: 'SUM-1042',
      request_id: 'att_12345678',
      source: 'summitaa_roofing_deposit',
      site: 'summitaa-roofing',
      plan_key: 'inspection',
    })
    expect(buildDepositMetadata('SUM-1042', 'att_12345678', 'nope')).not.toHaveProperty(
      'plan_key',
    )
  })

  test('attempt IDs match the server pattern and are unique', () => {
    const first = makeDepositAttemptId()
    const second = makeDepositAttemptId()

    expect(first).toMatch(/^att_[A-Za-z0-9_-]{8,80}$/)
    expect(isDepositAttemptId(first)).toBe(true)
    expect(first).not.toBe(second)
    expect(isDepositAttemptId('att_short')).toBe(false)
    expect(isDepositAttemptId(undefined)).toBe(false)
  })

  test('confirmation tokens must look like Whop tokens', () => {
    expect(isConfirmationToken('ctok_12345678')).toBe(true)
    expect(isConfirmationToken('ctok_short')).toBe(false)
    expect(isConfirmationToken('sk_live_12345678')).toBe(false)
    expect(isConfirmationToken(null)).toBe(false)
  })
})

describe('public deposit configuration', () => {
  test('exposes the plan only when every required value is present', () => {
    const config = publicDepositConfig({
      accountId: 'biz_test',
      planId: 'plan_amUMyymLN6UCm',
      amountCents: 50_000,
      currency: 'usd',
      issues: [],
    })

    expect(config.configured).toBe(true)
    expect(config.accountId).toBe('biz_test')
    expect(config.planId).toBe('plan_amUMyymLN6UCm')
    expect(config.amountCents).toBe(50_000)
    expect(config.amountLabel).toBe('$500.00')
    expect(config.planKey).toBeNull()
    expect(config.planName).toBeNull()
    expect(config.issues).toEqual([])
  })

  test('returns the public plan key and name for a self-serve plan', () => {
    const config = publicDepositConfig({
      accountId: 'biz_test',
      planId: 'plan_3T6dfuJFNyOLG',
      planKey: 'inspection',
      planName: 'Roof Inspection',
      amountCents: 14_900,
      currency: 'usd',
      issues: [],
    })

    expect(config).toMatchObject({
      configured: true,
      planId: 'plan_3T6dfuJFNyOLG',
      planKey: 'inspection',
      planName: 'Roof Inspection',
      amountCents: 14_900,
      amountLabel: '$149.00',
    })
  })

  test('hides the plan key and name when configuration is incomplete', () => {
    const config = publicDepositConfig({
      accountId: 'biz_test',
      planId: 'plan_3T6dfuJFNyOLG',
      planKey: 'inspection',
      planName: 'Roof Inspection',
      amountCents: 14_900,
      currency: 'usd',
      issues: ['WHOP_API_KEY is not configured on the server.'],
    })

    expect(config.configured).toBe(false)
    expect(config.planKey).toBeNull()
    expect(config.planName).toBeNull()
  })

  test('any server configuration issue keeps the payment form hidden', () => {
    const config = publicDepositConfig({
      accountId: 'biz_test',
      planId: 'plan_amUMyymLN6UCm',
      amountCents: 50_000,
      currency: 'usd',
      issues: ['WHOP_API_KEY is not configured on the server.'],
    })

    expect(config.configured).toBe(false)
    expect(config.accountId).toBeNull()
    expect(config.planId).toBeNull()
    expect(config.amountCents).toBeNull()
    expect(config.issues).toEqual(['WHOP_API_KEY is not configured on the server.'])
  })

  test('hides partial configuration and returns issue names only', () => {
    const config = publicDepositConfig({
      accountId: 'biz_test',
      planId: null,
      amountCents: null,
      currency: 'usd',
      issues: ['WHOP_DEPOSIT_PLAN_ID is not configured.'],
    })

    expect(config.configured).toBe(false)
    expect(config.accountId).toBeNull()
    expect(config.planId).toBeNull()
    expect(config.amountCents).toBeNull()
    expect(config.amountLabel).toBeNull()
    expect(config.issues).toEqual(['WHOP_DEPOSIT_PLAN_ID is not configured.'])
  })

  test('a zero or negative amount is not considered configured', () => {
    const zero = publicDepositConfig({
      accountId: 'biz_test',
      planId: 'plan_amUMyymLN6UCm',
      amountCents: 0,
      currency: 'usd',
      issues: [],
    })
    expect(zero.configured).toBe(false)

    const negative = publicDepositConfig({
      accountId: 'biz_test',
      planId: 'plan_amUMyymLN6UCm',
      amountCents: -500,
      currency: 'usd',
      issues: [],
    })
    expect(negative.configured).toBe(false)
  })
})
