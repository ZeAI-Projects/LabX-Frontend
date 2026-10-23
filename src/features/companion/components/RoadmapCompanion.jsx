import { lazy, Suspense, useId, useLayoutEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Sparkles, X } from 'lucide-react'
import { useSharp } from '../context/sharp_context.js'
import { SharpRobot } from './SharpRobot.jsx'
import './RoadmapCompanion.css'

const CompanionWorkspace = lazy(() => import('../pages/CompanionPage.jsx').then(module => ({ default: module.CompanionPage })))

export function RoadmapCompanion() {
  const sharp = useSharp()
  const [params, setParams] = useSearchParams()
  const dialog = useRef(null)
  const trigger = useRef(null)
  const closeButton = useRef(null)
  const panelId = useId()
  const isOpen = params.has('companion')
  const project = sharp.context.project

  function openCompanion() {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.set('companion', 'chat')
      next.delete('milestone')
      next.delete('prompt')
      return next
    })
  }

  function closeCompanion() {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('companion')
      next.delete('prompt')
      return next
    }, { replace: true })
  }

  useLayoutEffect(() => {
    if (!isOpen) return
    const panel = dialog.current
    const opener = trigger.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.showModal()
    closeButton.current?.focus({ preventScroll: true })
    return () => {
      panel.close()
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [isOpen])

  return <div className="roadmap-companion">
    <button ref={trigger} type="button" className="roadmap-companion__bar" aria-label="Open Companion" aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={panelId} onClick={openCompanion}>
      <span className="roadmap-companion__avatar"><SharpRobot happy/></span>
      <span className="roadmap-companion__copy"><span className="roadmap-companion__name"><Sparkles size={14}/> Zenith <span>Roadmap companion</span></span><span className="roadmap-companion__description">{project ? `Need a hand with ${project.name}? Get guidance for your next step.` : 'Find your next step, work through a blocker, or shape your idea.'}</span></span>
      <span className="roadmap-companion__action">Open Companion <ArrowUpRight size={17}/></span>
    </button>
    <dialog ref={dialog} id={panelId} className="roadmap-companion-dialog" aria-label="Roadmap Companion" onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); closeCompanion() }} onClick={event => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeCompanion()
    }}>
      <header className="roadmap-companion-dialog__header">
        <span className="roadmap-companion-dialog__avatar"><SharpRobot happy/></span>
        <div><span className="sharp-eyebrow">Roadmap companion</span><h2>Zenith <span>AI</span></h2><p>{project?.name || 'A little clarity for your next step.'}</p></div>
        <button ref={closeButton} type="button" className="sharp-icon-button roadmap-companion-dialog__close" aria-label="Close Companion" onClick={closeCompanion}><X size={22}/></button>
      </header>
      <div className="roadmap-companion-dialog__body">
        {isOpen && <Suspense fallback={<p className="roadmap-companion-dialog__loading" role="status">Opening your companion…</p>}><CompanionWorkspace embedded/></Suspense>}
      </div>
    </dialog>
  </div>
}
