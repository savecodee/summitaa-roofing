import { serviceOptions, type ServiceValue } from '../config/site'

/**
 * Shared estimate-request validation.
 *
 * This module is imported by both the browser form and the server route, so it
 * must not touch `window`, `process`, or any secret. Contact details are sent to
 * Whop Leads; they are deliberately never included in tracking events.
 */

export type EstimateValues = {
  name: string
  email: string
  phone: string
  zip: string
  service: ServiceValue
  details: string
}

export type EstimateField = keyof EstimateValues
export type EstimateErrors = Partial<Record<EstimateField, string>>

export type EstimateSubmission = {
  values: EstimateValues
  requestId: string
  startedAt: number
  sourcePath: string
}

export type EstimateSubmissionResult =
  | { ok: true; submission: EstimateSubmission }
  | {
      ok: false
      code: 'invalid_input' | 'invalid_request'
      message: string
      errors?: EstimateErrors
    }

export const ESTIMATE_FIELD_LABELS: Record<EstimateField, string> = {
  name: 'Full name',
  email: 'Email address',
  phone: 'Phone number',
  zip: 'Property ZIP code',
  service: 'Service needed',
  details: 'Project details',
}

export const ESTIMATE_LIMITS = {
  name: 120,
  email: 254,
  phoneDigits: 15,
  zip: 10,
  details: 1500,
  sourcePath: 200,
  minimumFillMs: 2500,
  staleFormMs: 12 * 60 * 60 * 1000,
} as const

const SERVICE_VALUES = new Set<string>(serviceOptions.map((option) => option.value))
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/
const REQUEST_ID_PATTERN = /^est_[A-Za-z0-9_-]{8,80}$/
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

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

export function makeEstimateRequestId(): string {
  return `est_${randomToken()}`
}

export function estimateEventId(requestId: string): string {
  return `evt_${requestId}`.slice(0, 80)
}

export function isEstimateRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
}

export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(CONTROL_CHARACTERS, '').trim().slice(0, maxLength)
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

export function sanitizeDetails(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\r\n/g, '\n')
    .replace(CONTROL_CHARACTERS, '')
    .trim()
    .slice(0, ESTIMATE_LIMITS.details)
}

export function sanitizeSourcePath(value: unknown): string {
  if (typeof value !== 'string') return '/'

  const trimmed = value.split('#')[0]?.split('?')[0] ?? '/'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/'

  const cleaned = trimmed.replace(CONTROL_CHARACTERS, '').slice(0, ESTIMATE_LIMITS.sourcePath)
  return cleaned || '/'
}

export function normalizeEstimateValues(
  raw: Partial<Record<EstimateField, unknown>>,
): EstimateValues {
  const service =
    typeof raw.service === 'string' && SERVICE_VALUES.has(raw.service)
      ? (raw.service as ServiceValue)
      : ''

  return {
    name: sanitizeText(raw.name, ESTIMATE_LIMITS.name),
    email: sanitizeText(raw.email, ESTIMATE_LIMITS.email),
    phone: sanitizeText(raw.phone, 40),
    zip: sanitizeText(raw.zip, ESTIMATE_LIMITS.zip),
    service,
    details: sanitizeDetails(raw.details),
  }
}

export function validateEstimateField(
  field: EstimateField,
  values: EstimateValues,
): string | undefined {
  switch (field) {
    case 'name':
      return values.name.trim().length >= 2 ? undefined : 'Enter your full name.'
    case 'email':
      return isValidEmail(values.email) ? undefined : 'Enter a valid email address.'
    case 'phone': {
      const digits = values.phone.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= ESTIMATE_LIMITS.phoneDigits
        ? undefined
        : 'Enter a phone number with at least 10 digits.'
    }
    case 'zip':
      return ZIP_PATTERN.test(values.zip.trim())
        ? undefined
        : 'Enter a 5-digit ZIP code or ZIP+4.'
    case 'service':
      return SERVICE_VALUES.has(values.service)
        ? undefined
        : "Choose the service you're interested in."
    case 'details':
      return undefined
    default:
      return undefined
  }
}

export function validateEstimate(values: EstimateValues): EstimateErrors {
  const errors: EstimateErrors = {}

  for (const field of Object.keys(ESTIMATE_FIELD_LABELS) as EstimateField[]) {
    const message = validateEstimateField(field, values)
    if (message) errors[field] = message
  }

  return errors
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Server-side parse. Unknown keys are ignored so contact details cannot be
 * smuggled into a tracking payload through this function.
 */
export function parseEstimateSubmission(raw: unknown): EstimateSubmissionResult {
  if (!isRecord(raw)) {
    return { ok: false, code: 'invalid_input', message: 'Invalid request body.' }
  }

  const values = normalizeEstimateValues(raw)
  const errors = validateEstimate(values)

  if (Object.values(errors).some(Boolean)) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'Please check the highlighted fields.',
      errors,
    }
  }

  const requestId = raw.requestId
  if (!isEstimateRequestId(requestId)) {
    return { ok: false, code: 'invalid_request', message: 'Missing request reference.' }
  }

  const startedAt = typeof raw.startedAt === 'number' ? raw.startedAt : Number(raw.startedAt)
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return { ok: false, code: 'invalid_request', message: 'Missing form timing.' }
  }

  return {
    ok: true,
    submission: {
      values,
      requestId,
      startedAt,
      sourcePath: sanitizeSourcePath(raw.sourcePath),
    },
  }
}

/**
 * A filled honeypot or an instant submit indicates automated traffic. The
 * caller should return a neutral success without creating anything.
 */
export function isLikelyAutomated(
  company: unknown,
  startedAt: number,
  now: number = Date.now(),
): boolean {
  return hasHoneypotValue(company) || wasSubmittedTooFast(startedAt, now)
}

export function hasHoneypotValue(company: unknown): boolean {
  return typeof company === 'string' && company.trim().length > 0
}

export function wasSubmittedTooFast(
  startedAt: number,
  now: number = Date.now(),
): boolean {
  const elapsed = now - startedAt
  return !Number.isFinite(elapsed) || elapsed < ESTIMATE_LIMITS.minimumFillMs
}

/**
 * A form left open for more than half a day needs a refresh. Unlike the
 * honeypot, this is a real-visitor case: returning a fake success would tell
 * someone their request was recorded when it was not.
 */
export function isStaleEstimate(
  startedAt: number,
  now: number = Date.now(),
): boolean {
  const elapsed = now - startedAt
  return !Number.isFinite(elapsed) || elapsed < 0 || elapsed > ESTIMATE_LIMITS.staleFormMs
}

/**
 * Whop Leads has no native name/email/phone fields: contact details live in
 * metadata. This is the only place those details are assembled, and this object
 * is never forwarded to the events API or the browser.
 */
export function buildLeadMetadata(
  values: EstimateValues,
  requestId: string,
  submittedAt: string = new Date().toISOString(),
): Record<string, string> {
  return {
    source: 'summitaa_roofing_estimate',
    request_id: requestId,
    name: values.name,
    email: values.email,
    phone: values.phone,
    zip: values.zip,
    service: values.service,
    details: values.details,
    submitted_at: submittedAt,
  }
}
