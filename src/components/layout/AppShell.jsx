import { lazy, Suspense, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use_auth.js'
import { localStore } from '../../services/storage/local_storage.js'
import { Sidebar } from './Sidebar.jsx'
import { Navbar } from './Navbar.jsx'
import { Footer } from './Footer.jsx'
import { MobileNavigation } from './MobileNavigation.jsx'
import { ProgressCelebration } from '../common/ProgressCelebration.jsx'
import { useProjects } from '../../features/projects/hooks/use_projects.js'
import { ROADMAP_VISUAL_MY_DATA } from '../../features/projects/services/roadmap_visual_mock_data.js'
import './FounderWorlds.css'
import './labxshell.css'

const JoinRoadmapPopup = lazy(() => import('../../features/roadmap/pages/JoinRoadmapPage.jsx').then(module => ({ default: module.JoinRoadmapPopup })))

const pageTitles = {
  dashboard: 'Dashboard',
  chats: 'Chats',
  roadmap: 'Roadmap',
  leaderboard: 'LabX Leaderboard',
  guild: 'Guilds',
  social: 'Social',
  events: 'Events & Opportunities',
  achievements: 'Achievements',
  profile: 'Profile',
  notifications: 'Notifications',
}

export function AppShell({ children }) {
  const { user, logout } = useAuth()
  const { projects } = useProjects()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const section = pathname.split('/')[1] || 'dashboard'
  const projectId = pathname.match(/^\/roadmap\/([^/]+)\/?$/)?.[1]
  const project = projectId && projects.find(entry => entry.id === projectId)
  const demoProjectId = pathname.match(/^\/roadmap\/demo\/([^/]+)\/?$/)?.[1]
  const demoProject = demoProjectId && ROADMAP_VISUAL_MY_DATA.find(entry => entry.id === demoProjectId)
  const roadmapRouteKey = `labx:last-roadmap-route:v1:${encodeURIComponent(user.id)}`
  useEffect(() => {
    if (demoProject) localStore.writeJSON(roadmapRouteKey, `/roadmap/demo/${demoProject.id}`)
    else if (project?.assessment_completed) localStore.writeJSON(roadmapRouteKey, `/roadmap/${project.id}`)
  }, [demoProject, project?.assessment_completed, project?.id, roadmapRouteKey])
  const savedRoadmapRoute = localStore.readJSON(roadmapRouteKey, '')
  const demoRouteMatch = typeof savedRoadmapRoute === 'string' && savedRoadmapRoute.match(/^\/roadmap\/demo\/([^/]+)$/)
  const projectRouteMatch = typeof savedRoadmapRoute === 'string' && savedRoadmapRoute.match(/^\/roadmap\/([^/]+)$/)
  const resumeRoadmap = demoRouteMatch && ROADMAP_VISUAL_MY_DATA.some(entry => entry.id === demoRouteMatch[1])
    ? savedRoadmapRoute
    : projectRouteMatch && projects.some(entry => entry.id === projectRouteMatch[1] && entry.assessment_completed)
      ? savedRoadmapRoute
      : '/roadmap'
  const title = pathname === '/roadmap/new'
    ? 'New Project'
    : pathname.startsWith('/roadmap/joined/')
      ? 'Joined Roadmap'
      : pageTitles[section] || 'LabX'

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout app-shell">
      <a className="labx-skip-link" href="#app-page-content">Skip to page content</a>
      <Sidebar user={user} onSignOut={signOut} roadmapTo={resumeRoadmap} />
      <MobileNavigation user={user} onSignOut={signOut} />
      <main className={`main-content founder-world founder-world--${section}`} tabIndex={pathname === '/roadmap' ? 0 : undefined}>
        <div className="founder-world__backdrop" aria-hidden="true" />
        <Navbar
          user={user}
          title={title}
          onSignOut={signOut}
        />
        <div id="app-page-content" className="app-shell__page" tabIndex={-1}>{children}</div>
        <Footer />
      </main>
      <ProgressCelebration key={user.id}/>
      {user.role === 'founder' && section === 'roadmap' && new URLSearchParams(search).get('join') === '1' && <Suspense fallback={null}><JoinRoadmapPopup key={user.id} /></Suspense>}
    </div>
  )
}
