import PodiumCard from '../components/PodiumCard.jsx'
import { useLeaderboard } from '../hooks/useLeaderboard.js'
import { getRankClass } from '../services/leaderboardUtils.js'
import { CURRENT_DOMAIN, getDomainIcon, PERIODS } from '../services/mockLeaderboard.js'
import './LeaderboardPage.css'

function LeaderboardPage() {
  const {
    actions,
    clearFilters,
    domain,
    domains,
    eligibility,
    founders,
    modal,
    openAction,
    period,
    scope,
    search,
    setDomain,
    setEligibility,
    setModal,
    setPeriod,
    setScope,
    setSearch,
    userStanding,
  } = useLeaderboard()
  const top3 = founders.slice(0, 3)
  return (
    <div className="leaderboard-page">
      <div className="labx-navbar"><div className="labx-navbar-title"><div className="labx-title-line"/><div><h1>Leaderboard</h1><span className="labx-subtitle">FOUNDER COMMAND CENTER</span></div></div><span className="lb-demo-flag">DEMO DATA</span></div>
      <div className="leaderboard-bg"><div className="leaderboard-glow glow-purple"/><div className="leaderboard-glow glow-cyan"/><div className="leaderboard-grid"/></div>
      <main className="leaderboard-content">
        <section className="leaderboard-header-section">
          <div className="header-text-group"><h1 className="leaderboard-main-title">Founder <span style={{ color: '#22d3ee' }}>Leaderboard</span></h1><p className="leaderboard-main-sub">Compete, complete milestones, and rise to the top of the founder ranks.</p></div>
          <div className="leaderboard-controls-row">
            <div className="leaderboard-tabs">
              <button type="button" className={`leaderboard-tab ${scope === 'domain' && !domain ? 'active' : ''}`} onClick={() => { setScope('domain'); setDomain('') }}><span>⌖</span>{CURRENT_DOMAIN}</button>
              <button type="button" className={`leaderboard-tab ${scope === 'all' && !domain ? 'active' : ''}`} onClick={() => { setScope('all'); setDomain('') }}><span>◎</span>Global</button>
              <div className="domain-select-wrap"><span>⌄</span><select aria-label="Filter leaderboard by domain" value={domain} onChange={(event) => { setDomain(event.target.value); if (event.target.value) setScope('') }}><option value="">Filter by Domain</option>{domains.map((name) => <option key={name} value={name}>{getDomainIcon(name)} {name}</option>)}</select></div>
            </div>
            <form className="leaderboard-search" onSubmit={(event) => event.preventDefault()}><span aria-hidden="true">⌕</span><input aria-label="Search founders" placeholder="Search founder..." value={search} onChange={(event) => setSearch(event.target.value)}/><button type="submit">Search</button></form>
          </div>
          <div className="lb-extra-filters"><div className="lb-period-tabs" aria-label="Ranking period">{PERIODS.map((item) => <button type="button" key={item.id} className={period === item.id ? 'active' : ''} onClick={() => setPeriod(item.id)}>{item.label}</button>)}</div><label className="lb-eligibility">Eligibility<select aria-label="Filter by eligibility" value={eligibility} onChange={(event) => setEligibility(event.target.value)}><option value="all">Everyone</option><option value="eligible">Eligible</option><option value="ineligible">Not eligible</option></select></label></div>
        </section>
        <div className="lb-actions">{actions.map((action) => <button type="button" key={action.id} className="leaderboard-tab" onClick={() => openAction(action)}>{action.label}</button>)}</div>

        {userStanding && <section className="your-standing-card-hero"><div className="your-standing-left"><div className="your-rank-badge"><span className="rank-hash">#</span><span className="rank-num">{userStanding.rank}</span></div><div className="your-avatar-wrap"><span>{userStanding.full_name[0]}</span></div><div className="your-identity-col"><div className="your-name-row"><strong className="your-full-name">{userStanding.full_name}</strong><span className="you-pill-badge">YOU</span><span className="your-handle">@{userStanding.username}</span></div><div className="your-meta-sub"><span className="your-domain-text">{userStanding.domain}</span><span>·</span><span className="your-badge-count">{userStanding.badges_count} Badges Earned</span><span className={`lb-status ${userStanding.eligible ? 'eligible' : 'ineligible'}`}>{userStanding.eligible ? 'Eligible' : 'Not eligible'}</span></div></div></div><div className="your-standing-right"><div className="your-points-block"><strong className="points-number">{userStanding.total_points.toLocaleString()}</strong><span className="points-label">{period.toUpperCase()} POINTS</span></div><button type="button" className="btn-view-profile" onClick={() => openAction(actions[2], userStanding)}>View Leaderboard <span>›</span></button></div></section>}

        {!founders.length ? <div className="glass-card lb-empty"><span>🏆</span><h3>No founders found</h3><p>Try changing filters or clearing your search.</p><button type="button" onClick={clearFilters}>Clear filters</button></div> : <>
          <section className="podium-section"><div className="section-heading"><div><span className="podium-section-kicker">TOP 3 SOVEREIGNS</span><h2 className="podium-section-title">The Hall of Leaders</h2></div><div className="live-indicator"><span/> DEMO RANKINGS</div></div><div className="podium-container">{[top3[1], top3[0], top3[2]].filter(Boolean).map((founder) => <PodiumCard key={founder.id} founder={founder} leaderboardAction={actions[2]} onAction={openAction}/>)}</div></section>
          {founders.length > 3 && <section className="rankings-section"><div className="rankings-header"><div><span className="podium-section-kicker">CONTINUED STANDINGS</span><h2 className="rankings-title">Ranks #4 and Beyond</h2></div><span className="lb-count">{founders.length - 3} Founders</span></div><div className="rankings-table" role="region" aria-label="Founder standings"><div className="rankings-table-head"><span>RANK</span><span>FOUNDER</span><span>DOMAIN</span><span>PROGRESS</span><span>BADGES</span><span>POINTS</span><span/></div>{founders.slice(3).map((founder) => <article className={`ranking-row ${founder.is_current_user ? 'is-user' : ''}`} key={founder.id}><div className={`ranking-position ${getRankClass(founder.rank)}`}><span>#{founder.rank}</span></div><div className="ranking-founder"><div className="small-avatar"><span>{founder.full_name[0]}</span></div><div><div className="founder-name"><strong>{founder.full_name}</strong>{founder.is_current_user && <span className="you-badge">YOU</span>}</div><span>@{founder.username}</span></div></div><div className="ranking-domain"><span>{founder.domain_icon}</span><span>{founder.domain}</span></div><div className="ranking-progress"><strong>{founder.stage}</strong><span>{founder.level}</span><span className={`lb-status ${founder.eligible ? 'eligible' : 'ineligible'}`}>{founder.eligible ? 'Eligible' : 'Not eligible'}</span></div><div className="ranking-badges"><span>✦ {founder.badges_count} badges</span></div><div className="ranking-points"><strong>{founder.total_points.toLocaleString()}</strong><span> PTS</span></div><button type="button" className="ranking-arrow lb-row-action" aria-label={`View details for ${founder.full_name}`} onClick={() => openAction(actions[2], founder)}>›</button></article>)}</div></section>}
        </>}
      </main>
      {modal && <div className="lb-modal-shade" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><section className="lb-modal glass-card" role="dialog" aria-modal="true" aria-labelledby="lb-modal-title"><button type="button" className="lb-modal-x" aria-label="Close" onClick={() => setModal(null)}>×</button><span className="podium-section-kicker">{modal.action.label.toUpperCase()}</span><h2 id="lb-modal-title">{modal.founder.full_name}</h2>{modal.action.id === 'badge' && <p>Earned badges: {modal.founder.badges_count}. Featured: {modal.founder.domain} Explorer.</p>}{modal.action.id === 'history' && <div className="lb-history"><p>Quest completion <strong>+120 pts</strong></p><p>Community contribution <strong>+80 pts</strong></p><p>Milestone achieved <strong>+45 pts</strong></p></div>}{modal.action.id === 'quest' && <p>{modal.founder.domain_icon} Related quest: {modal.founder.quest}. Demo destination.</p>}{modal.action.id === 'leaderboard' && <p>Rank #{modal.founder.rank} · {modal.founder.total_points.toLocaleString()} {period} points · {modal.founder.eligible ? 'Eligible' : 'Not eligible'}.</p>}<button type="button" className="lb-modal-done" onClick={() => setModal(null)}>Done</button><small>Mock data demonstration</small></section></div>}
    </div>
  )
}

export default LeaderboardPage

