import { lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use_auth.js'
import { Sidebar } from './Sidebar.jsx'
import { Navbar } from './Navbar.jsx'
import { MobileNavigation } from './MobileNavigation.jsx'
import { ProgressCelebration } from '../common/ProgressCelebration.jsx'
import './FounderWorlds.css'
import './labxshell.css'

const JoinRoadmapPopup = lazy(() => import('../../features/roadmap/pages/JoinRoadmapPage.jsx').then(module => ({ default: module.JoinRoadmapPopup })))

const pageTitles = {
  dashboard: 'Dashboard',
  chats: 'Chats',
  roadmap: 'Roadmap',
  leaderboard: 'Leaderboard',
  guild: 'Guilds',
  social: 'Social',
  events: 'Events & Opportunities',
  achievements: 'Achievements',
  profile: 'Profile',
  notifications: 'Notifications',
}

export function AppShell({ children }) {
  const { user, logout } = useAuth()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const section = pathname.split('/')[1] || 'dashboard'

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout app-shell">
      <a className="labx-skip-link" href="#app-page-content">Skip to page content</a>
      <Sidebar user={user} onSignOut={signOut} />
      <MobileNavigation user={user} onSignOut={signOut} />
      <main className={`main-content founder-world founder-world--${section}`}>
        <div className="founder-world__backdrop" aria-hidden="true" />
        <Navbar
          user={user}
          title={pageTitles[section] || 'LabX'}
          compact={['dashboard', 'chats', 'roadmap', 'leaderboard'].includes(section)}
          onSignOut={signOut}
        />
        <div id="app-page-content" className="app-shell__page" tabIndex={-1}>{children}</div>
      </main>
      <ProgressCelebration key={user.id}/>
      {user.role === 'founder' && section === 'roadmap' && new URLSearchParams(search).get('join') === '1' && <Suspense fallback={null}><JoinRoadmapPopup key={user.id} /></Suspense>}
    </div>
  )
}
