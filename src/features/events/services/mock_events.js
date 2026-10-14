import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js'

export const EVENT_CATEGORIES = ['Hackathon', 'Workshop', 'Mentoring', 'Grant', 'Opportunity', 'Announcement']
export const EVENT_STORAGE_KEY = 'labx.demo.events.v1'
export const REPORT_REASONS = ['Incorrect or outdated information', 'Misleading listing', 'Inappropriate content', 'Other']

const defaults = {
  type: 'event', organizer: 'LabX Community · Demo', contact: 'Organizer contact is unavailable in this demo.',
  timezone: 'Asia/Kolkata', format: 'Online', location: 'Online · meeting room available at the event',
  roles: ['founder', 'mentor'], eligibility: 'LabX founders and mentors', fee: 'Free', prize: null,
  sponsored: false, capacity: 100, available: 24,
}

// Fixed sample dates are intentional: expired listings move to Past instead of silently shifting.
export const MOCK_EVENTS = [
  {
    id: 'prototype-hackathon', category: 'Hackathon', title: 'Build for Impact Hackathon',
    description: 'Turn a meaningful problem into a working prototype with a weekend of building, mentor feedback, and a community showcase.',
    schedule: 'Day 1: team formation and problem framing. Day 2: prototype builds, mentor clinics, and a final showcase.',
    startsAt: '2026-10-20T09:00:00+05:30', endsAt: '2026-10-21T18:00:00+05:30', deadline: '2026-10-19T18:00:00+05:30',
    format: 'Hybrid', location: 'Demo Innovation Hub, Bengaluru / online', capacity: 120, available: 38,
    prize: 'Prototype feedback and a showcase slot · sample benefits', sponsored: true, sponsor: 'LabX Innovation Partners · Demo',
  },
  {
    id: 'customer-workshop', category: 'Workshop', title: 'Customer Discovery Masterclass',
    description: 'Practice interview techniques, test your assumptions, and leave with a focused plan for your next five customer conversations.',
    schedule: '10:00: discovery principles. 10:45: interview practice. 11:30: questions and next steps.',
    startsAt: '2026-10-18T10:00:00+05:30', endsAt: '2026-10-18T12:00:00+05:30', deadline: '2026-10-17T18:00:00+05:30',
    organizer: 'LabX Learning Studio · Demo',
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
    prize: 'Illustrative prototype support grant; no funding is awarded in this demo',
  },
  {
    id: 'residency-opportunity', category: 'Opportunity', title: 'Founder Residency Open House',
    description: 'Meet a sample venture studio team, explore the residency program, and learn how structured founder support could fit your next stage.',
    schedule: '14:00: studio introduction. 14:30: program walkthrough. 15:00: open questions.',
    startsAt: '2026-11-02T14:00:00+05:30', endsAt: '2026-11-02T16:00:00+05:30', deadline: '2026-10-30T18:00:00+05:30',
    format: 'In person', location: 'Demo Venture Studio, Bengaluru', roles: ['founder'], eligibility: 'Founder accounts',
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
  {
    id: 'community-transmission', type: 'announcement', category: 'Announcement', title: 'October Community Transmission',
    description: 'This month’s sample broadcast brings together new learning sessions, founder opportunities, and ways to meet the LabX community.',
    schedule: 'Community bulletin · published 14 October 2026.',
    startsAt: '2026-10-14T09:00:00+05:30', endsAt: '2026-10-31T23:59:00+05:30', deadline: null,
    location: 'LabX community bulletin', capacity: null, available: null, fee: null,
  },
].map((event) => Object.freeze({ ...defaults, ...event }))

export function eventPhase(event, now = Date.now()) {
  return Date.parse(event.endsAt) <= now ? 'past' : 'upcoming'
}

export function getRegistrationAvailability(event, user, registration, now = Date.now()) {
  if (!event) return { allowed: false, label: 'Listing unavailable' }
  if (registration) return { allowed: false, label: 'Registered' }
  if (event.type === 'announcement') return { allowed: false, label: 'Information only' }
  if (!user?.id || !event.roles.includes(user.role)) return { allowed: false, label: 'Not eligible' }
  if (eventPhase(event, now) === 'past') return { allowed: false, label: 'Event ended' }
  if (!Number.isFinite(Date.parse(event.deadline)) || Date.parse(event.deadline) <= now || Date.parse(event.startsAt) <= now) {
    return { allowed: false, label: 'Registration closed' }
  }
  if (event.available !== null && event.available <= 0) return { allowed: false, label: 'Fully booked' }
  return { allowed: true, label: 'Register' }
}

export function selectEvents(events, { query = '', category = 'all', format = 'all', view = 'upcoming', broadcast = 'all', sort = 'soonest', myPeriod = 'all' } = {}, registrations = {}, now = Date.now()) {
  const search = query.trim().toLowerCase()
  return events.filter((event) => {
    const phase = eventPhase(event, now)
    return (!search || `${event.title} ${event.organizer} ${event.description} ${event.category} ${event.location}`.toLowerCase().includes(search))
      && (category === 'all' || event.category === category)
      && (format === 'all' || event.format === format)
      && (broadcast === 'all' || event.type === broadcast)
      && (view === 'my' ? Boolean(registrations[event.id]) && (myPeriod === 'all' || phase === myPeriod) : phase === view)
  }).sort((a, b) => (Date.parse(a.startsAt) - Date.parse(b.startsAt)) * (sort === 'latest' ? -1 : 1))
}

export function createEventStore({ storage = localStore, now = Date.now, events = MOCK_EVENTS } = {}) {
  const store = storage?.readJSON ? storage : createSafeStorage(storage)
  const keyFor = (user) => {
    if (!user?.id) throw new Error('Log in to save an event.')
    return `${EVENT_STORAGE_KEY}:${encodeURIComponent(user.id)}`
  }
  function read(user) {
    const data = store.readJSON(keyFor(user), {})
    const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
    const entries = (value) => isRecord(value) ? Object.entries(value) : []
    const isIsoDate = (value) => typeof value === 'string'
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      && Number.isFinite(Date.parse(value))
    // Read only valid records from this account's known listings. A corrupt date
    // must not reach the details formatter, and unknown IDs must not inflate counts.
    const registrations = entries(data?.registrations).filter(([id, record]) =>
      events.some((event) => event.id === id && event.type === 'event')
      && isRecord(record) && record.eventId === id && record.status === 'registered'
      && isIsoDate(record.registeredAt) && typeof record.reminder === 'boolean')
    const reports = entries(data?.reports).filter(([id, record]) =>
      events.some((event) => event.id === id) && isRecord(record)
      && REPORT_REASONS.includes(record.reason) && typeof record.notes === 'string'
      && record.notes.length <= 500 && isIsoDate(record.reportedAt))
    return {
      registrations: Object.fromEntries(registrations.map(([id, record]) => [id, {
        eventId: id, status: 'registered', registeredAt: record.registeredAt, reminder: record.reminder,
      }])),
      reports: Object.fromEntries(reports.map(([id, record]) => [id, {
        reason: record.reason, notes: record.notes, reportedAt: record.reportedAt,
      }])),
    }
  }
  function findEvent(id) {
    const event = events.find((item) => item.id === id)
    if (!event) throw new Error('This listing is unavailable.')
    return event
  }
  return {
    read,
    register(user, eventId) {
      const event = findEvent(eventId)
      const data = read(user)
      if (data.registrations[eventId]) return data.registrations[eventId]
      const availability = getRegistrationAvailability(event, user, null, now())
      if (!availability.allowed) throw new Error(availability.label)
      const registration = { eventId, registeredAt: new Date(now()).toISOString(), reminder: false, status: 'registered' }
      data.registrations[eventId] = registration
      store.writeJSON(keyFor(user), data)
      return registration
    },
    setReminder(user, eventId, enabled) {
      const event = findEvent(eventId)
      const data = read(user)
      if (!data.registrations[eventId]) throw new Error('Register before saving a reminder.')
      if (enabled && eventPhase(event, now()) === 'past') throw new Error('This event has ended.')
      data.registrations[eventId] = { ...data.registrations[eventId], reminder: Boolean(enabled) }
      store.writeJSON(keyFor(user), data)
      return data.registrations[eventId]
    },
    report(user, eventId, reason, notes = '') {
      findEvent(eventId)
      if (!REPORT_REASONS.includes(reason)) throw new Error('Select a reason for this report.')
      if (String(notes).length > 500) throw new Error('Keep report details to 500 characters.')
      const data = read(user)
      data.reports[eventId] = { reason, notes: String(notes).trim(), reportedAt: new Date(now()).toISOString() }
      store.writeJSON(keyFor(user), data)
      return data.reports[eventId]
    },
  }
}

export const eventStore = createEventStore()
