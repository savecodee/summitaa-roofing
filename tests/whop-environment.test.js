import { describe, expect, test } from 'bun:test'

import {
  LIVE_WHOP_CONFIG,
  SANDBOX_WHOP_CONFIG,
  resolveWhopConfig,
} from '../src/config/whop.ts'

describe('Whop environment separation', () => {
  test('defaults to live configuration and uses live identifiers', () => {
    const config = resolveWhopConfig()

    expect(config).toEqual(LIVE_WHOP_CONFIG)
    expect(config.environment).toBe('production')
    expect(config.accountId).toBe('biz_wHs7ScZ5eHIZrH')
    expect(config.productId).toBe('prod_UxTHDvkWPVf68')
    expect(config.plans.inspection).toBe('plan_3T6dfuJFNyOLG')
    expect(config.plans.deposit).toBe('plan_NlxIPUOrmzS6E')
    expect(config.plans.repair).toBe('plan_EFVJjO467EmuD')
    expect(config).not.toMatchObject({ accountId: 'biz_7vkTTLzyYse5ks' })
  })

  test('sandbox mode uses only the requested sandbox identifiers', () => {
    const config = resolveWhopConfig({
      VITE_WHOP_ENV: 'sandbox',
    })

    expect(config).toMatchObject({
      environment: 'sandbox',
      accountId: 'biz_7vkTTLzyYse5ks',
      productId: 'prod_FFSXFModF0vkr',
      plans: {
        inspection: 'plan_MdtZCNOTMLG7F',
        deposit: 'plan_05gMoSfY59SL1',
        repair: 'plan_vPUPYC94P5obx',
      },
    })
    expect(config.accountId).not.toBe(LIVE_WHOP_CONFIG.accountId)
  })

  test('live ids never leak into sandbox and sandbox ids never leak into live', () => {
    const sandbox = resolveWhopConfig({ VITE_WHOP_ENV: 'sandbox' })
    const live = resolveWhopConfig({ VITE_WHOP_ENV: 'production' })

    expect(JSON.stringify(sandbox)).not.toContain(LIVE_WHOP_CONFIG.accountId)
    expect(JSON.stringify(sandbox)).not.toContain(LIVE_WHOP_CONFIG.productId)
    expect(JSON.stringify(sandbox)).not.toContain(LIVE_WHOP_CONFIG.plans.inspection)
    expect(JSON.stringify(live)).not.toContain(SANDBOX_WHOP_CONFIG.accountId)
    expect(JSON.stringify(live)).not.toContain(SANDBOX_WHOP_CONFIG.productId)
    expect(JSON.stringify(live)).not.toContain(SANDBOX_WHOP_CONFIG.plans.inspection)
  })

  test('sandbox plan IDs can still be overridden by env vars', () => {
    const config = resolveWhopConfig({
      VITE_WHOP_ENV: 'sandbox',
      VITE_WHOP_PLAN_INSPECTION: 'plan_sandbox_inspection',
      VITE_WHOP_PLAN_DEPOSIT: 'plan_sandbox_deposit',
      VITE_WHOP_PLAN_REPAIR: 'plan_sandbox_repair',
    })

    expect(config.plans).toEqual({
      inspection: 'plan_sandbox_inspection',
      deposit: 'plan_sandbox_deposit',
      repair: 'plan_sandbox_repair',
    })
    expect(config.plans.inspection).not.toBe(LIVE_WHOP_CONFIG.plans.inspection)
  })

  test('sandbox defaults contain only verified sandbox plans, never live plans', () => {
    expect(SANDBOX_WHOP_CONFIG.plans).toEqual({
      inspection: 'plan_MdtZCNOTMLG7F',
      deposit: 'plan_05gMoSfY59SL1',
      repair: 'plan_vPUPYC94P5obx',
    })
    expect(SANDBOX_WHOP_CONFIG.baseUrl).toBe('https://summitaa.whop.site')

    for (const planId of Object.values(SANDBOX_WHOP_CONFIG.plans)) {
      expect(Object.values(LIVE_WHOP_CONFIG.plans)).not.toContain(planId)
    }
  })

  test('public config excludes API key secrets', () => {
    const secretKeys = [
      'apiKey',
      'api_key',
      'WHOP_API_KEY',
      'sessionSecret',
      'operatorToken',
      'webhookSecret',
    ]
    const configKeys = Object.keys(resolveWhopConfig())

    for (const key of secretKeys) {
      expect(configKeys).not.toContain(key)
    }
  })
})
