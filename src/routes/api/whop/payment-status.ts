import { createFileRoute } from '@tanstack/react-router'

import { depositAmountMatches, formatCents } from '../../../lib/deposit'
import { normalizeProjectRef } from '../../../lib/project'
import { jsonResponse } from '../../../server/http'
import {
  WhopApiError,
  WhopNotConfiguredError,
  WhopTransportError,
} from '../../../server/whop/client'
import { getWhopServerConfig } from '../../../server/whop/config'
import { getDepositPayment, isPaymentId } from '../../../server/whop/payments'

/**
 * Authoritative payment status for the return page.
 *
 * Query-string values such as `status=succeeded` are display hints only. This
 * endpoint reads the payment from Whop and returns the real status. It also
 * requires the project reference to match the payment metadata, so one project
 * link cannot be used to inspect another payment.
 */
export const Route = createFileRoute('/api/whop/payment-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const paymentId = url.searchParams.get('payment')
        const projectRef = normalizeProjectRef(url.searchParams.get('project'))

        if (!isPaymentId(paymentId) || !projectRef) {
          return jsonResponse(
            { ok: false, code: 'invalid_reference', message: 'Payment reference is not valid.' },
            { status: 400 },
          )
        }

        const config = getWhopServerConfig()
        if (!config.apiConfigured) {
          return jsonResponse(
            {
              ok: false,
              code: 'not_configured',
              message: 'Payment status cannot be checked right now.',
            },
            { status: 503 },
          )
        }

        if (!config.depositAmountCents) {
          return jsonResponse(
            {
              ok: false,
              code: 'not_configured',
              message: 'Payment status cannot be checked right now.',
            },
            { status: 503 },
          )
        }

        try {
          const payment = await getDepositPayment(paymentId)

          if (!payment.projectRef || payment.projectRef !== projectRef) {
            return jsonResponse(
              { ok: false, code: 'not_found', message: 'Payment reference was not found.' },
              { status: 404 },
            )
          }

          const amountCents =
            payment.amountMajor && /^\d+(\.\d+)?$/.test(payment.amountMajor)
              ? Math.round(Number(payment.amountMajor) * 100)
              : null

          // Whop charges the plan. If the processor total does not match the
          // configured deposit, never report a successful deposit.
          if (
            !depositAmountMatches({
              actualCents: amountCents,
              actualCurrency: payment.currency,
              expectedCents: config.depositAmountCents,
              expectedCurrency: config.depositCurrency,
            })
          ) {
            return jsonResponse(
              {
                ok: false,
                code: 'amount_mismatch',
                message:
                  'The payment amount does not match the configured deposit. Contact the office before treating this as paid.',
              },
              { status: 409 },
            )
          }

          return jsonResponse({
            ok: true,
            status: payment.status,
            paid: payment.paid,
            failed: payment.failed,
            pending: payment.pending,
            amountLabel:
              amountCents !== null
                ? formatCents(amountCents, payment.currency ?? config.depositCurrency)
                : null,
            currency: payment.currency ?? config.depositCurrency,
          })
        } catch (error) {
          if (error instanceof WhopNotConfiguredError) {
            return jsonResponse(
              {
                ok: false,
                code: 'not_configured',
                message: 'Payment status cannot be checked right now.',
              },
              { status: 503 },
            )
          }

          if (error instanceof WhopApiError) {
            if (error.status === 404) {
              return jsonResponse(
                { ok: false, code: 'not_found', message: 'Payment reference was not found.' },
                { status: 404 },
              )
            }

            console.error('[payment-status] Whop lookup failed', {
              status: error.status,
              code: error.code,
            })
            return jsonResponse(
              {
                ok: false,
                code: 'status_unavailable',
                message: 'Payment status is temporarily unavailable.',
              },
              { status: 503 },
            )
          }

          if (error instanceof WhopTransportError) {
            return jsonResponse(
              {
                ok: false,
                code: 'status_unavailable',
                message: 'Payment status is temporarily unavailable.',
              },
              { status: 504 },
            )
          }

          console.error('[payment-status] unexpected failure')
          return jsonResponse(
            {
              ok: false,
              code: 'unexpected_error',
              message: 'Payment status could not be checked.',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
