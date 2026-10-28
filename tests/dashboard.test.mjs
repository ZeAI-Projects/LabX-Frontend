import assert from 'node:assert/strict'
import test from 'node:test'
import { getDashboardSnapshot } from '../src/features/dashboard/services/dashboard_snapshot.js'
import { ASSESSMENT_VERSION, createEmptyAnswers, DOMAIN_OPTIONS, evaluateAssessment } from '../src/features/assessment/services/mock_assessment.js'
import { MOCK_EVENTS } from '../src/features/events/services/mock_events.js'
import { createRoadmapSnapshot } from '../src/features/roadmap/services/roadmap_workflow.js'

const now = Date.parse('2026-10-20T04:30:00Z')
const demo = { id: 'demo-founder', role: 'founder', full_name: 'Founder', total_points: 900000 }
const fresh = { id: 'new-founder', role: 'founder', full_name: 'New Founder', total_points: 900000 }
const answers = { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8: 1 }
const project = (id, overrides = {}) => ({
  id,
  owner_id: demo.id,
  name: `Project ${id}`,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
  assessment_completed: false,
  assessment_answers: null,
  assessment_result: null,
  draft: { version: ASSESSMENT_VERSION, step: 1, answers: createEmptyAnswers() },
  ...overrides,
})
const readyProject = (id, overrides = {}) => project(id, {
  assessment_completed: true,
  assessment_answers: { ...answers },
  assessment_result: evaluateAssessment(answers),
  ...overrides,
})
const registration = (eventId, overrides = {}) => ({
  eventId, status: 'registered', registeredAt: '2026-10-01T12:00:00Z', reminder: false, ...overrides,
})

function submittedProject(submittedAt, status = 'approved', submittedBy = demo.id) {
  const own = readyProject('daily-mission')
  own.roadmap_snapshot = createRoadmapSnapshot(own, {
    version: 1, ownerId: demo.id, projectId: own.id,
    submissionsByMilestone: {
      'discover-l1-m1': {
        missionId: 'discover-l1-m1', attempt: 1, status, submittedBy, submittedAt,
        payload: { notes: status === 'approved' ? 'We interviewed the intended users, documented their needs, and compared our findings with existing alternatives.' : 'Too short.', url: 'https://example.test/evidence', file: null },
      },
    },
  })
  return own
}

test('dashboard progress follows approved work without treating roadmap missions as Daily Quest', () => {
  const own = submittedProject('2026-10-19T19:00:00Z')
  const initial = getDashboardSnapshot({ user: demo, projects: [readyProject('ready')], now })
  const completed = getDashboardSnapshot({ user: demo, projects: [own], now })
  assert.equal(Object.hasOwn(initial, 'dailyQuest'), false, 'Side quests have their own independent store')
  assert.equal(completed.projects[0].roadmap.completedCount, 1)
  assert.equal(completed.projects[0].roadmap.totalCount - completed.projects[0].roadmap.completedCount, 74)
  assert.equal(completed.achievements.pointsBalance, initial.achievements.pointsBalance)
  assert.equal(getDashboardSnapshot({ user: demo, projects: [own], now: Date.parse('2026-10-20T18:30:00Z') }).projects[0].roadmap.completedCount, 1, 'Roadmap progress never resets with daily side quests')
})

test('dashboard remaining work excludes rejected work and other accounts', () => {
  const rejected = submittedProject('2026-10-20T04:00:00Z', 'rejected')
  const foreign = { ...submittedProject('2026-10-20T04:00:00Z'), owner_id: 'another-founder' }
  const snapshot = getDashboardSnapshot({ user: demo, projects: [rejected, foreign], now })
  assert.equal(snapshot.projectCount, 1)
  assert.equal(snapshot.projects[0].roadmap.completedCount, 0)
  assert.equal(snapshot.projects[0].roadmap.totalCount, 75)
  assert.deepEqual(getDashboardSnapshot({ user: fresh, projects: [rejected, foreign], now }).projects, [])
})

test('demo account rewards match achievements and leaderboard without granting project completions', () => {
  const snapshot = getDashboardSnapshot({ user: demo, projects: [readyProject('launch')], now })
  assert.equal(snapshot.achievements.pointsBalance, 450)
  assert.equal(snapshot.achievements.earnedBadgeCount, 1)
  assert.equal(snapshot.leaderboard.userStanding.total_points, 450)
  assert.equal(snapshot.leaderboard.userStanding.badges_count, 1)
  assert.equal(snapshot.projects[0].stage, 'Discover')
  assert.equal(snapshot.projects[0].level, 1)
  assert.equal(snapshot.projects[0].currentMilestone.id, 'discover-l1-m1')
  assert.equal(snapshot.projects[0].currentMilestone.state, 'active')
  assert.equal(snapshot.projects[0].roadmap.completedCount, 0)
  assert.equal(snapshot.projects[0].roadmap.progressPercent, 0)
  assert.equal(snapshot.projects[0].roadmap.totalCount, 75)
  const milestones = snapshot.projects[0].roadmap.stages.flatMap((stage) => stage.levels).flatMap((level) => level.milestones)
  assert.ok(milestones.every((milestone) => milestone.state !== 'completed'))
  assert.equal(snapshot.activity.length, 5)
  assert.equal(snapshot.activity[0].status, 'Pending')
  assert.equal(snapshot.activity[0].amount, 100)
  assert.deepEqual(snapshot.activity, snapshot.achievements.transactions)
})

test('new founders stay at zero before and after assessment; no draft stage is invented', () => {
  const empty = getDashboardSnapshot({ user: fresh, now })
  assert.equal(empty.projectCount, 0)
  assert.equal(empty.achievements.pointsBalance, 0)
  assert.equal(empty.achievements.earnedBadgeCount, 0)
  assert.equal(empty.leaderboard.userStanding.total_points, 0)
  assert.equal(empty.leaderboard.userStanding.stage, null)
  assert.deepEqual(empty.activity, [])
  const assessed = getDashboardSnapshot({
    user: fresh,
    projects: [project('draft', { owner_id: fresh.id }), readyProject('ready', { owner_id: fresh.id })],
    now,
  })
  assert.equal(assessed.achievements.pointsBalance, 0)
  assert.equal(assessed.achievements.earnedBadgeCount, 0)
  assert.equal(assessed.leaderboard.userStanding.total_points, 0)
  const draft = assessed.projects.find(({ id }) => id === 'draft')
  assert.equal(draft.stage, null)
  assert.equal(draft.level, null)
  assert.equal(draft.domain, null)
  assert.equal(draft.roadmap, null)
  assert.equal(draft.currentMilestone, null)
  assert.deepEqual(assessed.activity, [])
})

test('projects exclude other owners, deduplicate IDs and sort latest update first', () => {
  const snapshot = getDashboardSnapshot({
    user: demo,
    projects: [
      readyProject('foreign', { owner_id: 'someone-else', assessment_result: { domain: DOMAIN_OPTIONS[5], stage: 'Grow', level: 5 } }),
      project('older'),
      readyProject('newer', { updated_at: '2026-10-19T12:00:00Z' }),
      project('newer', { updated_at: '2026-10-02T12:00:00Z' }),
      readyProject('missing-owner', { owner_id: undefined }),
      null,
    ],
    now,
  })
  assert.deepEqual(snapshot.projects.map(({ id }) => id), ['newer', 'older'])
  assert.equal(snapshot.projectCount, 2)
  assert.equal(snapshot.readyCount, 1)
  assert.equal(snapshot.draftCount, 1)
  assert.deepEqual(snapshot.leaderboard.userStanding.domains.map(({ name }) => name), [DOMAIN_OPTIONS[0]])
  const noId = getDashboardSnapshot({ user: { role: 'founder' }, projects: [project('missing-owner', { owner_id: undefined })], now })
  assert.deepEqual(noId.projects, [])
  assert.equal(noId.achievements, null)
})

test('assessment progress counts valid answers rather than saved step or truthiness', () => {
  const snapshot = getDashboardSnapshot({
    user: demo,
    projects: [
      project('empty'),
      project('partial', { draft: { version: ASSESSMENT_VERSION, step: 7, answers: { q1: 2, q2: 99, q3: ['none_yet', 'prototype'], q4: 1, q5: '1', q6: -1, q7: 0 } } }),
      readyProject('ready'),
      project('malformed', { draft: { version: ASSESSMENT_VERSION, answers: { q1: 99, q3: ['prototype', 'prototype'] } } }),
    ],
    now,
  })
  const byId = Object.fromEntries(snapshot.projects.map((item) => [item.id, item]))
  assert.equal(byId.partial.answeredCount, 2)
  assert.equal(byId.partial.totalQuestions, 8)
  assert.equal(byId.partial.domain, DOMAIN_OPTIONS[1])
  assert.equal(byId.partial.action, 'Continue assessment')
  assert.equal(byId.partial.href, '/roadmap/partial/assessment')
  assert.equal(byId.empty.answeredCount, 0)
  assert.equal(byId.empty.action, 'Start assessment')
  assert.equal(byId.ready.answeredCount, 8)
  assert.equal(byId.ready.action, 'Open roadmap')
  assert.equal(byId.ready.href, '/roadmap/ready')
  assert.equal(byId.malformed.answeredCount, 0)
})

test('legacy completed domains remain accessible while old unfinished answers restart', () => {
  const legacy = readyProject('legacy', {
    assessment_result: { domain: 'Artificial Intelligence & Machine Learning', stage: 'Launch', level: 5, version: 3 },
    assessment_answers: { q1: 1, q2: 2, q3: ['prototype'], q4: 1, q5: 1, q6: 1, q7: 1 },
  })
  const draft = project('old-draft', { draft: { step: 4, answers: legacy.assessment_answers } })
  const snapshot = getDashboardSnapshot({ user: demo, projects: [legacy, draft], now })
  const completed = snapshot.projects.find(item => item.id === 'legacy')
  assert.equal(completed.domain, 'Artificial Intelligence & Machine Learning')
  assert.ok(completed.roadmap)
  assert.equal(completed.href, '/roadmap/legacy')
  const unfinished = snapshot.projects.find(item => item.id === 'old-draft')
  assert.equal(unfinished.answeredCount, 0)
  assert.equal(unfinished.totalQuestions, 8)
  assert.equal(unfinished.domain, null)
})

test('roadmap requires a completed project and valid domain, stage and level', () => {
  const cases = [
    { domain: DOMAIN_OPTIONS[0], stage: 'Unknown stage', level: 3 },
    { domain: DOMAIN_OPTIONS[0], stage: 'Launch', level: 0 },
    { domain: DOMAIN_OPTIONS[0], stage: 'Launch', level: 6 },
    { domain: DOMAIN_OPTIONS[0], stage: 'Launch', level: '5' },
    { domain: '', stage: 'Launch', level: 5 },
    { domain: 'Imaginary domain', stage: 'Launch', level: 5 },
  ]
  for (const assessment_result of cases) {
    const snapshot = getDashboardSnapshot({ user: demo, projects: [readyProject('invalid', { assessment_result })], now })
    const summary = snapshot.projects[0]
    assert.equal(summary.assessmentCompleted, true)
    assert.equal(summary.answeredCount, 7)
    assert.equal(summary.roadmap, null)
    assert.equal(summary.currentMilestone, null)
    assert.equal(summary.stage, null)
    assert.equal(summary.level, null)
    assert.equal(summary.action, 'View assessment result')
    assert.equal(summary.href, '/roadmap/invalid/result')
    assert.equal(snapshot.readyCount, 0)
    assert.equal(snapshot.draftCount, 0)
    assert.equal(snapshot.unavailableCount, 1)
  }
  const unassessed = getDashboardSnapshot({
    user: demo, projects: [readyProject('not-completed', { assessment_completed: false })], now,
  }).projects[0]
  assert.equal(unassessed.roadmap, null)
  assert.equal(unassessed.action, 'Start assessment')
  const normalized = getDashboardSnapshot({
    user: demo, projects: [readyProject('lowercase', { assessment_result: { domain: DOMAIN_OPTIONS[0], stage: ' launch ', level: 2 } })], now,
  }).projects[0]
  assert.equal(normalized.stage, 'Discover')
  assert.equal(normalized.currentMilestone.id, 'discover-l1-m1')
  const mixed = getDashboardSnapshot({
    user: demo,
    projects: [project('draft'), readyProject('ready'), readyProject('unavailable', { assessment_result: {} })],
    now,
  })
  assert.equal(mixed.projectCount, 3)
  assert.equal(mixed.readyCount, 1)
  assert.equal(mixed.draftCount, 1)
  assert.equal(mixed.unavailableCount, 1)
  assert.equal(mixed.readyCount + mixed.draftCount + mixed.unavailableCount, mixed.projectCount)
})

test('role-eligible event previews keep actual dates and availability, including ongoing events', () => {
  const founder = getDashboardSnapshot({ user: demo, now })
  assert.deepEqual(founder.upcomingEvents.map(({ id }) => id), ['prototype-hackathon', 'showcase-closed', 'climate-sprint'])
  assert.deepEqual(founder.upcomingEvents.map(({ availability }) => availability.label), ['Registration closed', 'Registration closed', 'Fully booked'])
  assert.deepEqual(founder.upcomingEvents.map(({ phase }) => phase), ['ongoing', 'upcoming', 'upcoming'])
  assert.ok(founder.upcomingEvents.every((event) => !event.availability.allowed && event.href === '/events'))
  const mentor = getDashboardSnapshot({ user: { id: 'mentor', role: 'mentor' }, now })
  assert.deepEqual(mentor.upcomingEvents.map(({ id }) => id), ['prototype-hackathon', 'mentor-circle', 'climate-sprint'])
  assert.deepEqual(mentor.upcomingEvents[1].availability, { allowed: true, label: 'Register' })
  const investor = getDashboardSnapshot({ user: { id: 'investor', role: 'investor' }, now })
  assert.deepEqual(investor.upcomingEvents.map(({ id }) => id), ['fundraising-webinar', 'venture-job', 'funding-forum'])
  assert.ok(investor.upcomingEvents.every((event) => event.roles.includes('investor') && event.availability.allowed))
  assert.deepEqual(getDashboardSnapshot({ now }).upcomingEvents, [])
  assert.deepEqual(getDashboardSnapshot({ user: demo, now: Date.parse('2026-12-01T00:00:00Z') }).upcomingEvents, [])
})

test('registered preview selects before truncating and excludes expired or ineligible listings', () => {
  const registrations = Object.fromEntries([
    'prototype-hackathon', 'impact-grant', 'residency-opportunity', 'past-pitch-workshop', 'mentor-circle', 'community-transmission', 'unknown',
  ].map((id) => [id, registration(id)]))
  const snapshot = getDashboardSnapshot({ user: demo, registrations, now })
  assert.deepEqual(snapshot.registeredEvents.map(({ id }) => id), ['prototype-hackathon', 'impact-grant', 'residency-opportunity'])
  assert.ok(snapshot.registeredEvents.every((event) => event.isRegistered && !event.availability.allowed && event.availability.label === 'Registered'))
  assert.equal(snapshot.upcomingEvents[0].isRegistered, true)
  assert.equal(snapshot.upcomingEvents[1].isRegistered, false)
  const otherAccount = getDashboardSnapshot({ user: fresh, now })
  assert.deepEqual(otherAccount.registeredEvents, [])
})

test('malformed registrations and event dates cannot create a dashboard registration', () => {
  const invalid = {
    'prototype-hackathon': registration('other-event'),
    'showcase-closed': registration('showcase-closed', { registeredAt: 'not-a-date' }),
    'climate-sprint': registration('climate-sprint', { status: 'cancelled' }),
    'impact-grant': registration('impact-grant', { reminder: 'yes' }),
    'residency-opportunity': true,
  }
  const sample = MOCK_EVENTS[0]
  const events = [
    ...MOCK_EVENTS,
    { ...sample, id: 'broken-date', startsAt: 'invalid' },
    { ...sample, id: 'broken-end', endsAt: 'invalid' },
    { ...sample, id: 'reversed', startsAt: '2027-01-01T12:00:00Z' },
    { ...sample, id: 'no-roles', roles: null },
    { ...sample, id: 'announcement', type: 'announcement' },
  ]
  const snapshot = getDashboardSnapshot({ user: demo, events, registrations: invalid, now })
  assert.deepEqual(snapshot.registeredEvents, [])
  assert.deepEqual(snapshot.upcomingEvents.map(({ id }) => id), ['prototype-hackathon', 'showcase-closed', 'climate-sprint'])
  assert.ok(snapshot.upcomingEvents.every((event) => !event.isRegistered && event.registration === null))
})

test('events end exactly at endsAt and registration closes exactly at deadline', () => {
  const event = {
    ...MOCK_EVENTS[0], id: 'boundary', startsAt: '2026-10-21T12:00:00Z',
    endsAt: '2026-10-21T13:00:00Z', deadline: '2026-10-20T04:30:00Z',
  }
  assert.equal(getDashboardSnapshot({ user: demo, events: [event], now: now - 1 }).upcomingEvents[0].availability.allowed, true)
  assert.deepEqual(getDashboardSnapshot({ user: demo, events: [event], now }).upcomingEvents[0].availability, { allowed: false, label: 'Registration closed' })
  assert.deepEqual(getDashboardSnapshot({ user: demo, events: [event], now: Date.parse(event.endsAt) }).upcomingEvents, [])
})

test('mentor and investor summaries use saved profile fields without founder metrics', () => {
  const profiles = [
    ['mentor', { expertise: ' Product research ', experience: '5–10 years', availability: '4 hours' }, ['expertise', 'experience', 'availability']],
    ['investor', { investmentFocus: ' Climate ', preferredStage: 'Seed', organization: '' }, ['investmentFocus', 'preferredStage', 'organization']],
  ]
  for (const [role, onboarding_profile, expectedKeys] of profiles) {
    const user = { ...demo, role, onboarding_completed: true, onboarding_profile }
    const snapshot = getDashboardSnapshot({ user, projects: [readyProject('owned')], now })
    assert.equal(snapshot.isFounder, false)
    assert.deepEqual(snapshot.projects, [])
    assert.equal(snapshot.projectCount, 0)
    assert.equal(snapshot.achievements, null)
    assert.equal(snapshot.leaderboard, null)
    assert.deepEqual(snapshot.activity, [])
    assert.equal(snapshot.profile.completed, true)
    assert.deepEqual(snapshot.profile.details.map(({ key }) => key), expectedKeys)
    assert.equal(snapshot.profile.details[0].value, onboarding_profile[expectedKeys[0]].trim())
    assert.equal(Object.hasOwn(snapshot, 'verified'), false)
    assert.equal(Object.hasOwn(snapshot, 'assignments'), false)
  }
})

test('profile completion requires saved flag and valid required fields', () => {
  const user = { id: 'mentor', role: 'mentor', onboarding_completed: true }
  assert.equal(getDashboardSnapshot({ user, now }).profile.completed, false)
  assert.equal(getDashboardSnapshot({ user: { ...user, onboarding_profile: { expertise: 'X', experience: '2 years', availability: ' ' } }, now }).profile.completed, false)
  assert.equal(getDashboardSnapshot({ user: { ...user, onboarding_profile: { expertise: 'x'.repeat(121), experience: '2 years', availability: '4 hours' } }, now }).profile.completed, false)
  assert.equal(getDashboardSnapshot({ user: { ...user, onboarding_completed: false, onboarding_profile: { expertise: 'X', experience: '2 years', availability: '4 hours' } }, now }).profile.completed, false)
  assert.deepEqual(getDashboardSnapshot({ user: demo, now }).profile, { completed: false, details: [] })
})

test('snapshot outputs are immutable and do not freeze or mutate caller data', () => {
  const own = readyProject('owned')
  const event = { ...MOCK_EVENTS[0], roles: ['founder'] }
  const saved = registration(event.id)
  const user = { ...demo, onboarding_profile: { expertise: 'Before' } }
  const snapshot = getDashboardSnapshot({ user, projects: [own], events: [event], registrations: { [event.id]: saved }, now })
  assert.throws(() => { snapshot.projects[0].roadmap.stages[0].levels[0].milestones[0].state = 'completed' }, TypeError)
  assert.throws(() => { snapshot.upcomingEvents[0].roles.push('investor') }, TypeError)
  assert.throws(() => { snapshot.registeredEvents[0].registration.reminder = true }, TypeError)
  own.name = 'Changed'
  own.assessment_result.stage = 'Grow'
  event.roles.push('mentor')
  saved.reminder = true
  user.onboarding_profile.expertise = 'After'
  assert.equal(snapshot.projects[0].name, 'Project owned')
  assert.equal(snapshot.projects[0].stage, 'Discover')
  assert.deepEqual(snapshot.upcomingEvents[0].roles, ['founder'])
  assert.equal(snapshot.registeredEvents[0].registration.reminder, false)
  assert.equal(getDashboardSnapshot({ user: fresh, now }).achievements.pointsBalance, 0)
})
