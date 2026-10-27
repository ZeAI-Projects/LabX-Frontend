import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Award, BookOpen, Bookmark, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Coins, Compass, Flag, FolderPlus, HeartHandshake, Lock, MessageSquare, Mountain, Rocket, Route, Shield, Sparkles, Target, Trophy, UserRound, Users, X, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { ACHIEVEMENTS_CHANGE_EVENT, getAchievementsSnapshot } from '../services/mock_achievements.js'
import '../components/AchievementsPage.css'
import { Medal } from '../../../components/common/Medal.jsx'

const PAGE_SIZE = 10
const badgeIcons = { flag: Flag, compass: Compass, mountain: Mountain, route: Route, zap: Zap, trophy: Trophy, users: Users, shield: Shield, rocket: Rocket, calendar: Calendar, profile: UserRound, user: UserRound, folder: FolderPlus, project: FolderPlus, book: BookOpen, target: Target, sparkles: Sparkles, handshake: HeartHandshake, message: MessageSquare, award: Award, bookmark: Bookmark }
const formatDate = (date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date))
const progressLabel = (badge) => badge.progressLabel || (badge.metric === 'quests' ? 'approved missions' : 'completed levels')

function AchievementDialog({ labelledBy, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => { dialog.close(); queueMicrotask(() => { if (trigger?.isConnected) trigger.focus() }) }
  }, [])
  return (
    <dialog ref={ref} className="achievements-dialog" aria-labelledby={labelledBy} onCancel={(event) => { event.preventDefault(); onClose() }}>
      <button autoFocus className="achievements-dialog__close" type="button" onClick={onClose} aria-label="Close achievement details"><X size={20} /></button>
      {children}
    </dialog>
  )
}

export function AchievementsPage() {
  const { user } = useAuth()
  const isFounder = user?.role === 'founder'
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState('locked')
  const [page, setPage] = useState(1)
  const collectionHeading = useRef(null)
  const [, refresh] = useReducer((value) => value + 1, 0)
  useEffect(() => {
    const events = ['storage', 'focus', ACHIEVEMENTS_CHANGE_EVENT, 'labx:events-change', 'labx:profile-change', 'labx:roadmap-change']
    for (const event of events) window.addEventListener(event, refresh)
    return () => { for (const event of events) window.removeEventListener(event, refresh) }
  }, [])
  const snapshot = getAchievementsSnapshot(user)
  const { badges, earnedBadgeCount, pointsBalance } = snapshot
  const selectedBadge = badges.find((badge) => badge.id === searchParams.get('badge')) ?? null
  const progressPct = badges.length ? Math.round(earnedBadgeCount / badges.length * 100) : 0
  const filtered = badges.filter((badge) => filter === 'earned' ? badge.isEarned : !badge.isEarned)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const filters = [['earned', 'Unlocked', earnedBadgeCount], ['locked', 'Yet to unlock', badges.length - earnedBadgeCount]]

  function changeFilter(value) {
    setFilter(value)
    setPage(1)
  }

  function changePage(value) {
    setPage(value)
    collectionHeading.current?.focus({ preventScroll: true })
    collectionHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }

  function selectBadge(badge) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (badge) next.set('badge', badge.id)
      else next.delete('badge')
      return next
    }, { replace: !badge })
  }

  return (
    <div className="achievements-page">
      <section className="achievements-hero" aria-labelledby="achievements-hero-title">
        <div className="achievements-hero__emblem" aria-hidden="true"><Trophy size={37} /></div>
        <div className="achievements-hero__copy">
          <h2 id="achievements-hero-title">Small wins. Lasting milestones.</h2>
          <p>Build, learn, and connect. Celebrate every step of your LabX journey.</p>
        </div>
        <div className="achievements-progress">
          <div className="achievements-progress__numbers"><strong>{earnedBadgeCount}<span> / {badges.length}</span></strong><span>unlocked</span></div>
          <div className="achievements-progress__track" role="progressbar" aria-label="Achievement progress" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progressPct}%` }} /></div>
          <span className="achievements-progress__caption">{progressPct}% of your collection unlocked</span>
        </div>
      </section>

      <section className="achievements-summary" aria-label="Achievement summary">
        <div><Coins size={20} /><span>LabX Points</span><strong>{pointsBalance.toLocaleString()}</strong></div>
        <div><Trophy size={20} /><span>Unlocked achievements</span><strong>{earnedBadgeCount}</strong></div>
        <div><CheckCircle2 size={20} /><span>Approved missions</span><strong>{snapshot.completedQuests}</strong></div>
        <div><Flag size={20} /><span>Level milestones</span><strong>{snapshot.completedMilestones}</strong></div>
      </section>

      <div className="achievements-section-heading achievements-collection-heading">
        <h2 ref={collectionHeading} tabIndex={-1}>Your achievements</h2><span>{earnedBadgeCount} of {badges.length} unlocked</span>
      </div>
      <div className="achievements-filters" aria-label="Filter achievements">
        {filters.map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => changeFilter(value)}>{label}<span>{count}</span></button>)}
      </div>
      <p className="achievements-filter-result" role="status">{filtered.length ? `Showing ${pageStart + 1}–${pageStart + visible.length} of ${filtered.length} ${filter === 'earned' ? 'unlocked achievements' : 'achievements yet to unlock'}` : filter === 'earned' ? 'No achievements unlocked yet' : 'Every achievement unlocked'}</p>

      {visible.length === 0 ? (
        <div className="achievements-status" role="status">
          <Trophy size={32} /><h3>{filter === 'earned' ? 'Your first achievement is ahead' : 'Your collection is complete'}</h3>
          <p>{filter === 'earned' ? 'Explore the collection to find your next step on LabX.' : 'You have unlocked every achievement. Revisit the moments that brought you here.'}</p>
          <button className="achievements-link-button" type="button" onClick={() => changeFilter(filter === 'earned' ? 'locked' : 'earned')}>{filter === 'earned' ? 'Explore achievements' : 'View unlocked achievements'} <ArrowRight size={16} /></button>
        </div>
      ) : (
        <>
          <div className="achievements-grid">
            {visible.map((badge) => (
              <article key={badge.id} className={`achievement-card ${badge.isEarned ? 'is-earned' : 'is-locked'}`} aria-labelledby={`badge-name-${badge.id}`}>
                <div className="achievement-card__top"><span className="achievement-card__state">{badge.isEarned ? <CheckCircle2 size={12} /> : <Lock size={11} />}{badge.isEarned ? 'Unlocked' : 'Yet to unlock'}</span></div>
                <div className="achievement-card__medal" aria-hidden="true"><Medal icon={badgeIcons[badge.icon] || Trophy} earned={badge.isEarned} tone={badge.tone || (badge.metric === 'milestones' ? 'gold' : 'violet')} size={70} /></div>
                <h3 id={`badge-name-${badge.id}`}>{badge.name}</h3><p className="achievement-card__description">{badge.description}</p>
                <div className="achievement-card__criteria"><span>{badge.isEarned ? 'Achievement completed' : 'How to unlock'}</span><p>{badge.criteria}</p></div>
                <div className="achievements-progress__track" role="progressbar" aria-label={`${badge.name} progress`} aria-valuenow={badge.current} aria-valuemin={0} aria-valuemax={badge.target}><span style={{ width: `${badge.progress}%` }} /></div>
                <div className="achievement-card__progress"><span>{badge.current} / {badge.target} {progressLabel(badge)}</span><strong>{badge.progress}%</strong></div>
                <div className="achievement-card__footer">{badge.earnedAt ? <time dateTime={badge.earnedAt}>Unlocked {formatDate(badge.earnedAt)}</time> : <span className="achievement-card__locked-note">{badge.availabilityNote ? 'Coming with guilds' : 'View achievement'}</span>}<ArrowRight size={14} aria-hidden="true" /></div>
                <button type="button" className="achievement-card__open" aria-label={`View ${badge.name} badge`} onClick={() => selectBadge(badge)} />
              </article>
            ))}
          </div>
          <nav className="achievements-pagination" aria-label="Achievement pages">
            <span>Page {currentPage} of {pageCount}</span>
            <div className="achievements-pagination__controls">
              <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft size={17} /></button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} type="button" aria-label={`Page ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>)}
              <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}><ChevronRight size={17} /></button>
            </div>
          </nav>
        </>
      )}

      {selectedBadge && <AchievementDialog key={selectedBadge.id} labelledBy="achievement-badge-title" onClose={() => selectBadge(null)}>
        <Medal icon={badgeIcons[selectedBadge.icon] || Trophy} earned={selectedBadge.isEarned} tone={selectedBadge.tone || 'violet'} size={80} />
        <h2 id="achievement-badge-title">{selectedBadge.name}</h2><p>{selectedBadge.description}</p>
        <dl className="achievements-badge-facts"><div><dt>Status</dt><dd>{selectedBadge.isEarned ? 'Unlocked' : 'Yet to unlock'}</dd></div><div><dt>Unlocked date</dt><dd>{selectedBadge.earnedAt ? formatDate(selectedBadge.earnedAt) : 'Not unlocked yet'}</dd></div><div><dt>How to unlock</dt><dd>{selectedBadge.criteria}</dd></div></dl>
        <div className="achievements-progress__track" role="progressbar" aria-label={`${selectedBadge.name} progress`} aria-valuenow={selectedBadge.current} aria-valuemin={0} aria-valuemax={selectedBadge.target}><span style={{ width: `${selectedBadge.progress}%` }} /></div>
        <p>{selectedBadge.current} of {selectedBadge.target} {progressLabel(selectedBadge)} · {selectedBadge.progress}% complete</p>
        {selectedBadge.availabilityNote && <p className="achievements-availability-note">{selectedBadge.availabilityNote}</p>}
        {isFounder && selectedBadge.actionPath && !selectedBadge.availabilityNote && <Link className="achievements-dialog__action" to={selectedBadge.actionPath}>{selectedBadge.actionLabel || 'Continue your journey'} <ArrowRight size={17} /></Link>}
      </AchievementDialog>}
    </div>
  )
}
