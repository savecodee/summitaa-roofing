import '@tanstack/react-start/server-only'

import { whopPublicConfig } from '../../config/whop'
import { whopRequest } from './client'

export type ServerEventInput = {
  eventName: string
  eventId: string
  sessionId?: string
  planId?: string
  pageUrl?: string
}

/**
 * Sends one event to the Whop Events API.
 *
 * Only identifiers are included: an anonymous session ID, public plan/product
 * IDs, and a same-origin page URL. The Events API has no metadata field, which
 * is another guarantee that names, emails, phone numbers, and payment data
 * cannot travel with analytics.
 */
export async function createWhopEvent(input: ServerEventInput): Promise<void> {
  const body: Record<string, unknown> = {
    account_id: whopPublicConfig.accountId,
    event_name: input.eventName,
    event_id: input.eventId,
    event_time: new Date().toISOString(),
    action_source: 'website',
    product_id: whopPublicConfig.productId,
  }

  if (input.planId) body.plan_id = input.planId
  if (input.pageUrl) body.url = input.pageUrl
  if (input.sessionId) body.user = { anonymous_id: input.sessionId }

  await whopRequest('/events', {
    method: 'POST',
    timeoutMs: 8_000,
    body,
  })
}
