import '@tanstack/react-start/server-only'

import { whopPublicConfig } from '../../config/whop'
import { asRecord, pickString, whopRequest } from './client'

export type CreatedLead = {
  id: string | null
}

/**
 * Creates a Whop Lead. The Leads API has no native name/email/phone fields, so
 * the validated contact details travel in `metadata`, which is what the operator
 * reads in the Whop dashboard.
 */
export async function createWhopLead(input: {
  requestId: string
  userId: string
  metadata: Record<string, string>
  referrer: string
}): Promise<CreatedLead> {
  const payload = await whopRequest('/leads', {
    method: 'POST',
    idempotencyKey: `lead-${input.requestId}`,
    timeoutMs: 12_000,
    body: {
      account_id: whopPublicConfig.accountId,
      product_id: whopPublicConfig.productId,
      user_id: input.userId,
      metadata: input.metadata,
      referrer: input.referrer,
    },
  })

  return { id: pickString(asRecord(payload), 'id') }
}
