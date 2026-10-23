import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { Expand, Minus, X } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { useSharp } from '../context/sharp_context.js'
import { SharpRobot } from './SharpRobot.jsx'
import { SharpChat } from './SharpChat.jsx'
import { getCompanionUrl } from '../services/companion_navigation.js'

export function SharpDock() {
  const { pathname, search } = useLocation()
  const { user } = useAuth()
  const { open, setOpen, state, busy, context, session } = useSharp()
  const trigger = useRef(null)
  const panel = useRef(null)
  const hasNavigation = Boolean(user) && /^\/(dashboard|leaderboard|guild|social|events|achievements|profile|notifications)(\/|$)/.test(pathname)
  const allowed = hasNavigation && state.settings.dockEnabled
  const expression = busy ? 'thinking' : open ? 'happy' : 'idle'
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }
  useEffect(() => {
    if (!allowed) { if (open) setOpen(false); return }
    if (!open) return
    panel.current?.querySelector('textarea')?.focus({ preventScroll: true })
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus({ preventScroll: true }) } }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [open, allowed, setOpen])
  if (!allowed) return null
  return createPortal(<aside className={`sharp-dock${hasNavigation ? ' sharp-dock--app' : ''}${open ? ' has-open-chat' : ''}`} aria-label="Zenith assistant">
    {open && <section id="sharp-quick-chat" className="sharp-quick-panel" ref={panel} role="region" aria-label="Zenith quick chat panel">
      <header className="sharp-quick-header"><span className="sharp-quick-avatar"><SharpRobot expression={expression}/></span><div><strong>Zenith <span>AI</span></strong><small><span className="sharp-status-dot"/> Your LabX companion</small></div><button className="sharp-icon-button" onClick={close} aria-label="Minimize Zenith" type="button"><Minus size={18}/></button><Link className="sharp-icon-button" to={getCompanionUrl({ pathname, search, projectId: context.project?.id, chatId: session.id })} onClick={() => setOpen(false)} aria-label="Open Chats"><Expand size={16}/></Link><button className="sharp-icon-button" onClick={close} aria-label="Close Zenith chat" type="button"><X size={18}/></button></header>
      <SharpChat compact/>
    </section>}
    <button ref={trigger} type="button" className={`sharp-dock-trigger${open ? ' is-open' : ''}`} aria-label={open ? 'Minimize Zenith assistant' : 'Ask Zenith AI'} aria-expanded={open} aria-controls={open ? 'sharp-quick-chat' : undefined} onClick={() => setOpen(!open)}><span className="sharp-dock-label">{open ? 'Close chat' : 'Ask Zenith'}</span><SharpRobot expression={expression}/><span className="sharp-dock-spark"/></button>
  </aside>, document.body)
}
