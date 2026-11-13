import { pricingPlans, type PricingPlan } from '@/config'

/**
 * The three sellable plans, resolved from the same configuration the pricing
 * section renders. The server uses this list as an allowlist: a browser can
 * name a plan key, but it can never invent a plan id or an amount.
 */
export type CheckoutPlanKey = PricingPlan['key']

export type CheckoutPlan = {
  key: CheckoutPlanKey
  name: string
  amountCents: number
  currency: 'usd'
  planId: string
}

export const checkoutPlans: ReadonlyArray<CheckoutPlan> = pricingPlans.map((plan) => ({
  key: plan.key,
  name: plan.name,
  amountCents: Math.round(plan.amountUsd * 100),
  currency: 'usd',
  planId: plan.planId,
}))

const CHECKOUT_PLAN_KEYS = new Set<string>(checkoutPlans.map((plan) => plan.key))

export function isCheckoutPlanKey(value: unknown): value is CheckoutPlanKey {
  return typeof value === 'string' && CHECKOUT_PLAN_KEYS.has(value)
}

export function checkoutPlanByKey(value: unknown): CheckoutPlan | null {
  if (!isCheckoutPlanKey(value)) return null
  return checkoutPlans.find((plan) => plan.key === value) ?? null
}

export function checkoutPlanByPlanId(value: unknown): CheckoutPlan | null {
  if (typeof value !== 'string' || !value.startsWith('plan_')) return null
  return checkoutPlans.find((plan) => plan.planId === value) ?? null
}

export type ResolvedPaymentPlan = {
  planKey: CheckoutPlanKey | 'legacy-deposit'
  planName: string
  amountCents: number
  currency: string
}

/**
 * Resolves the amount that a Whop payment must have for its actual
 * `variant_id`. The browser's query string is never used here: the plan id
 * comes from the authoritative payment lookup.
 *
 * The environment-configured deposit remains supported for proposal links that
 * predate the self-serve plans. It is only accepted when the payment's plan id
 * equals the configured deposit plan id.
 */
export function resolvePaymentPlan(input: {
  planId: string | null
  envPlanId: string | null
  envAmountCents: number | null
  envCurrency: string
}): ResolvedPaymentPlan | null {
  const plan = checkoutPlanByPlanId(input.planId)
  if (plan) {
    return {
      planKey: plan.key,
      planName: plan.name,
      amountCents: plan.amountCents,
      currency: plan.currency,
    }
  }

  if (
    input.planId &&
    input.envPlanId &&
    input.planId === input.envPlanId &&
    input.envAmountCents &&
    input.envAmountCents > 0
  ) {
    return {
      planKey: 'legacy-deposit',
      planName: 'Project deposit',
      amountCents: input.envAmountCents,
      currency: input.envCurrency,
    }
  }

  return null
}
