import { createFileRoute } from '@tanstack/react-router'

import {
  buildDepositReturnUrl,
  isConfirmationToken,
  isDepositAttemptId,
} from '../../../lib/deposit'
import { normalizeProjectRef } from '../../../lib/project'
import { isSameOriginRequest, jsonResponse, readJsonBody } from '../../../server/http'
import {
  WhopApiError,
  WhopNotConfiguredError,
  WhopTransportError,
} from '../../../server/whop/client'
import { depositConfigurationIssues, getWhopServerConfig } from '../../../server/whop/config'
import { createDepositPayment } from '../../../server/whop/payments'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const Route = createFileRoute('/api/whop/deposit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonResponse(
            { ok: false, code: 'forbidden', message: 'Request origin is not allowed.' },
            { status: 403 },
          )
        }

        const body = await readJsonBody(request, 12_000)
        if (!body.ok) {
          return jsonResponse(
            { ok: false, code: body.code, message: body.message },
            { status: body.status },
          )
        }

        if (!isRecord(body.value)) {
          return jsonResponse(
            { ok: false, code: 'invalid_input', message: 'Invalid payment request.' },
            { status: 400 },
          )
        }

        const projectRef = normalizeProjectRef(body.value.projectRef)
        const attemptId = body.value.attemptId
        const confirmationToken = body.value.confirmationToken

        if (!projectRef) {
          return jsonResponse(
            { ok: false, code: 'invalid_project', message: 'A valid project reference is required.' },
            { status: 400 },
          )
        }

        if (!isDepositAttemptId(attemptId) || !isConfirmationToken(confirmationToken)) {
          return jsonResponse(
            { ok: false, code: 'invalid_payment_details', message: 'The payment details are incomplete.' },
            { status: 400 },
          )
        }

        const config = getWhopServerConfig()
        const issues = depositConfigurationIssues(config)
        if (issues.length > 0) {
          return jsonResponse(
            {
              ok: false,
              code: 'not_configured',
              message:
                'Online deposit payments are not connected yet. Please contact the office to arrange payment.',
              issues,
            },
            { status: 503 },
          )
        }

        const returnUrl = buildDepositReturnUrl(new URL(request.url).origin, projectRef)
        if (!returnUrl) {
          return jsonResponse(
            {
              ok: false,
              code: 'invalid_return_url',
              message: 'Payment cannot be started from this address.',
            },
            { status: 400 },
          )
        }

        try {
          const payment = await createDepositPayment({
            projectRef,
            attemptId,
            confirmationToken,
            returnUrl,
          })

          return jsonResponse({
            ok: true,
            paymentId: payment.id,
            status: payment.status,
            paid: payment.paid,
            clientSecret: payment.clientSecret,
          })
        } catch (error) {
          if (error instanceof WhopNotConfiguredError) {
            return jsonResponse(
              {
                ok: false,
                code: 'not_configured',
                message:
                  'Online deposit payments are not connected yet. Please contact the office to arrange payment.',
              },
              { status: 503 },
            )
          }

          if (error instanceof WhopApiError) {
            console.error('[deposit] Whop payment creation failed', {
              status: error.status,
              code: error.code,
            })

            const rejected = error.status >= 400 && error.status < 500 && error.status !== 401
            return jsonResponse(
              {
                ok: false,
                code: rejected ? 'payment_rejected' : 'payment_unavailable',
                message: rejected
                  ? 'The payment could not be started. No charge was made. Please check the payment details and try again.'
                  : 'Payments are temporarily unavailable. No charge was made. Please try again shortly.',
              },
              { status: rejected ? 422 : 503 },
            )
          }

          if (error instanceof WhopTransportError) {
            return jsonResponse(
              {
                ok: false,
                code: 'payment_unavailable',
                message:
                  'We could not reach the payment processor. No charge was made. Please try again shortly.',
              },
              { status: 504 },
            )
          }

          console.error('[deposit] unexpected payment failure')
          return jsonResponse(
            {
              ok: false,
              code: 'unexpected_error',
              message: 'Something went wrong while starting the payment. No charge was made.',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
