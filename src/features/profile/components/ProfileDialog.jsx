import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export function ProfileDialog({ title, onClose, children, wide = false, eyebrow = 'Your LabX dossier' }) {
  const dialogRef = useRef(null)
  const headingRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    headingRef.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  function trapFocus(event) {
    if (event.key !== 'Tab') return
    const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')]
      .filter((node) => node.getClientRects().length > 0)
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
  return <dialog ref={dialogRef} className={`pf-dialog${wide ? ' pf-dialog--wide' : ''}`} aria-labelledby="pf-dialog-title" onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <header className="pf-dialog-heading"><div><span className="pf-eyebrow">{eyebrow}</span><h2 id="pf-dialog-title" ref={headingRef} tabIndex={-1}>{title}</h2></div><button className="pf-icon-button" type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    {children}
  </dialog>
}

export function ProfileField({ label, required = false, children, hint }) {
  return <label className="pf-field"><span>{label}{required && <span className="pf-required" aria-hidden="true">*</span>}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function ProfileAvatar({ profile, small = false }) {
  const initials = (profile.full_name || 'LabX').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <span className={`pf-avatar${small ? ' pf-avatar--small' : ''}`}>{profile.avatar?.dataUrl ? <img src={profile.avatar.dataUrl} alt={`${profile.full_name}'s profile`} /> : <span aria-hidden="true">{initials}</span>}</span>
}
