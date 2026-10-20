import { ASSESSMENT_QUESTION_COUNT, ASSESSMENT_VERSION, DOMAIN_OPTIONS, SUPPORTED_DOMAIN_OPTIONS, validateAssessmentStep } from '../../assessment/services/mock_assessment.js'
import { normalizeAssessmentDraft } from '../../assessment/services/assessment_draft.js'
import { getAchievementsSnapshot } from '../../achievements/services/mock_achievements.js'
import { getLeaderboardSnapshot } from '../../leaderboard/services/mock_leaderboard.js'
import { MOCK_EVENTS, getRegistrationAvailability } from '../../events/services/mock_events.js'
import { ROADMAP_STAGE_NAMES } from '../../roadmap/services/mock_roadmap.js'
import { createRoadmapSnapshot } from '../../roadmap/services/roadmap_workflow.js'

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' ? value.trim() : ''
const timestamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0
const clone = (value) => Array.isArray(value)
  ? value.map(clone)
  : isRecord(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

function ownedProjects(user, projects) {
  if (user?.role !== 'founder' || !text(user.id)) return []
  const ids = new Set()
  return (Array.isArray(projects) ? projects : [])
    .filter((project) => project?.owner_id === user.id && text(project.id) && text(project.name))
    .slice()
    .sort((left, right) => timestamp(right.updated_at) - timestamp(left.updated_at)
      || timestamp(right.created_at) - timestamp(left.created_at)
      || compareText(left.id, right.id))
    .filter((project) => {
      if (ids.has(project.id)) return false
      ids.add(project.id)
      return true
    })
}

function summarizeProject(project) {
  const assessmentCompleted = project.assessment_completed === true
    && isRecord(project.assessment_result) && isRecord(project.assessment_answers)
  const answers = assessmentCompleted ? project.assessment_answers : normalizeAssessmentDraft(project.draft).answers
  const legacyCompleted = assessmentCompleted && project.assessment_result.assessment_version !== ASSESSMENT_VERSION
  const totalQuestions = legacyCompleted ? 7 : ASSESSMENT_QUESTION_COUNT
  const answeredCount = legacyCompleted ? totalQuestions : Array.from({ length: totalQuestions }, (_, index) => index + 1)
    .filter((step) => !validateAssessmentStep(answers, step)).length
  const result = assessmentCompleted ? project.assessment_result : null
  const domain = result
    ? SUPPORTED_DOMAIN_OPTIONS.find((name) => name === text(result.domain)) ?? null
    : !validateAssessmentStep(answers, 1) ? DOMAIN_OPTIONS[answers.q1 - 1] : null
  const stage = ROADMAP_STAGE_NAMES.find((name) => name.toLowerCase() === text(result?.stage).toLowerCase())
  const validPlacement = Boolean(result && domain && stage && Number.isInteger(result.level) && result.level >= 1 && result.level <= 5)
  // Placement coverage never creates account-wide points or achievements.
  const roadmap = validPlacement ? project.roadmap_snapshot ? clone(project.roadmap_snapshot) : createRoadmapSnapshot(project) : null
  const currentMilestone = roadmap?.stages.flatMap((item) => item.levels)
    .flatMap((level) => level.milestones)
    .find((milestone) => milestone.id === roadmap.currentMilestoneId) ?? null
  return {
    id: project.id,
    name: text(project.name),
    createdAt: timestamp(project.created_at) ? project.created_at : null,
    updatedAt: timestamp(project.updated_at) ? project.updated_at : null,
    assessmentCompleted,
    answeredCount,
    totalQuestions,
    domain,
    stage: roadmap ? roadmap.stages[roadmap.currentStageIndex].name : null,
    level: roadmap ? roadmap.currentLevel : null,
    href: `/roadmap/${encodeURIComponent(project.id)}${assessmentCompleted ? roadmap ? '' : '/result' : '/assessment'}`,
    action: assessmentCompleted
      ? roadmap ? 'Open roadmap' : 'View assessment result'
      : answeredCount ? 'Continue assessment' : 'Start assessment',
    roadmap,
    currentMilestone,
  }
}

function profileSnapshot(user) {
  const fields = user?.role === 'mentor'
    ? [
        ['expertise', 'Area of expertise', 120, true],
        ['experience', 'Years of experience', 80, true],
        ['availability', 'Monthly availability', 80, true],
      ]
    : user?.role === 'investor'
      ? [
          ['investmentFocus', 'Investment focus', 120, true],
          ['preferredStage', 'Preferred stage', 80, true],
          ['organization', 'Organization', 120, false],
        ]
      : []
  const profile = isRecord(user?.onboarding_profile) ? user.onboarding_profile : {}
  const details = fields.map(([key, label]) => ({ key, label, value: text(profile[key]) }))
  const valid = fields.length > 0 && fields.every(([key, , maxLength, required]) => {
    const value = text(profile[key])
    return (!required || Boolean(value)) && value.length <= maxLength
  })
  return { completed: user?.onboarding_completed === true && valid, details }
}

function savedRegistration(registrations, eventId) {
  const record = isRecord(registrations) && Object.hasOwn(registrations, eventId) ? registrations[eventId] : null
  if (!isRecord(record) || record.eventId !== eventId || record.status !== 'registered'
    || !timestamp(record.registeredAt) || typeof record.reminder !== 'boolean') return null
  return { eventId, status: 'registered', registeredAt: record.registeredAt, reminder: record.reminder }
}

function eventPreviews(user, events, registrations, now) {
  if (!text(user?.id)) return { upcomingEvents: [], registeredEvents: [] }
  const ids = new Set()
  const upcoming = (Array.isArray(events) ? events : [])
    .filter((event) => event?.type === 'event' && text(event.id)
      && Array.isArray(event.roles) && event.roles.includes(user.role)
      && timestamp(event.startsAt) && timestamp(event.endsAt) > now
      && timestamp(event.endsAt) > timestamp(event.startsAt))
    .slice()
    .sort((left, right) => timestamp(left.startsAt) - timestamp(right.startsAt) || compareText(left.id, right.id))
    .filter((event) => {
      if (ids.has(event.id)) return false
      ids.add(event.id)
      return true
    })
    .map((event) => {
      const registration = savedRegistration(registrations, event.id)
      return {
        ...clone(event),
        href: '/events',
        phase: timestamp(event.startsAt) <= now ? 'ongoing' : 'upcoming',
        isRegistered: Boolean(registration),
        registration,
        availability: getRegistrationAvailability(event, user, registration, now),
      }
    })
  return {
    upcomingEvents: upcoming.slice(0, 3),
    registeredEvents: upcoming.filter((event) => event.isRegistered).slice(0, 3),
  }
}

// Registrations must be the current account's eventStore.read(user).registrations.
// Achievement totals include the current founder's persisted demo recognition.
// This selector never awards points, completes work, or infers assignments.
export function getDashboardSnapshot({ user = null, projects = [], registrations = {}, events = MOCK_EVENTS, now = Date.now() } = {}) {
  const isFounder = user?.role === 'founder' && Boolean(text(user.id))
  const owned = ownedProjects(user, projects)
  const summaries = owned.map(summarizeProject)
  const achievements = isFounder ? getAchievementsSnapshot(user) : null
  return freeze({
    role: ['founder', 'mentor', 'investor'].includes(user?.role) ? user.role : null,
    isFounder,
    projects: summaries,
    projectCount: summaries.length,
    readyCount: summaries.filter((project) => Boolean(project.roadmap)).length,
    draftCount: summaries.filter((project) => !project.assessmentCompleted).length,
    unavailableCount: summaries.filter((project) => project.assessmentCompleted && !project.roadmap).length,
    achievements,
    leaderboard: isFounder ? getLeaderboardSnapshot({ user, projects: owned }) : null,
    activity: achievements ? achievements.transactions.slice(0, 5) : [],
    ...eventPreviews(user, events, registrations, now),
    profile: profileSnapshot(user),
  })
}
