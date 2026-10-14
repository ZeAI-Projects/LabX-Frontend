import { Award, Bot, Calendar, Home, LogOut, Map, Trophy, User, Users } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import labxLogo from '../../assets/images/labx-logo.png'
import { soundManager } from '../../features/authentication/components/gamified/soundEffects.js'

export function Sidebar({ user, onSignOut }) {
  const isFounder = user.role === 'founder'
  const displayName = user.full_name || user.username || 'LabX Member'
  const displayHandle = `@${user.username || user.email?.split('@')[0] || user.role}`
  const initials = displayName.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()
  const deckName = isFounder ? 'FOUNDER COMMAND' : 'MENTOR COMMAND'

  return (
    <aside className="labx-sidebar">
      <div className="labx-brand">
        <img className="labx-brand-logo" src={labxLogo} alt="LabX by ZeAI" />
      </div>
      <div className="labx-deck-status">
        <div className="labx-deck-status__name"><span aria-hidden="true" />{deckName}</div>
      </div>
      <nav className="labx-sidebar-nav" aria-label="Main navigation">
        <SidebarItem to="/dashboard" icon={<Home size={18} />} label="Dashboard" />
        {isFounder && <>
          <SidebarItem to="/roadmap" icon={<Map size={18} />} label="Projects" />
          <SidebarItem to="/leaderboard" icon={<Trophy size={18} />} label="Leaderboard" />
          <SidebarItem to="/guild" icon={<Bot size={18} />} label="Guilds" />
          <SidebarItem to="/social" icon={<Users size={18} />} label="Social" />
        </>}
        <SidebarItem to="/events" icon={<Calendar size={18} />} label="Events" />
        <SidebarItem to="/achievements" icon={<Award size={18} />} label="Achievements" />
        <SidebarItem to="/profile" icon={<User size={18} />} label="Profile" />
      </nav>
      <div className="labx-sidebar-footer">
        <div className="labx-user-card">
          <Link className="labx-user-profile" to="/profile" aria-label={`Open profile for ${displayName}`} onClick={soundManager.playHover}>
            <div className="labx-user-avatar" aria-hidden="true">{initials}</div>
            <div className="labx-user-info">
              <div className="labx-user-name" title={displayName}>{displayName}</div>
              <div className="labx-user-role" title={displayHandle}>{displayHandle}</div>
            </div>
          </Link>
          <button className="labx-logout-btn" type="button" onClick={onSignOut} title="Sign out" aria-label="Sign out">
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      data-roadmap-entry={to === '/roadmap' ? '' : undefined}
      onClick={soundManager.playHover}
      className={({ isActive }) => `labx-nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="labx-nav-icon" aria-hidden="true">{icon}</span>
      <span className="labx-nav-label">{label}</span>
    </NavLink>
  )
}
