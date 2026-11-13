import '@tanstack/react-start/server-only'

/**
 * Server-only Whop configuration.
 *
 * Secrets arrive as Whop app secrets / Cloudflare env bindings. They are read at
 * request time and are never placed in a response, a log, or client code.
 * `src/config/whop.ts` contains only public identifiers.
 */

const PRODUCTION_API_BASE = 'https://api.whop.com/api/v1'
const SANDBOX_API_BASE = 'https://sandbox-api.whop.com/api/v1'
const WHOP_ORIGIN_HOSTS = new Set(['api.whop.com', 'sandbox-api.whop.com'])

export type WhopServerConfig = {
  apiKey: string | null
  apiConfigured: boolean
  apiBaseUrl: string
  environment: 'production' | 'sandbox'
  webhookSecret: string | null
  depositPlanId: string | null
  depositAmountCents: number | null
  depositCurrency: string
  operatorToken: string | null
  fulfillmentWebhookUrl: string | null
  fulfillmentWebhookSecret: string | null
  finalInvoiceEnabled: boolean
}

function readEnv(name: string): string | null {
  if (typeof process === 'undefined' || !process.env) return null

  const value = process.env[name]
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null
  if (!/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function resolveApiBaseUrl(): string {
  const whopEnv = readEnv('WHOP_ENV')?.toLowerCase()
  if (whopEnv === 'sandbox') return SANDBOX_API_BASE
  if (whopEnv === 'production') return PRODUCTION_API_BASE

  // Whop's hosted runtime sets WHOP_API_ORIGIN and signs matching server-side
  // requests automatically, so no API key ever enters the app.
  const origin = readEnv('WHOP_API_ORIGIN')
  if (origin) {
    try {
      const parsed = new URL(origin)
      if (parsed.protocol === 'https:' && WHOP_ORIGIN_HOSTS.has(parsed.hostname)) {
        return `${parsed.origin}/api/v1`
      }
    } catch {
      // Fall through to the explicit/local configuration below.
    }
  }

  const configured = readEnv('WHOP_API_BASE_URL')
  if (!configured) return PRODUCTION_API_BASE

  if (configured === SANDBOX_API_BASE) return SANDBOX_API_BASE
  if (configured === PRODUCTION_API_BASE) return PRODUCTION_API_BASE

  // Do not accept arbitrary hosts: the API key must never be sent to an
  // operator-supplied URL by accident (SSRF / credential exfiltration).
  return PRODUCTION_API_BASE
}

export function getWhopServerConfig(): WhopServerConfig {
  const apiKey = readEnv('WHOP_SERVER_API_KEY') ?? readEnv('WHOP_API_KEY')

  return {
    // `WHOP_API_KEY` is reserved by the Whop runtime for its own injection.
    // The hosted website reads the explicitly configured server key first.
    apiKey,
    apiConfigured: Boolean(apiKey || readEnv('WHOP_API_ORIGIN')),
    apiBaseUrl: resolveApiBaseUrl(),
    environment: (readEnv('WHOP_ENV')?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production'),
    webhookSecret: readEnv('WHOP_WEBHOOK_SECRET'),
    depositPlanId: readEnv('WHOP_DEPOSIT_PLAN_ID'),
    depositAmountCents: parsePositiveInteger(readEnv('WHOP_DEPOSIT_AMOUNT_CENTS')),
    depositCurrency: (readEnv('WHOP_DEPOSIT_CURRENCY') ?? 'usd').toLowerCase(),
    operatorToken: readEnv('WHOP_OPERATOR_TOKEN'),
    fulfillmentWebhookUrl: readEnv('WHOP_FULFILLMENT_WEBHOOK_URL'),
    fulfillmentWebhookSecret: readEnv('WHOP_FULFILLMENT_WEBHOOK_SECRET'),
    finalInvoiceEnabled: readEnv('WHOP_ENABLE_FINAL_INVOICE') === 'true',
  }
}

/**
 * Non-secret reasons a self-serve plan checkout cannot run. The public plans
 * carry their own fixed amount and currency, so only the API credential is
 * required; the legacy deposit environment variables are not consulted.
 */
export function planConfigurationIssues(config: WhopServerConfig): string[] {
  const issues: string[] = []

  if (!config.apiConfigured && !config.apiKey) {
    issues.push('WHOP_API_KEY is not configured on the server.')
  }

  return issues
}

/**
 * Non-secret reasons the legacy deposit flow cannot run. Variable NAMES are
 * safe to return; variable VALUES never are.
 */
export function depositConfigurationIssues(config: WhopServerConfig): string[] {
  const issues: string[] = []

  if (!config.apiConfigured && !config.apiKey) {
    issues.push('WHOP_API_KEY is not configured on the server.')
  }
  if (!config.depositPlanId) {
    issues.push('WHOP_DEPOSIT_PLAN_ID is not configured.')
  } else if (!/^plan_[A-Za-z0-9]{6,80}$/.test(config.depositPlanId)) {
    issues.push('WHOP_DEPOSIT_PLAN_ID is not a valid plan_ identifier.')
  }
  if (!config.depositAmountCents) {
    issues.push('WHOP_DEPOSIT_AMOUNT_CENTS is not configured.')
  }
  if (!/^[a-z]{3}$/.test(config.depositCurrency)) {
    issues.push('WHOP_DEPOSIT_CURRENCY must be a three-letter code such as usd.')
  }

  return issues
}

export function finalInvoiceConfigurationIssues(config: WhopServerConfig): string[] {
  const issues: string[] = []

  if (!config.apiConfigured && !config.apiKey) {
    issues.push('WHOP_API_KEY is not configured on the server.')
  }
  if (!config.operatorToken) issues.push('WHOP_OPERATOR_TOKEN is not configured on the server.')
  if (!config.finalInvoiceEnabled) {
    issues.push('WHOP_ENABLE_FINAL_INVOICE is not set to "true".')
  }

  // The invoice credit is only accepted after a live payment lookup, so the
  // deposit plan, amount, and currency must be configured too.
  for (const issue of depositConfigurationIssues(config)) {
    if (!issues.includes(issue)) issues.push(issue)
  }

  return issues
}

export function isProductionApi(config: WhopServerConfig): boolean {
  return config.apiBaseUrl === PRODUCTION_API_BASE
}

export const WHOP_API_BASES = {
  production: PRODUCTION_API_BASE,
  sandbox: SANDBOX_API_BASE,
} as const

