import { useEffect, useRef } from 'react'
import { ArrowRight, ClipboardCheck, X } from 'lucide-react'
import './AssessmentGate.css'

export function AssessmentGate({ onStart, onDismiss }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  function dismiss() {
    // Release the modal's focus trap before the route transition restores focus.
    dialogRef.current.close()
    onDismiss()
  }

  return (
    <dialog ref={dialogRef} className="assessment-gate" aria-labelledby="assessment-gate-title" aria-describedby="assessment-gate-description"
      onCancel={(event) => { event.preventDefault(); dismiss() }}>
      <button type="button" className="assessment-gate__close" aria-label="Close assessment reminder" onClick={dismiss}><X size={20} /></button>
      <div className="assessment-gate__icon"><ClipboardCheck size={32} /></div>
      <h2 id="assessment-gate-title">Complete Initial Assessment</h2>
      <p id="assessment-gate-description">Complete the initial assessment to unlock your roadmap and see your starting point. Any answers you have already saved will be waiting for you.</p>
      <div className="assessment-gate__actions">
        <button type="button" className="btn btn-primary" onClick={onStart} autoFocus>Start Assessment<ArrowRight size={18} /></button>
        <button type="button" className="btn btn-secondary" onClick={dismiss}>Maybe later</button>
      </div>
    </dialog>
  )
}
