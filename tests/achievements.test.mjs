import assert from 'node:assert/strict'
import test from 'node:test'
import { getAchievementsSnapshot, getMockPointsBalance } from '../src/features/achievements/services/mock_achievements.js'

const demoUser = { id: 'demo-founder', role: 'founder' }

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
  for (const user of [null, { id: 'new-founder', role: 'founder' }, { id: 'demo-founder', role: 'mentor' }, { id: 'new-founder', assessment_completed: true, assessment_result: { stage: 'Launch', level: 5 } }]) {
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
