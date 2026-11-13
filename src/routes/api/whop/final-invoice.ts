import { createFileRoute } from '@tanstack/react-router'

import { whopPublicConfig } from '@/config'
import { isPaymentId } from '@/lib/deposit'
import { validateFinalInvoice, verifyDepositForInvoice } from '@/lib/invoice'
import { normalizeProjectRef } from '@/lib/project'
import {
  isSameOriginRequest,
  jsonResponse,
  readBearerToken,
  readJsonBody,
  timingSafeEqualString,
} from '@/server/http'
import {
  WhopApiError,
  WhopNotConfiguredError,
  WhopTransportError,
} from '@/server/whop/client'
import {
  finalInvoiceConfigurationIssues,
  getWhopServerConfig,
} from '@/server/whop/config'
import { createFinalInvoice } from '@/server/whop/invoices'
import { getDepositPayment } from '@/server/whop/payments'
import { findSavedPaymentMethodForProject } from '@/server/whop/setup-intents'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Operator-only final invoice creation.
 *
 * Auth is a bearer token that is compared in constant time. The route stays
 * disabled until `WHOP_ENABLE_FINAL_INVOICE=true`.
 *
 * The deposit credit is not trusted from the request. The operator sends a
 * `pay_` reference; this route fetches that payment from Whop and requires a
 * paid status, the configured account and deposit plan, the same project
 * reference, and the configured amount and currency. Only then is the Whop
 * amount used as the credit.
 *
 * If a saved payment method exists for the project (from the deposit/save-card
 * flow), the invoice is created with `collection_method: 'charge_automatically'`
 * and the balance is charged immediately. Otherwise, the invoice is sent for
 * manual payment via `collection_method: 'send_invoice'`.
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

        if (!isRecord(body.value)) {
          return jsonResponse(
            { ok: false, code: 'invalid_input', message: 'Invalid invoice request.' },
            { status: 400 },
          )
        }

        if ('depositCreditCents' in body.value) {
          return jsonResponse(
            {
              ok: false,
              code: 'client_supplied_credit',
              message: 'The deposit credit is derived from a verified Whop payment.',
              fields: {
                depositCreditCents:
                  'Remove this field. Send depositPaymentId so the server can verify the payment.',
              },
            },
            { status: 400 },
          )
        }

        const depositPaymentId = body.value.depositPaymentId
        if (!isPaymentId(depositPaymentId)) {
          return jsonResponse(
            {
              ok: false,
              code: 'invalid_input',
              message: 'Please check the invoice details.',
              fields: { depositPaymentId: 'Send the pay_ reference of the verified deposit.' },
            },
            { status: 400 },
          )
        }

        const projectRef = normalizeProjectRef(body.value.projectRef)
        if (!projectRef) {
          return jsonResponse(
            {
              ok: false,
              code: 'invalid_input',
              message: 'Please check the invoice details.',
              fields: { projectRef: 'Use a valid project reference.' },
            },
            { status: 400 },
          )
        }

        const expectedAmountCents = config.depositAmountCents
        const expectedPlanId = config.depositPlanId
        if (!expectedAmountCents || !expectedPlanId) {
          // `finalInvoiceConfigurationIssues` already covers this; keep the
          // guard so the verifier can never receive a null expectation.
          return jsonResponse(
            {
              ok: false,
              code: 'not_configured',
              message: 'The deposit configuration is incomplete.',
            },
            { status: 503 },
          )
        }

        let verifiedDeposit: { paymentId: string; creditCents: number }
        try {
          const payment = await getDepositPayment(depositPaymentId)
          const verification = verifyDepositForInvoice({
            payment,
            expected: {
              accountId: whopPublicConfig.accountId,
              planId: expectedPlanId,
              projectRef,
              amountCents: expectedAmountCents,
              currency: config.depositCurrency,
            },
          })

          if (!verification.ok) {
            return jsonResponse(
              {
                ok: false,
                code: 'deposit_not_verified',
                reason: verification.code,
                message: verification.message,
              },
              { status: 422 },
            )
          }

          verifiedDeposit = {
            paymentId: depositPaymentId,
            creditCents: verification.depositCreditCents,
          }
        } catch (error) {
          if (error instanceof WhopNotConfiguredError) {
            return jsonResponse(
              { ok: false, code: 'not_configured', message: 'Whop is not configured.' },
              { status: 503 },
            )
          }

          if (error instanceof WhopApiError) {
            if (error.status === 404) {
              return jsonResponse(
                {
                  ok: false,
                  code: 'deposit_not_found',
                  message: 'Whop did not find that deposit payment.',
                },
                { status: 422 },
              )
            }

            console.error('[final-invoice] deposit verification failed', {
              status: error.status,
              code: error.code,
            })
            return jsonResponse(
              {
                ok: false,
                code: 'deposit_unavailable',
                message: 'The deposit could not be verified right now. No invoice was created.',
              },
              { status: 502 },
            )
          }

          if (error instanceof WhopTransportError) {
            return jsonResponse(
              {
                ok: false,
                code: 'deposit_unavailable',
                message: 'The deposit could not be verified right now. No invoice was created.',
              },
              { status: 504 },
            )
          }

          console.error('[final-invoice] unexpected deposit lookup failure')
          return jsonResponse(
            {
              ok: false,
              code: 'deposit_unavailable',
              message: 'The deposit could not be verified right now. No invoice was created.',
            },
            { status: 500 },
          )
        }

        const invoice = validateFinalInvoice(body.value, {
          currency: config.depositCurrency,
          deposit: verifiedDeposit,
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

        // Look up saved payment method for this project
        const savedPaymentMethod = await findSavedPaymentMethodForProject(projectRef)

        try {
          const created = await createFinalInvoice({
            draft: invoice.draft,
            paymentMethodId: savedPaymentMethod?.paymentMethodId ?? null,
          })

          const wasAutoCharged = !!savedPaymentMethod?.paymentMethodId && created.charged

          return jsonResponse(
            {
              ok: true,
              invoice: created,
              depositPaymentId: verifiedDeposit.paymentId,
              depositCreditCents: invoice.draft.depositCreditCents,
              balanceDueCents: invoice.draft.balanceDueCents,
              currency: invoice.draft.currency,
              idempotencyKey: invoice.draft.idempotencyKey,
              autoCharged: wasAutoCharged,
              paymentMethodUsed: wasAutoCharged ? savedPaymentMethod?.paymentMethodId ?? null : null,
              invoiceUrl: created.url,
              note: wasAutoCharged
                ? 'Invoice created and balance auto-charged to the saved payment method.'
                : 'Invoice created and sent for manual payment. Customer will receive a payment link.',
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
