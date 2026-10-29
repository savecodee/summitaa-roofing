import '@tanstack/react-start/server-only'

import { whopPublicConfig } from '../../config/whop'
import { isSetupIntentId, normalizeSetupIntentStatus } from '../../lib/save-card'
import { asRecord, pickString, whopRequest } from './client'
import { getWhopServerConfig } from './config'

/**
 * Setup intents save a card without charging it.
 *
 * This is the official collect-only path: the browser mounts Whop Elements in
 * `mode="setup"`, creates a confirmation token, and this server call turns the
 * token into a setup intent. The saved method belongs to the buyer in Whop; the
 * site never receives or stores a card number.
 *
 * The API version matches the native setup-intent resource introduced on
 * 2026-09-22. A hosted Whop app reaches this through the auto-signed outbound
 * proxy, so no key is present in the deployment.
 */
const SETUP_INTENTS_API_VERSION = '2026-10-24'

/**
 * The setup intent was created for, or resolved to, a different Whop account
 * than the one this site sells under. The route refuses to report it as saved.
 */
export class SetupIntentAccountMismatchError extends Error {
  constructor() {
    super('setup_intent_account_mismatch')
    this.name = 'SetupIntentAccountMismatchError'
  }
}

export type CreatedSetupIntent = {
  id: string
  status: string
  clientSecret: string | null
  paymentMethodId: string | null
  accountId: string | null
  memberId: string | null
}

export type SetupIntentStatus = {
  id: string
  status: string
  succeeded: boolean
  canceled: boolean
  requiresAction: boolean
  processing: boolean
  paymentMethodId: string | null
  accountId: string | null
  memberId: string | null
}

function readSetupIntent(payload: unknown, fallbackId?: string): CreatedSetupIntent {
  const record = asRecord(payload)
  const nested = asRecord(record.setup_intent)
  const source = pickString(nested, 'id') ? nested : record

  // A nested resource may omit linkage fields that sit on the envelope, so
  // read from the chosen object first and fall back to the root.
  const read = (key: string) => pickString(source, key) ?? pickString(record, key)

  return {
    id: pickString(source, 'id') ?? fallbackId ?? '',
    status: pickString(source, 'status') ?? 'unknown',
    clientSecret: pickString(source, 'client_secret'),
    paymentMethodId: read('payment_method_id'),
    accountId: read('account_id'),
    memberId: read('member_id'),
  }
}

function assertConfiguredAccount(accountId: string | null): void {
  if (accountId && accountId !== whopPublicConfig.accountId) {
    throw new SetupIntentAccountMismatchError()
  }
}

export async function createSetupIntent(input: {
  confirmationToken: string
  attemptId: string
  returnUrl: string
  projectRef?: string | null
}): Promise<CreatedSetupIntent> {
  const config = getWhopServerConfig()
  if (!config.apiConfigured) throw new Error('save_card_not_configured')

  const metadata: Record<string, string> = {
    source: 'summitaa_roofing_saved_card',
    site: 'summitaa-roofing',
    request_id: input.attemptId,
  }
  if (input.projectRef) metadata.project_ref = input.projectRef

  const payload = await whopRequest('/setup_intents', {
    method: 'POST',
    apiVersion: SETUP_INTENTS_API_VERSION,
    idempotencyKey: `save-card-${input.attemptId}`,
    timeoutMs: 20_000,
    body: {
      account_id: whopPublicConfig.accountId,
      confirmation_token: input.confirmationToken,
      currency: config.depositCurrency,
      return_url: input.returnUrl,
      metadata,
    },
  })

  const created = readSetupIntent(payload)
  if (!isSetupIntentId(created.id)) throw new Error('invalid_setup_intent_response')
  assertConfiguredAccount(created.accountId)
  return created
}

export async function getSetupIntentStatus(setupIntentId: string): Promise<SetupIntentStatus> {
  if (!isSetupIntentId(setupIntentId)) throw new Error('invalid_setup_intent_id')

  const payload = await whopRequest(`/setup_intents/${encodeURIComponent(setupIntentId)}`, {
    apiVersion: SETUP_INTENTS_API_VERSION,
    timeoutMs: 12_000,
  })

  const created = readSetupIntent(payload, setupIntentId)
  const status = normalizeSetupIntentStatus(created.status)
  assertConfiguredAccount(created.accountId)

  return {
    id: created.id,
    status,
    succeeded: status === 'succeeded',
    canceled: status === 'canceled' || status === 'failed' || status === 'void',
    requiresAction: status === 'requires_action' || status === 'requires_confirmation',
    processing: !['succeeded', 'canceled', 'failed', 'void'].includes(status),
    paymentMethodId: created.paymentMethodId,
    accountId: created.accountId,
    memberId: created.memberId,
  }
}
