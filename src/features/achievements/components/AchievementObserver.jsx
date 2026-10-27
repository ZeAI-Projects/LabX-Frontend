import { useEffect } from 'react'
import { useAuth } from '../../../hooks/use_auth.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { PROFILE_CHANGE_EVENT } from '../../profile/services/profile_store.js'
import { EVENT_CHANGE_EVENT } from '../../events/services/mock_events.js'
import { ROADMAP_CHANGE_EVENT } from '../../roadmap/services/roadmap_collaboration.js'
import { achievementStore } from '../services/mock_achievements.js'
import { readAchievementActivities } from '../services/achievement_sources.js'

const sourceEvents = ['storage', 'focus', PROFILE_CHANGE_EVENT, EVENT_CHANGE_EVENT, ROADMAP_CHANGE_EVENT]

// Keep recognition independent of visiting the Achievements page. Project
// actions update their provider; the other features notify after saving.
export function AchievementObserver() {
  const { user } = useAuth()
  const { projects } = useProjects()
  useEffect(() => {
    if (user?.role !== 'founder') return undefined
    const capture = () => achievementStore.recordPlatform(user, readAchievementActivities(user))
    capture()
    for (const event of sourceEvents) window.addEventListener(event, capture)
    return () => { for (const event of sourceEvents) window.removeEventListener(event, capture) }
  }, [user, projects])
  return null
}
