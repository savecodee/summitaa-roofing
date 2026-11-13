import { describe, expect, test } from 'bun:test'

import { pricingPlans } from '../src/config/site.ts'
import {
  checkoutPlanByKey,
  checkoutPlanByPlanId,
  checkoutPlans,
  isCheckoutPlanKey,
  resolvePaymentPlan,
} from '../src/lib/checkout-plans.ts'

describe('self-serve checkout plans', () => {
  test('mirrors the three advertised plans exactly', () => {
    expect(checkoutPlans).toHaveLength(3)
    expect(checkoutPlans.map((plan) => plan.key)).toEqual([
      'inspection',
      'deposit',
      'repair',
    ])

    for (const plan of checkoutPlans) {
      const advertised = pricingPlans.find((item) => item.key === plan.key)
      expect(advertised).toBeDefined()
      expect(plan.planId).toBe(advertised.planId)
      expect(plan.amountCents).toBe(Math.round(advertised.amountUsd * 100))
      expect(plan.currency).toBe('usd')
    }
  })

  test('uses the real plan ids for the advertised prices', () => {
    expect(checkoutPlanByKey('inspection')).toMatchObject({
      planId: 'plan_3T6dfuJFNyOLG',
      amountCents: 14_900,
    })
    expect(checkoutPlanByKey('deposit')).toMatchObject({
      planId: 'plan_NlxIPUOrmzS6E',
      amountCents: 50_000,
    })
    expect(checkoutPlanByKey('repair')).toMatchObject({
      planId: 'plan_EFVJjO467EmuD',
      amountCents: 99_900,
    })
  })

  test('accepts only the three allowlisted keys', () => {
    expect(isCheckoutPlanKey('inspection')).toBe(true)
    expect(isCheckoutPlanKey('deposit')).toBe(true)
    expect(isCheckoutPlanKey('repair')).toBe(true)
    expect(isCheckoutPlanKey('legacy-deposit')).toBe(false)
    expect(isCheckoutPlanKey('plan_3T6dfuJFNyOLG')).toBe(false)
    expect(isCheckoutPlanKey('')).toBe(false)
    expect(isCheckoutPlanKey(null)).toBe(false)
    expect(checkoutPlanByKey('nope')).toBeNull()
  })

  test('resolves a plan only from an exact public plan id', () => {
    expect(checkoutPlanByPlanId('plan_3T6dfuJFNyOLG')?.key).toBe('inspection')
    expect(checkoutPlanByPlanId('plan_NlxIPUOrmzS6E')?.key).toBe('deposit')
    expect(checkoutPlanByPlanId('plan_EFVJjO467EmuD')?.key).toBe('repair')
    expect(checkoutPlanByPlanId('plan_unknown')).toBeNull()
    expect(checkoutPlanByPlanId('3T6dfuJFNyOLG')).toBeNull()
    expect(checkoutPlanByPlanId(null)).toBeNull()
  })
})

describe('authoritative payment plan resolution', () => {
  const legacy = {
    envPlanId: 'plan_53arhuP2hflnI',
    envAmountCents: 250_000,
    envCurrency: 'usd',
  }

  test('resolves each public plan from the payment variant, not the query string', () => {
    expect(
      resolvePaymentPlan({
        planId: 'plan_3T6dfuJFNyOLG',
        ...legacy,
      }),
    ).toEqual({
      planKey: 'inspection',
      planName: 'Roof Inspection',
      amountCents: 14_900,
      currency: 'usd',
    })

    expect(
      resolvePaymentPlan({
        planId: 'plan_EFVJjO467EmuD',
        ...legacy,
      }),
    ).toMatchObject({ planKey: 'repair', amountCents: 99_900 })
  })

  test('keeps the legacy deposit only for the configured environment plan', () => {
    expect(
      resolvePaymentPlan({
        planId: 'plan_53arhuP2hflnI',
        ...legacy,
      }),
    ).toEqual({
      planKey: 'legacy-deposit',
      planName: 'Project deposit',
      amountCents: 250_000,
      currency: 'usd',
    })

    expect(
      resolvePaymentPlan({
        planId: 'plan_other',
        ...legacy,
      }),
    ).toBeNull()
  })

  test('fails closed when the payment plan or legacy amount is missing', () => {
    expect(
      resolvePaymentPlan({
        planId: null,
        ...legacy,
      }),
    ).toBeNull()

    expect(
      resolvePaymentPlan({
        planId: 'plan_53arhuP2hflnI',
        envPlanId: 'plan_53arhuP2hflnI',
        envAmountCents: 0,
        envCurrency: 'usd',
      }),
    ).toBeNull()

    expect(
      resolvePaymentPlan({
        planId: 'plan_53arhuP2hflnI',
        envPlanId: null,
        envAmountCents: 250_000,
        envCurrency: 'usd',
      }),
    ).toBeNull()
  })
})
