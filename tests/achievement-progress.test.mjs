import assert from 'node:assert/strict'
import test from 'node:test'
import { roadmapAchievementProgress, streakAchievementProgress } from '../src/features/achievements/services/achievement_progress.js'
import { createMockRoadmap } from '../src/features/roadmap/services/mock_roadmap.js'

const missions = createMockRoadmap().stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))
const approvalDate = (index) => new Date(Date.UTC(2026, 0, index + 1, 12)).toISOString()
const approvals = (count, projectId = 'project-one', ownerId = 'owner') => missions.slice(0, count).map((mission, index) => ({
  metric: 'quests', ownerId, projectId, missionId: mission.id, date: approvalDate(index),
}))
const days = (count, start = '2026-09-01T12:00:00Z') => Array.from({ length: count }, (_, index) => ({
  date: new Date(Date.parse(start) + index * 86400000).toISOString(),
}))

test('roadmap progress cannot combine separate projects or owners', () => {
  for (const second of [approvals(37, 'project-two'), approvals(37, 'project-one', 'other-owner')]) {
    assert.deepEqual(roadmapAchievementProgress([...approvals(37), ...second], 50), {
      current: 49, isEarned: false, earnedAt: null, progress: 98,
    })
  }
})

test('roadmap thresholds use exact mission counts and the first qualifying approval date', () => {
  assert.equal(missions.length, 75)
  assert.deepEqual(roadmapAchievementProgress(approvals(38), 50), {
    current: 50, isEarned: true, earnedAt: approvalDate(37), progress: 100,
  })
  assert.deepEqual(roadmapAchievementProgress(approvals(74), 100), {
    current: 98, isEarned: false, earnedAt: null, progress: 98,
  })
  assert.deepEqual(roadmapAchievementProgress(approvals(75).reverse(), 100), {
    current: 100, isEarned: true, earnedAt: approvalDate(74), progress: 100,
  })
})

test('roadmap progress deduplicates missions, ignores other metrics, and takes the earliest qualifying roadmap', () => {
  const earlier = approvals(38, 'earlier-project').map((activity) => ({
    ...activity, date: new Date(Date.parse(activity.date) - 86400000 * 100).toISOString(),
  }))
  const latestDuplicate = { ...earlier[37], date: '2026-12-31T12:00:00Z' }
  const activities = [...approvals(38), latestDuplicate, ...earlier, { ...earlier[0], metric: 'milestones', missionId: missions[38].id }]
  assert.equal(roadmapAchievementProgress(activities, 50).earnedAt, earlier[37].date)
  const repeated = [...approvals(37), ...approvals(37), { ...approvals(38)[37], metric: 'milestones' }]
  assert.equal(roadmapAchievementProgress(repeated, 50).isEarned, false)
  assert.equal(roadmapAchievementProgress(repeated, 50).current, 49)
})

test('streak requires 30 distinct consecutive days and records the first qualifying activity', () => {
  const activity = days(30)
  const now = Date.parse(activity.at(-1).date)
  assert.deepEqual(streakAchievementProgress(activity.slice(0, 29), 30, now), {
    current: 29, isEarned: false, earnedAt: null, progress: 97,
  })
  assert.deepEqual(streakAchievementProgress([...activity].reverse(), 30, now), {
    current: 30, isEarned: true, earnedAt: activity.at(-1).date, progress: 100,
  })
})

test('duplicate activity on one day cannot extend a streak and a gap resets unfinished progress', () => {
  const activity = days(30)
  const now = Date.parse(activity.at(-1).date)
  const repeated = [...activity.slice(0, 29), ...activity.slice(0, 29)]
  assert.equal(streakAchievementProgress(repeated, 30, now).current, 29)
  const gap = activity.filter((_, index) => index !== 15)
  assert.deepEqual(streakAchievementProgress(gap, 30, now), {
    current: 14, isEarned: false, earnedAt: null, progress: 47,
  })
  assert.equal(streakAchievementProgress(activity.slice(0, 28), 30, now).current, 0)
})

test('streak day boundaries use IST midnight rather than UTC midnight', () => {
  const activity = [{ date: '2026-10-01T18:29:59Z' }, { date: '2026-10-01T18:30:00Z' }]
  assert.deepEqual(streakAchievementProgress(activity, 30, Date.parse('2026-10-01T18:30:01Z')), {
    current: 2, isEarned: false, earnedAt: null, progress: 7,
  })
  const sameDay = [{ date: '2026-10-01T18:30:00Z' }, { date: '2026-10-02T18:29:59Z' }]
  assert.equal(streakAchievementProgress(sameDay, 30, Date.parse('2026-10-02T18:29:59Z')).current, 1)
})

test('historical streak unlock persists and later streaks do not change its earned date', () => {
  const first = days(30)
  const second = days(30, '2026-11-01T12:00:00Z')
  const activities = [...second, ...first, { date: '2026-09-30T13:00:00Z' }]
  assert.deepEqual(streakAchievementProgress(activities, 30, Date.parse('2027-01-01T12:00:00Z')), {
    current: 30, isEarned: true, earnedAt: first.at(-1).date, progress: 100,
  })
})

test('future activity cannot complete a streak, including later on the current day', () => {
  const activity = days(30)
  const now = Date.parse('2026-09-30T11:59:59Z')
  assert.deepEqual(streakAchievementProgress(activity, 30, now), {
    current: 29, isEarned: false, earnedAt: null, progress: 97,
  })
  assert.deepEqual(streakAchievementProgress([{ date: '2027-01-01T00:00:00Z' }], 30, now), {
    current: 0, isEarned: false, earnedAt: null, progress: 0,
  })
})
