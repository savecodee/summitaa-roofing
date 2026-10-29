import { createFileRoute } from '@tanstack/react-router'

import { whopPublicConfig } from '../../../config/whop'
import { publicDepositConfig } from '../../../lib/deposit'
import { jsonResponse } from '../../../server/http'
import { depositConfigurationIssues, getWhopServerConfig } from '../../../server/whop/config'

/**
 * Public, non-secret deposit configuration.
 *
 * The client needs the public account ID, the paid plan ID, and the amount to
 * mount Whop Elements. Secret values and environment variable values are never
 * included; only the names of missing variables appear in `issues`.
 */
export const Route = createFileRoute('/api/whop/deposit-config')({
  server: {
    handlers: {
      GET: async () => {
        const config = getWhopServerConfig()
        const issues = depositConfigurationIssues(config)

        return jsonResponse(
          publicDepositConfig({
            accountId: whopPublicConfig.accountId,
            planId: config.depositPlanId,
            amountCents: config.depositAmountCents,
            currency: config.depositCurrency,
            issues,
          }),
        )
      },
    },
  },
})
