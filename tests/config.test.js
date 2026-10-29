import { afterEach, describe, expect, test } from 'bun:test'

import {
  depositConfigurationIssues,
  finalInvoiceConfigurationIssues,
  getWhopServerConfig,
  isProductionApi,
  WHOP_API_BASES,
} from '../src/server/whop/config.ts'

const ENV_KEYS = [
  'WHOP_API_KEY',
  'WHOP_API_BASE_URL',
  'WHOP_WEBHOOK_SECRET',
  'WHOP_DEPOSIT_PLAN_ID',
  'WHOP_DEPOSIT_AMOUNT_CENTS',
  'WHOP_DEPOSIT_CURRENCY',
  'WHOP_OPERATOR_TOKEN',
  'WHOP_FULFILLMENT_WEBHOOK_URL',
  'WHOP_FULFILLMENT_WEBHOOK_SECRET',
  'WHOP_ENABLE_FINAL_INVOICE',
]

const saved = new Map()

for (const key of ENV_KEYS) {
  saved.set(key, process.env[key])
}

function setEnv(values) {
  for (const key of ENV_KEYS) {
    if (key in values) {
      const value = values[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    } else {
      delete process.env[key]
    }
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved.get(key)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

const completeConfig = {
  apiKey: 'sk_test_placeholder',
  apiBaseUrl: WHOP_API_BASES.production,
  webhookSecret: 'ws_test_placeholder',
  depositPlanId: 'plan_amUMyymLN6UCm',
  depositAmountCents: 50_000,
  depositCurrency: 'usd',
  operatorToken: 'operator-token',
  fulfillmentWebhookUrl: null,
  fulfillmentWebhookSecret: null,
  finalInvoiceEnabled: true,
}

describe('server configuration', () => {
  test('reads bindings at request time and trims values', () => {
    setEnv({
      WHOP_API_KEY: '  sk_test_abc  ',
      WHOP_DEPOSIT_PLAN_ID: ' plan_amUMyymLN6UCm ',
      WHOP_DEPOSIT_AMOUNT_CENTS: '50000',
      WHOP_DEPOSIT_CURRENCY: 'USD',
      WHOP_ENABLE_FINAL_INVOICE: 'true',
    })

    const config = getWhopServerConfig()
    expect(config.apiKey).toBe('sk_test_abc')
    expect(config.depositPlanId).toBe('plan_amUMyymLN6UCm')
    expect(config.depositAmountCents).toBe(50_000)
    expect(config.depositCurrency).toBe('usd')
    expect(config.finalInvoiceEnabled).toBe(true)
  })

  test('blank values are treated as missing', () => {
    setEnv({
      WHOP_API_KEY: '   ',
      WHOP_DEPOSIT_AMOUNT_CENTS: '',
      WHOP_DEPOSIT_CURRENCY: '',
    })

    const config = getWhopServerConfig()
    expect(config.apiKey).toBeNull()
    expect(config.depositAmountCents).toBeNull()
    expect(config.depositCurrency).toBe('usd')
  })

  test('only a literal true enables the final invoice route', () => {
    for (const value of ['TRUE', '1', 'yes', 'True ', '', undefined]) {
      setEnv({ WHOP_ENABLE_FINAL_INVOICE: value })
      expect(getWhopServerConfig().finalInvoiceEnabled).toBe(false)
    }

    setEnv({ WHOP_ENABLE_FINAL_INVOICE: 'true' })
    expect(getWhopServerConfig().finalInvoiceEnabled).toBe(true)
  })

  test('amounts must be positive safe integers', () => {
    for (const value of ['0', '-500', '5.5', 'abc', '99999999999999999999']) {
      setEnv({ WHOP_DEPOSIT_AMOUNT_CENTS: value })
      expect(getWhopServerConfig().depositAmountCents).toBeNull()
    }

    setEnv({ WHOP_DEPOSIT_AMOUNT_CENTS: '1' })
    expect(getWhopServerConfig().depositAmountCents).toBe(1)
  })

  test('accepts only the production and sandbox API base URLs', () => {
    setEnv({})
    expect(getWhopServerConfig().apiBaseUrl).toBe(WHOP_API_BASES.production)
    expect(isProductionApi(getWhopServerConfig())).toBe(true)

    setEnv({ WHOP_API_BASE_URL: WHOP_API_BASES.sandbox })
    expect(getWhopServerConfig().apiBaseUrl).toBe(WHOP_API_BASES.sandbox)
    expect(isProductionApi(getWhopServerConfig())).toBe(false)

    for (const value of [
      'https://evil.example/api/v1',
      'https://api.whop.com/api/v2',
      'http://api.whop.com/api/v1',
      'https://api.whop.com.evil.example/api/v1',
    ]) {
      setEnv({ WHOP_API_BASE_URL: value })
      expect(getWhopServerConfig().apiBaseUrl).toBe(WHOP_API_BASES.production)
    }
  })
})

describe('configuration issue reporting', () => {
  test('a complete deposit configuration has no issues', () => {
    expect(depositConfigurationIssues(completeConfig)).toEqual([])
  })

  test('missing deposit values are reported by variable name only', () => {
    const issues = depositConfigurationIssues({
      ...completeConfig,
      apiKey: null,
      depositPlanId: null,
      depositAmountCents: null,
      depositCurrency: 'dollars',
    })

    expect(issues).toContain('WHOP_API_KEY is not configured on the server.')
    expect(issues).toContain('WHOP_DEPOSIT_PLAN_ID is not configured.')
    expect(issues).toContain('WHOP_DEPOSIT_AMOUNT_CENTS is not configured.')
    expect(issues).toContain('WHOP_DEPOSIT_CURRENCY must be a three-letter code such as usd.')
  })

  test('rejects a deposit plan ID that is not a plan_ identifier', () => {
    const issues = depositConfigurationIssues({
      ...completeConfig,
      depositPlanId: 'prod_UxTHDvkWPVf68',
    })
    expect(issues).toContain('WHOP_DEPOSIT_PLAN_ID is not a valid plan_ identifier.')
  })

  test('issues never contain secret values', () => {
    const issues = depositConfigurationIssues({
      ...completeConfig,
      apiKey: null,
      webhookSecret: null,
      depositPlanId: 'not-a-plan',
      depositAmountCents: null,
    }).join(' ')

    expect(issues).not.toContain('sk_')
    expect(issues).not.toContain('ws_')
  })

  test('the final invoice route needs an operator token and an explicit enable flag', () => {
    expect(
      finalInvoiceConfigurationIssues({
        ...completeConfig,
        operatorToken: null,
        finalInvoiceEnabled: false,
        apiKey: null,
      }),
    ).toEqual([
      'WHOP_API_KEY is not configured on the server.',
      'WHOP_OPERATOR_TOKEN is not configured on the server.',
      'WHOP_ENABLE_FINAL_INVOICE is not set to "true".',
    ])

    expect(finalInvoiceConfigurationIssues(completeConfig)).toEqual([])
  })
})
