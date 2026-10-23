import { getCompanionRoadmapRoute } from './companion_navigation.js'

// The companion needs progress and mission instructions, never submitted evidence.
function joinedSummary(access, roadmap, pathname) {
  const current = roadmap.stages.flatMap(stage => stage.levels.flatMap(level => level.milestones))
    .find(mission => mission.id === roadmap.currentMilestoneId)
  const canOpenCurrent = current && (access.role === 'owner'
    || current.id !== 'discover-l1-m1' && access.assignedMissionIds.includes(current.id))
  return {
    id: access.project.id,
    ownerId: access.project.owner_id,
    name: access.project.name,
    domain: roadmap.domain,
    assessmentCompleted: true,
    stage: roadmap.stages[roadmap.currentStageIndex]?.name || null,
    level: roadmap.currentLevel,
    href: pathname.replace(/\/$/, ''),
    action: 'Open roadmap',
    isJoined: access.role === 'member',
    roadmap: {
      isComplete: roadmap.isComplete,
      completedCount: roadmap.completedCount,
      creditedCount: roadmap.creditedCount,
      totalCount: roadmap.totalCount,
      progressPercent: roadmap.progressPercent,
    },
    currentMilestone: canOpenCurrent ? { id: current.id, name: current.name, description: current.description } : null,
  }
}

export function getCompanionProjectContext({ pathname = '', search = '', summaries = [], selectedProjectId = '', selectedSession = null, user = null, getAccess, readRoadmap } = {}) {
  const inChats = /^\/chats\/?$/.test(pathname)
  const params = new URLSearchParams(search)
  const chatProjectId = selectedSession ? selectedSession.projectId : params.get('project')
  const chatOwnerId = selectedSession ? selectedSession.projectOwnerId : params.get('owner')
  const sharedChat = inChats && chatOwnerId && chatOwnerId !== user?.id
  const route = sharedChat ? { kind: 'joined', ownerId: chatOwnerId, projectId: chatProjectId, pathname: `/roadmap/joined/${encodeURIComponent(chatOwnerId)}/${encodeURIComponent(chatProjectId || '')}` } : getCompanionRoadmapRoute(pathname)
  if (route?.kind === 'joined') {
    let project = null
    if (user?.role === 'founder' && user.id) {
      try {
        const access = getAccess(route.projectId, route.ownerId, user.id)
        const roadmap = readRoadmap(route.projectId, route.ownerId, user.id)
        if (access.project.id === route.projectId && access.project.owner_id === route.ownerId && access.user.id === user.id) {
          project = joinedSummary(access, roadmap, route.pathname)
        }
      } catch { /* An unavailable shared roadmap must not use an unrelated project. */ }
    }
    return { project, projects: project ? [project] : [], projectLocked: true }
  }
  // Assessment screens still keep the correct context for the generic assistant.
  const assessment = /^\/roadmap\/([^/]+)\/(?:assessment|result)\/?$/.exec(pathname)
  const individual = route?.kind === 'owned' ? route : assessment ? getCompanionRoadmapRoute(`/roadmap/${assessment[1]}`) : null
  if (individual) {
    const project = summaries.find(item => item.id === individual.projectId) || null
    return { project, projects: project ? [project] : [], projectLocked: true }
  }
  const queryProject = inChats ? chatProjectId : route?.kind === 'collection' ? params.get('project') : null
  if (inChats && selectedSession && !queryProject) return { project: null, projects: summaries, projectLocked: false }
  const project = queryProject
    ? summaries.find(item => item.id === queryProject) || null
    : summaries.find(item => item.id === selectedProjectId) || summaries[0] || null
  return { project, projects: summaries, projectLocked: false }
}
