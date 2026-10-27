import { LogOut } from 'lucide-react'
import { Header } from './Header.jsx'

export function Navbar({ user, title, onSignOut }) {
  return (
    <header className="labx-navbar">
      <Header user={user} title={title} />
      <div className="labx-navbar-account-actions">
        <button type="button" className="labx-mobile-logout" onClick={onSignOut} aria-label="Sign out" title="Sign out">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
