import { lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use_auth.js'
import { Sidebar } from './Sidebar.jsx'
import { Navbar } from './Navbar.jsx'
import { Footer } from './Footer.jsx'
import { MobileNavigation } from './MobileNavigation.jsx'
import { ProgressCelebration } from '../common/ProgressCelebration.jsx'
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
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const section = pathname.split('/')[1] || 'dashboard'
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
      <Sidebar user={user} onSignOut={signOut} roadmapTo="/roadmap" />
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
