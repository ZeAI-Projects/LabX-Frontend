import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Coins, Compass, Flag, History, Lock, Mountain, Route, Trophy, X, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { ACHIEVEMENTS_CHANGE_EVENT, getAchievementsSnapshot } from '../services/mock_achievements.js'
import '../components/AchievementsPage.css'
import { Medal } from '../../../components/common/Medal.jsx'

const badgeIcons = { flag: Flag, compass: Compass, mountain: Mountain, route: Route, zap: Zap, trophy: Trophy }
const formatDate = (date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date))

function BadgeIcon({ badge, size = 26 }) {
  const Icon = badgeIcons[badge.icon] || Trophy
  return <Icon size={size} aria-hidden="true" />
}

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

function Transactions({ entries }) {
  if (!entries.length) return <p className="achievements-empty-ledger">No LabX Points transactions yet.</p>
  return (
    <ul className="achievements-transactions">
      {entries.map((entry) => (
        <li key={entry.id}>
          <div className="achievements-transactions__activity"><strong>{entry.activity}</strong><span>{entry.type} · <time dateTime={entry.date}>{formatDate(entry.date)}</time></span><small>{entry.id}</small></div>
          <div className="achievements-transactions__value"><strong>+{entry.amount} <span>points</span></strong><span className={`achievements-transaction-status ${entry.status === 'Approved' ? 'is-approved' : ''}`}>{entry.status}</span></div>
        </li>
      ))}
    </ul>
  )
}

export function AchievementsPage() {
  const { user } = useAuth()
  const isFounder = user?.role === 'founder'
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState('all')
  const [showHistory, setShowHistory] = useState(false)
  const [, refresh] = useReducer((value) => value + 1, 0)
  useEffect(() => {
    for (const event of ['storage', 'focus', ACHIEVEMENTS_CHANGE_EVENT]) window.addEventListener(event, refresh)
    return () => { for (const event of ['storage', 'focus', ACHIEVEMENTS_CHANGE_EVENT]) window.removeEventListener(event, refresh) }
  }, [])
  const snapshot = getAchievementsSnapshot(user)
  const { badges, earnedBadgeCount, pointsBalance, nextAchievement } = snapshot
  const selectedBadge = badges.find((badge) => badge.id === searchParams.get('badge')) ?? null
  const progressPct = badges.length ? Math.round(earnedBadgeCount / badges.length * 100) : 0
  const visible = badges.filter((badge) => filter === 'all' || (filter === 'earned' ? badge.isEarned : !badge.isEarned))
  const filters = [['all', 'All', badges.length], ['earned', 'Earned', earnedBadgeCount], ['locked', 'Locked', badges.length - earnedBadgeCount]]

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
          <span className="achievements-eyebrow"><Trophy size={14} /> YOUR TROPHY COLLECTION</span>
          <h2 id="achievements-hero-title">Small wins. Lasting milestones.</h2>
          <p>Every mission moves you forward. Build your collection as you learn, create, and connect.</p>
        </div>
        <div className="achievements-progress">
          <div className="achievements-progress__numbers"><strong>{earnedBadgeCount}<span> / {badges.length}</span></strong><span>badges earned</span></div>
          <div className="achievements-progress__track" role="progressbar" aria-label="Achievement progress" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progressPct}%` }} /></div>
          <span className="achievements-progress__caption">{progressPct}% of your collection unlocked</span>
        </div>
      </section>

      <p className="achievements-demo-note">{isFounder ? <>Approved missions unlock badges in this browser. Placement credits do not count, and mission completion does not award LabX Points.</> : 'This is the founder achievement collection. Badges track approved founder missions and completed levels.'}</p>

      <section className="achievements-summary" aria-label="Achievement summary">
        <div><Coins size={20} /><span>LabX Points balance</span><strong>{pointsBalance.toLocaleString()}</strong></div>
        <div><Trophy size={20} /><span>Earned badges</span><strong>{earnedBadgeCount}</strong></div>
        <div><CheckCircle2 size={20} /><span>Approved missions</span><strong>{snapshot.completedQuests}</strong></div>
        <div><Flag size={20} /><span>Level milestones</span><strong>{snapshot.completedMilestones}</strong></div>
      </section>

      {nextAchievement && <Link className="achievement-next-checkpoint" to={isFounder ? '/roadmap' : '/events'}><span className="achievement-next-checkpoint__icon"><Medal icon={badgeIcons[nextAchievement.icon] || Trophy} earned={false} size={39}/></span><div><span>Your next unlock</span><strong>{nextAchievement.name}</strong><small>{nextAchievement.current} of {nextAchievement.target} {nextAchievement.metric === 'quests' ? 'approved missions' : 'level milestones'}</small></div><span className="achievement-next-checkpoint__progress" role="progressbar" aria-label="Next badge progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={nextAchievement.progress}><span style={{ width: nextAchievement.progress + '%' }}/></span><ArrowRight size={18}/></Link>}
      <div className="achievements-section-heading achievements-collection-heading"><h2>Your badges</h2><span>{earnedBadgeCount} of {badges.length} earned</span></div>
      <div className="achievements-filters" aria-label="Filter achievements">
        {filters.map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}
      </div>
      <p className="achievements-filter-result" role="status">{filter === 'all' ? `Showing all ${badges.length} achievements` : `${visible.length} ${filter} ${visible.length === 1 ? 'achievement' : 'achievements'}`}</p>

      {visible.length === 0 ? (
        <div className="achievements-status" role="status"><Trophy size={32} /><h3>{filter === 'earned' ? 'Your first badge is ahead' : 'Your collection is complete'}</h3><p>{filter === 'earned' ? isFounder ? 'Complete approved missions and level milestones to start your collection.' : 'Your earned recognition will appear here as eligible activities become available.' : 'Every badge in this collection is earned. Explore All to revisit your achievements.'}</p>{filter === 'locked' ? <button className="achievements-link-button" type="button" onClick={() => setFilter('all')}>View all achievements <ArrowRight size={16} /></button> : <Link className="achievements-link-button" to={isFounder ? '/roadmap' : '/events'}>{isFounder ? 'Explore your roadmap' : 'Explore events'} <ArrowRight size={16} /></Link>}</div>
      ) : (
        <div className="achievements-grid">
          {visible.map((badge) => (
            <article key={badge.id} className={`achievement-card ${badge.isEarned ? 'is-earned' : 'is-locked'}`} aria-labelledby={`badge-name-${badge.id}`}>
              <div className="achievement-card__top"><span className="achievement-card__state">{badge.isEarned ? <CheckCircle2 size={12} /> : <Lock size={11} />}{badge.isEarned ? 'Earned' : 'Locked'}</span><span className="achievement-card__category">{badge.metric === 'quests' ? 'MISSION' : 'MILESTONE'}</span></div>
              <div className="achievement-card__medal" aria-hidden="true"><Medal icon={badgeIcons[badge.icon] || Trophy} earned={badge.isEarned} tone={badge.metric === 'milestones' ? 'gold' : 'violet'} size={74}/></div>
              <h3 id={`badge-name-${badge.id}`}>{badge.name}</h3><p className="achievement-card__description">{badge.description}</p>
              <div className="achievement-card__criteria"><span>{badge.isEarned ? 'Achievement completed' : 'How to unlock'}</span><p>{badge.criteria}</p></div>
              <div className="achievements-progress__track" role="progressbar" aria-label={`${badge.name} collection progress`} aria-valuenow={badge.current} aria-valuemin={0} aria-valuemax={badge.target}><span style={{ width: `${badge.progress}%` }} /></div>
              <div className="achievement-card__progress"><span>{badge.current} / {badge.target} {badge.metric === 'quests' ? 'approved missions' : 'level milestones'}</span><strong>{badge.progress}%</strong></div>
              <div className="achievement-card__footer">{badge.earnedAt ? <time dateTime={badge.earnedAt}>Earned {formatDate(badge.earnedAt)}</time> : <span className="achievement-card__locked-note">Keep building your progress</span>}<ArrowRight size={14} aria-hidden="true" /></div>
              <button type="button" className="achievement-card__open" aria-label={`View ${badge.name} badge`} onClick={() => selectBadge(badge)} />
            </article>
          ))}
        </div>
      )}

      <div className="achievements-overview">
        <section className="achievements-points" aria-labelledby="achievements-points-title">
          <div className="achievements-section-heading"><h2 id="achievements-points-title"><Coins size={19} /> Points overview</h2><button type="button" className="achievements-link-button" onClick={() => setShowHistory(true)}><History size={16} /> View Points History</button></div>
          <p><strong>{snapshot.approvedPoints} points</strong> earned from approved activities. Pending points are excluded from your available balance.</p>
          <Transactions entries={snapshot.transactions.slice(0, 3)} />
          <p className="achievements-points__footnote">LabX Points are non-cash recognition. They cannot be withdrawn or redeemed for cash.</p>
        </section>
        <section className="achievements-next" aria-labelledby="achievements-next-title">
          <span className="achievements-eyebrow"><Compass size={14} /> KEEP MOVING FORWARD</span>
          <h2 id="achievements-next-title">Your next achievement</h2>
          {nextAchievement ? <>
            <div className="achievements-next__badge"><BadgeIcon badge={nextAchievement} /><strong>{nextAchievement.name}</strong></div>
            <p>{nextAchievement.criteria}</p>
            <div className="achievements-progress__track" role="progressbar" aria-label={`Progress toward ${nextAchievement.name}`} aria-valuenow={nextAchievement.current} aria-valuemin={0} aria-valuemax={nextAchievement.target}><span style={{ width: `${nextAchievement.progress}%` }} /></div>
            <span className="achievements-progress__caption">{nextAchievement.current} of {nextAchievement.target} {nextAchievement.metric === 'quests' ? 'approved missions' : 'level milestones'}</span>
            <p className="achievements-next__criteria-note">Illustrative collection criteria</p>
            <button type="button" className="achievements-link-button" onClick={() => selectBadge(nextAchievement)}>View badge details <ArrowRight size={15} /></button>
          </> : <p>You have unlocked every badge in this collection.</p>}
          {isFounder && <Link className="achievements-leaderboard-link" to="/leaderboard"><Trophy size={16} /> View Leaderboard <ArrowRight size={15} /></Link>}
        </section>
      </div>

      {selectedBadge && <AchievementDialog key={selectedBadge.id} labelledBy="achievement-badge-title" onClose={() => selectBadge(null)}>
        <div className={`achievement-card__icon ${selectedBadge.isEarned ? 'is-earned' : ''}`}><BadgeIcon badge={selectedBadge} size={30} /></div>
        <span className="achievements-dialog__eyebrow">FOUNDER BADGE COLLECTION</span>
        <h2 id="achievement-badge-title">{selectedBadge.name}</h2><p>{selectedBadge.description}</p>
        <dl className="achievements-badge-facts"><div><dt>Status</dt><dd>{selectedBadge.isEarned ? 'Earned' : 'Locked'}</dd></div><div><dt>Earned date</dt><dd>{selectedBadge.earnedAt ? formatDate(selectedBadge.earnedAt) : 'Not earned yet'}</dd></div><div><dt>Earning criteria</dt><dd>{selectedBadge.criteria}</dd></div></dl>
        <div className="achievements-progress__track" role="progressbar" aria-label={`${selectedBadge.name} progress`} aria-valuenow={selectedBadge.current} aria-valuemin={0} aria-valuemax={selectedBadge.target}><span style={{ width: `${selectedBadge.progress}%` }} /></div>
        <p>{selectedBadge.current} of {selectedBadge.target} {selectedBadge.metric === 'quests' ? 'approved missions' : 'level milestones'} · {selectedBadge.progress}% complete</p>
        <p className="achievements-points__footnote">{isFounder ? 'A level milestone requires all three missions in that level to be approved and submitted by you.' : 'This collection is based on founder missions. Criteria for your role are not configured.'}</p>
        {isFounder && <Link className="achievements-dialog__action" to="/roadmap">Open roadmap for related quests <ArrowRight size={17} /></Link>}
      </AchievementDialog>}

      {showHistory && <AchievementDialog labelledBy="achievement-history-title" onClose={() => setShowHistory(false)}>
        <span className="achievements-eyebrow"><History size={16} /> POINTS LEDGER</span><h2 id="achievement-history-title">Points History</h2>
        <p>Available balance: <strong>{pointsBalance} LabX Points</strong></p><p>Only approved points transactions count toward your balance.</p>
        <Transactions entries={snapshot.transactions} /><p className="achievements-points__footnote">Entries are read-only. LabX Points have no cash value.</p>
      </AchievementDialog>}
    </div>
  )
}
