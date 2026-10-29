import { createFileRoute } from '@tanstack/react-router'

import { buildEventPageUrl, parseClientEvent } from '../../lib/events'
import { isSameOriginRequest, jsonResponse, readJsonBody } from '../../server/http'
import { getWhopServerConfig } from '../../server/whop/config'
import { createWhopEvent } from '../../server/whop/events'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonResponse(
            { ok: false, code: 'forbidden', message: 'Request origin is not allowed.' },
            { status: 403 },
          )
        }

        const body = await readJsonBody(request, 4_000)
        if (!body.ok) {
          return jsonResponse(
            { ok: false, code: body.code, message: body.message },
            { status: body.status },
          )
        }

        const event = parseClientEvent(body.value)
        if (!event) {
          return jsonResponse(
            { ok: false, code: 'invalid_event', message: 'Event is not allowed.' },
            { status: 400 },
          )
        }

        const config = getWhopServerConfig()
        if (!config.apiConfigured) {
          // The browser falls back to the Whop Pixel with the same event_id.
          return jsonResponse(
            { ok: true, forwarded: false, reason: 'not_configured' },
            { status: 202 },
          )
        }

        try {
          const pageUrl = buildEventPageUrl(request.headers.get('referer'), request.url)
          await createWhopEvent({
            eventName: event.eventName,
            eventId: event.eventId,
            sessionId: event.sessionId,
            planId: event.planId,
            pageUrl,
          })

          return jsonResponse({ ok: true, forwarded: true })
        } catch {
          return jsonResponse(
            { ok: true, forwarded: false, reason: 'upstream_error' },
            { status: 202 },
          )
        }
      },
    },
  },
})
