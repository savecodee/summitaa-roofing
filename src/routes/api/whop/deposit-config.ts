import { createFileRoute } from '@tanstack/react-router'

import { whopPublicConfig } from '../../../config/whop'
import { checkoutPlanByKey } from '../../../lib/checkout-plans'
import { publicDepositConfig } from '../../../lib/deposit'
import { jsonResponse } from '../../../server/http'
import {
  depositConfigurationIssues,
  getWhopServerConfig,
  planConfigurationIssues,
} from '../../../server/whop/config'

/**
 * Public, non-secret checkout configuration.
 *
 * With `?plan=<key>` the server resolves one of the three allowlisted public
 * plans. Without it, the legacy proposal deposit configured by environment
 * variables is returned. Secret values and environment variable values are
 * never included; only the names of missing variables appear in `issues`.
 */
export const Route = createFileRoute('/api/whop/deposit-config')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const requestedPlan = url.searchParams.get('plan')
        const plan = requestedPlan ? checkoutPlanByKey(requestedPlan) : null

        if (requestedPlan && !plan) {
          return jsonResponse(
            {
              ok: false,
              code: 'invalid_plan',
              message: 'That plan is not available for online checkout.',
            },
            { status: 400 },
          )
        }

        const config = getWhopServerConfig()
        const issues = plan
          ? planConfigurationIssues(config)
          : depositConfigurationIssues(config)

        return jsonResponse(
          publicDepositConfig({
            accountId: whopPublicConfig.accountId,
            planId: plan?.planId ?? config.depositPlanId,
            planKey: plan?.key ?? null,
            planName: plan?.name ?? null,
            amountCents: plan?.amountCents ?? config.depositAmountCents,
            currency: plan?.currency ?? config.depositCurrency,
            issues,
          }),
        )
      },
    },
  },
})
