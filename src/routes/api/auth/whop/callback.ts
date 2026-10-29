import { createFileRoute } from '@tanstack/react-router'

import {
  clearOAuthCookie,
  createSessionCookie,
  exchangeCodeForIdentity,
  readOAuthTransaction,
  requestOrigin,
} from '../../../../server/whop/oauth'

/**
 * OAuth callback. Exchanges the authorization code with PKCE, resolves the
 * signed-in Whop user, stores their user id in a signed HttpOnly cookie, and
 * returns the visitor to the estimate form. No token is stored in the browser.
 */
export const Route = createFileRoute('/api/auth/whop/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const origin = requestOrigin(request)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')

        const transaction = await readOAuthTransaction(request)
        if (!transaction || !code || !state || state !== transaction.state) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${origin}/?auth=error&reason=state#estimate`,
              'Set-Cookie': clearOAuthCookie(request),
              'Cache-Control': 'no-store',
            },
          })
        }

        const identity = await exchangeCodeForIdentity(
          request,
          code,
          transaction.verifier,
          transaction.nonce,
        )
        if (!identity) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${origin}/?auth=error&reason=exchange#estimate`,
              'Set-Cookie': clearOAuthCookie(request),
              'Cache-Control': 'no-store',
            },
          })
        }

        const session = await createSessionCookie(request, identity)
        const headers = new Headers({
          Location: `${origin}${transaction.returnTo}`,
          'Cache-Control': 'no-store',
        })
        headers.append('Set-Cookie', session)
        headers.append('Set-Cookie', clearOAuthCookie(request))

        return new Response(null, { status: 302, headers })
      },
    },
  },
})
