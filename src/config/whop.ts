/**
 * Public Whop identifiers.
 *
 * These values are safe to ship to the browser: they are the account, app, and
 * product identifiers the Whop Pixel and Elements use. They are NOT secrets.
 *
 * Never add an API key, webhook secret, admin token, or customer data here.
 * Server-only values are read from runtime environment bindings in
 * `src/server/whop/config.ts`.
 */
export const whopPublicConfig = {
  appId: 'app_wZYnrCcqbNft8J',
  accountId: 'biz_wHs7ScZ5eHIZrH',
  productId: 'prod_UxTHDvkWPVf68',
  /** Public production origin of the Whop-hosted site (not a secret). */
  baseUrl: 'https://summitaa.whop.site',
  /**
   * Paid plans created in the Whop dashboard for this account. Plan IDs are
   * public checkout identifiers, not secrets. Keep them here so the marketing
   * page and checkout always advertise the same prices.
   */
  plans: {
    inspection: 'plan_3T6dfuJFNyOLG',
    deposit: 'plan_NlxIPUOrmzS6E',
    repair: 'plan_EFVJjO467EmuD',
  },
} as const
