import assert from 'node:assert/strict'
import test from 'node:test'
import { achievementActivityKey, platformAchievementKey, createAchievementStore, getAchievementsSnapshot, getMockPointsBalance } from '../src/features/achievements/services/mock_achievements.js'
import { readAchievementActivities } from '../src/features/achievements/services/achievement_sources.js'
import { createMockRoadmap } from '../src/features/roadmap/services/mock_roadmap.js'
import { createProjectStore, projectsKey } from '../src/features/projects/services/project_store.js'
import { createProfileStore } from '../src/features/profile/services/profile_store.js'
import { createEventStore, MOCK_EVENTS } from '../src/features/events/services/mock_events.js'
import { createCollaborationStore } from '../src/features/roadmap/services/roadmap_collaboration.js'

const demoUser = { id: 'demo-founder', role: 'founder' }

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

const owner = { id: 'achievement-owner', role: 'founder' }
const project = { id: 'project-one', owner_id: owner.id }
const firstLevel = ['discover-l1-m1', 'discover-l1-m2', 'discover-l1-m3']
function validatedSnapshot(submissions) {
  const snapshot = createMockRoadmap()
  snapshot.submissionsByMilestone = Object.fromEntries(submissions.map((submission) => [submission.missionId, submission]))
  for (const stage of snapshot.stages) for (const level of stage.levels) for (const mission of level.milestones) {
    mission.state = snapshot.submissionsByMilestone[mission.id]?.status === 'approved' ? 'completed' : 'locked'
  }
  return snapshot
}
const approval = (missionId, index = 0, userId = owner.id) => ({
  missionId, status: 'approved', submittedBy: userId, submittedAt: `2026-10-${String(20 + index).padStart(2, '0')}T12:00:00Z`,
})

test('points balance includes approved ledger entries and excludes pending amounts', () => {
  const snapshot = getAchievementsSnapshot(demoUser)
  const approved = snapshot.transactions.filter((entry) => entry.status === 'Approved')
  const pending = snapshot.transactions.filter((entry) => entry.status === 'Pending')
  assert.ok(pending.length > 0)
  assert.equal(snapshot.pointsBalance, approved.reduce((sum, entry) => sum + entry.amount, 0))
  assert.equal(snapshot.pointsBalance, 450)
  assert.equal(getMockPointsBalance(demoUser), snapshot.pointsBalance)
  assert.equal(snapshot.approvedPoints, snapshot.pointsBalance)
  assert.equal(new Set(snapshot.transactions.map((entry) => entry.id)).size, snapshot.transactions.length)
})

test('earned dates reflect the qualifying approval and locked badges have no earned date', () => {
  const snapshot = getAchievementsSnapshot(demoUser)
  for (const badge of snapshot.badges) {
    const qualifying = snapshot.transactions.filter((entry) => entry.status === 'Approved' && entry.metric === badge.metric).sort((a, b) => a.date.localeCompare(b.date))
    assert.equal(badge.isEarned, qualifying.length >= badge.target)
    assert.equal(badge.earnedAt, badge.isEarned ? qualifying[badge.target - 1].date : null)
    assert.ok(badge.progress >= 0 && badge.progress <= 100)
    assert.ok(badge.current <= badge.target)
  }
  assert.equal(snapshot.earnedBadgeCount, 3)
  assert.equal(snapshot.completedQuests, 3)
  assert.equal(snapshot.completedMilestones, 1)
  assert.equal(snapshot.nextAchievement.id, 'quest-momentum')
  assert.equal(snapshot.nextAchievement.progress, 60)
})

test('new accounts and assessment placement cannot inherit demo rewards', () => {
  for (const user of [null, { id: 'new-founder', role: 'founder' }, { id: 'demo-founder', role: 'mentor' }, { id: 'demo-founder', role: 'investor' }, { id: 'demo-founder' }, { id: 'new-founder', assessment_completed: true, assessment_result: { stage: 'Launch', level: 5 } }]) {
    const snapshot = getAchievementsSnapshot(user)
    assert.equal(snapshot.isDemo, false)
    assert.equal(snapshot.pointsBalance, 0)
    assert.equal(snapshot.earnedBadgeCount, 0)
    assert.equal(snapshot.completedQuests, 0)
    assert.equal(snapshot.completedMilestones, 0)
    assert.equal(snapshot.transactions.length, 0)
    assert.ok(snapshot.badges.every((badge) => !badge.isEarned && badge.earnedAt === null && badge.progress === 0))
  }
})

test('activity history and snapshots are immutable across accounts and reads', () => {
  const snapshot = getAchievementsSnapshot(demoUser)
  assert.throws(() => { snapshot.transactions[0].amount = 9000 }, TypeError)
  assert.throws(() => { snapshot.transactions.pop() }, TypeError)
  assert.throws(() => { snapshot.badges[0].isEarned = false }, TypeError)
  assert.equal(getAchievementsSnapshot(demoUser).pointsBalance, 450)
  assert.equal(getAchievementsSnapshot({ id: 'another-account' }).pointsBalance, 0)
})

test('recognition persists once per project mission and qualifies a level on the third own approval', () => {
  const storage = memoryStorage()
  const store = createAchievementStore({ storage })
  const record = store.recordRoadmap
  const one = record(owner, project, validatedSnapshot([approval(firstLevel[0])]))
  assert.equal(one.length, 1)
  const first = getAchievementsSnapshot(owner, one)
  assert.equal(first.earnedBadgeCount, 1)
  assert.equal(first.badges.find((badge) => badge.id === 'first-quest').earnedAt, approval(firstLevel[0]).submittedAt)
  const all = validatedSnapshot(firstLevel.map((id, index) => approval(id, index)))
  const completed = record(owner, project, all)
  assert.equal(completed.length, 4)
  assert.deepEqual(record(owner, project, all), completed)
  assert.deepEqual(createAchievementStore({ storage }).read(owner), completed)
  const snapshot = getAchievementsSnapshot(owner, completed)
  assert.equal(snapshot.completedQuests, 3)
  assert.equal(snapshot.completedMilestones, 1)
  assert.equal(snapshot.earnedBadgeCount, 3)
  assert.equal(snapshot.badges.find((badge) => badge.id === 'milestone-maker').earnedAt, approval(firstLevel[2], 2).submittedAt)
  assert.equal(snapshot.pointsBalance, 0)
  assert.deepEqual(snapshot.transactions, [])
  // Reads do not depend on the original project continuing to exist.
  assert.deepEqual(store.read(owner), completed)
  assert.throws(() => { completed[0].amount = 50 }, TypeError)
})

test('only own canonical approved contributions count, including when later snapshots omit earlier work', () => {
  const store = createAchievementStore({ storage: memoryStorage() })
  const other = { id: 'other-founder', role: 'founder' }
  store.recordRoadmap(owner, project, validatedSnapshot([
    approval(firstLevel[0]),
    approval(firstLevel[1], 1, other.id),
    { ...approval(firstLevel[2], 2), status: 'rejected' },
    approval('unknown-mission'),
  ]))
  assert.equal(store.read(owner).length, 1)
  assert.deepEqual(store.read(other), [])
  store.recordRoadmap(owner, project, validatedSnapshot([approval(firstLevel[1], 1)]))
  const entries = store.recordRoadmap(owner, project, validatedSnapshot([approval(firstLevel[2], 2)]))
  assert.equal(getAchievementsSnapshot(owner, entries).completedMilestones, 1)
  const snapshot = validatedSnapshot([approval('discover-l2-m1')])
  snapshot.stages[0].levels[1].milestones[0].state = 'credited'
  store.recordRoadmap(owner, project, snapshot)
  assert.equal(getAchievementsSnapshot(owner, store.read(owner)).completedQuests, 3)
})

test('recognition is isolated by account, project and owner and rejects non-founder writes', () => {
  const store = createAchievementStore({ storage: memoryStorage() })
  const snapshot = validatedSnapshot([approval(firstLevel[0])])
  store.recordRoadmap(owner, project, snapshot)
  store.recordRoadmap(owner, { ...project, id: 'project-two' }, snapshot)
  store.recordRoadmap(owner, { ...project, owner_id: 'another-project-owner' }, snapshot)
  assert.equal(store.read(owner).length, 3)
  for (const user of [null, { ...owner, role: 'mentor' }, { ...owner, role: 'investor' }, { ...owner, id: '' }]) {
    assert.deepEqual(store.recordRoadmap(user, project, snapshot), [])
    assert.deepEqual(store.read(user), [])
    assert.equal(getAchievementsSnapshot(user, store.read(owner)).earnedBadgeCount, 0)
  }
  assert.deepEqual(store.recordRoadmap(owner, { ...project, id: '' }, snapshot), store.read(owner))
  assert.deepEqual(store.recordRoadmap(owner, project, null), store.read(owner))
})

test('malformed, foreign, pending and orphaned level records cannot enter recognition', () => {
  const storage = memoryStorage()
  const store = createAchievementStore({ storage })
  const entries = store.recordRoadmap(owner, project, validatedSnapshot(firstLevel.map((id, index) => approval(id, index))))
  const mission = entries.find((entry) => entry.metric === 'quests')
  const milestone = entries.find((entry) => entry.metric === 'milestones')
  const invalid = [
    null,
    { ...mission, userId: 'someone-else' },
    { ...mission, status: 'Pending' },
    { ...mission, amount: 100 },
    { ...mission, date: 'invalid' },
    { ...mission, missionId: 'not-a-mission' },
    { ...mission, projectId: '' },
    milestone,
  ]
  assert.equal(getAchievementsSnapshot(owner, invalid).completedQuests, 0)
  assert.equal(getAchievementsSnapshot(owner, invalid).completedMilestones, 0)
  storage.setItem(achievementActivityKey(owner.id), JSON.stringify({ version: 1, userId: owner.id, records: [...invalid, mission, mission] }))
  assert.deepEqual(store.read(owner), [mission])
  storage.setItem(achievementActivityKey(owner.id), JSON.stringify({ version: 1, userId: 'another-account', records: entries }))
  assert.deepEqual(store.read(owner), [])
})

const completeAnswers = { q1: 1, q2: 2, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8: 1 }
const builder = { id: 'platform-builder', role: 'founder', full_name: 'Builder', username: 'builder', email: 'builder@example.test' }
const teammate = { id: 'platform-teammate', role: 'founder', full_name: 'Teammate', username: 'teammate', email: 'teammate@example.test' }

function platformFixture(initialUser = builder) {
  const storage = memoryStorage()
  let current = initialUser
  let timestamp = Date.parse('2026-10-14T12:00:00Z')
  let sequence = 0
  const auth = {
    getUser: () => current,
    updateProfileIdentity: (identity) => { current = { ...current, ...identity }; return current },
    findRegisteredFounderByEmail: (email) => [builder, teammate].find((user) => user.email === email) ?? null,
  }
  const now = () => timestamp
  const projects = createProjectStore({ storage, auth, now, createId: () => `project-${++sequence}` })
  const sources = {
    achievementStore: createAchievementStore({ storage }),
    projectStore: projects,
    profileStore: createProfileStore({ storage, auth, now }),
    eventStore: createEventStore({ storage, now }),
    collaborationStore: createCollaborationStore({ storage, auth, projects, now, createId: () => `collaboration-${++sequence}`, notify() {} }),
  }
  return {
    storage, sources,
    snapshot: (user = current) => getAchievementsSnapshot(user, [], sources),
    capture: () => sources.achievementStore.recordPlatform(current, readAchievementActivities(current, sources)),
    switchUser: (user) => { current = user },
    setTime: (value) => { timestamp = Date.parse(value) },
  }
}
const badgeById = (snapshot, id) => snapshot.badges.find((badge) => badge.id === id)

test('catalog contains 30 unique actionable LabX achievements and two explicitly unavailable guild awards', () => {
  const snapshot = getAchievementsSnapshot(owner, [], {})
  assert.equal(snapshot.badges.length, 30)
  assert.equal(new Set(snapshot.badges.map((badge) => badge.id)).size, 30)
  for (const badge of snapshot.badges) {
    assert.ok(badge.progressLabel)
    assert.ok(['gold', 'mint', 'violet'].includes(badge.tone))
    assert.ok(badge.icon)
    assert.ok(Number.isInteger(badge.target) && badge.target > 0)
    if (badge.id.startsWith('guild-')) {
      assert.ok(badge.availabilityNote)
      assert.equal(badge.actionPath, null)
      assert.equal(badge.actionLabel, null)
      assert.equal(badge.isEarned, false)
    } else {
      assert.ok(badge.actionPath.startsWith('/'))
      assert.ok(badge.actionLabel)
    }
  }
  assert.equal(badgeById(snapshot, 'milestone-maker').name, 'First Level Up')
})

test('project creation and valid assessment completion award only their own badges, never levels or guild membership', () => {
  const app = platformFixture()
  const project = app.sources.projectStore.createProject('New venture', builder.id)
  let snapshot = app.snapshot()
  assert.equal(badgeById(snapshot, 'project-starter').isEarned, true)
  assert.equal(badgeById(snapshot, 'assessment-complete').isEarned, false)
  app.setTime('2026-10-15T12:00:00Z')
  app.sources.projectStore.completeProject(project.id, completeAnswers, builder.id)
  snapshot = app.snapshot()
  assert.equal(badgeById(snapshot, 'assessment-complete').isEarned, true)
  assert.equal(badgeById(snapshot, 'assessment-complete').earnedAt, '2026-10-15T12:00:00.000Z')
  assert.equal(snapshot.completedQuests, 0)
  assert.equal(snapshot.completedMilestones, 0)
  assert.equal(snapshot.pointsBalance, 0)
  for (const id of ['milestone-maker', 'guild-founder', 'guild-member']) assert.equal(badgeById(snapshot, id).isEarned, false)
  app.switchUser(teammate)
  assert.equal(app.snapshot().earnedBadgeCount, 0)
  assert.equal(app.snapshot(builder).earnedBadgeCount, 0, 'A stale account cannot read another signed-in account through its stores')
})

test('profile achievements use saved validated details and never reveal private field content', () => {
  const app = platformFixture()
  app.sources.profileStore.save(builder.id, {
    bio: 'Private founder story', skills: ['Research', 'research', 'Design'], goals: 'Private ambition',
    startup: { name: 'Private venture', problem: 'Private problem', solution: 'Private solution' },
    website: 'https://example.test',
  })
  let snapshot = app.snapshot()
  for (const id of ['profile-story', 'profile-goals', 'startup-story', 'profile-link']) assert.equal(badgeById(snapshot, id).isEarned, true)
  assert.equal(badgeById(snapshot, 'profile-skills').current, 2, 'Case variants are one skill')
  app.sources.profileStore.save(builder.id, { skills: ['Research', 'Design', 'Engineering'] })
  snapshot = app.snapshot()
  assert.equal(badgeById(snapshot, 'profile-skills').isEarned, true)
  assert.equal(JSON.stringify(snapshot).includes('Private'), false)
  assert.deepEqual(snapshot.recognitionActivity, [])
  assert.equal(snapshot.pointsBalance, 0)
  app.switchUser(teammate)
  assert.equal(app.snapshot().earnedBadgeCount, 0)
})

test('event achievements distinguish confirmed registration, saved opportunities, and recorded participation', () => {
  const app = platformFixture()
  const events = app.sources.eventStore
  const external = MOCK_EVENTS.find((event) => event.registrationMethod === 'external')
  events.beginExternal(builder, external.id)
  let snapshot = app.snapshot()
  assert.equal(badgeById(snapshot, 'event-first').isEarned, false)
  assert.equal(badgeById(snapshot, 'event-participation').isEarned, false)
  events.confirmExternal(builder, external.id, 'REGISTERED-123')
  events.register(builder, 'customer-workshop')
  events.register(builder, 'prototype-hackathon')
  events.setSaved(builder, 'residency-opportunity', true)
  snapshot = app.snapshot()
  for (const id of ['event-first', 'event-explorer', 'event-saved']) assert.equal(badgeById(snapshot, id).isEarned, true)
  assert.equal(badgeById(snapshot, 'event-participation').isEarned, false, 'Registration does not prove participation')
  app.setTime('2026-10-18T12:00:00Z')
  const certificate = Buffer.from('%PDF-1.4\nSample certificate')
  events.saveOutcome(builder, 'customer-workshop', {
    participation: 'attended', feedback: 'Useful discovery practice',
    certificate: { name: 'certificate.pdf', type: 'application/pdf', size: certificate.length, dataUrl: `data:application/pdf;base64,${certificate.toString('base64')}` },
  })
  snapshot = app.snapshot()
  for (const id of ['event-participation', 'event-feedback', 'event-certificate']) assert.equal(badgeById(snapshot, id).isEarned, true)
  assert.equal(badgeById(snapshot, 'event-participation').earnedAt, '2026-10-18T12:00:00.000Z')
  assert.equal(snapshot.pointsBalance, 0)
  assert.deepEqual(snapshot.transactions, [])
  app.switchUser(teammate)
  assert.equal(app.snapshot().earnedBadgeCount, 0)
})

test('collaboration badges require own published opportunity or accepted membership, never pending requests', () => {
  const app = platformFixture()
  const project = app.sources.projectStore.createProject('Team venture', builder.id)
  app.sources.projectStore.completeProject(project.id, completeAnswers, builder.id)
  const collaboration = app.sources.collaborationStore
  collaboration.publishOpportunity(project.id, { title: 'Build together', description: 'Work on the prototype', contribution: 'Design', skills: 'Research' }, builder.id)
  assert.equal(badgeById(app.snapshot(), 'collaboration-post').isEarned, true)
  const invitation = collaboration.inviteFounder(project.id, teammate.email, 'member', builder.id)
  app.switchUser(teammate)
  assert.equal(badgeById(app.snapshot(), 'collaboration-post').isEarned, false)
  assert.equal(badgeById(app.snapshot(), 'roadmap-teammate').isEarned, false)
  app.setTime('2026-10-15T12:00:00Z')
  collaboration.respondInvitation(invitation.id, 'accepted', teammate.id)
  const snapshot = app.snapshot()
  assert.equal(badgeById(snapshot, 'roadmap-teammate').isEarned, true)
  assert.equal(badgeById(snapshot, 'roadmap-teammate').earnedAt, '2026-10-15T12:00:00.000Z')
  assert.equal(badgeById(snapshot, 'project-starter').isEarned, false, 'Joining another founder does not create an owned project')
  assert.equal(badgeById(snapshot, 'guild-member').isEarned, false)
  assert.equal(snapshot.completedQuests, 0)
})

test('reading achievements does not migrate legacy placement, create projects, or write account state', () => {
  const legacyUser = { ...builder, assessment_completed: true, assessment_result: { stage: 'Launch', level: 5, guild: 'A suggested guild' }, assessment_answers: completeAnswers }
  const app = platformFixture(legacyUser)
  let writes = 0
  app.storage.setItem = () => { writes += 1; throw new Error('Snapshot reads must not write') }
  const snapshot = app.snapshot()
  assert.equal(snapshot.earnedBadgeCount, 0)
  assert.equal(writes, 0)
  assert.equal(app.storage.getItem(projectsKey(builder.id)), null)
  assert.deepEqual(app.sources.projectStore.peekProjects(builder.id), [])
  assert.equal(writes, 0)
})

test('profile recognition keeps its first date after unrelated edits and remains earned after field removal', () => {
  const app = platformFixture()
  app.sources.profileStore.save(builder.id, { bio: 'My founder story', skills: ['Research', 'Design', 'Engineering'] })
  const first = app.capture()
  const earnedAt = badgeById(app.snapshot(), 'profile-story').earnedAt
  const originalLedger = app.storage.getItem(platformAchievementKey(builder.id))
  app.setTime('2026-10-18T12:00:00Z')
  app.sources.profileStore.save(builder.id, { city: 'Chennai' })
  assert.deepEqual(app.capture(), first)
  assert.equal(app.storage.getItem(platformAchievementKey(builder.id)), originalLedger, 'Unrelated source edits do not rewrite recognition')
  assert.equal(badgeById(app.snapshot(), 'profile-story').earnedAt, earnedAt)
  app.sources.profileStore.save(builder.id, { bio: '', skills: [] })
  app.capture()
  app.sources.achievementStore = createAchievementStore({ storage: app.storage })
  const snapshot = app.snapshot()
  assert.equal(badgeById(snapshot, 'profile-story').isEarned, true)
  assert.equal(badgeById(snapshot, 'profile-story').earnedAt, earnedAt)
  assert.equal(badgeById(snapshot, 'profile-skills').isEarned, true)
  assert.equal(snapshot.pointsBalance, 0)
  assert.deepEqual(snapshot.recognitionActivity, [])
  assert.equal(originalLedger.includes('Research'), false, 'Recognition does not duplicate private skill names')
})

test('saved event and project achievements survive unsaving and deletion and remain isolated after reload', () => {
  const app = platformFixture()
  const project = app.sources.projectStore.createProject('Temporary project', builder.id)
  app.sources.projectStore.completeProject(project.id, completeAnswers, builder.id)
  app.sources.eventStore.setSaved(builder, 'customer-workshop', true)
  app.capture()
  const saved = app.snapshot()
  app.setTime('2026-10-18T12:00:00Z')
  app.sources.eventStore.setSaved(builder, 'customer-workshop', false)
  app.sources.projectStore.renameProject(project.id, 'New title', builder.id)
  app.capture()
  assert.equal(badgeById(app.snapshot(), 'assessment-complete').earnedAt, badgeById(saved, 'assessment-complete').earnedAt)
  app.sources.projectStore.deleteProject(project.id, builder.id)
  app.capture()
  app.sources.achievementStore = createAchievementStore({ storage: app.storage })
  for (const id of ['event-saved', 'project-starter', 'assessment-complete']) {
    assert.equal(badgeById(app.snapshot(), id).isEarned, true)
    assert.equal(badgeById(app.snapshot(), id).earnedAt, badgeById(saved, id).earnedAt)
  }
  app.switchUser(teammate)
  app.capture()
  assert.equal(app.snapshot().earnedBadgeCount, 0)
  assert.deepEqual(app.sources.achievementStore.readPlatform(teammate), [])
  assert.equal(app.storage.getItem(platformAchievementKey(teammate.id)), null)
  app.switchUser(builder)
  assert.equal(app.snapshot().earnedBadgeCount, 3)
})

test('platform ledger sanitizes account, metric, points and dates while deduplicating earliest qualification', () => {
  const storage = memoryStorage()
  const store = createAchievementStore({ storage })
  const first = { id: 'ignored-id', userId: owner.id, source: 'platform', status: 'Recorded', amount: 0, metric: 'profileBio', targetId: owner.id, date: '2026-10-14T12:00:00Z' }
  const later = { ...first, date: '2026-10-18T12:00:00Z' }
  const earlier = { ...first, date: '2026-10-12T12:00:00Z' }
  const invalid = [null, { ...first, userId: 'someone-else' }, { ...first, metric: 'guildsJoined' }, { ...first, metric: 'quests' }, { ...first, source: 'roadmap' }, { ...first, status: 'Pending' }, { ...first, amount: 100 }, { ...first, targetId: '' }, { ...first, date: 'invalid' }]
  const initial = store.recordPlatform(owner, [...invalid, first, later, first])
  assert.equal(initial.length, 1)
  assert.equal(initial[0].id, JSON.stringify(['profileBio', owner.id]))
  assert.equal(initial[0].date, first.date)
  assert.throws(() => { initial[0].amount = 100 }, TypeError)
  const updated = store.recordPlatform(owner, [later, earlier])
  assert.equal(updated.length, 1)
  assert.equal(updated[0].date, earlier.date)
  assert.deepEqual(createAchievementStore({ storage }).readPlatform(owner), updated)
  assert.deepEqual(store.read(owner), [], 'Platform recognition never becomes roadmap contribution history')
  for (const user of [null, { ...owner, role: 'mentor' }, { ...owner, role: 'investor' }, { ...owner, id: '' }]) {
    assert.deepEqual(store.recordPlatform(user, [first]), [])
    assert.deepEqual(store.readPlatform(user), [])
  }
  storage.setItem(platformAchievementKey(owner.id), JSON.stringify({ version: 1, userId: owner.id, records: [...invalid, later, first] }))
  assert.equal(store.readPlatform(owner).length, 1)
  assert.equal(store.readPlatform(owner)[0].date, first.date)
  storage.setItem(platformAchievementKey(owner.id), JSON.stringify({ version: 1, userId: 'someone-else', records: [first] }))
  assert.deepEqual(store.readPlatform(owner), [])
})

test('snapshots merge stored recognition with current evidence without writing, double counting, or speculative guild awards', () => {
  const app = platformFixture()
  app.sources.profileStore.save(builder.id, { bio: 'Builder', skills: ['Research'] })
  app.capture()
  app.sources.profileStore.save(builder.id, { skills: ['Design'] })
  app.capture()
  assert.equal(badgeById(app.snapshot(), 'profile-skills').current, 1, 'Replacing a skill does not accumulate simultaneous skill slots')
  app.sources.eventStore.setSaved(builder, 'customer-workshop', true)
  let writes = 0
  app.storage.setItem = () => { writes += 1; throw new Error('Snapshot must not write') }
  const snapshot = app.snapshot()
  assert.equal(snapshot.earnedBadgeCount, 2, 'Current event evidence merges with the saved bio award')
  assert.equal(badgeById(snapshot, 'profile-story').current, 1)
  assert.equal(badgeById(snapshot, 'event-saved').isEarned, true)
  for (const id of ['guild-founder', 'guild-member']) assert.equal(badgeById(snapshot, id).isEarned, false)
  assert.equal(writes, 0)
})
