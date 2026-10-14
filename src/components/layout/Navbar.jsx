import { Bell, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMockPointsBalance } from '../../features/achievements/services/mock_achievements.js'
import { FloatingXp } from './FloatingXp.jsx'

export function Navbar({ user, title, pageHasHeading, onSignOut }) {
  const Title = pageHasHeading ? 'p' : 'h1'

  return (
    <header className="labx-navbar">
      <div className="labx-navbar-title">
        <div className="labx-title-line" aria-hidden="true" />
        <div>
          <Title className="labx-page-title">{title}</Title>
          <span className="labx-subtitle">{user.role === 'mentor' ? 'MENTOR' : 'FOUNDER'} COMMAND CENTER</span>
        </div>
      </div>
      <div className="labx-navbar-actions">
        <FloatingXp points={getMockPointsBalance(user)} />
        <Link className="labx-notification-btn" to="/notifications" aria-label="Notifications">
          <Bell size={18} aria-hidden="true" />
        </Link>
        <button type="button" className="labx-mobile-logout" onClick={onSignOut} aria-label="Sign out" title="Sign out">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
