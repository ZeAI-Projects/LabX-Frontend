import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js'
import { createMockRoadmap } from '../../roadmap/services/mock_roadmap.js'

export const ACHIEVEMENTS_CHANGE_EVENT = 'labx:achievements-change'

const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

// Recognition uses approved submissions only. Placement and assessment results
// never create completion records, and recognition does not award LabX Points.
const BADGES = freeze([
  { id: 'first-quest', name: 'First Steps', icon: 'flag', description: 'Your founder journey starts with one completed mission.', criteria: 'Submit 1 roadmap mission that passes review.', metric: 'quests', target: 1 },
  { id: 'quest-explorer', name: 'Quest Explorer', icon: 'compass', description: 'Turn your early ideas into completed work.', criteria: 'Submit 3 roadmap missions that pass review.', metric: 'quests', target: 3 },
  { id: 'milestone-maker', name: 'Milestone Maker', icon: 'mountain', description: 'Bring a complete level of work together.', criteria: 'Complete all 3 missions in one level with your own approved submissions.', metric: 'milestones', target: 1 },
  { id: 'quest-momentum', name: 'Quest Momentum', icon: 'zap', description: 'Build momentum through consistent progress.', criteria: 'Submit 5 roadmap missions that pass review.', metric: 'quests', target: 5 },
  { id: 'pathfinder', name: 'Pathfinder', icon: 'route', description: 'Create a path forward, one completed level at a time.', criteria: 'Complete 3 levels, each with all 3 missions approved from your own submissions.', metric: 'milestones', target: 3 },
  { id: 'quest-champion', name: 'Quest Champion', icon: 'trophy', description: 'Grow your collection as your venture takes shape.', criteria: 'Submit 10 roadmap missions that pass review.', metric: 'quests', target: 10 },
])

const catalog = createMockRoadmap()
const levels = catalog.stages.flatMap((stage) => stage.levels.map((level) => ({
  id: level.id,
  name: `${stage.name} · Level ${level.number}`,
  missionIds: level.milestones.map((mission) => mission.id),
})))
const missionsById = new Map(catalog.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones)).map((mission) => [mission.id, mission]))
const levelsById = new Map(levels.map((level) => [level.id, level]))
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const validId = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 512
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const eligible = (user) => user?.role === 'founder' && validId(user?.id)
const activityId = (ownerId, projectId, metric, targetId) => JSON.stringify(['roadmap', ownerId, projectId, metric, targetId])
const byDate = (a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id)

export const achievementActivityKey = (userId) => `labx:achievement-activity:v1:${encodeURIComponent(userId)}`

function activityFor(user, project, metric, targetId, date) {
  const target = metric === 'quests' ? missionsById.get(targetId) : levelsById.get(targetId)
  return {
    id: activityId(project.owner_id, project.id, metric, targetId),
    userId: user.id,
    ownerId: project.owner_id,
    projectId: project.id,
    ...(metric === 'quests' ? { missionId: targetId } : { levelId: targetId }),
    source: 'roadmap',
    status: 'Approved',
    amount: 0,
    metric,
    date,
    type: metric === 'quests' ? 'Mission completion' : 'Level milestone',
    activity: target.name,
  }
}

function sanitizeActivity(user, records) {
  if (!eligible(user) || !Array.isArray(records)) return []
  const unique = new Map()
  for (const item of records) {
    if (!isRecord(item) || item.userId !== user.id || !validId(item.ownerId) || !validId(item.projectId)
      || item.source !== 'roadmap' || item.status !== 'Approved' || item.amount !== 0 || !validDate(item.date)
      || !['quests', 'milestones'].includes(item.metric)) continue
    const targetId = item.metric === 'quests' ? item.missionId : item.levelId
    const target = item.metric === 'quests' ? missionsById.get(targetId) : levelsById.get(targetId)
    if (!target) continue
    const entry = activityFor(user, { owner_id: item.ownerId, id: item.projectId }, item.metric, targetId, item.date)
    if (!unique.has(entry.id) || Date.parse(entry.date) < Date.parse(unique.get(entry.id).date)) unique.set(entry.id, entry)
  }
  // A saved level milestone must retain the three approved contributions that
  // qualified it. This also rejects malformed partial recognition histories.
  return [...unique.values()].filter((entry) => entry.metric === 'quests'
    || levelsById.get(entry.levelId).missionIds.every((id) => unique.has(activityId(entry.ownerId, entry.projectId, 'quests', id))))
    .sort(byDate)
}

export function createAchievementStore({ storage = localStore } = {}) {
  const local = storage?.readJSON ? storage : createSafeStorage(storage)

  function read(user) {
    if (!eligible(user)) return freeze([])
    const saved = local.readJSON(achievementActivityKey(user.id))
    return freeze(sanitizeActivity(user, saved?.version === 1 && saved.userId === user.id ? saved.records : []))
  }

  // The roadmap service calls this only after persisting and authorizing an
  // approved submission. It supplies its validated snapshot, never raw storage.
  function recordRoadmap(user, project, validatedSnapshot) {
    if (!eligible(user) || !validId(project?.id) || !validId(project?.owner_id)
      || !Array.isArray(validatedSnapshot?.stages) || !isRecord(validatedSnapshot?.submissionsByMilestone)) return read(user)
    const existing = read(user)
    const entries = new Map(existing.map((entry) => [entry.id, entry]))
    const completedIds = new Set(validatedSnapshot.stages.flatMap((stage) => Array.isArray(stage?.levels)
      ? stage.levels.flatMap((level) => Array.isArray(level?.milestones)
        ? level.milestones.filter((mission) => mission?.state === 'completed').map((mission) => mission.id) : []) : []))
    for (const [missionId] of missionsById) {
      const submission = validatedSnapshot.submissionsByMilestone[missionId]
      if (!completedIds.has(missionId) || !isRecord(submission) || submission.missionId !== missionId
        || submission.status !== 'approved' || submission.submittedBy !== user.id || !validDate(submission.submittedAt)) continue
      const entry = activityFor(user, project, 'quests', missionId, validDate(submission.approvedAt) ? submission.approvedAt : submission.submittedAt)
      if (!entries.has(entry.id)) entries.set(entry.id, entry)
    }
    for (const level of levels) {
      const contributions = level.missionIds.map((id) => entries.get(activityId(project.owner_id, project.id, 'quests', id)))
      if (!contributions.every(Boolean)) continue
      const date = [...contributions].sort(byDate).at(-1).date
      const entry = activityFor(user, project, 'milestones', level.id, date)
      if (!entries.has(entry.id)) entries.set(entry.id, entry)
    }
    if (entries.size === existing.length) return existing
    const records = sanitizeActivity(user, [...entries.values()])
    local.writeJSON(achievementActivityKey(user.id), { version: 1, userId: user.id, records })
    globalThis.window?.dispatchEvent(new Event(ACHIEVEMENTS_CHANGE_EVENT))
    return freeze(records)
  }

  return { read, recordRoadmap }
}

export const achievementStore = createAchievementStore()

const DEMO_TRANSACTIONS = freeze([
  { id: 'DEMO-001', date: '2026-10-05T10:00:00Z', type: 'Quest approval', activity: 'Define your problem', metric: 'quests', amount: 100, status: 'Approved' },
  { id: 'DEMO-002', date: '2026-10-08T11:00:00Z', type: 'Quest approval', activity: 'Explore your audience', metric: 'quests', amount: 100, status: 'Approved' },
  { id: 'DEMO-003', date: '2026-10-10T09:30:00Z', type: 'Quest approval', activity: 'Write your value proposition', metric: 'quests', amount: 100, status: 'Approved' },
  { id: 'DEMO-004', date: '2026-10-11T12:00:00Z', type: 'Milestone completion', activity: 'Problem discovery', metric: 'milestones', amount: 150, status: 'Approved' },
  { id: 'DEMO-005', date: '2026-10-12T10:00:00Z', type: 'Quest submission', activity: 'Plan customer interviews', metric: 'quests', amount: 100, status: 'Pending' },
])

function transactionsFor(user) {
  return user?.id === 'demo-founder' && user?.role === 'founder' ? DEMO_TRANSACTIONS : []
}

export function getMockPointsBalance(user) {
  return transactionsFor(user).reduce((balance, entry) => balance + (entry.status === 'Approved' ? entry.amount : 0), 0)
}

export function getAchievementsSnapshot(user, activityRecords = achievementStore.read(user)) {
  const transactions = transactionsFor(user)
  const recognitionActivity = sanitizeActivity(user, activityRecords)
  const approved = [...transactions.filter((entry) => entry.status === 'Approved'), ...recognitionActivity].sort(byDate)
  const quests = approved.filter((entry) => entry.metric === 'quests')
  const milestones = approved.filter((entry) => entry.metric === 'milestones')
  const badges = BADGES.map((badge) => {
    const activities = badge.metric === 'quests' ? quests : milestones
    const isEarned = activities.length >= badge.target
    return {
      ...badge,
      isEarned,
      earnedAt: isEarned ? activities[badge.target - 1].date : null,
      current: Math.min(activities.length, badge.target),
      progress: Math.min(100, Math.round(activities.length / badge.target * 100)),
    }
  })
  const nextAchievement = badges.filter((badge) => !badge.isEarned).sort((a, b) => b.progress - a.progress || a.target - b.target)[0] ?? null
  const pointsBalance = getMockPointsBalance(user)
  return freeze({
    isDemo: transactions.length > 0,
    pointsBalance,
    approvedPoints: pointsBalance,
    earnedBadgeCount: badges.filter((badge) => badge.isEarned).length,
    completedQuests: quests.length,
    completedMilestones: milestones.length,
    questProgress: { completed: quests.length, target: 10 },
    milestoneProgress: { completed: milestones.length, target: 3 },
    badges,
    transactions: [...transactions].reverse(),
    recognitionActivity,
    nextAchievement,
  })
}
