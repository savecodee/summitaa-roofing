import { createFileRoute } from '@tanstack/react-router'

import { whopPublicConfig } from '../../../config/whop'
import {
  isHandledWebhookType,
  parseWebhookEnvelope,
  readWebhookHeaders,
  verifyWhopWebhook,
} from '../../../lib/webhooks'
import { jsonResponse, readRawBody } from '../../../server/http'
import { getWhopServerConfig } from '../../../server/whop/config'
import { forwardVerifiedWebhook } from '../../../server/whop/webhooks'

/**
 * Whop webhook receiver.
 *
 * The raw bytes are verified before parsing. Fulfillment is never performed
 * here directly: the site has no database, so the verified event is either
 * forwarded to an operator endpoint (which must deduplicate by
 * `x-summitaa-delivery`) or left for manual handling in the Whop dashboard.
 * No payload is logged.
 */
export const Route = createFileRoute('/api/whop/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const config = getWhopServerConfig()

        if (!config.webhookSecret) {
          return jsonResponse(
            { ok: false, code: 'not_configured', message: 'Webhook verification is not configured.' },
            { status: 503 },
          )
        }

        const body = await readRawBody(request, 1_000_000)
        if (!body.ok) {
          return jsonResponse(
            { ok: false, code: body.code, message: body.message },
            { status: body.status },
          )
        }

        const verification = await verifyWhopWebhook({
          secret: config.webhookSecret,
          payload: body.text,
          headers: readWebhookHeaders(request.headers),
        })

        if (!verification.ok) {
          console.error('[webhook] Whop signature verification failed', {
            reason: verification.reason,
          })
          return jsonResponse(
            { ok: false, code: 'invalid_signature', message: 'Webhook signature is not valid.' },
            { status: 401 },
          )
        }

        const envelope = parseWebhookEnvelope(body.text)
        if (!envelope) {
          return jsonResponse(
            { ok: false, code: 'invalid_event', message: 'Webhook event is not valid.' },
            { status: 400 },
          )
        }

        if (envelope.accountId !== whopPublicConfig.accountId) {
          // A valid signature for another account is not ours to process.
          return jsonResponse({ ok: true, ignored: true, reason: 'account_mismatch' })
        }

        if (!isHandledWebhookType(envelope.type)) {
          return jsonResponse({ ok: true, ignored: true, reason: 'unhandled_event_type' })
        }

        const webhookId = readWebhookHeaders(request.headers)?.id ?? envelope.id
        if (!webhookId) {
          return jsonResponse(
            { ok: false, code: 'invalid_event', message: 'Webhook delivery ID is missing.' },
            { status: 400 },
          )
        }

        const forward = await forwardVerifiedWebhook({
          webhookId,
          eventType: envelope.type,
          payload: body.text,
        })

        if (!forward.ok) {
          // Return a failure so Whop retries; the operator receiver deduplicates
          // repeated deliveries by the preserved webhook ID.
          return jsonResponse(
            {
              ok: false,
              code: 'fulfillment_forward_failed',
              message: 'The verified event could not be forwarded.',
            },
            { status: 502 },
          )
        }

        return jsonResponse({
          ok: true,
          forwarded: forward.forwarded,
          eventType: envelope.type,
        })
      },
    },
  },
})
