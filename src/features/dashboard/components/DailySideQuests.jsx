import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Coins, Lightbulb, MessageCircle, Target, X } from 'lucide-react'
import { dailySideQuestStore, SIDE_QUEST_CHANGE_EVENT } from '../services/daily_side_quests.js'
import './DailySideQuests.css'

const questIcons = { 'learning-note': Lightbulb, 'customer-question': MessageCircle, 'small-next-step': Target }

function DailyQuestDialog({ user, snapshot, onSnapshot, onClose, drafts, setDrafts }) {
  const dialogRef = useRef(null)
  const workRef = useRef(null)
  const completionRef = useRef(null)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const [selected, setSelected] = useState(() => snapshot.quests.find((quest) => quest.status === 'available')?.id || snapshot.quests[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState(false)
  const [notice, setNotice] = useState('')
  const prefix = useId()
  const quest = snapshot.quests.find((item) => item.id === selected)
  const completed = quest.status === 'completed'

  useEffect(() => {
    mounted.current = true
    const trigger = document.activeElement
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      mounted.current = false
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  function trapFocus(event) {
    if (event.key !== 'Tab') return
    const controls = [...dialogRef.current.querySelectorAll('button:not([disabled]), textarea:not([disabled]), [tabindex="0"]')]
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }

  async function complete(event) {
    event.preventDefault()
    if (busyRef.current || completed) return
    setError('')
    setFieldError(false)
    setNotice('')
    busyRef.current = true
    setBusy(true)
    // Let the disabled controls and saving announcement paint before the local write.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    if (!mounted.current) return
    try {
      const next = dailySideQuestStore.complete(user, quest.id, drafts[quest.id] || '', snapshot.day)
      onSnapshot(next)
      setNotice(next.claimed ? `Quest complete. ${quest.reward} sample LabX coins added to your balance.` : 'This quest is already complete. Its coins have already been added.')
      requestAnimationFrame(() => completionRef.current?.focus({ preventScroll: true }))
    } catch (failure) {
      setError(failure.message || 'Unable to save this quest. Your response is preserved. Please try again.')
      setFieldError(failure.field === 'work')
      onSnapshot(dailySideQuestStore.read(user))
      if (failure.field === 'work') requestAnimationFrame(() => workRef.current?.focus())
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return <dialog ref={dialogRef} className="sq-dialog" aria-labelledby={`${prefix}-title`} aria-describedby={`${prefix}-description`} onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); if (!busyRef.current) onClose() }}>
    <header className="sq-dialog-header">
      <div><span className="sq-eyebrow">A little extra, every day</span><h2 id={`${prefix}-title`}><Target size={24} aria-hidden="true" />Daily Quests</h2></div>
      <button type="button" className="sq-close" aria-label="Close daily quests" onClick={onClose} disabled={busy}><X size={21} aria-hidden="true" /></button>
    </header>
    <p id={`${prefix}-description`} className="sq-intro">Small side quests for extra LabX coins. Choose a mission and complete it here.</p>
    <div className="sq-summary"><span>{snapshot.completedCount} / {snapshot.totalCount} completed today</span><strong><Coins size={16} aria-hidden="true" />{snapshot.todayCoins} coins earned today</strong></div>
    <div className="sq-workspace" aria-busy={busy}>
      <div className="sq-missions" aria-label="Choose a daily quest">
        {snapshot.quests.map((item) => {
          const Icon = questIcons[item.id]
          return <button key={item.id} type="button" className={`sq-mission${selected === item.id ? ' is-selected' : ''}${item.status === 'completed' ? ' is-complete' : ''}`} aria-pressed={selected === item.id} disabled={busy} onClick={() => { setSelected(item.id); setError(''); setFieldError(false); setNotice('') }}>
            <span className="sq-mission-icon"><Icon size={19} aria-hidden="true" /></span>
            <span className="sq-mission-copy"><strong>{item.title}</strong><span>{item.duration} · {item.status === 'completed' ? 'Completed' : `+${item.reward} coins`}</span></span>
            {item.status === 'completed' && <CheckCircle2 size={18} aria-hidden="true" />}
          </button>
        })}
      </div>
      <form className="sq-quest-work" onSubmit={complete} noValidate>
        <div className="sq-work-heading"><h3>{quest.title}</h3><span className="sq-reward"><Coins size={15} aria-hidden="true" />+{quest.reward} coins</span></div>
        <p>{quest.description}</p>
        {completed ? <div className="sq-completion"><span ref={completionRef} tabIndex={-1}><CheckCircle2 size={18} aria-hidden="true" />Completed · reward claimed</span><p className="sq-saved-work" tabIndex={0}>{quest.work}</p></div> : <>
          <label htmlFor={`${prefix}-response`}>Your quest response</label>
          <p id={`${prefix}-prompt`} className="sq-field-help">{quest.prompt}</p>
          <textarea ref={workRef} id={`${prefix}-response`} value={drafts[quest.id] || ''} onChange={(event) => { setDrafts((current) => ({ ...current, [quest.id]: event.target.value })); if (fieldError) { setFieldError(false); setError('') } }} placeholder={quest.placeholder} rows={5} required disabled={busy} aria-invalid={fieldError || undefined} aria-describedby={`${prefix}-prompt${fieldError ? ` ${prefix}-error` : ''}`} />
          <button className="sq-primary" type="submit" disabled={busy}>{busy ? 'Saving quest…' : `Complete & earn ${quest.reward} coins`}<ArrowRight size={16} aria-hidden="true" /></button>
        </>}
        {error && <p id={`${prefix}-error`} className="sq-error" role="alert">{error}</p>}
        <p className="sq-notice" role="status" aria-live="polite">{busy ? 'Saving your response and coin reward…' : notice}</p>
      </form>
    </div>
    <footer className="sq-dialog-footer"><span>Sample quests and rewards · saved in this browser.</span><span>Quests reset at midnight IST. Earned coins stay.</span></footer>
  </dialog>
}

function DailySideQuestSession({ user, variant }) {
  const [snapshot, setSnapshot] = useState(() => dailySideQuestStore.read(user))
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState({})
  const titleId = useId()

  useEffect(() => {
    const refresh = () => setSnapshot(dailySideQuestStore.read(user))
    window.addEventListener(SIDE_QUEST_CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    const interval = window.setInterval(refresh, 30_000)
    return () => {
      window.removeEventListener(SIDE_QUEST_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      window.clearInterval(interval)
    }
  }, [user])

  function openQuests() {
    setSnapshot(dailySideQuestStore.read(user))
    setOpen(true)
  }

  return <>
    {variant === 'stat' || variant === 'coin-stat' ? <button className={`db-stat db-tone-gold ${variant === 'coin-stat' ? 'db-coin-stat' : 'db-daily-quest'}`} type="button" aria-label={variant === 'coin-stat' ? 'View LabX Coins in Daily Quests' : 'Open daily quests'} aria-haspopup="dialog" onClick={openQuests}>
      <span className="db-stat-icon"><Target size={19} aria-hidden="true" /></span>
      <span className="db-daily-quest-copy"><span>{variant === 'coin-stat' ? 'LabX Coins' : 'Daily Quests'}</span><strong data-dashboard-stat={variant === 'coin-stat' ? 'LabX Coins' : 'Daily Quests'}>{variant === 'coin-stat' ? snapshot.earnedCoins.toLocaleString('en-IN') : `${snapshot.completedCount} / ${snapshot.totalCount}`}</strong><small>{variant === 'coin-stat' ? 'Lifetime Daily Quest rewards' : `Completed today · ${snapshot.availableCoins} coins left`}</small></span>
      <span className="db-daily-quest-link">{variant === 'coin-stat' ? 'View coin rewards' : 'Open quests'}<ArrowRight size={15} aria-hidden="true" /></span>
    </button> : <section className="sq-card" aria-labelledby={titleId}>
      <div className="sq-card-heading"><h2 id={titleId}><Target size={19} aria-hidden="true" />Daily Quests</h2><span className="sq-sample">Sample quests</span></div>
      <p>Small side quests. Extra LabX coins.</p>
      <div className="sq-card-stats"><span><strong>{snapshot.completedCount}<small> / {snapshot.totalCount}</small></strong>completed today</span><span><strong>{snapshot.availableCoins}<Coins size={16} aria-hidden="true" /></strong>coins still available</span></div>
      <button className="sq-primary" type="button" onClick={openQuests}>Open daily quests<ArrowRight size={16} aria-hidden="true" /></button>
    </section>}
    {open && <DailyQuestDialog user={user} snapshot={snapshot} onSnapshot={setSnapshot} onClose={() => setOpen(false)} drafts={drafts} setDrafts={setDrafts} />}
  </>
}

export function DailySideQuestCard({ user, variant = 'card' }) {
  return user?.id ? <DailySideQuestSession key={user.id} user={user} variant={variant} /> : null
}
