import { createFileRoute } from '@tanstack/react-router'

import { validateFinalInvoice } from '../../../lib/invoice'
import {
  isSameOriginRequest,
  jsonResponse,
  readBearerToken,
  readJsonBody,
  timingSafeEqualString,
} from '../../../server/http'
import {
  WhopApiError,
  WhopNotConfiguredError,
  WhopTransportError,
} from '../../../server/whop/client'
import {
  finalInvoiceConfigurationIssues,
  getWhopServerConfig,
} from '../../../server/whop/config'
import { createFinalInvoice } from '../../../server/whop/invoices'

/**
 * Operator-only final invoice creation.
 *
 * Auth is a bearer token that is compared in constant time. The route stays
 * disabled until `WHOP_ENABLE_FINAL_INVOICE=true`. The deposit credit is never
 * inferred: the operator supplies it explicitly after reconciling the deposit
 * payment in Whop.
 */
export const Route = createFileRoute('/api/whop/final-invoice')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonResponse(
            { ok: false, code: 'forbidden', message: 'Request origin is not allowed.' },
            { status: 403 },
          )
        }

        const config = getWhopServerConfig()

        if (!config.operatorToken) {
          return jsonResponse(
            { ok: false, code: 'not_configured', message: 'Operator access is not configured.' },
            { status: 503 },
          )
        }

        const token = readBearerToken(request)
        if (!token || !(await timingSafeEqualString(token, config.operatorToken))) {
          return jsonResponse(
            { ok: false, code: 'unauthorized', message: 'Operator authorization is required.' },
            { status: 401 },
          )
        }

        const issues = finalInvoiceConfigurationIssues(config)
        if (issues.length > 0) {
          return jsonResponse(
            {
              ok: false,
              code: 'not_configured',
              message: 'Final invoice creation is not enabled for this environment.',
              issues,
            },
            { status: 503 },
          )
        }

        const body = await readJsonBody(request, 16_000)
        if (!body.ok) {
          return jsonResponse(
            { ok: false, code: body.code, message: body.message },
            { status: body.status },
          )
        }

        const invoice = validateFinalInvoice(body.value, {
          currency: config.depositCurrency,
        })

        if (!invoice.ok) {
          return jsonResponse(
            {
              ok: false,
              code: invoice.code,
              message: invoice.message,
              fields: invoice.fields,
            },
            { status: 400 },
          )
        }

        try {
          const created = await createFinalInvoice(invoice.draft)

          return jsonResponse(
            {
              ok: true,
              invoice: created,
              balanceDueCents: invoice.draft.balanceDueCents,
              currency: invoice.draft.currency,
              idempotencyKey: invoice.draft.idempotencyKey,
              note: 'Whop stores idempotency keys for 24 hours. Verify in Whop before retrying after that window.',
            },
            { status: 201 },
          )
        } catch (error) {
          if (error instanceof WhopNotConfiguredError) {
            return jsonResponse(
              { ok: false, code: 'not_configured', message: 'Whop is not configured.' },
              { status: 503 },
            )
          }

          if (error instanceof WhopApiError) {
            console.error('[final-invoice] Whop invoice creation failed', {
              status: error.status,
              code: error.code,
            })

            if (error.status === 409) {
              return jsonResponse(
                {
                  ok: false,
                  code: 'possible_duplicate',
                  message:
                    'Whop reported a conflict. Check the existing invoices before retrying with a new idempotency key.',
                },
                { status: 409 },
              )
            }

            if (error.status >= 400 && error.status < 500 && error.status !== 401) {
              return jsonResponse(
                {
                  ok: false,
                  code: 'invoice_rejected',
                  message: 'Whop rejected the invoice. No invoice was created.',
                },
                { status: 422 },
              )
            }

            return jsonResponse(
              {
                ok: false,
                code: 'invoice_failed',
                message: 'Whop could not create the invoice right now.',
              },
              { status: 502 },
            )
          }

          if (error instanceof WhopTransportError) {
            return jsonResponse(
              {
                ok: false,
                code: 'invoice_unavailable',
                message:
                  'Whop could not be reached. Check Whop for an invoice before retrying with the same idempotency key.',
              },
              { status: 504 },
            )
          }

          console.error('[final-invoice] unexpected failure')
          return jsonResponse(
            { ok: false, code: 'unexpected_error', message: 'The invoice could not be created.' },
            { status: 500 },
          )
        }
      },
    },
  },
})
