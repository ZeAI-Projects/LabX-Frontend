import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use_auth.js'
import { Sidebar } from './Sidebar.jsx'
import { Navbar } from './Navbar.jsx'
import { MobileNavigation } from './MobileNavigation.jsx'
import './FounderWorlds.css'
import './labxshell.css'

const pageTitles = {
  dashboard: 'Dashboard',
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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const section = pathname.split('/')[1] || 'dashboard'
  const isRoadmapMap = /^\/roadmap\/(?!new$)[^/]+$/.test(pathname) || /^\/roadmap\/joined\/[^/]+\/[^/]+$/.test(pathname)

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`app-layout app-shell${isRoadmapMap ? ' app-shell--roadmap-focus' : ''}`}>
      <a className="labx-skip-link" href="#app-page-content">Skip to page content</a>
      <Sidebar user={user} onSignOut={signOut} />
      <MobileNavigation user={user} onSignOut={signOut} />
      <main className={`main-content founder-world founder-world--${section}`}>
        <div className="founder-world__backdrop" aria-hidden="true" />
        <Navbar
          user={user}
          title={pageTitles[section] || 'LabX'}
          pageHasHeading={section === 'dashboard' || section === 'roadmap' || section === 'leaderboard'}
          onSignOut={signOut}
        />
        <div id="app-page-content" className="app-shell__page" tabIndex={-1}>{children}</div>
      </main>
    </div>
  )
}
