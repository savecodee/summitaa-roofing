import { createFileRoute } from '@tanstack/react-router'

import { isConfirmationToken, isDepositAttemptId } from '../../../lib/deposit'
import { normalizeProjectRef } from '../../../lib/project'
import { buildSaveCardReturnUrl, isSetupIntentId } from '../../../lib/save-card'
import { isSameOriginRequest, jsonResponse, readJsonBody } from '../../../server/http'
import {
  WhopApiError,
  WhopNotConfiguredError,
  WhopTransportError,
} from '../../../server/whop/client'
import { getWhopServerConfig } from '../../../server/whop/config'
import { createSetupIntent, getSetupIntentStatus } from '../../../server/whop/setup-intents'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Save a card without charging it.
 *
 * POST accepts a confirmation token collected by Whop Elements in setup mode.
 * GET reads the authoritative setup status for a return page. Neither route
 * receives or returns a card number.
 */
export const Route = createFileRoute('/api/whop/save-card')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const setupIntentId = url.searchParams.get('setupIntentId')

        if (!isSetupIntentId(setupIntentId)) {
          return jsonResponse(
            { ok: false, code: 'invalid_setup_intent', message: 'A valid setup intent is required.' },
            { status: 400 },
          )
        }

        try {
          const status = await getSetupIntentStatus(setupIntentId)
          return jsonResponse({
            ok: true,
            setupIntentId: status.id,
            status: status.status,
            succeeded: status.succeeded,
            canceled: status.canceled,
            requiresAction: status.requiresAction,
            processing: status.processing,
          })
        } catch (error) {
          if (error instanceof WhopNotConfiguredError) {
            return jsonResponse(
              { ok: false, code: 'not_configured', message: 'Card saving is not configured.' },
              { status: 503 },
            )
          }
          if (error instanceof WhopApiError) {
            return jsonResponse(
              { ok: false, code: 'setup_unavailable', message: 'The card status is unavailable.' },
              { status: error.status >= 500 ? 503 : 422 },
            )
          }
          if (error instanceof WhopTransportError) {
            return jsonResponse(
              { ok: false, code: 'setup_unavailable', message: 'The card status is unavailable.' },
              { status: 504 },
            )
          }
          return jsonResponse(
            { ok: false, code: 'unexpected_error', message: 'The card status is unavailable.' },
            { status: 500 },
          )
        }
      },

      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonResponse(
            { ok: false, code: 'forbidden', message: 'Request origin is not allowed.' },
            { status: 403 },
          )
        }

        const config = getWhopServerConfig()
        if (!config.apiConfigured) {
          return jsonResponse(
            {
              ok: false,
              code: 'not_configured',
              message: 'Saving a card is not connected yet. Contact the office instead.',
            },
            { status: 503 },
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
            { ok: false, code: 'invalid_input', message: 'Invalid card request.' },
            { status: 400 },
          )
        }

        const confirmationToken = body.value.confirmationToken
        const attemptId = body.value.attemptId
        const projectRef = normalizeProjectRef(body.value.projectRef)

        if (!isConfirmationToken(confirmationToken) || !isDepositAttemptId(attemptId)) {
          return jsonResponse(
            {
              ok: false,
              code: 'invalid_payment_details',
              message: 'The card details are incomplete. Nothing was saved.',
            },
            { status: 400 },
          )
        }

        const returnUrl = buildSaveCardReturnUrl(new URL(request.url).origin)
        if (!returnUrl) {
          return jsonResponse(
            { ok: false, code: 'invalid_return_url', message: 'Card saving cannot start from this address.' },
            { status: 400 },
          )
        }

        try {
          const setup = await createSetupIntent({
            confirmationToken,
            attemptId,
            returnUrl,
            projectRef,
          })

          return jsonResponse({
            ok: true,
            setupIntentId: setup.id,
            status: setup.status,
            clientSecret: setup.clientSecret,
            saved: setup.status === 'succeeded',
            canceled: setup.status === 'canceled' || setup.status === 'failed',
          })
        } catch (error) {
          if (error instanceof WhopNotConfiguredError) {
            return jsonResponse(
              {
                ok: false,
                code: 'not_configured',
                message: 'Saving a card is not connected yet. Contact the office instead.',
              },
              { status: 503 },
            )
          }

          if (error instanceof WhopApiError) {
            console.error('[save-card] Whop setup intent creation failed', {
              status: error.status,
              code: error.code,
            })
            const rejected = error.status >= 400 && error.status < 500 && error.status !== 401
            return jsonResponse(
              {
                ok: false,
                code: rejected ? 'card_rejected' : 'card_unavailable',
                message: rejected
                  ? 'The card could not be saved. Nothing was charged. Check the details and try again.'
                  : 'Saving a card is temporarily unavailable. Nothing was charged.',
              },
              { status: rejected ? 422 : 503 },
            )
          }

          if (error instanceof WhopTransportError) {
            return jsonResponse(
              {
                ok: false,
                code: 'card_unavailable',
                message: 'The card processor could not be reached. Nothing was charged.',
              },
              { status: 504 },
            )
          }

          console.error('[save-card] unexpected setup intent failure')
          return jsonResponse(
            {
              ok: false,
              code: 'unexpected_error',
              message: 'Something went wrong while saving the card. Nothing was charged.',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
