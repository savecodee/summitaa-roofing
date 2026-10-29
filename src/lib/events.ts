import { serviceOptions } from '../config/site'
import { normalizeProjectRef } from './project'

/**
 * Tracking event names and payload builders.
 *
 * Product requirement: `estimate_requested`, `service_viewed`, and
 * `deposit_started` are the only events this site sends, they carry no names,
 * emails, phone numbers, addresses, or payment data, and each one has a stable
 * `event_id` so retries are deduplicated by Whop.
 */

export const TRACKING_EVENT_NAMES = [
  'estimate_requested',
  'service_viewed',
  'deposit_started',
] as const

export type TrackingEventName = (typeof TRACKING_EVENT_NAMES)[number]

export const CLIENT_EVENT_NAMES = ['service_viewed', 'deposit_started'] as const
export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number]

export type ServiceKey = (typeof serviceOptions)[number]['value']

export type ClientEventPayload = {
  event_name: ClientEventName
  event_id: string
  session_id: string
  service?: ServiceKey
  project_ref?: string
  plan_id?: string
}

export type ParsedClientEvent = {
  eventName: ClientEventName
  eventId: string
  sessionId: string
  service?: ServiceKey
  projectRef?: string
  planId?: string
}

export const EVENT_ID_PATTERN = /^evt_[A-Za-z0-9_-]{8,80}$/
export const SESSION_ID_PATTERN = /^sid_[A-Za-z0-9_-]{8,80}$/
export const PLAN_ID_PATTERN = /^plan_[A-Za-z0-9]{6,80}$/

const SERVICE_VALUES = new Set<string>(serviceOptions.map((option) => option.value))
const CLIENT_EVENT_SET = new Set<string>(CLIENT_EVENT_NAMES)

function randomToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export function createEventId(eventName: TrackingEventName): string {
  return `evt_${eventName}_${randomToken()}`.slice(0, 80)
}

export function createSessionId(): string {
  return `sid_${randomToken()}`
}

const SESSION_STORAGE_KEY = 'summitaa.tracking.session'

/**
 * Session-scoped anonymous identifier. It is not derived from the visitor's
 * name, email, phone, IP address, or device fingerprint. Falls back to a
 * throwaway value when storage is blocked, which only weakens deduplication.
 */
export function getTrackingSessionId(): string {
  if (typeof window === 'undefined') return createSessionId()

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing && SESSION_ID_PATTERN.test(existing)) return existing

    const created = createSessionId()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created)
    return created
  } catch {
    return createSessionId()
  }
}

/**
 * Builds the exact object posted to `/api/events`. No caller-supplied extra
 * keys are spread in, so contact details cannot leak into analytics.
 */
export function buildClientEventPayload(input: {
  eventName: ClientEventName
  eventId?: string
  sessionId?: string
  service?: ServiceKey
  projectRef?: string
  planId?: string
}): ClientEventPayload {
  const payload: ClientEventPayload = {
    event_name: input.eventName,
    event_id: input.eventId ?? createEventId(input.eventName),
    session_id: input.sessionId ?? getTrackingSessionId(),
  }

  if (input.eventName === 'service_viewed' && input.service) {
    payload.service = input.service
  }

  if (input.eventName === 'deposit_started') {
    const project = normalizeProjectRef(input.projectRef)
    if (project) payload.project_ref = project
    if (input.planId && PLAN_ID_PATTERN.test(input.planId)) payload.plan_id = input.planId
  }

  return payload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Allowlist-only parser used by the public events endpoint. It ignores every
 * unknown field, so a crafted body cannot smuggle PII into the Whop Events API.
 */
export function parseClientEvent(raw: unknown): ParsedClientEvent | null {
  if (!isRecord(raw)) return null

  const eventName = raw.event_name
  const eventId = raw.event_id
  const sessionId = raw.session_id

  if (typeof eventName !== 'string' || !CLIENT_EVENT_SET.has(eventName)) return null
  if (typeof eventId !== 'string' || !EVENT_ID_PATTERN.test(eventId)) return null
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) return null

  const parsed: ParsedClientEvent = {
    eventName: eventName as ClientEventName,
    eventId,
    sessionId,
  }

  if (eventName === 'service_viewed') {
    if (typeof raw.service !== 'string' || !SERVICE_VALUES.has(raw.service)) return null
    parsed.service = raw.service as ServiceKey
    return parsed
  }

  const projectRef = normalizeProjectRef(raw.project_ref)
  if (!projectRef) return null

  parsed.projectRef = projectRef

  if (raw.plan_id !== undefined && raw.plan_id !== null) {
    if (typeof raw.plan_id !== 'string' || !PLAN_ID_PATTERN.test(raw.plan_id)) return null
    parsed.planId = raw.plan_id
  }

  return parsed
}

/**
 * The Whop Events API accepts a page URL. Only the same-origin path is kept:
 * query strings and fragments are dropped so no form values or tokens travel
 * with an event.
 */
export function buildEventPageUrl(referrer: string | null, requestUrl: string): string {
  let origin: string
  let fallbackPath = '/'

  try {
    const request = new URL(requestUrl)
    origin = request.origin
    fallbackPath = request.pathname || '/'
  } catch {
    return '/'
  }

  if (!referrer) return `${origin}${fallbackPath}`

  try {
    const parsed = new URL(referrer)
    if (parsed.origin !== origin) return `${origin}/`

    const path = parsed.pathname.slice(0, 200) || '/'
    return `${origin}${path}`
  } catch {
    return `${origin}/`
  }
}

/** Properties attached to the browser Pixel copy of an event. */
export function pixelEventProperties(payload: ClientEventPayload): Record<string, string> {
  const properties: Record<string, string> = { event_id: payload.event_id }

  if (payload.service) properties.service = payload.service
  if (payload.project_ref) properties.project_ref = payload.project_ref
  if (payload.plan_id) properties.plan_id = payload.plan_id

  return properties
}
