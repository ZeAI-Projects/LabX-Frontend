import assert from 'node:assert/strict'
import test from 'node:test'
import { achievementActivityKey, createAchievementStore, getAchievementsSnapshot, getMockPointsBalance } from '../src/features/achievements/services/mock_achievements.js'
import { createMockRoadmap } from '../src/features/roadmap/services/mock_roadmap.js'

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
