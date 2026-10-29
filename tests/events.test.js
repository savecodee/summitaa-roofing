import { describe, expect, test } from 'bun:test'

import {
  buildClientEventPayload,
  buildEventPageUrl,
  createEventId,
  parseClientEvent,
  pixelEventProperties,
  TRACKING_EVENT_NAMES,
} from '../src/lib/events.ts'

const SESSION_ID = 'sid_1234567890abcdef'
const EVENT_ID = 'evt_service_viewed_12345678'

describe('tracking event allowlist', () => {
  test('exposes exactly the three required events', () => {
    expect([...TRACKING_EVENT_NAMES]).toEqual([
      'estimate_requested',
      'service_viewed',
      'deposit_started',
    ])
  })

  test('accepts service_viewed with a known service only', () => {
    const valid = parseClientEvent({
      event_name: 'service_viewed',
      event_id: EVENT_ID,
      session_id: SESSION_ID,
      service: 'roof-repair',
    })
    expect(valid?.service).toBe('roof-repair')

    expect(
      parseClientEvent({
        event_name: 'service_viewed',
        event_id: EVENT_ID,
        session_id: SESSION_ID,
        service: 'not-a-service',
      }),
    ).toBeNull()
  })

  test('accepts deposit_started only with a valid project reference', () => {
    const valid = parseClientEvent({
      event_name: 'deposit_started',
      event_id: 'evt_deposit_started_12345678',
      session_id: SESSION_ID,
      project_ref: 'SUM-1042',
      plan_id: 'plan_amUMyymLN6UCm',
    })
    expect(valid?.projectRef).toBe('SUM-1042')
    expect(valid?.planId).toBe('plan_amUMyymLN6UCm')

    expect(
      parseClientEvent({
        event_name: 'deposit_started',
        event_id: 'evt_deposit_started_12345678',
        session_id: SESSION_ID,
        project_ref: '../../etc/passwd',
      }),
    ).toBeNull()
  })

  test('never accepts estimate_requested from the browser', () => {
    expect(
      parseClientEvent({
        event_name: 'estimate_requested',
        event_id: EVENT_ID,
        session_id: SESSION_ID,
      }),
    ).toBeNull()
  })

  test('ignores unknown fields so PII cannot be smuggled into analytics', () => {
    const parsed = parseClientEvent({
      event_name: 'service_viewed',
      event_id: EVENT_ID,
      session_id: SESSION_ID,
      service: 'roof-repair',
      name: 'Jordan Miller',
      email: 'jordan@example.com',
      phone: '5550102030',
    })

    expect(parsed).not.toBeNull()
    expect(parsed).not.toHaveProperty('name')
    expect(parsed).not.toHaveProperty('email')
    expect(parsed).not.toHaveProperty('phone')
  })
})

describe('client event payloads', () => {
  test('builds a service_viewed payload with identifiers only', () => {
    const payload = buildClientEventPayload({
      eventName: 'service_viewed',
      eventId: EVENT_ID,
      sessionId: SESSION_ID,
      service: 'roof-inspection',
    })

    expect(payload).toEqual({
      event_name: 'service_viewed',
      event_id: EVENT_ID,
      session_id: SESSION_ID,
      service: 'roof-inspection',
    })
    expect(JSON.stringify(payload)).not.toContain('@')
  })

  test('builds a deposit_started payload without customer or payment data', () => {
    const payload = buildClientEventPayload({
      eventName: 'deposit_started',
      eventId: 'evt_deposit_started_12345678',
      sessionId: SESSION_ID,
      projectRef: 'SUM-1042',
      planId: 'plan_amUMyymLN6UCm',
    })

    expect(payload.project_ref).toBe('SUM-1042')
    expect(payload.plan_id).toBe('plan_amUMyymLN6UCm')
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('email')
    expect(payload).not.toHaveProperty('amount')
  })

  test('pixel properties reuse the same event id and contain no PII', () => {
    const properties = pixelEventProperties({
      event_name: 'service_viewed',
      event_id: EVENT_ID,
      session_id: SESSION_ID,
      service: 'roof-repair',
    })

    expect(properties.event_id).toBe(EVENT_ID)
    expect(properties.service).toBe('roof-repair')
    expect(properties).not.toHaveProperty('session_id')
  })

  test('event ids have the expected shape and differ', () => {
    const first = createEventId('service_viewed')
    const second = createEventId('service_viewed')
    expect(first).toMatch(/^evt_[A-Za-z0-9_-]{8,80}$/)
    expect(second).toMatch(/^evt_[A-Za-z0-9_-]{8,80}$/)
    expect(first).not.toBe(second)
  })
})

describe('event page URLs', () => {
  test('keeps only the same-origin path and drops query strings', () => {
    expect(
      buildEventPageUrl(
        'https://summitaa.example/deposit?project=SUM-1042&email=a%40b.com',
        'https://summitaa.example/api/events',
      ),
    ).toBe('https://summitaa.example/deposit')
  })

  test('drops foreign and malformed referrers', () => {
    expect(
      buildEventPageUrl('https://evil.example/phish?x=1', 'https://summitaa.example/api/events'),
    ).toBe('https://summitaa.example/')

    expect(buildEventPageUrl('not a url', 'not a url')).toBe('/')
  })
})
