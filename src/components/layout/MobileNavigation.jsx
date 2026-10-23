import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Award, Bell, Bot, Calendar, Home, LogOut, Map, Menu, MessageCircle, Trophy, User, Users, X } from 'lucide-react'
import './MobileNavigation.css'
import { ProfileAvatar } from '../common/ProfileAvatar.jsx'

const sharedLinks = [
  ['/events', 'Events', Calendar], ['/achievements', 'Achievements', Award],
  ['/profile', 'Profile', User], ['/notifications', 'Notifications', Bell],
]
const founderLinks = [
  ['/dashboard', 'Dashboard', Home], ['/chats', 'Chats', MessageCircle], ['/roadmap', 'Roadmap', Map],
  ['/leaderboard', 'Leaderboard', Trophy], ['/guild', 'Guilds', Bot],
  ['/social', 'Social', Users], ...sharedLinks,
]
const memberLinks = [['/dashboard', 'Dashboard', Home], ['/chats', 'Chats', MessageCircle], ...sharedLinks]

export function MobileNavigation({ user, onSignOut }) {
  const { pathname } = useLocation()
  const dialog = useRef(null)
  const trigger = useRef(null)
  const [open, setOpen] = useState(false)
  const isFounder = user.role === 'founder'
  const links = isFounder ? founderLinks : memberLinks
  const primaryPaths = isFounder ? ['/dashboard', '/roadmap', '/events'] : ['/dashboard', '/events', '/achievements']
  const primary = primaryPaths.map(path => links.find(([target]) => target === path))
  const moreActive = !primaryPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))
  const displayName = user.full_name || user.username || 'LabX Member'
  const displayHandle = `@${user.username || user.email?.split('@')[0] || user.role}`

  function close() { dialog.current?.close() }

  useEffect(() => { dialog.current?.close() }, [pathname])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflowY
    document.body.style.overflowY = 'hidden'
    return () => { document.body.style.overflowY = previous }
  }, [open])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)')
    const onResize = () => {
      if (desktop.matches && dialog.current?.open) {
        dialog.current.close()
        requestAnimationFrame(() => document.querySelector('.labx-sidebar-nav a[aria-current="page"]')?.focus())
      }
    }
    desktop.addEventListener('change', onResize)
    return () => desktop.removeEventListener('change', onResize)
  }, [])

  return (
    <>
      <nav className="mobile-navigation" aria-label="Main navigation">
        {primary.map(([path, label, Icon]) => (
          <NavLink key={path} to={path} data-roadmap-entry={path === '/roadmap' ? '' : undefined}>
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
        <button type="button" ref={trigger} className={moreActive || open ? 'active' : ''} aria-label="More navigation" aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-menu" onClick={() => { dialog.current.showModal(); setOpen(true) }}>
          <Menu size={20} aria-hidden="true" /><span>More</span>
        </button>
      </nav>
      <dialog id="mobile-menu" className="mobile-menu" ref={dialog} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) close() }} aria-labelledby="mobile-menu-title">
        <div className="mobile-menu__surface">
          <div className="mobile-menu__handle" aria-hidden="true" />
          <header>
            <div><span>LABX BY ZEAI</span><h2 id="mobile-menu-title">Your workspace</h2></div>
            <button type="button" autoFocus aria-label="Close navigation" onClick={close}><X size={20} aria-hidden="true" /></button>
          </header>
          <nav aria-label="All pages" className="mobile-menu__links">
            {links.map(([path, label, Icon]) => <NavLink key={path} to={path} onClick={close}><Icon size={19} aria-hidden="true" /><span>{label}</span></NavLink>)}
          </nav>
          <NavLink to="/profile" className="mobile-menu__profile" onClick={close} aria-label={`Open profile for ${displayName}`}>
            <ProfileAvatar user={user} />
            <span className="labx-user-info"><span className="labx-user-name">{displayName}</span><span className="labx-user-role">{displayHandle}</span></span>
          </NavLink>
          <button type="button" className="mobile-menu__logout" onClick={() => { close(); onSignOut() }}><LogOut size={18} aria-hidden="true" />Sign out</button>
        </div>
      </dialog>
    </>
  )
}
