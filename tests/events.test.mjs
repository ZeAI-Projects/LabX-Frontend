import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENT_CITIES, EVENT_STORAGE_KEY, MAX_CERTIFICATE_BYTES, MOCK_EVENTS, REPORT_REASONS, createEventStore, eventPhase, getRegistrationAvailability, getSafeEventLink, getTrackingStatus, selectEvents } from '../src/features/events/services/mock_events.js'

const OCTOBER_14 = Date.parse('2026-10-14T12:00:00+05:30')
const founder = { id: 'founder-events-test', role: 'founder' }
const mentor = { id: 'mentor-events-test', role: 'mentor' }
const byId = (id) => MOCK_EVENTS.find((event) => event.id === id)
function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
}

test('saved broadcasts persist per account independently of registration, reminders and participation', () => {
  const storage = memoryStorage()
  let now = OCTOBER_14
  const store = createEventStore({ storage, now: () => now })
  const original = store.setSaved(founder, 'customer-workshop', true)
  now += 1000
  assert.deepEqual(store.setSaved(founder, 'customer-workshop', true), original, 'Saving twice keeps one bookmark and its timestamp')
  assert.deepEqual(store.read(founder).registrations, {})
  assert.deepEqual(store.read(founder).outcomes, {})
  const reloaded = createEventStore({ storage, now: () => now })
  assert.deepEqual(reloaded.read(founder).savedEvents, { 'customer-workshop': original })
  assert.deepEqual(reloaded.read(mentor).savedEvents, {})
  reloaded.register(founder, 'customer-workshop')
  const registration = reloaded.setReminder(founder, 'customer-workshop', true)
  assert.equal(reloaded.setSaved(founder, 'customer-workshop', false), null)
  assert.equal(reloaded.setSaved(founder, 'customer-workshop', false), null)
  assert.deepEqual(reloaded.read(founder).savedEvents, {})
  assert.deepEqual(reloaded.read(founder).registrations['customer-workshop'], registration, 'Removing a bookmark does not cancel or change registration')
})

test('Saved includes past, full, closed and role-ineligible events and supports discovery filters', () => {
  const store = createEventStore({ storage: memoryStorage(), now: () => OCTOBER_14 })
  const ids = ['past-pitch-workshop', 'climate-sprint', 'showcase-closed', 'mentor-circle']
  for (const id of ids) store.setSaved(founder, id, true)
  const saved = store.read(founder)
  const selected = selectEvents(MOCK_EVENTS, { view: 'saved' }, saved.registrations, OCTOBER_14, founder, saved.outcomes, saved.savedEvents)
  assert.deepEqual(new Set(selected.map(({ id }) => id)), new Set(ids))
  assert.deepEqual(selectEvents(MOCK_EVENTS, { view: 'saved', category: 'Workshop' }, {}, OCTOBER_14, founder, {}, saved.savedEvents).map(({ id }) => id), ['past-pitch-workshop'])
  assert.deepEqual(selectEvents(MOCK_EVENTS, { view: 'saved', query: 'Climate' }, {}, OCTOBER_14, founder, {}, saved.savedEvents).map(({ id }) => id), ['climate-sprint'])
  assert.deepEqual(selectEvents(MOCK_EVENTS, { view: 'my' }, saved.registrations, OCTOBER_14), [])
  assert.throws(() => store.setSaved(founder, 'unknown', true), /unavailable/)
  assert.throws(() => store.setSaved(founder, 'community-transmission', true), /unavailable/)
  assert.throws(() => store.setSaved(null, 'customer-workshop', true), /Log in/)
  assert.throws(() => store.setSaved(founder, 'customer-workshop', 'yes'), /whether to save/)
})

test('Saved Events time filters separate upcoming, ongoing and past bookmarks without changing registrations', () => {
  let now = OCTOBER_14
  const store = createEventStore({ storage: memoryStorage(), now: () => now })
  for (const id of ['past-pitch-workshop', 'customer-workshop', 'residency-opportunity']) store.setSaved(founder, id, true)
  const saved = store.read(founder)
  const select = (period, extra = {}) => selectEvents(MOCK_EVENTS, { view: 'saved', savedPeriod: period, ...extra }, saved.registrations, now, founder, saved.outcomes, saved.savedEvents).map(({ id }) => id)
  assert.deepEqual(select('past'), ['past-pitch-workshop'])
  assert.deepEqual(select('upcoming'), ['customer-workshop', 'residency-opportunity'])
  assert.deepEqual(select('ongoing'), [])
  now = Date.parse('2026-10-18T11:00:00+05:30')
  assert.deepEqual(select('ongoing'), ['customer-workshop'])
  assert.deepEqual(select('upcoming'), ['residency-opportunity'])
  assert.deepEqual(select('past', { query: 'does not exist' }), [])
  assert.deepEqual(store.read(founder), saved, 'Filtering never changes bookmarks or registration')
})

test('past My Events history retains ended registrations with completed participation', () => {
  let now = OCTOBER_14
  const store = createEventStore({ storage: memoryStorage(), now: () => now })
  store.register(founder, 'customer-workshop')
  store.register(founder, 'residency-opportunity')
  now = Date.parse('2026-10-18T13:00:00+05:30')
  store.saveOutcome(founder, 'customer-workshop', { participation: 'attended', notes: '', award: '', feedback: '', rating: null, certificate: null })
  const saved = store.read(founder)
  const select = (myPeriod) => selectEvents(MOCK_EVENTS, { view: 'my', myPeriod }, saved.registrations, now, founder, saved.outcomes).map(({ id }) => id)
  assert.deepEqual(select('past'), ['customer-workshop'])
  assert.deepEqual(select('completed'), ['customer-workshop'])
  assert.deepEqual(select('upcoming'), ['residency-opportunity'])
  assert.equal(getTrackingStatus(byId('customer-workshop'), saved.registrations['customer-workshop'], saved.outcomes['customer-workshop'], now), 'Completed')
})

test('corrupt or retired bookmarks never inflate Saved while valid bookmarks survive', () => {
  const storage = memoryStorage()
  const savedAt = new Date(OCTOBER_14).toISOString()
  const valid = { eventId: 'customer-workshop', savedAt }
  storage.setItem(`${EVENT_STORAGE_KEY}:${founder.id}`, JSON.stringify({ savedEvents: {
    'customer-workshop': valid,
    'climate-sprint': { eventId: 'climate-sprint', savedAt: 'invalid' },
    'mentor-circle': { eventId: 'customer-workshop', savedAt },
    'residency-opportunity': true,
    unknown: { eventId: 'unknown', savedAt },
    'community-transmission': { eventId: 'community-transmission', savedAt },
  } }))
  const store = createEventStore({ storage })
  assert.deepEqual(store.read(founder).savedEvents, { 'customer-workshop': valid })
  assert.ok(MOCK_EVENTS.every(({ type }) => type === 'event'), 'Transmissions are removed from the broadcast catalogue')
})

test('failed bookmark writes report errors without claiming success or losing existing bookmarks', () => {
  const backing = memoryStorage()
  let failWrites = false
  const storage = { ...backing, setItem: (key, value) => {
    if (failWrites) throw new Error('Storage is full')
    backing.setItem(key, value)
  } }
  const store = createEventStore({ storage, now: () => OCTOBER_14 })
  store.setSaved(founder, 'customer-workshop', true)
  const before = store.read(founder)
  failWrites = true
  assert.throws(() => store.setSaved(founder, 'climate-sprint', true), /Unable to save/)
  assert.throws(() => store.setSaved(founder, 'customer-workshop', false), /Unable to save/)
  assert.deepEqual(store.read(founder), before)
  assert.deepEqual(createEventStore({ storage: backing }).read(founder), before)
  failWrites = false
  store.setSaved(founder, 'climate-sprint', true)
  assert.equal(Object.keys(store.read(founder).savedEvents).length, 2)
})

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
  assert.deepEqual(selectEvents(MOCK_EVENTS, { broadcast: 'announcement' }, {}, OCTOBER_14), [])
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
    assert.deepEqual(saved.registrations, { 'past-pitch-workshop': { ...pastRegistration, method: 'internal' } })
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
      registrations: { 'past-pitch-workshop': { ...pastRegistration, method: 'internal' } },
      reports: { 'past-pitch-workshop': validReport },
      outcomes: {},
      savedEvents: {},
    })
  }
  for (const value of [null, [], 'invalid', { registrations: [], reports: 'invalid' }]) {
    storage.setItem(key, JSON.stringify(value))
    assert.deepEqual(store.read(founder), { registrations: {}, reports: {}, outcomes: {}, savedEvents: {} })
  }
})

test('external registration stays pending until explicitly confirmed and cannot use the internal action', () => {
  const storage = memoryStorage()
  const store = createEventStore({ storage, now: () => OCTOBER_14 })
  const event = byId('accelerator-preview')
  assert.throws(() => store.register(founder, event.id), /organizer preview/)
  assert.throws(() => store.confirmExternal(founder, event.id, 'ABC'), /Start the external/)
  const pending = store.beginExternal(founder, event.id)
  assert.equal(pending.status, 'external_pending')
  assert.equal(getTrackingStatus(event, pending, null, OCTOBER_14), 'Registration pending')
  assert.equal(getRegistrationAvailability(event, founder, pending, OCTOBER_14).label, 'Continue registration')
  assert.deepEqual(store.beginExternal(founder, event.id), pending)
  assert.throws(() => store.setReminder(founder, event.id, true), /Register before/)
  assert.throws(() => store.confirmExternal(founder, event.id, ''), /confirmation reference/)
  assert.throws(() => store.confirmExternal(founder, event.id, 'x'.repeat(121)), /120/)
  const confirmed = store.confirmExternal(founder, event.id, '  Demo confirmation 42  ')
  assert.equal(confirmed.confirmationReference, 'Demo confirmation 42')
  assert.equal(confirmed.status, 'registered')
  assert.deepEqual(store.confirmExternal(founder, event.id, 'again'), confirmed)
  assert.deepEqual(createEventStore({ storage }).read(founder).registrations[event.id], confirmed)
  assert.deepEqual(store.read(mentor).registrations, {})
  assert.throws(() => store.beginExternal(founder, 'customer-workshop'), /on LabX/)
})

test('external confirmation rechecks eligibility, capacity and expired deadlines', () => {
  let now = OCTOBER_14
  const event = { ...byId('accelerator-preview'), roles: ['founder'] }
  const store = createEventStore({ storage: memoryStorage(), now: () => now, events: [event] })
  store.beginExternal(founder, event.id)
  assert.throws(() => store.confirmExternal({ ...founder, role: 'investor' }, event.id, 'ref'), /Not eligible/)
  event.available = 0
  assert.throws(() => store.confirmExternal(founder, event.id, 'ref'), /Fully booked/)
  event.available = 1
  now = Date.parse(event.deadline)
  assert.throws(() => store.confirmExternal(founder, event.id, 'ref'), /Registration closed/)
  assert.equal(store.read(founder).registrations[event.id].status, 'external_pending')
})

test('only HTTPS links without embedded credentials can be offered for external registration', () => {
  assert.equal(getSafeEventLink('https://example.org/?labx-demo=test'), 'https://example.org/?labx-demo=test')
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'http://example.org/', 'https://user:pass@example.org/', '/relative', null]) {
    assert.equal(getSafeEventLink(value), null)
  }
  const event = { ...byId('accelerator-preview'), registrationUrl: 'javascript:alert(1)' }
  const store = createEventStore({ storage: memoryStorage(), now: () => OCTOBER_14, events: [event] })
  assert.throws(() => store.beginExternal(founder, event.id), /Registration unavailable/)
})

test('location filters use canonical cities across venues and combine with event format', () => {
  assert.deepEqual(EVENT_CITIES, ['Bengaluru', 'Chennai'])
  const byCity = selectEvents(MOCK_EVENTS, { location: ' bengALURU ' }, {}, OCTOBER_14, founder)
  assert.ok(byCity.some(({ id }) => id === 'prototype-hackathon'))
  assert.ok(byCity.some(({ id }) => id === 'residency-opportunity'))
  assert.ok(byCity.every((event) => event.city === 'Bengaluru'))
  assert.equal(byCity.some(({ id }) => id === 'customer-workshop'), false, 'Online-only events do not receive a city')
  const inPerson = selectEvents(MOCK_EVENTS, { location: 'Bengaluru', format: 'In person' }, {}, OCTOBER_14, founder)
  assert.ok(inPerson.some(({ id }) => id === 'residency-opportunity'))
  assert.equal(inPerson.some(({ id }) => id === 'prototype-hackathon'), false)
  for (const location of ['Bengal', 'Innovation Hub, Bengaluru / online', 'Online', 'Unknown city']) {
    assert.deepEqual(selectEvents(MOCK_EVENTS, { location }, {}, OCTOBER_14, founder), [], 'Location is an exact city selection, not venue substring search')
  }
})

test('advanced discovery filters combine dates, role, location, price, prizes and sponsorship', () => {
  const filtered = selectEvents(MOCK_EVENTS, {
    dateFrom: '2026-10-20', dateTo: '2026-10-20', location: 'BENGALURU', eligibility: 'eligible',
    fee: 'free', prizes: 'with-prizes', sponsored: 'sponsored',
  }, {}, OCTOBER_14, founder)
  assert.deepEqual(filtered.map(({ id }) => id), ['prototype-hackathon'])
  assert.deepEqual(selectEvents(MOCK_EVENTS, { fee: 'paid' }, {}, OCTOBER_14, founder).map(({ id }) => id), ['product-training'])
  const investor = { id: 'investor-event', role: 'investor' }
  const eligible = selectEvents(MOCK_EVENTS, { eligibility: 'eligible' }, {}, OCTOBER_14, investor)
  assert.ok(eligible.length > 0)
  assert.ok(eligible.every((event) => event.roles.includes('investor')))
  assert.equal(selectEvents(MOCK_EVENTS, { dateFrom: '2026-11-01', dateTo: '2026-10-01' }, {}, OCTOBER_14).length, 0)
  assert.ok(selectEvents(MOCK_EVENTS, { sponsored: 'organic' }, {}, OCTOBER_14).every((event) => !event.sponsored))
})

const sampleCertificate = () => {
  const bytes = Buffer.from('%PDF-1.4\nsample certificate\n%%EOF')
  return { name: 'certificate.pdf', type: 'application/pdf', size: bytes.length, dataUrl: `data:application/pdf;base64,${bytes.toString('base64')}` }
}

test('participation and real certificate bytes persist per account and completed tracker updates', () => {
  const storage = memoryStorage()
  let now = OCTOBER_14
  const store = createEventStore({ storage, now: () => now })
  const event = byId('customer-workshop')
  assert.throws(() => store.saveOutcome(founder, event.id, { participation: 'attended' }), /Confirm registration/)
  const registration = store.register(founder, event.id)
  assert.equal(getTrackingStatus(event, registration, null, now), 'Upcoming')
  assert.throws(() => store.saveOutcome(founder, event.id, { participation: 'attended' }), /after the event starts/)
  now = Date.parse(event.startsAt)
  assert.equal(eventPhase(event, now), 'ongoing')
  assert.equal(getTrackingStatus(event, registration, null, now), 'Ongoing')
  assert.ok(selectEvents(MOCK_EVENTS, { view: 'ongoing' }, {}, now).some(({ id }) => id === event.id))
  const outcome = store.saveOutcome(founder, event.id, {
    participation: 'attended', notes: '  Learned to ask open questions  ', award: 'Peer recognition',
    rating: 5, feedback: 'Useful practice.', certificate: sampleCertificate(),
  })
  assert.equal(outcome.notes, 'Learned to ask open questions')
  assert.equal(outcome.status, 'completed')
  const reloaded = createEventStore({ storage }).read(founder)
  assert.deepEqual(reloaded.outcomes[event.id], outcome)
  assert.deepEqual(store.read(mentor).outcomes, {})
  assert.equal(getTrackingStatus(event, registration, outcome, now), 'Completed')
  assert.deepEqual(selectEvents(MOCK_EVENTS, { view: 'completed' }, reloaded.registrations, now, founder, reloaded.outcomes).map(({ id }) => id), [event.id])
  assert.equal(selectEvents(MOCK_EVENTS, { view: 'my', myPeriod: 'ongoing' }, reloaded.registrations, now, founder, reloaded.outcomes).length, 0)
  assert.equal(selectEvents(MOCK_EVENTS, { view: 'my', myPeriod: 'completed' }, reloaded.registrations, now, founder, reloaded.outcomes).length, 1)
  now = Date.parse(event.endsAt)
  assert.equal(eventPhase(event, now), 'past')
  assert.equal(getTrackingStatus(event, registration, null, now), 'Past')
  const edited = store.saveOutcome(founder, event.id, { participation: 'completed', notes: 'Revised result', certificate: null })
  assert.equal(edited.certificate, null)
  assert.equal(store.read(founder).outcomes[event.id].notes, 'Revised result')
})

test('invalid outcomes and unsafe or oversized certificates cannot overwrite saved participation', () => {
  let now = OCTOBER_14
  const store = createEventStore({ storage: memoryStorage(), now: () => now })
  store.register(founder, 'customer-workshop')
  now = Date.parse(byId('customer-workshop').endsAt)
  const valid = store.saveOutcome(founder, 'customer-workshop', { participation: 'completed', notes: 'Saved result' })
  for (const value of [
    { participation: '' }, { participation: 'completed', notes: 'x'.repeat(2001) },
    { participation: 'completed', award: 'x'.repeat(201) }, { participation: 'attended', rating: 6 },
    { participation: 'attended', rating: '5' },
    ...[
      { ...sampleCertificate(), size: MAX_CERTIFICATE_BYTES + 1 },
      { ...sampleCertificate(), type: 'image/svg+xml' },
      { ...sampleCertificate(), name: '../certificate.pdf' },
      { ...sampleCertificate(), dataUrl: 'javascript:alert(1)' },
      { ...sampleCertificate(), dataUrl: 'data:application/pdf;base64,SGVsbG8=' },
      { ...sampleCertificate(), size: 2 },
    ].map((certificate) => ({ participation: 'completed', certificate })),
  ]) {
    assert.throws(() => store.saveOutcome(founder, 'customer-workshop', value))
    assert.deepEqual(store.read(founder).outcomes['customer-workshop'], valid)
  }
})

test('corrupt tracker records cannot turn an external click or unregistered event into completion', () => {
  const storage = memoryStorage()
  const store = createEventStore({ storage, now: () => OCTOBER_14 })
  store.beginExternal(founder, 'accelerator-preview')
  store.register(founder, 'customer-workshop')
  const data = store.read(founder)
  const outcome = { participation: 'completed', status: 'completed', updatedAt: new Date(OCTOBER_14).toISOString() }
  data.outcomes = { 'accelerator-preview': outcome, 'customer-workshop': outcome, unknown: outcome }
  storage.setItem(`${EVENT_STORAGE_KEY}:${founder.id}`, JSON.stringify(data))
  assert.deepEqual(store.read(founder).outcomes, {})
  assert.equal(getTrackingStatus(byId('accelerator-preview'), data.registrations['accelerator-preview'], outcome), 'Registration pending')
})
