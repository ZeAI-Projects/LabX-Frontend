import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENT_STORAGE_KEY, MOCK_EVENTS, REPORT_REASONS, createEventStore, getRegistrationAvailability, selectEvents } from '../src/features/events/services/mock_events.js'

const OCTOBER_14 = Date.parse('2026-10-14T12:00:00+05:30')
const founder = { id: 'founder-events-test', role: 'founder' }
const mentor = { id: 'mentor-events-test', role: 'mentor' }
const byId = (id) => MOCK_EVENTS.find((event) => event.id === id)
function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
}

test('registrations and reminders persist across reloads and remain separate for each account', () => {
  const storage = memoryStorage()
  const store = createEventStore({ storage, now: () => OCTOBER_14 })
  store.register(founder, 'customer-workshop')
  store.setReminder(founder, 'customer-workshop', true)
  const reloaded = createEventStore({ storage, now: () => OCTOBER_14 })
  assert.equal(reloaded.read(founder).registrations['customer-workshop'].reminder, true)
  assert.deepEqual(reloaded.read(mentor).registrations, {})
  reloaded.register(mentor, 'mentor-circle')
  assert.equal(reloaded.read(founder).registrations['mentor-circle'], undefined)
})

test('duplicate registration is idempotent and keeps the original reminder and timestamp', () => {
  let now = OCTOBER_14
  const store = createEventStore({ storage: memoryStorage(), now: () => now })
  store.register(founder, 'prototype-hackathon')
  const original = store.setReminder(founder, 'prototype-hackathon', true)
  now += 300000
  assert.deepEqual(store.register(founder, 'prototype-hackathon'), original)
  assert.equal(Object.keys(store.read(founder).registrations).length, 1)
})

test('both UI availability and registration action reject past, closed, full and ineligible listings', () => {
  const store = createEventStore({ storage: memoryStorage(), now: () => OCTOBER_14 })
  const rejected = [
    [founder, 'past-pitch-workshop', 'Event ended'],
    [founder, 'showcase-closed', 'Registration closed'],
    [founder, 'climate-sprint', 'Fully booked'],
    [founder, 'mentor-circle', 'Not eligible'],
    [mentor, 'impact-grant', 'Not eligible'],
    [founder, 'community-transmission', 'Information only'],
  ]
  for (const [user, id, label] of rejected) {
    assert.deepEqual(getRegistrationAvailability(byId(id), user, null, OCTOBER_14), { allowed: false, label })
    assert.throws(() => store.register(user, id), (error) => error.message === label)
  }
  assert.deepEqual(store.read(founder).registrations, {})
})

test('confirmation rechecks the clock when a deadline expires while details are open', () => {
  const event = byId('customer-workshop')
  let now = Date.parse(event.deadline) - 1
  const store = createEventStore({ storage: memoryStorage(), now: () => now })
  assert.equal(getRegistrationAvailability(event, founder, null, now).allowed, true)
  now += 1
  assert.throws(() => store.register(founder, event.id), /Registration closed/)
  assert.equal(store.read(founder).registrations[event.id], undefined)
})

test('search, category, format, broadcast and date sort work together', () => {
  const result = selectEvents(MOCK_EVENTS, { query: ' customer ', category: 'Workshop', format: 'Online', broadcast: 'event' }, {}, OCTOBER_14)
  assert.deepEqual(result.map((event) => event.id), ['customer-workshop'])
  assert.equal(selectEvents(MOCK_EVENTS, { query: 'unlikely unmatched text' }, {}, OCTOBER_14).length, 0)
  const descending = selectEvents(MOCK_EVENTS, { sort: 'latest' }, {}, OCTOBER_14)
  assert.ok(descending.every((event, index) => index === 0 || Date.parse(descending[index - 1].startsAt) >= Date.parse(event.startsAt)))
  assert.deepEqual(selectEvents(MOCK_EVENTS, { broadcast: 'announcement' }, {}, OCTOBER_14).map((event) => event.id), ['community-transmission'])
  assert.deepEqual(selectEvents(MOCK_EVENTS, { view: 'past' }, {}, OCTOBER_14).map((event) => event.id), ['past-pitch-workshop'])
})

test('My Events retains both upcoming and past registrations as dates pass', () => {
  let now = OCTOBER_14
  const store = createEventStore({ storage: memoryStorage(), now: () => now })
  store.register(founder, 'customer-workshop')
  store.register(founder, 'residency-opportunity')
  now = Date.parse('2026-10-19T09:00:00+05:30')
  const registrations = store.read(founder).registrations
  assert.deepEqual(selectEvents(MOCK_EVENTS, { view: 'my' }, registrations, now).map((event) => event.id), ['customer-workshop', 'residency-opportunity'])
  assert.deepEqual(selectEvents(MOCK_EVENTS, { view: 'my', myPeriod: 'past' }, registrations, now).map((event) => event.id), ['customer-workshop'])
  assert.deepEqual(selectEvents(MOCK_EVENTS, { view: 'my', myPeriod: 'upcoming' }, registrations, now).map((event) => event.id), ['residency-opportunity'])
  assert.throws(() => store.setReminder(founder, 'customer-workshop', true), /event has ended/)
})

test('reminders require registration and invalid event IDs cannot be saved', () => {
  const store = createEventStore({ storage: memoryStorage(), now: () => OCTOBER_14 })
  assert.throws(() => store.setReminder(founder, 'customer-workshop', true), /Register before/)
  assert.throws(() => store.register(founder, 'unknown'), /unavailable/)
  assert.throws(() => store.register(null, 'customer-workshop'), /Log in/)
})

test('listing reports validate their reason and remain scoped to the reporting account', () => {
  const storage = memoryStorage()
  const store = createEventStore({ storage, now: () => OCTOBER_14 })
  assert.throws(() => store.report(founder, 'customer-workshop', ''), /Select a reason/)
  const report = store.report(founder, 'customer-workshop', REPORT_REASONS[0], '  Incorrect schedule  ')
  assert.equal(report.notes, 'Incorrect schedule')
  assert.deepEqual(createEventStore({ storage }).read(founder).reports['customer-workshop'], report)
  assert.deepEqual(store.read(mentor).reports, {})
  assert.throws(() => store.report(founder, 'customer-workshop', REPORT_REASONS[0], 'a'.repeat(501)), /500 characters/)
})

test('corrupt saved data is ignored without losing valid past registrations or reports', () => {
  const storage = memoryStorage()
  const key = `${EVENT_STORAGE_KEY}:${encodeURIComponent(founder.id)}`
  const store = createEventStore({ storage, now: () => OCTOBER_14 })
  const validRegistration = { eventId: 'customer-workshop', registeredAt: new Date(OCTOBER_14).toISOString(), status: 'registered', reminder: false }
  const pastRegistration = { ...validRegistration, eventId: 'past-pitch-workshop', registeredAt: '2026-10-05T09:00:00.000Z', reminder: true }
  const validReport = { reason: REPORT_REASONS[0], notes: 'Incorrect schedule', reportedAt: new Date(OCTOBER_14).toISOString() }
  const invalidRegistrations = [
    { ...validRegistration, registeredAt: 'not-a-date' },
    { ...validRegistration, registeredAt: '2026-99-14T09:00:00.000Z' },
    { ...validRegistration, registeredAt: 0 },
    { ...validRegistration, registeredAt: '2026-10-14' },
    { ...validRegistration, eventId: 'prototype-hackathon' },
    { ...validRegistration, reminder: 'true' },
    { ...validRegistration, status: 'pending' },
    'registered', [], null,
  ]
  for (const record of invalidRegistrations) {
    storage.setItem(key, JSON.stringify({
      registrations: {
        'customer-workshop': record,
        'past-pitch-workshop': pastRegistration,
        unknown: { ...validRegistration, eventId: 'unknown' },
        'community-transmission': { ...validRegistration, eventId: 'community-transmission' },
      },
      reports: { 'past-pitch-workshop': validReport },
    }))
    const saved = store.read(founder)
    assert.deepEqual(saved.registrations, { 'past-pitch-workshop': pastRegistration })
    assert.deepEqual(saved.reports, { 'past-pitch-workshop': validReport })
    assert.equal(selectEvents(MOCK_EVENTS, { view: 'my' }, saved.registrations, OCTOBER_14).length, 1)
  }
  for (const report of [
    { ...validReport, reason: 'Unknown reason' },
    { ...validReport, notes: 123 },
    { ...validReport, notes: 'a'.repeat(501) },
    { ...validReport, reportedAt: 'invalid' },
    [], true, null,
  ]) {
    storage.setItem(key, JSON.stringify({
      registrations: { 'past-pitch-workshop': pastRegistration },
      reports: { 'past-pitch-workshop': validReport, 'customer-workshop': report, unknown: validReport },
    }))
    assert.deepEqual(store.read(founder), {
      registrations: { 'past-pitch-workshop': pastRegistration },
      reports: { 'past-pitch-workshop': validReport },
    })
  }
  for (const value of [null, [], 'invalid', { registrations: [], reports: 'invalid' }]) {
    storage.setItem(key, JSON.stringify(value))
    assert.deepEqual(store.read(founder), { registrations: {}, reports: {} })
  }
})
