import { LogOut } from 'lucide-react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/use_auth.js'
import './OnboardingLayout.css'

export function OnboardingLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const assessing = /^\/roadmap\/[^/]+\/(assessment|result)$/.test(pathname)

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="onboarding-layout">
      <header className="onboarding-header">
        <div className="onboarding-brand" aria-label="LabX by ZeAI">Lab<span>X</span><small>by ZeAI</small></div>
        <nav className={`onboarding-nav${assessing ? " is-assessing" : ""}`} aria-label="Main navigation" inert={assessing}>
          <NavLink to="/dashboard">Dashboard</NavLink>
          {user.role === 'founder' && <NavLink to="/roadmap" data-roadmap-entry>Roadmap</NavLink>}
        </nav>
        <div className="onboarding-account">
          <span className="onboarding-founder">{user.full_name}</span>
          <button className="btn btn-secondary" type="button" onClick={signOut}><LogOut size={16} />Sign out</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
