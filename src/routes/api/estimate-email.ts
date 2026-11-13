import { createFileRoute } from '@tanstack/react-router'

import { checkoutPlanByKey } from '../../lib/checkout-plans'
import { normalizeCustomerEmail } from '../../lib/customer'
import { isEstimateRequestId, makeEstimateRequestId } from '../../lib/estimate'
import { jsonResponse, isSameOriginRequest, readJsonBody } from '../../server/http'
import { checkRateLimit, clientAddress } from '../../server/rate-limit'
import { isEmailConfigured, sendJourneyConfirmation } from '../../server/whop/email'

const EMAIL_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 } as const

/**
 * Email-first entry. The address is used for one confirmation email and to
 * prefill the Whop payment form. No account, password, or OAuth session is
 * created, and no email is claimed as sent unless Resend returned an id.
 */
export const Route = createFileRoute('/api/estimate-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonResponse(
            { ok: false, code: 'forbidden', message: 'Invalid origin.' },
            { status: 403 },
          )
        }

        const rate = checkRateLimit(`journey-email:${clientAddress(request)}`, EMAIL_RATE_LIMIT)
        if (!rate.allowed) {
          return jsonResponse(
            {
              ok: false,
              code: 'rate_limited',
              message: 'Too many email attempts. Please wait a few minutes and try again.',
            },
            { status: 429, headers: { 'retry-after': String(rate.retryAfterSeconds) } },
          )
        }

        const body = await readJsonBody(request, 4_000)
        if (!body.ok) {
          return jsonResponse(
            { ok: false, code: body.code, message: body.message },
            { status: body.status },
          )
        }

        if (typeof body.value !== 'object' || body.value === null || Array.isArray(body.value)) {
          return jsonResponse(
            { ok: false, code: 'invalid_input', message: 'Enter a valid email address.' },
            { status: 400 },
          )
        }

        const value = body.value as Record<string, unknown>
        const email = normalizeCustomerEmail(value.email)
        if (!email) {
          return jsonResponse(
            { ok: false, code: 'invalid_input', message: 'Enter a valid email address.' },
            { status: 400 },
          )
        }

        const plan = checkoutPlanByKey(value.planKey)
        const requestId = isEstimateRequestId(value.requestId)
          ? value.requestId
          : makeEstimateRequestId()

        const plansUrl = new URL('/#pricing', request.url).toString()
        const configured = isEmailConfigured()
        let sent = false

        if (configured) {
          try {
            sent = await sendJourneyConfirmation({
              to: email,
              requestId,
              planKey: plan?.key ?? null,
              plansUrl,
            })
          } catch {
            sent = false
          }
        }

        return jsonResponse({
          ok: true,
          sent,
          configured,
          planKey: plan?.key ?? null,
          message: sent
            ? 'A confirmation email is on its way. You can choose a plan now.'
            : configured
              ? 'Your email was saved for this visit, but the confirmation could not be sent. You can still choose a plan.'
              : 'Your email was saved for this visit. Email delivery is not configured on this server yet, so no confirmation was sent. You can still choose a plan.',
        })
      },
    },
  },
})
