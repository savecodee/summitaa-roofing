import { describe, expect, test } from 'bun:test'

import {
  CUSTOMER_STORAGE_KEY,
  clearCustomerSession,
  customerPlanHref,
  ensureCustomerProjectRef,
  makeCustomerProjectRef,
  normalizeCustomerEmail,
  readCustomerSession,
  writeCustomerSession,
} from '../src/lib/customer.ts'
import { PROJECT_REF_PATTERN } from '../src/lib/project.ts'

class MemoryStorage {
  constructor() {
    this.values = new Map()
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

describe('account-free customer session', () => {
  test('validates and trims the email without creating an account', () => {
    expect(normalizeCustomerEmail('  Customer@Example.com ')).toBe('Customer@Example.com')
    expect(normalizeCustomerEmail('customer@example.com')).toBe('customer@example.com')
    expect(normalizeCustomerEmail('not-an-email')).toBeNull()
    expect(normalizeCustomerEmail('')).toBeNull()
    expect(normalizeCustomerEmail(null)).toBeNull()
    expect(normalizeCustomerEmail(42)).toBeNull()
  })

  test('creates a public project reference, not a customer identifier', () => {
    const ref = makeCustomerProjectRef()
    expect(ref.startsWith('WEB-')).toBe(true)
    expect(ref).toMatch(PROJECT_REF_PATTERN)
    expect(ref).not.toContain('@')
  })

  test('persists email, plan, and project reference in one tab', () => {
    const storage = new MemoryStorage()
    const ref = makeCustomerProjectRef()

    writeCustomerSession(
      {
        email: 'customer@example.com',
        planKey: 'inspection',
        projectRef: ref,
        emailSent: true,
        emailConfigured: true,
      },
      storage,
    )

    expect(readCustomerSession(storage)).toMatchObject({
      email: 'customer@example.com',
      planKey: 'inspection',
      projectRef: ref,
      emailSent: true,
      emailConfigured: true,
    })
    expect(storage.getItem(CUSTOMER_STORAGE_KEY)).toContain('customer@example.com')
  })

  test('a later plan selection does not lose the saved email', () => {
    const storage = new MemoryStorage()
    writeCustomerSession({ email: 'customer@example.com' }, storage)
    writeCustomerSession({ planKey: 'repair' }, storage)

    expect(readCustomerSession(storage)).toMatchObject({
      email: 'customer@example.com',
      planKey: 'repair',
    })
  })

  test('ignores malformed stored values instead of throwing', () => {
    const storage = new MemoryStorage()
    storage.setItem(CUSTOMER_STORAGE_KEY, '{not json')
    expect(readCustomerSession(storage)).toMatchObject({ email: '', planKey: null })

    storage.setItem(
      CUSTOMER_STORAGE_KEY,
      JSON.stringify({ email: 'bad', planKey: 'unknown', projectRef: '../etc/passwd' }),
    )
    expect(readCustomerSession(storage)).toMatchObject({
      email: '',
      planKey: null,
      projectRef: null,
    })
  })

  test('keeps the same project reference for the visit', () => {
    const storage = new MemoryStorage()
    const first = ensureCustomerProjectRef(storage)
    const second = ensureCustomerProjectRef(storage)

    expect(first).toBe(second)
    expect(readCustomerSession(storage).projectRef).toBe(first)
  })

  test('builds a plan-aware checkout link with the project reference', () => {
    const ref = makeCustomerProjectRef()
    expect(customerPlanHref('deposit', ref)).toBe(`/deposit?plan=deposit&project=${ref}`)
    expect(customerPlanHref('inspection', 'bad ref')).toBe('/#pricing')
    expect(customerPlanHref('unknown', ref)).toBe('/#pricing')
  })

  test('clears the tab session on request', () => {
    const storage = new MemoryStorage()
    writeCustomerSession({ email: 'customer@example.com', planKey: 'inspection' }, storage)
    clearCustomerSession(storage)

    expect(readCustomerSession(storage)).toMatchObject({ email: '', planKey: null })
    expect(storage.getItem(CUSTOMER_STORAGE_KEY)).toBeNull()
  })
})
