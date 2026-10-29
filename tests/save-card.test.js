import { describe, expect, test } from 'bun:test'

import {
  buildSaveCardReturnUrl,
  isSetupIntentId,
  normalizeSetupIntentStatus,
  SETUP_INTENT_ID_PATTERN,
} from '../src/lib/save-card.ts'

describe('setup intent identifiers', () => {
  test('accepts Whop setup intent ids and rejects other identifiers', () => {
    expect(isSetupIntentId('sint_abc12345')).toBe(true)
    expect(isSetupIntentId('sint_short')).toBe(false)
    expect(isSetupIntentId('pay_abc12345')).toBe(false)
    expect(isSetupIntentId('ctok_12345678')).toBe(false)
    expect(isSetupIntentId(null)).toBe(false)
    expect(isSetupIntentId('sint_abc12345 ')).toBe(false)
  })

  test('the public pattern is anchored and bounded', () => {
    expect(SETUP_INTENT_ID_PATTERN.test('sint_' + 'a'.repeat(120))).toBe(true)
    expect(SETUP_INTENT_ID_PATTERN.test('sint_' + 'a'.repeat(121))).toBe(false)
  })

  test('normalizes setup statuses without inventing success', () => {
    expect(normalizeSetupIntentStatus('SUCCEEDED')).toBe('succeeded')
    expect(normalizeSetupIntentStatus('requires_action')).toBe('requires_action')
    expect(normalizeSetupIntentStatus('canceled')).toBe('canceled')
    expect(normalizeSetupIntentStatus('complete')).toBe('unknown')
    expect(normalizeSetupIntentStatus(undefined)).toBe('unknown')
  })
})

describe('save-card return URL', () => {
  test('builds an absolute https URL with no customer data', () => {
    const url = buildSaveCardReturnUrl('https://summitaa.example')
    expect(url).toBe('https://summitaa.example/deposit/save-card')
    expect(url).not.toContain('@')
    expect(url).not.toContain('payt_')
    expect(url).not.toContain('token')
  })

  test('allows http only for local development hosts', () => {
    expect(buildSaveCardReturnUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/deposit/save-card',
    )
    expect(buildSaveCardReturnUrl('http://127.0.0.1:3000')).toBe(
      'http://127.0.0.1:3000/deposit/save-card',
    )
    expect(buildSaveCardReturnUrl('http://summitaa.example')).toBeNull()
  })

  test('rejects non-http schemes and malformed origins', () => {
    expect(buildSaveCardReturnUrl('javascript:alert(1)')).toBeNull()
    expect(buildSaveCardReturnUrl('not a url')).toBeNull()
  })
})
