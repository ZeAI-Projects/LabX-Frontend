import { createMockRoadmap } from '../../roadmap/services/mock_roadmap.js'

const missionIds = new Set(createMockRoadmap().stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones.map((mission) => mission.id))))
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
const dayNumber = (timestamp) => {
  const parts = Object.fromEntries(dayFormat.formatToParts(timestamp).map(({ type, value }) => [type, value]))
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86400000
}
const result = (current, target, earnedAt = null) => ({
  current: Math.min(current, target),
  isEarned: earnedAt !== null,
  earnedAt,
  progress: Math.min(100, Math.round(current / target * 100)),
})

// Recognition is already account-scoped and validated. Keep each roadmap's
// personal approvals separate; placement and completed levels add no missions.
export function roadmapAchievementProgress(recognitionActivity, target) {
  const projects = new Map()
  for (const activity of recognitionActivity) {
    if (activity.metric !== 'quests' || !missionIds.has(activity.missionId)) continue
    const key = JSON.stringify([activity.ownerId, activity.projectId])
    if (!projects.has(key)) projects.set(key, new Map())
    const missions = projects.get(key)
    const previous = missions.get(activity.missionId)
    if (!previous || Date.parse(activity.date) < Date.parse(previous.date)) missions.set(activity.missionId, activity)
  }
  const threshold = Math.ceil(missionIds.size * target / 100)
  let current = 0
  let earnedAt = null
  for (const missions of projects.values()) {
    current = Math.max(current, Math.floor(missions.size / missionIds.size * 100))
    if (missions.size < threshold) continue
    const activities = [...missions.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    const date = activities[threshold - 1].date
    if (earnedAt === null || Date.parse(date) < Date.parse(earnedAt)) earnedAt = date
  }
  return result(current, target, earnedAt)
}

// One active calendar day counts once in IST. A completed streak remains an
// achievement, while unfinished progress expires after a missed day.
export function streakAchievementProgress(activities, target, now = Date.now()) {
  const days = new Map()
  for (const activity of activities) {
    const timestamp = Date.parse(activity.date)
    if (!Number.isFinite(timestamp) || timestamp > now) continue
    const day = dayNumber(timestamp)
    const previous = days.get(day)
    if (!previous || timestamp < Date.parse(previous)) days.set(day, activity.date)
  }
  let streak = 0
  let previousDay = null
  for (const [day, date] of [...days].sort(([left], [right]) => left - right)) {
    streak = previousDay !== null && day === previousDay + 1 ? streak + 1 : 1
    if (streak >= target) return result(target, target, date)
    previousDay = day
  }
  const today = dayNumber(now)
  const current = previousDay === today || previousDay === today - 1 ? streak : 0
  return result(current, target)
}
