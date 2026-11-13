import {
  buildClientEventPayload,
  pixelEventProperties,
  type ClientEventName,
  type ClientEventPayload,
  type ServiceKey,
} from './events'
import { estimateEventId } from './estimate'

/**
 * Best-effort client tracking.
 *
 * The official Whop Pixel receives every event with `whop.track`, so the
 * campaign's three custom events fire in the browser even when the server
 * Events API is unavailable. The server route is also called with the same
 * `event_id`; Whop stores an `event_name` + `event_id` pair once, so the dual
 * transport cannot double count.
 */

export type WhopPixel = {
  setScope?: (...accountIds: string[]) => void
  track?: (name: string, properties?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    whop?: WhopPixel
  }
}

const memoryGuards = new Set<string>()

function readGuard(key: string): boolean {
  if (memoryGuards.has(key)) return true
  if (typeof window === 'undefined') return false

  try {
    return window.sessionStorage.getItem(key) !== null
  } catch {
    return false
  }
}

function writeGuard(key: string): void {
  memoryGuards.add(key)

  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, '1')
  } catch {
    // In-memory guard still prevents duplicates for this page view.
  }
}

function trackWithPixel(
  eventName: string,
  properties: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return

  try {
    window.whop?.track?.(eventName, properties)
  } catch {
    // Analytics must never break the page or the payment flow.
  }
}

async function sendClientEvent(payload: ClientEventPayload): Promise<void> {
  // The Pixel call is synchronous and independent of the API response.
  trackWithPixel(payload.event_name, pixelEventProperties(payload))

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // The Pixel copy above already fired; nothing else to do.
  }
}

function trackOnce(
  guardKey: string,
  eventName: ClientEventName,
  input: { service?: ServiceKey; projectRef?: string; planId?: string },
): void {
  if (typeof window === 'undefined') return

  const storageKey = `summitaa.tracking.${guardKey}`
  if (readGuard(storageKey)) return

  writeGuard(storageKey)

  const payload = buildClientEventPayload({ eventName, ...input })
  void sendClientEvent(payload)
}

export function trackServiceViewed(service: ServiceKey): void {
  trackOnce(`service_viewed.${service}`, 'service_viewed', { service })
}

/**
 * Fires when the visitor starts a deposit payment (the pay button), not when
 * the deposit page is merely visited. The id matches the server-side event the
 * Lead route writes after a successful estimate, so Whop deduplicates it.
 */
export function trackDepositStarted(projectRef: string, planId: string): void {
  trackOnce(`deposit_started.${projectRef}`, 'deposit_started', { projectRef, planId })
}

/**
 * Fires after the server confirms an estimate request was recorded as a lead.
 * The event id is derived from the request id, so the server-side event uses
 * the same id and cannot double count.
 */
export function trackEstimateRequested(requestId: string): void {
  if (typeof window === 'undefined') return

  const storageKey = `summitaa.tracking.estimate_requested.${requestId}`
  if (readGuard(storageKey)) return
  writeGuard(storageKey)

  trackWithPixel('estimate_requested', { event_id: estimateEventId(requestId) })
}

/** Exposed for tests and for resetting dedupe after an explicit user action. */
export function resetTrackingGuards(): void {
  memoryGuards.clear()
}
