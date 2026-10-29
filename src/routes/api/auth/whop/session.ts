import { createFileRoute } from '@tanstack/react-router'

import { isSameOriginRequest, jsonResponse } from '../../../../server/http'
import {
  clearSessionCookie,
  readWhopIdentity,
} from '../../../../server/whop/oauth'

export const Route = createFileRoute('/api/auth/whop/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const identity = await readWhopIdentity(request)
        return jsonResponse(
          identity
            ? { signedIn: true, name: identity.name, email: identity.email }
            : { signedIn: false },
          { headers: { 'Cache-Control': 'no-store' } },
        )
      },

      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonResponse(
            { ok: false, code: 'forbidden', message: 'Request origin is not allowed.' },
            { status: 403 },
          )
        }

        return jsonResponse(
          { ok: true },
          { headers: { 'Set-Cookie': clearSessionCookie(request), 'Cache-Control': 'no-store' } },
        )
      },
    },
  },
})
