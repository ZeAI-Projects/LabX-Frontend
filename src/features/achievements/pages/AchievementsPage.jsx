import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Coins, Compass, Flag, History, Lock, Mountain, Route, Trophy, X, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { getAchievementsSnapshot } from '../services/mock_achievements.js'
import '../components/AchievementsPage.css'

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
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog ref={ref} className="achievements-dialog" aria-labelledby={labelledBy} onCancel={(event) => { event.preventDefault(); onClose() }}>
      <button autoFocus className="achievements-dialog__close" type="button" onClick={onClose} aria-label="Close achievement details"><X size={20} /></button>
      {children}
    </dialog>
  )
}

function Transactions({ entries }) {
  if (!entries.length) return <p className="achievements-empty-ledger">No points transactions yet. Approved activity will appear here with its date and status.</p>
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
  const [filter, setFilter] = useState('all')
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const snapshot = getAchievementsSnapshot(user)
  const { badges, earnedBadgeCount, pointsBalance, nextAchievement } = snapshot
  const progressPct = Math.round(earnedBadgeCount / badges.length * 100)
  const visible = badges.filter((badge) => filter === 'all' || (filter === 'earned' ? badge.isEarned : !badge.isEarned))
  const filters = [['all', 'All', badges.length], ['earned', 'Earned', earnedBadgeCount], ['locked', 'Locked', badges.length - earnedBadgeCount]]

  return (
    <div className="achievements-page">
      <section className="achievements-hero" aria-labelledby="achievements-hero-title">
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

      <p className="achievements-demo-note">{snapshot.isDemo ? 'Demo collection: points, approvals, and earned badges below are illustrative sample activity.' : 'Preview collection: badge criteria are illustrative. Your account starts with zero points and no earned badges.'} Earned recognition is separate from identity or credential verification.</p>

      <section className="achievements-summary" aria-label="Achievement summary">
        <div><Coins size={20} /><span>LabX Points balance</span><strong>{pointsBalance.toLocaleString()}</strong></div>
        <div><Trophy size={20} /><span>Earned badges</span><strong>{earnedBadgeCount}</strong></div>
        <div><CheckCircle2 size={20} /><span>Completed quests</span><strong>{snapshot.completedQuests}</strong></div>
        <div><Flag size={20} /><span>Completed milestones</span><strong>{snapshot.completedMilestones}</strong></div>
      </section>

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
            <span className="achievements-progress__caption">{nextAchievement.current} of {nextAchievement.target} {nextAchievement.metric === 'quests' ? 'approved quests' : 'completed milestones'}</span>
            <p className="achievements-next__criteria-note">Illustrative collection criteria</p>
            <button type="button" className="achievements-link-button" onClick={() => setSelectedBadge(nextAchievement)}>View badge details <ArrowRight size={15} /></button>
          </> : <p>You have unlocked every badge in this collection.</p>}
          {isFounder && <Link className="achievements-leaderboard-link" to="/leaderboard"><Trophy size={16} /> View Leaderboard <ArrowRight size={15} /></Link>}
        </section>
      </div>

      <div className="achievements-section-heading achievements-collection-heading"><h2>Your badges</h2><span>Earned recognition</span></div>
      <div className="achievements-filters" aria-label="Filter achievements">
        {filters.map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}
      </div>

      {visible.length === 0 ? (
        <div className="achievements-status" role="status"><Trophy size={32} /><h3>{filter === 'earned' ? 'Your first badge is ahead' : 'No badges to show'}</h3><p>{filter === 'earned' ? isFounder ? 'Complete approved quests and milestones to start your collection.' : 'Your earned recognition will appear here as eligible activities become available.' : 'Try another filter to explore your collection.'}</p><Link className="achievements-link-button" to={isFounder ? '/roadmap' : '/events'}>{isFounder ? 'Explore your roadmap' : 'Explore events'} <ArrowRight size={16} /></Link></div>
      ) : (
        <div className="achievements-grid">
          {visible.map((badge) => (
            <article key={badge.id} className={`achievement-card ${badge.isEarned ? 'is-earned' : 'is-locked'}`}>
              <div className="achievement-card__top"><div className="achievement-card__icon"><BadgeIcon badge={badge} /></div>{badge.isEarned ? <CheckCircle2 className="achievement-card__status" size={17} aria-label="Earned" /> : <Lock className="achievement-card__status" size={15} aria-label="Locked" />}</div>
              <h3>{badge.name}</h3><p>{badge.description}</p>
              <div className="achievement-card__footer"><span />{badge.isEarned ? 'Earned' : 'Locked'}<span className="achievement-card__view">View badge <ArrowRight size={13} /></span></div>
              <button type="button" className="achievement-card__open" aria-label={`View ${badge.name} badge`} onClick={() => setSelectedBadge(badge)} />
            </article>
          ))}
        </div>
      )}

      {selectedBadge && <AchievementDialog labelledBy="achievement-badge-title" onClose={() => setSelectedBadge(null)}>
        <div className={`achievement-card__icon ${selectedBadge.isEarned ? 'is-earned' : ''}`}><BadgeIcon badge={selectedBadge} size={30} /></div>
        <span className="achievements-dialog__eyebrow">EARNED RECOGNITION · ILLUSTRATIVE BADGE</span>
        <h2 id="achievement-badge-title">{selectedBadge.name}</h2><p>{selectedBadge.description}</p>
        <dl className="achievements-badge-facts"><div><dt>Status</dt><dd>{selectedBadge.isEarned ? 'Earned' : 'Locked'}</dd></div><div><dt>Earned date</dt><dd>{selectedBadge.earnedAt ? formatDate(selectedBadge.earnedAt) : 'Not earned yet'}</dd></div><div><dt>Earning criteria</dt><dd>{selectedBadge.criteria}</dd></div></dl>
        <div className="achievements-progress__track" role="progressbar" aria-label={`${selectedBadge.name} progress`} aria-valuenow={selectedBadge.current} aria-valuemin={0} aria-valuemax={selectedBadge.target}><span style={{ width: `${selectedBadge.progress}%` }} /></div>
        <p>{selectedBadge.current} of {selectedBadge.target} {selectedBadge.metric === 'quests' ? 'approved quests' : 'completed milestones'} · {selectedBadge.progress}% complete</p>
        <p className="achievements-points__footnote">This badge recognizes activity; it does not verify identity or credentials. {isFounder ? 'Explore available quests in your roadmap.' : 'This preview collection illustrates founder activity; mentor recognition criteria are not configured yet.'}</p>
        {isFounder && <Link className="achievements-dialog__action" to="/roadmap">Open roadmap for related quests <ArrowRight size={17} /></Link>}
      </AchievementDialog>}

      {showHistory && <AchievementDialog labelledBy="achievement-history-title" onClose={() => setShowHistory(false)}>
        <span className="achievements-eyebrow"><History size={16} /> POINTS LEDGER</span><h2 id="achievement-history-title">Points History</h2>
        <p>Available balance: <strong>{pointsBalance} LabX Points</strong></p><p>{snapshot.isDemo ? 'Illustrative demo transactions. Approved entries count toward the balance; pending entries do not.' : 'Your approved activity and points will appear in this history.'}</p>
        <Transactions entries={snapshot.transactions} /><p className="achievements-points__footnote">Entries are read-only. LabX Points have no cash value.</p>
      </AchievementDialog>}
    </div>
  )
}
