import { projectStore } from '../../projects/services/project_store.js'
import { profileStore } from '../../profile/services/profile_store.js'
import { eventStore } from '../../events/services/mock_events.js'
import { collaborationStore } from '../../roadmap/services/roadmap_collaboration.js'
import { ASSESSMENT_QUESTION_COUNT, validateAssessmentStep } from '../../assessment/services/mock_assessment.js'

const defaultSources = { projectStore, profileStore, eventStore, collaborationStore }
const text = (value) => typeof value === 'string' && value.trim().length > 0
const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const read = (operation, fallback) => { try { return operation() ?? fallback } catch { return fallback } }

// Consume each feature's validated, account-scoped API. Never interpret raw
// storage, assessment guild suggestions, or external registration attempts as
// completed actions. Only counts and qualifying dates leave this adapter.
export function readAchievementActivities(user, sources = defaultSources) {
  if (user?.role !== 'founder' || !text(user.id)) return []
  const records = new Map()
  function add(metric, id, completedAt) {
    if (!text(id) || !date(completedAt)) return
    const key = JSON.stringify([metric, id])
    const entry = { id: key, userId: user.id, source: 'platform', status: 'Recorded', amount: 0, metric, targetId: id, date: completedAt }
    if (!records.has(key) || Date.parse(completedAt) < Date.parse(records.get(key).date)) records.set(key, entry)
  }
  const projects = read(() => sources.projectStore.peekProjects(user.id), []).filter((project) => project?.owner_id === user.id && text(project.id))
  for (const project of projects) {
    add('projects', project.id, project.created_at)
    if (project.assessment_completed === true && project.assessment_result
      && Array.from({ length: ASSESSMENT_QUESTION_COUNT }, (_, index) => index + 1).every((step) => !validateAssessmentStep(project.assessment_answers, step))) {
      add('assessments', project.id, project.updated_at)
    }
  }

  const profile = read(() => sources.profileStore.read(user.id), {})
  if (text(profile.bio)) add('profileBio', user.id, profile.updatedAt)
  const skills = new Set((Array.isArray(profile.skills) ? profile.skills : []).filter(text).map((skill) => skill.trim().toLocaleLowerCase()))
  // Preserve the highest qualifying skill count without duplicating private
  // profile content or counting replacement skills as simultaneous entries.
  for (let index = 1; index <= skills.size; index += 1) add('profileSkills', `${user.id}:skill:${index}`, profile.updatedAt)
  if (text(profile.goals)) add('profileGoals', user.id, profile.updatedAt)
  if (['website', 'portfolio', 'linkedin'].some((key) => text(profile[key]))) add('profileLink', user.id, profile.updatedAt)
  if (['name', 'problem', 'solution'].every((key) => text(profile.startup?.[key]))) add('startupStory', user.id, profile.updatedAt)

  const events = read(() => sources.eventStore.read(user), {})
  for (const [id, registration] of Object.entries(events.registrations ?? {})) {
    if (registration.status !== 'registered' || registration.eventId !== id) continue
    add('eventRegistrations', id, registration.registeredAt)
    const outcome = events.outcomes?.[id]
    if (outcome?.status !== 'completed') continue
    add('eventParticipation', id, outcome.updatedAt)
    if (text(outcome.feedback)) add('eventFeedback', id, outcome.updatedAt)
    if (outcome.certificate) add('eventCertificates', id, outcome.updatedAt)
  }
  for (const [id, saved] of Object.entries(events.savedEvents ?? {})) {
    if (saved.eventId === id) add('savedEvents', id, saved.savedAt)
  }

  const opportunities = read(() => sources.collaborationStore.listOpportunities(user.id), [])
  for (const opportunity of opportunities) {
    if (opportunity.ownerId === user.id && ['published', 'closed'].includes(opportunity.status)) add('collaborationPosts', opportunity.id, opportunity.createdAt)
  }
  const joined = read(() => sources.collaborationStore.listJoinedProjects(user.id), [])
  const joinedKeys = new Set(joined.map((project) => JSON.stringify([project.owner_id, project.id])))
  const invitations = read(() => sources.collaborationStore.listInvitations(user.id), [])
  const requests = read(() => sources.collaborationStore.listMyJoinRequests(user.id), [])
  for (const membership of [...invitations.filter((item) => item.recipientId === user.id), ...requests.filter((item) => item.applicantId === user.id)]) {
    const key = JSON.stringify([membership.ownerId, membership.projectId])
    if (['accepted', 'resolved'].includes(membership.status) && joinedKeys.has(key)) add('joinedRoadmaps', key, membership.respondedAt)
  }
  return [...records.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id))
}
