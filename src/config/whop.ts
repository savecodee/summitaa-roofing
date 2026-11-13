/**
 * Public Whop identifiers.
 *
 * These values are safe to ship to the browser: they are public checkout/account
 * identifiers used by the Whop Pixel and Elements. They are NOT secrets.
 */

export type WhopEnvironment = 'sandbox' | 'production'

export type ResolvedWhopConfig = {
  environment: WhopEnvironment
  appId: string
  accountId: string
  productId: string
  baseUrl: string
  plans: {
    inspection: string
    deposit: string
    repair: string
  }
}

export const LIVE_WHOP_CONFIG: ResolvedWhopConfig = {
  environment: 'production',
  appId: 'app_wZYnrCcqbNft8J',
  accountId: 'biz_wHs7ScZ5eHIZrH',
  productId: 'prod_UxTHDvkWPVf68',
  baseUrl: 'https://summitaa.whop.site',
  plans: {
    inspection: 'plan_3T6dfuJFNyOLG',
    deposit: 'plan_NlxIPUOrmzS6E',
    repair: 'plan_EFVJjO467EmuD',
  },
}

export const SANDBOX_WHOP_CONFIG: ResolvedWhopConfig = {
  environment: 'sandbox',
  appId: 'app_wZYnrCcqbNft8J',
  accountId: 'biz_7vkTTLzyYse5ks',
  productId: 'prod_FFSXFModF0vkr',
  // The sandbox route is served from the same hosted origin as production.
  // Only the Elements environment and the plan IDs below change.
  baseUrl: 'https://summitaa.whop.site',
  plans: {
    inspection: 'plan_MdtZCNOTMLG7F',
    deposit: 'plan_05gMoSfY59SL1',
    repair: 'plan_vPUPYC94P5obx',
  },
}

function normalizeEnvironment(value: unknown): WhopEnvironment {
  return value === 'sandbox' ? 'sandbox' : 'production'
}

function readEnvValue(
  env: Record<string, unknown>,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = env[name]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return undefined
}

function override(
  base: string,
  env: Record<string, unknown>,
  names: readonly string[],
): string {
  return readEnvValue(env, names) ?? base
}

export function resolveWhopConfig(env: Record<string, unknown> = {}): ResolvedWhopConfig {
  const environment = normalizeEnvironment(
    readEnvValue(env, ['VITE_WHOP_ENV', 'WHOP_ENV']),
  )

  const base = environment === 'sandbox' ? SANDBOX_WHOP_CONFIG : LIVE_WHOP_CONFIG

  return {
    environment,
    appId: override(base.appId, env, ['VITE_WHOP_APP_ID', 'WHOP_APP_ID', 'WHOP_APP']),
    accountId: override(base.accountId, env, [
      'VITE_WHOP_ACCOUNT_ID',
      'WHOP_ACCOUNT_ID',
    ]),
    productId: override(base.productId, env, [
      'VITE_WHOP_PRODUCT_ID',
      'WHOP_PRODUCT_ID',
    ]),
    baseUrl: override(base.baseUrl, env, ['VITE_WHOP_BASE_URL', 'WHOP_BASE_URL']),
    plans: {
      inspection: override(base.plans.inspection, env, [
        'VITE_WHOP_PLAN_INSPECTION',
        'WHOP_PLAN_INSPECTION',
      ]),
      deposit: override(base.plans.deposit, env, [
        'VITE_WHOP_PLAN_DEPOSIT',
        'WHOP_PLAN_DEPOSIT',
      ]),
      repair: override(base.plans.repair, env, [
        'VITE_WHOP_PLAN_REPAIR',
        'WHOP_PLAN_REPAIR',
      ]),
    },
  }
}

function currentEnv(): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  try {
    if (import.meta.env && typeof import.meta.env === 'object') {
      Object.assign(result, import.meta.env)
    }
  } catch {
    // import.meta can be unavailable in plain Node tests.
  }

  try {
    if (process?.env) {
      Object.assign(result, process.env)
    }
  } catch {
    // Browser environments may not expose process.
  }

  return result
}

export const whopPublicConfig = resolveWhopConfig(currentEnv())

export const isWhopSandbox = whopPublicConfig.environment === 'sandbox'
