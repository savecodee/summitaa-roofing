import { createFileRoute } from '@tanstack/react-router'

import {
  createOAuthTransaction,
  safeReturnTo,
} from '../../../../server/whop/oauth'

/**
 * Starts "Sign in with Whop" using OAuth 2.1 + PKCE. The app is a public OAuth
 * client, so no client secret is stored in this repository or on the server.
 */
export const Route = createFileRoute('/api/auth/whop/start')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const returnTo = safeReturnTo(url.searchParams.get('returnTo'))

        try {
          const { cookie, location } = await createOAuthTransaction(request, returnTo)
          return new Response(null, {
            status: 302,
            headers: {
              Location: location,
              'Set-Cookie': cookie,
              'Cache-Control': 'no-store',
            },
          })
        } catch {
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${url.origin}/?auth=unavailable#estimate`,
              'Cache-Control': 'no-store',
            },
          })
        }
      },
    },
  },
})
