import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js'
import { createMockRoadmap } from '../../roadmap/services/mock_roadmap.js'
import { readAchievementActivities } from './achievement_sources.js'
import { roadmapAchievementProgress, streakAchievementProgress } from './achievement_progress.js'

export const ACHIEVEMENTS_CHANGE_EVENT = 'labx:achievements-change'

const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

// Roadmap recognition uses approved submissions only. Placement never creates
// completion records, and no achievement changes the LabX Points ledger.
const BADGES = freeze([
  { id: 'first-quest', name: 'First Step', category: 'Missions', icon: 'flag', description: 'Start your journey with your first approved mission.', criteria: 'Complete 1 mission', metric: 'quests', target: 1 },
  { id: 'mission-master', name: 'Mission Master', category: 'Missions', icon: 'trophy', description: 'Build a record of 100 approved missions across your roadmaps.', criteria: 'Complete 100 missions', metric: 'quests', target: 100 },
  { id: 'event-attendance-explorer', name: 'Event Explorer', category: 'Events', icon: 'compass', description: 'Learn and connect through recorded event participation.', criteria: 'Attend 10 events', metric: 'eventParticipation', target: 10 },
  { id: 'event-champion', name: 'Event Champion', category: 'Events', icon: 'award', description: 'Celebrate your participation in 25 different events.', criteria: 'Attend 25 events', metric: 'eventParticipation', target: 25 },
  { id: 'roadmap-builder', name: 'Roadmap Builder', category: 'Roadmap', icon: 'route', description: 'Complete half of one roadmap through your own approved missions.', criteria: 'Reach 50% progress in an individual roadmap', metric: 'roadmapProgress', target: 50 },
  { id: 'roadmap-champion', name: 'Roadmap Champion', category: 'Roadmap', icon: 'mountain', description: 'Complete every mission in one roadmap with your own approved work.', criteria: 'Reach 100% progress in an individual roadmap', metric: 'roadmapProgress', target: 100 },
  { id: 'consistency-champion', name: 'Consistency Champion', category: 'Consistency', icon: 'zap', description: 'Record mission or platform activity on 30 consecutive days, counted in IST.', criteria: 'Maintain a 30-day activity streak', metric: 'activityStreak', target: 30 },
  { id: 'community-connect', name: 'Community Connect', category: 'Social Interaction', icon: 'users', description: 'Grow your community by connecting with five different people.', criteria: 'Connect with 5 unique users', metric: 'uniqueConnections', target: 5, availabilityNote: 'Connection tracking will be available with Social. This achievement will unlock once five unique connections are recorded.' },
  { id: 'conversation-starter', name: 'Conversation Starter', category: 'Social Interaction', icon: 'message', description: 'Share your ideas and start conversations in the community.', criteria: 'Publish 10 eligible posts', metric: 'eligiblePosts', target: 10, availabilityNote: 'Post tracking will be available with Social. This achievement will count eligible published posts when that feature is available.' },
  { id: 'community-contributor', name: 'Community Contributor', category: 'Social Interaction', icon: 'handshake', description: 'Help other members with answers and useful contributions.', criteria: 'Receive 5 accepted answers or verified helpful contributions', metric: 'helpfulContributions', target: 5, availabilityNote: 'Contribution recognition will be available with Social. This achievement will count accepted answers and verified helpful contributions.' },
  { id: 'quest-builder', name: 'Steady Builder', icon: 'zap', description: 'Make steady progress across your roadmap.', criteria: 'Submit 15 roadmap missions that pass review.', metric: 'quests', target: 15 },
  { id: 'quest-specialist', name: 'Making an Impact', icon: 'flag', description: 'Turn a growing body of work into real momentum.', criteria: 'Submit 25 roadmap missions that pass review.', metric: 'quests', target: 25 },
  { id: 'quest-master', name: 'Builder at Heart', icon: 'rocket', description: 'Keep showing up and putting your ideas into practice.', criteria: 'Submit 50 roadmap missions that pass review.', metric: 'quests', target: 50 },
  { id: 'quest-legend', name: 'Roadmap Legend', icon: 'trophy', description: 'Build an exceptional record of approved work.', criteria: 'Submit 75 roadmap missions that pass review.', metric: 'quests', target: 75 },
  { id: 'level-climber', name: 'Level Climber', icon: 'mountain', description: 'Keep growing beyond your first few levels.', criteria: 'Complete 5 levels with all 3 missions approved from your own submissions.', metric: 'milestones', target: 5 },
  { id: 'level-trailblazer', name: 'Trailblazer', icon: 'route', description: 'Let completed work mark the path you have travelled.', criteria: 'Complete 10 levels with all 3 missions approved from your own submissions.', metric: 'milestones', target: 10 },
  { id: 'level-summit', name: 'Summit Seeker', icon: 'trophy', description: 'Reach a new height in your founder journey.', criteria: 'Complete 25 levels with all 3 missions approved from your own submissions.', metric: 'milestones', target: 25 },
  { id: 'profile-story', name: 'Tell Your Story', icon: 'user', description: 'Introduce the person behind your venture.', criteria: 'Save a bio on your LabX profile.', metric: 'profileBio', target: 1 },
  { id: 'profile-skills', name: 'Your Toolkit', icon: 'sparkles', description: 'Show the strengths you bring to the community.', criteria: 'Add 3 different skills to your profile.', metric: 'profileSkills', target: 3 },
  { id: 'profile-goals', name: 'Eyes on the Future', icon: 'compass', description: 'Give your next steps a clear direction.', criteria: 'Save your goals on your LabX profile.', metric: 'profileGoals', target: 1 },
  { id: 'startup-story', name: 'Venture Vision', icon: 'rocket', description: 'Share what your startup is here to change.', criteria: 'Save your startup name, problem and solution in your profile.', metric: 'startupStory', target: 1 },
  { id: 'event-first', name: 'Count Me In', icon: 'calendar', description: 'Make room for your next learning opportunity.', criteria: 'Register for one LabX event or save a confirmed external registration.', metric: 'eventRegistrations', target: 1 },
  { id: 'event-explorer', name: 'Opportunity Explorer', icon: 'compass', description: 'Keep finding new spaces to learn and connect.', criteria: 'Register for 3 different events or save their external registration confirmations.', metric: 'eventRegistrations', target: 3 },
  { id: 'event-participation', name: 'A New Experience', icon: 'calendar', description: 'Keep a record of what you took part in.', criteria: 'Record your participation in a registered event after it starts.', metric: 'eventParticipation', target: 1 },
  { id: 'event-feedback', name: 'Share Your Takeaway', icon: 'message', description: 'Capture feedback from your event experience.', criteria: 'Save written feedback in one event participation record.', metric: 'eventFeedback', target: 1 },
  { id: 'event-certificate', name: 'Proof of Progress', icon: 'award', description: 'Keep your learning evidence close at hand.', criteria: 'Attach a certificate to one event participation record.', metric: 'eventCertificates', target: 1 },
  { id: 'event-saved', name: 'On Your Radar', icon: 'bookmark', description: 'Save an opportunity you want to come back to.', criteria: 'Save one event to your LabX event list.', metric: 'savedEvents', target: 1 },
  { id: 'collaboration-post', name: 'Open for Collaboration', icon: 'users', description: 'Invite the community to help build your venture.', criteria: 'Publish a collaboration opportunity for one of your projects.', metric: 'collaborationPosts', target: 1 },
  { id: 'roadmap-teammate', name: 'Better Together', icon: 'handshake', description: 'Join another founder on their roadmap.', criteria: 'Join a project team through an accepted invitation or join request.', metric: 'joinedRoadmaps', target: 1 },
  { id: 'profile-link', name: 'Stay Connected', icon: 'user', description: 'Help the community discover more of your work.', criteria: 'Save a website, portfolio or LinkedIn link on your profile.', metric: 'profileLink', target: 1 },
].map((badge) => ({ ...badge, ...badgePresentation(badge.metric) })))

function badgePresentation(metric) {
  if (metric === 'roadmapProgress') return { progressLabel: '% roadmap progress', actionPath: '/roadmap', actionLabel: 'Open roadmaps', tone: 'violet' }
  if (metric === 'activityStreak') return { progressLabel: 'consecutive days', actionPath: '/dashboard', actionLabel: 'Continue your journey', tone: 'gold' }
  if (['uniqueConnections', 'eligiblePosts', 'helpfulContributions'].includes(metric)) return { progressLabel: { uniqueConnections: 'unique connections', eligiblePosts: 'eligible posts', helpfulContributions: 'recognized contributions' }[metric], actionPath: null, actionLabel: null, tone: 'mint' }
  if (['quests', 'milestones'].includes(metric)) return { progressLabel: metric === 'quests' ? 'approved missions' : 'completed levels', actionPath: '/roadmap', actionLabel: 'Open roadmaps', tone: 'violet' }
  if (['projects', 'assessments'].includes(metric)) return { progressLabel: metric === 'projects' ? 'projects created' : 'assessments completed', actionPath: metric === 'projects' ? '/roadmap/new' : '/roadmap', actionLabel: metric === 'projects' ? 'Create a project' : 'Open projects', tone: 'mint' }
  if (metric.startsWith('guild')) return { progressLabel: metric === 'guildsCreated' ? 'guilds created' : 'guilds joined', actionPath: null, actionLabel: null, tone: 'gold' }
  if (['profileBio', 'profileSkills', 'profileGoals', 'startupStory', 'profileLink'].includes(metric)) return { progressLabel: { profileBio: 'bios saved', profileSkills: 'skills added', profileGoals: 'goals saved', startupStory: 'startup stories saved', profileLink: 'profile links saved' }[metric], actionPath: '/profile', actionLabel: 'Edit your profile', tone: 'mint' }
  if (['eventRegistrations', 'eventParticipation', 'eventFeedback', 'eventCertificates', 'savedEvents'].includes(metric)) return { progressLabel: { eventRegistrations: 'registrations confirmed', eventParticipation: 'participation records', eventFeedback: 'feedback records', eventCertificates: 'certificates attached', savedEvents: 'events saved' }[metric], actionPath: '/events', actionLabel: 'Explore events', tone: 'gold' }
  return { progressLabel: { collaborationPosts: 'opportunities published', joinedRoadmaps: 'teams joined' }[metric], actionPath: metric === 'joinedRoadmaps' ? '/roadmap?join=1' : '/roadmap', actionLabel: metric === 'joinedRoadmaps' ? 'Find a team' : 'Open projects', tone: 'mint' }
}

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
export const platformAchievementKey = (userId) => `labx:platform-achievements:v1:${encodeURIComponent(userId)}`
const platformMetrics = new Set(['projects', 'assessments', 'profileBio', 'profileSkills', 'profileGoals', 'startupStory', 'profileLink', 'eventRegistrations', 'eventParticipation', 'eventFeedback', 'eventCertificates', 'savedEvents', 'collaborationPosts', 'joinedRoadmaps', 'activityDays'])

function sanitizePlatformActivity(user, records) {
  if (!eligible(user) || !Array.isArray(records)) return []
  const unique = new Map()
  for (const item of records) {
    if (!isRecord(item) || item.userId !== user.id || item.source !== 'platform' || item.status !== 'Recorded'
      || item.amount !== 0 || !platformMetrics.has(item.metric) || !validId(item.targetId) || !validDate(item.date)) continue
    const id = JSON.stringify([item.metric, item.targetId])
    const entry = { id, userId: user.id, source: 'platform', status: 'Recorded', amount: 0, metric: item.metric, targetId: item.targetId, date: item.date }
    if (!unique.has(id) || Date.parse(entry.date) < Date.parse(unique.get(id).date)) unique.set(id, entry)
  }
  return [...unique.values()].sort(byDate)
}

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

  function readPlatform(user) {
    if (!eligible(user)) return freeze([])
    const saved = local.readJSON(platformAchievementKey(user.id))
    return freeze(sanitizePlatformActivity(user, saved?.version === 1 && saved.userId === user.id ? saved.records : []))
  }

  // Called by the application observer after a source feature saves. Reads and
  // render-time snapshots remain pure, and recognition never awards points.
  function recordPlatform(user, validatedSourceRecords) {
    const existing = readPlatform(user)
    if (!eligible(user) || !Array.isArray(validatedSourceRecords)) return existing
    const records = sanitizePlatformActivity(user, [...existing, ...validatedSourceRecords])
    if (records.length === existing.length && records.every((entry, index) => entry.id === existing[index].id && entry.date === existing[index].date)) return existing
    local.writeJSON(platformAchievementKey(user.id), { version: 1, userId: user.id, records })
    globalThis.window?.dispatchEvent(new Event(ACHIEVEMENTS_CHANGE_EVENT))
    return freeze(records)
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

  return { read, recordRoadmap, readPlatform, recordPlatform }
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

export function getAchievementsSnapshot(user, activityRecords = achievementStore.read(user), sources) {
  const transactions = transactionsFor(user)
  const recognitionActivity = sanitizeActivity(user, activityRecords)
  const approved = [...transactions.filter((entry) => entry.status === 'Approved'), ...recognitionActivity].sort(byDate)
  const quests = approved.filter((entry) => entry.metric === 'quests')
  const milestones = approved.filter((entry) => entry.metric === 'milestones')
  const platformStore = sources?.achievementStore ?? achievementStore
  const platformActivity = sanitizePlatformActivity(user, [...platformStore.readPlatform(user), ...readAchievementActivities(user, sources)])
  const badges = BADGES.map((badge) => {
    if (badge.metric === 'roadmapProgress') return { ...badge, ...roadmapAchievementProgress(recognitionActivity, badge.target) }
    if (badge.metric === 'activityStreak') return { ...badge, ...streakAchievementProgress([...recognitionActivity, ...platformActivity], badge.target) }
    const activities = badge.metric === 'quests' ? quests : badge.metric === 'milestones' ? milestones : platformActivity.filter((entry) => entry.metric === badge.metric)
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
