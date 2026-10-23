const dayInIndia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
const timestamp = (value) => typeof value === 'string' ? Date.parse(value) : NaN

// Legacy roadmap daily-goal selector, retained for older integrations only.
// The dashboard uses independent coin-reward side quests from daily_side_quests.js.
export function createDailyQuestSnapshot({ user, projects = [], recognitionActivity = [], now = Date.now() }) {
  const day = dayInIndia.format(now)
  const isToday = (date) => Number.isFinite(timestamp(date)) && timestamp(date) <= now && dayInIndia.format(timestamp(date)) === day
  const completed = recognitionActivity.some((activity) => activity.userId === user.id
    && activity.source === 'roadmap' && activity.metric === 'quests' && activity.status === 'Approved' && isToday(activity.date))
    || projects.some((project) => Object.values(project.roadmap?.submissionsByMilestone || {}).some((submission) =>
      submission.submittedBy === user.id && submission.status === 'approved' && isToday(submission.approvedAt || submission.submittedAt)))
  const ready = projects.find((project) => project.roadmap && !project.roadmap.isComplete && project.currentMilestone)
  const draft = projects.find((project) => !project.assessmentCompleted)
  const action = completed ? 'View achievements' : ready ? 'Open today’s mission' : draft ? 'Continue assessment' : 'Choose a roadmap'
  const href = completed ? '/achievements'
    : ready ? `${ready.href}?milestone=${encodeURIComponent(ready.currentMilestone.id)}`
      : draft ? draft.href : '/roadmap'
  return {
    day,
    completed: completed ? 1 : 0,
    target: 1,
    title: completed ? 'Today’s quest is complete.' : 'Complete one roadmap mission.',
    description: completed ? 'You submitted a mission that passed review today. Come back tomorrow for your next daily goal.'
      : ready ? `Make progress on ${ready.name}: submit “${ready.currentMilestone.name}” and pass review.`
        : draft ? 'Finish your assessment to unlock a roadmap, then submit one mission that passes review.'
          : 'Choose your own roadmap or a team roadmap with an assigned mission, then submit work that passes review.',
    action,
    href,
  }
}
