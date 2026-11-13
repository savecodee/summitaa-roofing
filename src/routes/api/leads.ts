import { createFileRoute } from '@tanstack/react-router'

import {
  buildLeadMetadata,
  estimateEventId,
  isStaleEstimate,
  isLikelyAutomated,
  parseEstimateSubmission,
} from '../../lib/estimate'
import { jsonResponse, isSameOriginRequest, readJsonBody } from '../../server/http'
import { getWhopServerConfig } from '../../server/whop/config'
import {
  WhopApiError,
  WhopNotConfiguredError,
  WhopTransportError,
} from '../../server/whop/client'
import { createWhopEvent } from '../../server/whop/events'
import { createWhopLead } from '../../server/whop/leads'
import { sendEstimateConfirmation } from '../../server/whop/email'
import { readWhopIdentity } from '../../server/whop/oauth'
import { checkRateLimit, clientAddress } from '../../server/rate-limit'

const LEAD_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 } as const

export const Route = createFileRoute('/api/leads')({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(getWhopServerConfig().apiConfigured)
        return jsonResponse({ configured })
      },

      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonResponse(
            { ok: false, code: 'forbidden', message: 'Request origin is not allowed.' },
            { status: 403 },
          )
        }

        const body = await readJsonBody(request, 24_000)
        if (!body.ok) {
          return jsonResponse(
            { ok: false, code: body.code, message: body.message },
            { status: body.status },
          )
        }

        const parsed = parseEstimateSubmission(body.value)
        if (!parsed.ok) {
          return jsonResponse(
            {
              ok: false,
              code: parsed.code,
              message: parsed.message,
              errors: parsed.errors ?? undefined,
            },
            { status: 400 },
          )
        }

        const submission = parsed.submission
        const raw = body.value as Record<string, unknown>

        // Honeypot / time-trap: acknowledge without creating a lead or an event.
        if (isLikelyAutomated(raw.company, submission.startedAt)) {
          return jsonResponse({ ok: true, requestId: submission.requestId })
        }

        if (isStaleEstimate(submission.startedAt)) {
          return jsonResponse(
            {
              ok: false,
              code: 'stale_form',
              message:
                'This page was open for too long. Please refresh the page and submit the request again.',
            },
            { status: 400 },
          )
        }

        const config = getWhopServerConfig()
        if (!config.apiConfigured) {
          return jsonResponse(
            {
              ok: false,
              code: 'not_configured',
              message:
                'Online estimate requests are not connected yet. Please call the office instead.',
            },
            { status: 503 },
          )
        }

        const rate = checkRateLimit(
          `leads:${clientAddress(request)}`,
          LEAD_RATE_LIMIT,
        )
        if (!rate.allowed) {
          return jsonResponse(
            {
              ok: false,
              code: 'rate_limited',
              message:
                'Too many estimate requests from this connection. Please wait a few minutes and try again, or call the office.',
            },
            {
              status: 429,
              headers: { 'retry-after': String(rate.retryAfterSeconds) },
            },
          )
        }

        // Whop only requires `account_id`. A signed-in visitor's user id is
        // linked when available; an anonymous visitor sends no user_id at all.
        const identity = await readWhopIdentity(request)

        const referrer = new URL(
          submission.sourcePath,
          new URL(request.url).origin,
        ).toString()

        try {
          const lead = await createWhopLead({
            requestId: submission.requestId,
            userId: identity?.userId,
            metadata: buildLeadMetadata(submission.values, submission.requestId),
            referrer,
          })

          // Tracking failure must never turn a successfully recorded lead into
          // an error the visitor sees.
          let tracked = false
          try {
            await createWhopEvent({
              eventName: 'estimate_requested',
              eventId: estimateEventId(submission.requestId),
              pageUrl: referrer,
            })
            tracked = true
          } catch {
            tracked = false
          }

          let emailSent = false
          try {
            emailSent = await sendEstimateConfirmation({
              to: submission.values.email,
              customerName: submission.values.name,
              requestId: submission.requestId,
              service: submission.values.service,
              zip: submission.values.zip,
              details: submission.values.details,
            })
          } catch {
            emailSent = false
          }

          return jsonResponse({
            ok: true,
            requestId: submission.requestId,
            leadId: lead.id,
            tracked,
            emailSent,
          })
        } catch (error) {
          if (error instanceof WhopNotConfiguredError) {
            return jsonResponse(
              {
                ok: false,
                code: 'not_configured',
                message:
                  'Online estimate requests are not connected yet. Please call the office instead.',
              },
              { status: 503 },
            )
          }

          if (error instanceof WhopApiError || error instanceof WhopTransportError) {
            console.error('[leads] Whop lead creation failed')
            return jsonResponse(
              {
                ok: false,
                code: 'lead_failed',
                message:
                  'We could not record your request just now. Nothing was sent. Please try again or call the office.',
              },
              { status: 502 },
            )
          }

          console.error('[leads] unexpected failure')
          return jsonResponse(
            {
              ok: false,
              code: 'unexpected_error',
              message: 'Something went wrong while recording your request. Please try again.',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
