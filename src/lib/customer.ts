import { checkoutPlanByKey, isCheckoutPlanKey, type CheckoutPlanKey } from './checkout-plans'
import { isValidEmail, sanitizeText } from './estimate'
import { normalizeProjectRef } from './project'

/**
 * Account-free customer session.
 *
 * The email and plan live in the browser tab only. No account, password, or
 * Whop OAuth session is created. The email is used to prefill the Whop payment
 * form and to ask the server for a Resend confirmation; the plan key is only a
 * public name that the server maps to an allowlisted Whop plan id.
 */

export const CUSTOMER_STORAGE_KEY = 'summitaa.customer.v1'
export const CUSTOMER_EMAIL_MAX_LENGTH = 254
export const CUSTOMER_PROJECT_PREFIX = 'WEB-'

export type CustomerSession = {
  email: string
  planKey: CheckoutPlanKey | null
  projectRef: string | null
  emailSent: boolean
  emailConfigured: boolean
  updatedAt: number
}

const emptySession: CustomerSession = {
  email: '',
  planKey: null,
  projectRef: null,
  emailSent: false,
  emailConfigured: false,
  updatedAt: 0,
}

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

/** A self-serve reference that is not a customer identifier. */
export function makeCustomerProjectRef(): string {
  return `${CUSTOMER_PROJECT_PREFIX}${randomToken().slice(0, 12).toUpperCase()}`
}

export function normalizeCustomerEmail(value: unknown): string | null {
  const email = sanitizeText(value, CUSTOMER_EMAIL_MAX_LENGTH)
  if (!email || !isValidEmail(email)) return null
  return email
}

function normalizeSession(value: unknown): CustomerSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...emptySession }
  }

  const record = value as Record<string, unknown>
  const email = normalizeCustomerEmail(record.email) ?? ''
  const planKey = isCheckoutPlanKey(record.planKey) ? record.planKey : null
  const projectRef = normalizeProjectRef(record.projectRef)

  return {
    email,
    planKey,
    projectRef,
    emailSent: record.emailSent === true,
    emailConfigured: record.emailConfigured === true,
    updatedAt:
      typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : 0,
  }
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function readCustomerSession(storage: Storage | null = browserStorage()): CustomerSession {
  if (!storage) return { ...emptySession }

  try {
    const raw = storage.getItem(CUSTOMER_STORAGE_KEY)
    if (!raw) return { ...emptySession }
    return normalizeSession(JSON.parse(raw))
  } catch {
    return { ...emptySession }
  }
}

export function writeCustomerSession(
  patch: Partial<Omit<CustomerSession, 'updatedAt'>>,
  storage: Storage | null = browserStorage(),
): CustomerSession {
  const current = readCustomerSession(storage)
  const next = normalizeSession({
    ...current,
    ...patch,
    updatedAt: Date.now(),
  })

  if (storage) {
    try {
      storage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // The in-memory return value still lets the current page continue.
    }
  }

  return next
}

export function clearCustomerSession(storage: Storage | null = browserStorage()): void {
  if (!storage) return

  try {
    storage.removeItem(CUSTOMER_STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}

export function ensureCustomerProjectRef(
  storage: Storage | null = browserStorage(),
): string {
  const current = readCustomerSession(storage)
  if (current.projectRef) return current.projectRef

  const projectRef = makeCustomerProjectRef()
  writeCustomerSession({ projectRef }, storage)
  return projectRef
}

export function customerPlanHref(planKey: CheckoutPlanKey, projectRef: string): string {
  const plan = checkoutPlanByKey(planKey)
  const project = normalizeProjectRef(projectRef)

  if (!plan || !project) return '/#pricing'

  const params = new URLSearchParams({ plan: plan.key, project })
  return `/deposit?${params.toString()}`
}
