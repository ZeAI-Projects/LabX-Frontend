import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js'
import { OPPORTUNITY_PREVIEWS } from './opportunity_previews.js'

export const EVENT_CATEGORIES = ['Hackathon', 'Workshop', 'Webinar', 'Training', 'Incubator', 'Accelerator', 'Residency', 'Mentoring', 'Job', 'Internship', 'Grant', 'Funding opportunity', 'Pitch event', 'Sponsored challenge', 'Community event', 'Guild event', 'Opportunity']
export const EVENT_STORAGE_KEY = 'labx.demo.events.v1'
export const EVENT_CHANGE_EVENT = 'labx:events-change'
export const MAX_CERTIFICATE_BYTES = 1024 * 1024
export const REPORT_REASONS = ['Incorrect or outdated information', 'Misleading listing', 'Inappropriate content', 'Other']

const defaults = {
  type: 'event', organizer: 'LabX Community', contact: 'Organizer contact is not available.',
  timezone: 'Asia/Kolkata', format: 'Online', location: 'Online · meeting room available at the event', city: null,
  roles: ['founder', 'mentor'], eligibility: 'LabX founders and mentors', fee: 'Free', prize: null,
  sponsored: false, capacity: 100, available: 24,
  registrationMethod: 'internal', registrationUrl: null, paymentUrl: null, feeAmount: 0,
}

// Fixed sample dates are intentional: expired listings move to Past instead of silently shifting.
export const MOCK_EVENTS = [
  {
    id: 'prototype-hackathon', category: 'Hackathon', title: 'Build for Impact Hackathon',
    description: 'Turn a meaningful problem into a working prototype with a weekend of building, mentor feedback, and a community showcase.',
    schedule: 'Day 1: team formation and problem framing. Day 2: prototype builds, mentor clinics, and a final showcase.',
    startsAt: '2026-10-20T09:00:00+05:30', endsAt: '2026-10-21T18:00:00+05:30', deadline: '2026-10-19T18:00:00+05:30',
    format: 'Hybrid', location: 'Innovation Hub, Bengaluru / online', city: 'Bengaluru', capacity: 120, available: 38,
    prize: 'Prototype feedback and a showcase slot · sample benefits', sponsored: true, sponsor: 'LabX Innovation Partners',
  },
  {
    id: 'customer-workshop', category: 'Workshop', title: 'Customer Discovery Masterclass',
    description: 'Practice interview techniques, test your assumptions, and leave with a focused plan for your next five customer conversations.',
    schedule: '10:00: discovery principles. 10:45: interview practice. 11:30: questions and next steps.',
    startsAt: '2026-10-18T10:00:00+05:30', endsAt: '2026-10-18T12:00:00+05:30', deadline: '2026-10-17T18:00:00+05:30',
    organizer: 'LabX Learning Studio',
  },
  {
    id: 'mentor-circle', category: 'Mentoring', title: 'Mentor Exchange Circle',
    description: 'A peer circle for mentors to share useful frameworks, discuss founder support, and exchange lessons from their practice.',
    schedule: '16:00: introductions. 16:20: case discussion. 17:00: peer exchange.',
    startsAt: '2026-10-24T16:00:00+05:30', endsAt: '2026-10-24T17:30:00+05:30', deadline: '2026-10-23T18:00:00+05:30',
    roles: ['mentor'], eligibility: 'Mentor accounts only', capacity: 20, available: 7,
  },
  {
    id: 'impact-grant', category: 'Grant', title: 'Early Impact Grant Opportunity',
    description: 'Explore a sample grant for founders testing solutions with social impact. Prepare a problem statement, prototype summary, and proposed validation plan.',
    schedule: 'Application window ends 22 October. Sample review briefing takes place 28 October.',
    startsAt: '2026-10-28T11:00:00+05:30', endsAt: '2026-10-28T12:00:00+05:30', deadline: '2026-10-22T18:00:00+05:30',
    roles: ['founder'], eligibility: 'Founder accounts with an early-stage impact idea', capacity: null, available: null,
    prize: 'Illustrative prototype support grant; funding is not awarded through this listing',
  },
  {
    id: 'residency-opportunity', category: 'Residency', title: 'Founder Residency Open House',
    description: 'Meet a sample venture studio team, explore the residency program, and learn how structured founder support could fit your next stage.',
    schedule: '14:00: studio introduction. 14:30: program walkthrough. 15:00: open questions.',
    startsAt: '2026-11-02T14:00:00+05:30', endsAt: '2026-11-02T16:00:00+05:30', deadline: '2026-10-30T18:00:00+05:30',
    format: 'In person', location: 'Venture Studio, Bengaluru', city: 'Bengaluru', roles: ['founder'], eligibility: 'Founder accounts',
  },
  {
    id: 'climate-sprint', category: 'Hackathon', title: 'Climate Sprint: Cohort Full',
    description: 'A focused prototype sprint for climate solutions. This sample cohort has reached capacity; registration is unavailable.',
    schedule: '09:00: challenge briefing. 11:00: build sessions. 17:00: showcase.',
    startsAt: '2026-10-25T09:00:00+05:30', endsAt: '2026-10-25T18:00:00+05:30', deadline: '2026-10-24T18:00:00+05:30',
    capacity: 40, available: 0,
  },
  {
    id: 'showcase-closed', category: 'Opportunity', title: 'Founder Showcase: Applications Closed',
    description: 'A sample pitch showcase for early-stage founders. The application window has closed, and the event is still upcoming.',
    schedule: '17:00: pitches. 18:00: panel feedback and networking.',
    startsAt: '2026-10-23T17:00:00+05:30', endsAt: '2026-10-23T19:00:00+05:30', deadline: '2026-10-12T18:00:00+05:30',
    roles: ['founder'], eligibility: 'Founder accounts',
  },
  {
    id: 'past-pitch-workshop', category: 'Workshop', title: 'Pitch Practice: October Edition',
    description: 'A past community workshop exploring story structure, clear problem statements, and concise founder pitches.',
    schedule: '15:00: pitch structure. 15:30: practice rounds. 16:30: feedback.',
    startsAt: '2026-10-07T15:00:00+05:30', endsAt: '2026-10-07T17:00:00+05:30', deadline: '2026-10-06T18:00:00+05:30',
  },
  ...OPPORTUNITY_PREVIEWS,
].map((event) => Object.freeze({ ...defaults, ...event }))

export const EVENT_CITIES = Object.freeze([...new Set(MOCK_EVENTS.map((event) => event.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)))

export function eventPhase(event, now = Date.now()) {
  if (Date.parse(event.endsAt) <= now) return 'past'
  return Date.parse(event.startsAt) <= now ? 'ongoing' : 'upcoming'
}

export function getSafeEventLink(value) {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function getTrackingStatus(event, registration, outcome, now = Date.now()) {
  if (!registration) return 'Not registered'
  if (registration.status === 'external_pending') return 'Registration pending'
  if (outcome?.status === 'completed') return 'Completed'
  return { upcoming: 'Upcoming', ongoing: 'Ongoing', past: 'Past' }[eventPhase(event, now)]
}

export function getRegistrationAvailability(event, user, registration, now = Date.now()) {
  if (!event) return { allowed: false, label: 'Listing unavailable' }
  if (registration?.status === 'registered') return { allowed: false, label: 'Registered' }
  if (event.type === 'announcement') return { allowed: false, label: 'Information only' }
  if (!user?.id || !event.roles?.includes(user.role)) return { allowed: false, label: 'Not eligible' }
  if (eventPhase(event, now) === 'past') return { allowed: false, label: 'Event ended' }
  if (!Number.isFinite(Date.parse(event.deadline)) || Date.parse(event.deadline) <= now || Date.parse(event.startsAt) <= now) {
    return { allowed: false, label: 'Registration closed' }
  }
  if (event.available !== null && event.available <= 0) return { allowed: false, label: 'Fully booked' }
  if (event.registrationMethod === 'external') {
    if (!getSafeEventLink(event.registrationUrl)) return { allowed: false, label: 'Registration unavailable' }
    return { allowed: true, label: registration?.status === 'external_pending' ? 'Continue registration' : 'Register externally' }
  }
  return { allowed: true, label: 'Register' }
}

export function selectEvents(events, {
  query = '', category = 'all', format = 'all', view = 'upcoming', broadcast = 'all', sort = 'soonest', myPeriod = 'all', savedPeriod = 'all',
  dateFrom = '', dateTo = '', location = '', eligibility = 'all', fee = 'all', prizes = 'all', sponsored = 'all',
} = {}, registrations = {}, now = Date.now(), user = null, outcomes = {}, savedEvents = {}) {
  const search = query.trim().toLowerCase()
  return events.filter((event) => {
    const phase = eventPhase(event, now)
    const completed = registrations[event.id]?.status === 'registered' && outcomes[event.id]?.status === 'completed'
    // Announcements stay in the discovery feed throughout their publication window.
    const discoveryPhase = event.type === 'announcement' && phase === 'ongoing' ? 'upcoming' : phase
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: event.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(event.startsAt))
    const visible = view === 'saved' ? Boolean(savedEvents[event.id]) && (savedPeriod === 'all' || phase === savedPeriod) : view === 'my'
      ? Boolean(registrations[event.id]) && (myPeriod === 'all' || (myPeriod === 'past' ? phase === 'past' : myPeriod === 'completed' ? completed : !completed && phase === myPeriod))
      : view === 'completed' ? completed : discoveryPhase === view
    return (!search || `${event.title} ${event.organizer} ${event.description} ${event.category} ${event.location}`.toLowerCase().includes(search))
      && (category === 'all' || event.category === category)
      && (format === 'all' || event.format === format)
      && (broadcast === 'all' || event.type === broadcast)
      && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo)
      && (!location.trim() || event.city?.toLowerCase() === location.trim().toLowerCase())
      && (eligibility !== 'eligible' || Boolean(user?.id && event.roles?.includes(user.role)))
      && (fee === 'all' || (fee === 'paid' ? event.feeAmount > 0 : event.feeAmount === 0))
      && (prizes !== 'with-prizes' || Boolean(event.prize))
      && (sponsored === 'all' || (sponsored === 'sponsored' ? event.sponsored : !event.sponsored))
      && visible
  }).sort((a, b) => (Date.parse(a.startsAt) - Date.parse(b.startsAt)) * (sort === 'latest' ? -1 : 1))
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const entries = (value) => isRecord(value) ? Object.entries(value) : []
const isIsoDate = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value))

function certificateFor(value) {
  if (value === null || value === undefined) return null
  const types = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
  if (!isRecord(value) || !types.includes(value.type) || typeof value.name !== 'string'
    // eslint-disable-next-line no-control-regex -- Reject control characters in uploaded filenames.
    || !value.name.trim() || value.name.length > 180 || /[\\/\u0000-\u001f]/.test(value.name)
    || !Number.isSafeInteger(value.size) || value.size < 1 || value.size > MAX_CERTIFICATE_BYTES
    || typeof value.dataUrl !== 'string' || value.dataUrl.length > Math.ceil(MAX_CERTIFICATE_BYTES / 3) * 4 + 80) {
    throw new Error('Use a PDF, JPG, PNG or WebP certificate up to 1 MB.')
  }
  const prefix = `data:${value.type};base64,`
  const encoded = value.dataUrl.slice(prefix.length)
  if (!value.dataUrl.startsWith(prefix) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('This certificate could not be read. Choose the file again.')
  }
  const binary = atob(encoded)
  const signatureValid = value.type === 'application/pdf' ? binary.startsWith('%PDF-')
    : value.type === 'image/png' ? binary.startsWith('\x89PNG\r\n\x1a\n')
      : value.type === 'image/jpeg' ? binary.startsWith('\xff\xd8\xff')
        : binary.startsWith('RIFF') && binary.slice(8, 12) === 'WEBP'
  if (binary.length !== value.size || !signatureValid) throw new Error('The certificate contents do not match its file type.')
  return { name: value.name.trim(), size: value.size, type: value.type, dataUrl: value.dataUrl }
}

function outcomeFor(value) {
  if (!isRecord(value) || !['attended', 'completed'].includes(value.participation)) throw new Error('Select your participation status.')
  const result = { participation: value.participation }
  for (const [key, max] of [['notes', 2000], ['award', 200], ['feedback', 2000]]) {
    const text = value[key] ?? ''
    if (typeof text !== 'string' || text.length > max) throw new Error(`Keep ${key} to ${max} characters.`)
    result[key] = text.trim()
  }
  if (value.rating !== null && value.rating !== undefined && (!Number.isInteger(value.rating) || value.rating < 1 || value.rating > 5)) {
    throw new Error('Choose a rating from 1 to 5.')
  }
  return { ...result, rating: value.rating ?? null, certificate: certificateFor(value.certificate) }
}

export function createEventStore({ storage = localStore, now = Date.now, events = MOCK_EVENTS } = {}) {
  const store = storage?.readJSON ? storage : createSafeStorage(storage)
  const keyFor = (user) => {
    if (!user?.id) throw new Error('Log in to save an event.')
    return `${EVENT_STORAGE_KEY}:${encodeURIComponent(user.id)}`
  }
  function read(user) {
    const data = store.readJSON(keyFor(user), {})
    // Read only valid records from this account's known listings. A corrupt date
    // must not reach the details formatter, and unknown IDs must not inflate counts.
    const registrations = Object.fromEntries(entries(data?.registrations).flatMap(([id, record]) => {
      const event = events.find((item) => item.id === id && item.type === 'event')
      const method = record?.method ?? 'internal'
      if (!event || !isRecord(record) || record.eventId !== id
        || !['registered', 'external_pending'].includes(record.status)
        || !isIsoDate(record.registeredAt) || typeof record.reminder !== 'boolean'
        || method !== (event.registrationMethod ?? 'internal')
        || record.status === 'external_pending' && (method !== 'external' || record.reminder)
        || method === 'external' && record.status === 'registered' && (typeof record.confirmationReference !== 'string'
          || !record.confirmationReference.trim() || record.confirmationReference.length > 120)) return []
      return [[id, {
        eventId: id, status: record.status, registeredAt: record.registeredAt, reminder: record.reminder, method,
        ...(method === 'external' && record.status === 'registered' ? { confirmationReference: record.confirmationReference.trim() } : {}),
      }]]
    }))
    const reports = entries(data?.reports).filter(([id, record]) =>
      events.some((event) => event.id === id) && isRecord(record)
      && REPORT_REASONS.includes(record.reason) && typeof record.notes === 'string'
      && record.notes.length <= 500 && isIsoDate(record.reportedAt))
    const outcomes = Object.fromEntries(entries(data?.outcomes).flatMap(([id, record]) => {
      const event = events.find((item) => item.id === id)
      if (registrations[id]?.status !== 'registered' || record?.status !== 'completed' || !isIsoDate(record.updatedAt)
        || Date.parse(record.updatedAt) < Date.parse(event.startsAt)
        || Date.parse(record.updatedAt) < Date.parse(registrations[id].registeredAt)) return []
      try {
        return [[id, { ...outcomeFor(record), status: 'completed', updatedAt: record.updatedAt }]]
      } catch {
        return []
      }
    }))
    const savedEvents = Object.fromEntries(entries(data?.savedEvents).flatMap(([id, record]) => {
      if (!events.some((event) => event.id === id && event.type === 'event') || !isRecord(record)
        || record.eventId !== id || !isIsoDate(record.savedAt)) return []
      return [[id, { eventId: id, savedAt: record.savedAt }]]
    }))
    return {
      registrations,
      reports: Object.fromEntries(reports.map(([id, record]) => [id, {
        reason: record.reason, notes: record.notes, reportedAt: record.reportedAt,
      }])),
      outcomes,
      savedEvents,
    }
  }
  function findEvent(id) {
    const event = events.find((item) => item.id === id)
    if (!event) throw new Error('This listing is unavailable.')
    return event
  }
  function write(user, data, strict = false) {
    if (strict) store.writeJSONStrict(keyFor(user), data)
    else store.writeJSON(keyFor(user), data)
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT_CHANGE_EVENT, { detail: { userId: user.id } }))
  }
  function requireAvailable(event, user, registration) {
    const availability = getRegistrationAvailability(event, user, registration, now())
    if (!availability.allowed) throw new Error(availability.label)
  }
  return {
    read,
    setSaved(user, eventId, saved) {
      const event = findEvent(eventId)
      const data = read(user)
      if (event.type !== 'event') throw new Error('This listing is unavailable.')
      if (typeof saved !== 'boolean') throw new Error('Choose whether to save this event.')
      if (Boolean(data.savedEvents[eventId]) === saved) return data.savedEvents[eventId] ?? null
      if (saved) data.savedEvents[eventId] = { eventId, savedAt: new Date(now()).toISOString() }
      else delete data.savedEvents[eventId]
      write(user, data, true)
      return data.savedEvents[eventId] ?? null
    },
    register(user, eventId) {
      const event = findEvent(eventId)
      const data = read(user)
      if (data.registrations[eventId]?.status === 'registered') return data.registrations[eventId]
      requireAvailable(event, user, null)
      if (event.registrationMethod === 'external') throw new Error('Continue registration on the organizer preview, then save your confirmation.')
      const registration = { eventId, registeredAt: new Date(now()).toISOString(), reminder: false, status: 'registered', method: 'internal' }
      data.registrations[eventId] = registration
      write(user, data)
      return registration
    },
    beginExternal(user, eventId) {
      const event = findEvent(eventId)
      const data = read(user)
      if (data.registrations[eventId]?.status === 'registered') return data.registrations[eventId]
      requireAvailable(event, user, data.registrations[eventId])
      if (event.registrationMethod !== 'external') throw new Error('Register for this event on LabX.')
      if (data.registrations[eventId]) return data.registrations[eventId]
      const registration = { eventId, registeredAt: new Date(now()).toISOString(), reminder: false, status: 'external_pending', method: 'external' }
      data.registrations[eventId] = registration
      write(user, data)
      return registration
    },
    confirmExternal(user, eventId, reference) {
      const event = findEvent(eventId)
      const data = read(user)
      if (event.registrationMethod !== 'external') throw new Error('Register for this event on LabX.')
      if (data.registrations[eventId]?.status === 'registered') return data.registrations[eventId]
      if (data.registrations[eventId]?.status !== 'external_pending') throw new Error('Start the external registration first.')
      requireAvailable(event, user, data.registrations[eventId])
      if (typeof reference !== 'string' || !reference.trim() || reference.length > 120) throw new Error('Enter a confirmation reference of 1 to 120 characters.')
      const registration = { ...data.registrations[eventId], status: 'registered', confirmationReference: reference.trim() }
      data.registrations[eventId] = registration
      write(user, data)
      return registration
    },
    setReminder(user, eventId, enabled) {
      const event = findEvent(eventId)
      const data = read(user)
      if (data.registrations[eventId]?.status !== 'registered') throw new Error('Register before saving a reminder.')
      if (enabled && eventPhase(event, now()) === 'past') throw new Error('This event has ended.')
      data.registrations[eventId] = { ...data.registrations[eventId], reminder: Boolean(enabled) }
      write(user, data)
      return data.registrations[eventId]
    },
    saveOutcome(user, eventId, value) {
      const event = findEvent(eventId)
      const data = read(user)
      if (data.registrations[eventId]?.status !== 'registered') throw new Error('Confirm registration before recording participation.')
      if (!event.roles.includes(user.role)) throw new Error('Not eligible')
      if (Date.parse(event.startsAt) > now()) throw new Error('Record participation after the event starts.')
      const outcome = { ...outcomeFor(value), status: 'completed', updatedAt: new Date(now()).toISOString() }
      data.outcomes[eventId] = outcome
      write(user, data)
      return outcome
    },
    report(user, eventId, reason, notes = '') {
      findEvent(eventId)
      if (!REPORT_REASONS.includes(reason)) throw new Error('Select a reason for this report.')
      if (String(notes).length > 500) throw new Error('Keep report details to 500 characters.')
      const data = read(user)
      data.reports[eventId] = { reason, notes: String(notes).trim(), reportedAt: new Date(now()).toISOString() }
      write(user, data)
      return data.reports[eventId]
    },
  }
}

export const eventStore = createEventStore()
