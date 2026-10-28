import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Award, BookOpen, Bookmark, Calendar, CheckCircle2, Coins, Compass, Flag, FolderPlus, HeartHandshake, Lock, MessageSquare, Mountain, Rocket, Route, Search, Shield, Sparkles, Target, Trophy, UserRound, Users, X, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { ACHIEVEMENTS_CHANGE_EVENT, getAchievementsSnapshot } from '../services/mock_achievements.js'
import '../components/AchievementsPage.css'
import { Medal } from '../../../components/common/Medal.jsx'
import { Pagination } from '../../../components/common/Pagination.jsx'

const PAGE_SIZE = 10
const badgeIcons = { flag: Flag, compass: Compass, mountain: Mountain, route: Route, zap: Zap, trophy: Trophy, users: Users, shield: Shield, rocket: Rocket, calendar: Calendar, profile: UserRound, user: UserRound, folder: FolderPlus, project: FolderPlus, book: BookOpen, target: Target, sparkles: Sparkles, handshake: HeartHandshake, message: MessageSquare, award: Award, bookmark: Bookmark }
const formatDate = (date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date))
const progressLabel = (badge) => badge.progressLabel || (badge.metric === 'quests' ? 'approved missions' : 'completed levels')
const progressText = (badge) => badge.metric === 'roadmapProgress' ? `${badge.current}% / ${badge.target}% roadmap progress` : `${badge.current} / ${badge.target} ${progressLabel(badge)}`

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
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const collectionHeading = useRef(null)
  const searchInput = useRef(null)
  const [, refresh] = useReducer((value) => value + 1, 0)
  useEffect(() => {
    const events = ['storage', 'focus', ACHIEVEMENTS_CHANGE_EVENT, 'labx:events-change', 'labx:profile-change', 'labx:roadmap-change']
    for (const event of events) window.addEventListener(event, refresh)
    return () => { for (const event of events) window.removeEventListener(event, refresh) }
  }, [])
  const snapshot = getAchievementsSnapshot(user)
  const { badges, earnedBadgeCount, pointsBalance } = snapshot
  const selectedBadge = badges.find((badge) => badge.id === searchParams.get('badge')) ?? null
  const search = query.trim().toLocaleLowerCase()
  const matching = badges.filter((badge) => [badge.name, badge.description, badge.criteria, badge.category].filter(Boolean).join(' ').toLocaleLowerCase().includes(search))
  const matchingEarned = matching.filter((badge) => badge.isEarned).length
  const filtered = matching.filter((badge) => filter === 'earned' ? badge.isEarned : !badge.isEarned)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const filters = [['earned', 'Earned', matchingEarned], ['locked', 'Unearned', matching.length - matchingEarned]]

  function changeQuery(value) {
    setQuery(value)
    setPage(1)
  }

  function clearSearch() {
    changeQuery('')
    searchInput.current?.focus()
  }

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
      <section className="achievements-summary" aria-label="Achievement summary">
        <div><Coins size={20} /><span>LabX Points</span><strong>{pointsBalance.toLocaleString()}</strong></div>
        <div><Trophy size={20} /><span>Total earned badges</span><strong>{earnedBadgeCount}</strong></div>
        <div><Lock size={20} /><span>Unearned badges</span><strong>{badges.length - earnedBadgeCount}</strong></div>
      </section>

      <div className="achievements-section-heading achievements-collection-heading">
        <h2 ref={collectionHeading} tabIndex={-1}>Your achievements</h2>
        <div className="achievements-search">
          <Search size={17} aria-hidden="true" />
          <input ref={searchInput} type="search" aria-label="Search achievements" placeholder="Search achievements" value={query} onChange={(event) => changeQuery(event.target.value)} />
          {query && <button type="button" onClick={clearSearch} aria-label="Clear achievement search"><X size={16} aria-hidden="true" /></button>}
        </div>
      </div>
      <div className="achievements-filters" aria-label="Filter achievements">
        {filters.map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => changeFilter(value)}>{label}<span>{count}</span></button>)}
      </div>
      {visible.length === 0 ? (
        <div className="achievements-status" role="status">
          <Trophy size={32} /><h3>{search ? `No ${filter === 'earned' ? 'earned' : 'unearned'} achievements match your search` : filter === 'earned' ? 'Your first achievement is ahead' : 'Your collection is complete'}</h3>
          <p>{search ? 'Try a different name, category, or unlock condition.' : filter === 'earned' ? 'Explore the collection to find your next step on LabX.' : 'You have earned every achievement. Revisit the moments that brought you here.'}</p>
          {search ? <button className="achievements-link-button" type="button" onClick={clearSearch}>Clear search <X size={16} /></button> : <button className="achievements-link-button" type="button" onClick={() => changeFilter(filter === 'earned' ? 'locked' : 'earned')}>{filter === 'earned' ? 'Explore achievements' : 'View earned achievements'} <ArrowRight size={16} /></button>}
        </div>
      ) : (
        <>
          <div className="achievements-grid">
            {visible.map((badge) => (
              <article key={badge.id} className={`achievement-card ${badge.isEarned ? 'is-earned' : 'is-locked'}`} aria-labelledby={`badge-name-${badge.id}`}>
                <div className="achievement-card__top"><span className="achievement-card__state">{badge.isEarned ? <CheckCircle2 size={12} /> : <Lock size={11} />}{badge.isEarned ? 'Earned' : 'Unearned'}</span></div>
                <div className="achievement-card__medal" aria-hidden="true"><Medal icon={badgeIcons[badge.icon] || Trophy} earned={badge.isEarned} tone={badge.tone || (badge.metric === 'milestones' ? 'gold' : 'violet')} size={70} /></div>
                <h3 id={`badge-name-${badge.id}`}>{badge.name}</h3><p className="achievement-card__description">{badge.description}</p>
                <div className="achievement-card__criteria"><span>{badge.isEarned ? 'Achievement completed' : 'How to earn'}</span><p>{badge.criteria}</p></div>
                <div className="achievements-progress__track" role="progressbar" aria-label={`${badge.name} progress`} aria-valuenow={badge.current} aria-valuemin={0} aria-valuemax={badge.target}><span style={{ width: `${badge.progress}%` }} /></div>
                <div className="achievement-card__progress"><span>{progressText(badge)}</span><strong>{badge.progress}%</strong></div>
                <div className="achievement-card__footer">{badge.earnedAt ? <time dateTime={badge.earnedAt}>Earned {formatDate(badge.earnedAt)}</time> : <span className="achievement-card__locked-note">{badge.availabilityNote ? 'Coming with Social' : 'View achievement'}</span>}<ArrowRight size={14} aria-hidden="true" /></div>
                <button type="button" className="achievement-card__open" aria-label={`View ${badge.name} badge`} onClick={() => selectBadge(badge)} />
              </article>
            ))}
          </div>
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} itemLabel="achievements" onPageChange={changePage} label="Achievement pages" className="achievements-pagination" />
        </>
      )}

      {selectedBadge && <AchievementDialog key={selectedBadge.id} labelledBy="achievement-badge-title" onClose={() => selectBadge(null)}>
        <Medal icon={badgeIcons[selectedBadge.icon] || Trophy} earned={selectedBadge.isEarned} tone={selectedBadge.tone || 'violet'} size={80} />
        <h2 id="achievement-badge-title">{selectedBadge.name}</h2><p>{selectedBadge.description}</p>
        <dl className="achievements-badge-facts">{selectedBadge.category && <div><dt>Category</dt><dd>{selectedBadge.category}</dd></div>}<div><dt>Status</dt><dd>{selectedBadge.isEarned ? 'Earned' : 'Unearned'}</dd></div><div><dt>Earned date</dt><dd>{selectedBadge.earnedAt ? formatDate(selectedBadge.earnedAt) : 'Not earned yet'}</dd></div><div><dt>How to earn</dt><dd>{selectedBadge.criteria}</dd></div></dl>
        <div className="achievements-progress__track" role="progressbar" aria-label={`${selectedBadge.name} progress`} aria-valuenow={selectedBadge.current} aria-valuemin={0} aria-valuemax={selectedBadge.target}><span style={{ width: `${selectedBadge.progress}%` }} /></div>
        <p>{progressText(selectedBadge)} · {selectedBadge.progress}% complete</p>
        {selectedBadge.availabilityNote && <p className="achievements-availability-note">{selectedBadge.availabilityNote}</p>}
        {isFounder && selectedBadge.actionPath && !selectedBadge.availabilityNote && <Link className="achievements-dialog__action" to={selectedBadge.actionPath}>{selectedBadge.actionLabel || 'Continue your journey'} <ArrowRight size={17} /></Link>}
      </AchievementDialog>}
    </div>
  )
}
