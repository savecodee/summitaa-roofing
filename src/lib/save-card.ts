import { normalizePaymentStatus, type NormalizedPaymentStatus } from './deposit'

/**
 * Card-on-file helpers.
 *
 * The card is collected by Whop Elements in setup mode. The browser only ever
 * sees a short-lived confirmation token and the setup intent's client secret;
 * the card number stays inside Whop's PCI-isolated fields.
 */

export const SETUP_INTENT_ID_PATTERN = /^sint_[A-Za-z0-9]{6,120}$/

export function isSetupIntentId(value: unknown): value is string {
  return typeof value === 'string' && SETUP_INTENT_ID_PATTERN.test(value)
}

export type SetupIntentStatus = NormalizedPaymentStatus

export function normalizeSetupIntentStatus(value: unknown): SetupIntentStatus {
  return normalizePaymentStatus(value)
}

/**
 * Absolute return URL for the save-card page. Only https (or localhost during
 * development) is accepted, and the URL carries no customer data.
 */
export function buildSaveCardReturnUrl(baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl)
    const isLocal =
      base.protocol === 'http:' &&
      (base.hostname === 'localhost' || base.hostname === '127.0.0.1')

    if (base.protocol !== 'https:' && !isLocal) return null
    return new URL('/deposit/save-card', base.origin).toString()
  } catch {
    return null
  }
}
