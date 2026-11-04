export function projectProgressPercent(project) {
  const progress = project.roadmap
    ? project.roadmap.progressPercent ?? 0
    : project.totalQuestions > 0
      ? project.answeredCount / project.totalQuestions * 100
      : 0
  return Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0
}

export function sortProjectsByProgress(projects) {
  return [...projects].sort((first, second) => (
    projectProgressPercent(second) - projectProgressPercent(first)
    || first.name.localeCompare(second.name, 'en', { sensitivity: 'base' })
    || String(first.id).localeCompare(String(second.id))
  ))
}
