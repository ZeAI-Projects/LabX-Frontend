import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Award, Compass, Crown, Globe2, Info, Medal, Search, Sparkles, Target, Trophy, Users, X, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { getLeaderboardSnapshot } from '../services/mock_leaderboard.js'
import '../components/LeaderboardPage.css'

const points = value => value.toLocaleString('en-US')
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')
const rankLabel = rank => rank == null ? 'Not ranked' : `#${rank}`

function RankPair({ founder, className = '' }) {
  return <dl className={`lb-rank-pair ${className}`}>
    <div><dt>Global Rank</dt><dd>{rankLabel(founder.global_rank)}</dd></div>
    <div title={founder.domain_rank === null ? 'Complete an assessment in a listed domain to receive a Domain Rank.' : founder.domain}><dt>Domain Rank</dt><dd>{rankLabel(founder.domain_rank)}</dd></div>
  </dl>
}

function Avatar({ founder, large = false }) {
  return <span className={`lb-avatar${large ? ' lb-avatar--large' : ''}`} style={{ '--avatar-color': founder.avatarColor || '#7c91ef' }} aria-hidden="true">{initials(founder.full_name)}</span>
}

function Progress({ founder }) {
  return founder.stage
    ? <><strong>{founder.stage}</strong><span>{founder.level ? `Level ${founder.level}` : 'Level not set'}</span></>
    : <><strong>Getting started</strong><span>Assessment ahead</span></>
}

function Dialog({ titleId, closeLabel = 'Close founder details', onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className="lb-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const targets = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length)
      const first = targets[0]
      const last = targets.at(-1)
      if (event.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement))) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !targets.includes(document.activeElement))) {
        event.preventDefault()
        first?.focus()
      }
    }}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }}>
    <button type="button" autoFocus className="lb-dialog-close" aria-label={closeLabel} onClick={onClose}><X size={20} /></button>
    {children}
  </dialog>
}

function FounderDetails({ founder, scopeLabel, onClose }) {
  return <Dialog titleId="lb-founder-title" onClose={onClose}>
    <span className="lb-eyebrow"><Sparkles size={13} />Founder spotlight</span>
    <div className="lb-detail-identity">
      <Avatar founder={founder} large />
      <div><h2 id="lb-founder-title">{founder.full_name}</h2><p>@{founder.username}{founder.is_current_user && <span className="lb-you">YOU</span>}</p></div>
    </div>
    <p className="lb-detail-bio">{founder.bio || 'A founder building their next chapter with LabX.'}</p>
    <RankPair founder={founder} className="lb-detail-ranks" />
    <div className="lb-detail-score"><span><Zap size={18} /><strong>{points(founder.total_points)}</strong> LabX Points</span></div>
    <p className="lb-detail-scope">Ranking in {scopeLabel}</p>
    <dl className="lb-detail-facts">
      <div><dt>Domain</dt><dd>{founder.domains.length ? founder.domains.map(domain => domain.name).join(' · ') : 'Domain not set'}</dd></div>
      <div><dt>Stage</dt><dd>{founder.stage || 'Getting started'}</dd></div>
      <div><dt>Level</dt><dd>{founder.level ? `Level ${founder.level}` : 'Not placed yet'}</dd></div>
      <div><dt>Badges earned</dt><dd><Award size={16} />{founder.badges_count}</dd></div>
      <div><dt>Domain ranks</dt><dd>{founder.domain_ranks.length ? founder.domain_ranks.map(domain => `${domain.name}: #${domain.rank}`).join(' · ') : 'Complete a domain assessment'}</dd></div>
      <div><dt>Eligibility status</dt><dd>Ranked in this scope</dd></div>
    </dl>
    {founder.is_current_user
      ? <Link className="lb-primary lb-detail-action" to="/achievements">Explore your achievements<ArrowRight size={16} /></Link>
      : <p className="lb-detail-note">Founder profile</p>}
  </Dialog>
}

function Podium({ founders, onSelect, domains }) {
  return <div className={`lb-podium${founders.length < 3 ? ' lb-podium--small' : ''}`}>
    {founders.map((founder, index) => {
      const domain = domains.find(entry => entry.name === founder.domain)
      const champion = founder.rank === 1
      return <button key={founder.id} id={`lb-podium-${founder.id}`} type="button"
        className={`lb-podium-card lb-podium-card--${index + 1}${champion ? ' is-champion' : ''}`}
        aria-label={`Rank ${founder.rank}: ${founder.full_name}. View founder details`}
        onClick={() => onSelect(founder)}>
        <div className="lb-podium-topline">{champion ? <Crown size={19} /> : <Medal size={17} />}<span>{champion ? 'Top founder' : index === 1 ? 'Runner-up' : 'On the podium'}</span><strong>#{founder.rank}</strong></div>
        <div className="lb-podium-person"><div className="lb-podium-avatar"><Avatar founder={founder} large /><span className="lb-podium-rank">{founder.rank}</span></div>
          <h3>{founder.full_name}{founder.is_current_user && <span className="lb-you">YOU</span>}</h3><p>@{founder.username}</p>
        </div>
        <span className="lb-podium-domain" title={founder.domain}>{domain?.shortName || founder.domain}</span>
        <RankPair founder={founder} className="lb-podium-ranks" />
        <div className="lb-podium-points"><Zap size={15} /><strong>{points(founder.total_points)}</strong><span>LabX Points</span></div>
        <p className="lb-podium-progress">{founder.stage || 'Getting started'}{founder.level ? ` · Level ${founder.level}` : ''}</p>
        <div className="lb-podium-footer"><span><Award size={13} />{founder.badges_count} badges</span><span>View founder<ArrowRight size={13} /></span></div>
      </button>
    })}
  </div>
}

export function LeaderboardPage() {
  const { user } = useAuth()
  const { projects } = useProjects()
  const [searchParams, setSearchParams] = useSearchParams()
  const scope = searchParams.get('scope') === 'domain' ? 'domain' : 'global'
  const domainId = searchParams.get('domain')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [selectedFounder, setSelectedFounder] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const searchInput = useRef(null)
  const tableHeading = useRef(null)
  const pendingFocus = useRef(null)
  const assessmentDomains = useMemo(() => getLeaderboardSnapshot({user, projects}).userStanding?.domains || [], [user, projects])
  const effectiveDomainId = domainId ?? assessmentDomains[0]?.id ?? ''
  const snapshot = useMemo(() => getLeaderboardSnapshot({ user, projects, scope, domainId: effectiveDomainId, search }), [user, projects, scope, effectiveDomainId, search])
  const { domains, rankings, podium, leader, userStanding, requiresDomain, totalFounders, matchedCount, nextRankGap, metrics } = snapshot
  const scopeLabel = scope === 'global' ? 'Global' : snapshot.domain?.name || 'your selected domain'
  const isSearching = Boolean(search)
  const podiumIds = new Set(podium.map(founder => founder.id))
  const pageRows = isSearching ? rankings : rankings.filter(founder => !podiumIds.has(founder.id))

  useEffect(() => {
    if (!pendingFocus.current) return
    const rowButton = document.getElementById(`lb-view-${pendingFocus.current}`)
    if (rowButton) {
      rowButton.focus({ preventScroll: true })
      rowButton.scrollIntoView({ block: 'center', behavior: 'instant' })
      pendingFocus.current = null
    }
  }, [search, rankings])

  const resetSearch = () => { setSearch(''); setSearchDraft('') }
  const setDomainId = id => setSearchParams({ scope: 'domain', domain: id })
  const switchScope = next => { setSearchParams({ scope: next, ...(domainId !== null ? { domain: domainId } : {}) }); resetSearch() }
  const findMyRank = () => {
    const index = snapshot.allRankings.findIndex(founder => founder.is_current_user)
    if (index < 0) return
    if (podium.some(founder => founder.is_current_user)) { const card = document.getElementById('lb-podium-' + user.id); card?.focus(); card?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'}); return }
    pendingFocus.current = user.id
    setSearch('')
    setSearchDraft('')
    // The row may already be visible, so focus immediately as well as after a page change.
    const rowButton = document.getElementById(`lb-view-${user.id}`)
    if (rowButton) { rowButton.focus({ preventScroll: true }); rowButton.scrollIntoView({ block: 'center', behavior: 'instant' }); pendingFocus.current = null }
  }
  const submitSearch = event => { event.preventDefault(); setSearch(searchDraft.trim()) }

  return (
    <div className="lb-page">
      <header className="lb-header">
        <div><span className="lb-eyebrow"><Trophy size={14} />The founder arena</span><h1>LabX Leaderboard<span className="lb-title-dot" aria-hidden="true">.</span></h1><p>Big ideas. Real progress. Every step earns your spot.</p></div>
        <button type="button" className="lb-quiet-button" onClick={() => setShowRules(true)}><Info size={15} />How rankings work</button>
      </header>

      <section className="lb-controls" aria-label="Leaderboard filters">
        <div className="lb-scope-row">
          <div className="lb-scope-toggle" aria-label="Leaderboard scope">
            <button type="button" aria-pressed={scope === 'global'} onClick={() => switchScope('global')}><Globe2 size={16} />Global</button>
            <button type="button" aria-pressed={scope === 'domain'} onClick={() => switchScope('domain')}><Compass size={16} />Domain</button>
          </div>
          <span className="lb-alltime"><span />Ranked by approved LabX Points</span>
        </div>
        <div className="lb-search-row">
          {scope === 'domain' && <div className="lb-domain-field"><label htmlFor="lb-domain">Domain</label><select id="lb-domain" required value={effectiveDomainId} onChange={event => { setDomainId(event.target.value); resetSearch() }}>
            <option value="">Choose a domain</option>
            {domains.map(domain => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
          </select>{assessmentDomains.length > 0 && <small className="lb-assessment-domain">Your assessment: {assessmentDomains.map(domain=>domain.name).join(", ")}</small>}</div>}
          <form className="lb-search" role="search" onSubmit={submitSearch}>
            <Search size={17} aria-hidden="true" /><input ref={searchInput} type="search" aria-label="Search founders by name" placeholder={scope === 'domain' ? 'Search this domain by name...' : 'Search any founder by name...'} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} maxLength={100} disabled={requiresDomain} enterKeyHint="search" />
            <button type="submit" disabled={requiresDomain}>Search<ArrowRight size={15} aria-hidden="true" /></button>
          </form>
        </div>
      </section>

      {requiresDomain ? <section className="lb-empty lb-empty--domain">
        <div className="lb-empty-icon"><Compass size={31} /></div><span className="lb-eyebrow">Find your field</span><h2>Choose your arena</h2><p>Select a global domain to see its top founders and rankings.</p>
        <div className="lb-domain-chips">{domains.slice(0, 4).map(domain => <button key={domain.id} type="button" onClick={() => { setDomainId(domain.id); resetSearch() }}>{domain.shortName}<ArrowRight size={13} /></button>)}</div>
      </section> : <>
        <section className="lb-metrics" aria-label={`${scope === 'global' ? 'Global' : 'Domain'} leaderboard metrics`}>
          <div><span><Users size={15} />Ranked founders</span><strong data-metric="founders">{points(metrics.totalFounders)}</strong><small>{scope === 'global' ? 'Across all domains' : snapshot.domain?.shortName}</small></div>
          <div><span><Zap size={15} />LabX Points</span><strong data-metric="points">{points(metrics.totalPoints)}</strong><small>Total in this leaderboard</small></div>
          <div><span><Award size={15} />Badges earned</span><strong data-metric="badges">{points(metrics.totalBadges)}</strong><small>Across ranked founders</small></div>
          <div><span><Crown size={15} />Leading score</span><strong data-metric="leading">{points(metrics.leadingPoints)}</strong><small>{leader ? 'LabX Points to set the pace' : 'Awaiting the first founder'}</small></div>
        </section>
        <section className={`lb-standing${!userStanding ? ' lb-standing--unranked' : ''}`} aria-label="Your standing">
          {userStanding ? <>
            <RankPair founder={userStanding} className="lb-standing-ranks" />
            <div className="lb-standing-identity"><Avatar founder={userStanding} /><div><strong>{userStanding.full_name}<span className="lb-you">YOU</span></strong><span>{scope === 'global' ? 'Across all domains' : snapshot.domain?.shortName || scopeLabel}</span></div></div>
            <div className="lb-standing-score"><strong>{points(userStanding.total_points)}<Zap size={15} /></strong><span>LabX Points</span></div>
            <div className="lb-next-rank"><Target size={17} /><div><strong>{nextRankGap === null ? 'Leading the way' : `${points(nextRankGap)} points to pass the next score`}</strong><span>{nextRankGap === null ? 'Keep building your next chapter.' : 'Small steps. Steady progress.'}</span></div></div>
            <button type="button" className="lb-find-rank" onClick={findMyRank}>Find my rank<ArrowRight size={15} /></button>
          </> : <>
            <div className="lb-empty-icon"><Compass size={24} /></div><div><strong>Not ranked in this domain yet</strong><p>Complete a project assessment in this domain to join its rankings.</p></div><Link to="/roadmap" className="lb-find-rank">View projects<ArrowRight size={15} /></Link>
          </>}
        </section>

        {!isSearching && podium.length > 0 && <section className="lb-hall" aria-labelledby="lb-hall-title">
          <div className="lb-section-heading"><div><span className="lb-eyebrow">A little inspiration for your next big move</span><h2 id="lb-hall-title">Hall of founders</h2></div><button type="button" className="lb-top-link" onClick={() => setSelectedFounder(leader)}><Crown size={15} />View top founder<ArrowRight size={14} /></button></div>
          <Podium founders={podium} domains={domains} onSelect={setSelectedFounder} />
        </section>}

        <section className="lb-rankings" aria-labelledby="lb-rankings-title">
          <div className="lb-section-heading lb-ranking-heading">
            <div><h2 ref={tableHeading} tabIndex={-1} id="lb-rankings-title">{isSearching ? 'Search results' : 'All rankings'}<span className="lb-count">{isSearching ? matchedCount : totalFounders}</span></h2><p>{isSearching ? <>Results for “{search}” in {scopeLabel}. Ranks stay within this scope.</> : `${scopeLabel} · Ranked by LabX Points`}</p></div>
            {isSearching ? <button type="button" className="lb-quiet-button" onClick={() => { resetSearch(); searchInput.current?.focus() }}><X size={15} />Clear search</button> : <span className="lb-rows-caption"><Users size={14} />A community in motion</span>}
          </div>
          <p className="lb-sr-only" role="status">{requiresDomain ? 'Choose a global domain.' : `${matchedCount} founders shown in ${scopeLabel}${isSearching ? ` for ${search}` : ''}.`}</p>
          {pageRows.length ? <>
            <div className="lb-table-scroll" role="region" aria-label="Founder rankings table" tabIndex={0}>
              <table aria-label="Founder rankings">
                <thead><tr><th scope="col">{scope === 'global' ? 'Global Rank' : 'Domain Rank'}</th><th scope="col">{scope === 'global' ? 'Domain Rank' : 'Global Rank'}</th><th scope="col">Founder</th><th scope="col">Domain</th><th scope="col">Progress</th><th scope="col">Badges</th><th scope="col" className="lb-points-heading">LabX Points</th><th scope="col"><span className="lb-sr-only">Details</span></th></tr></thead>
                <tbody>{pageRows.map(founder => {
                  const domain = domains.find(entry => entry.name === founder.domain)
                  return <tr key={founder.id} className={founder.is_current_user ? 'lb-row-you' : ''} aria-labelledby={`lb-name-${founder.id}`}>
                    <td data-label={scope === 'global' ? 'Global Rank' : 'Domain Rank'}><span className={`lb-rank-mark${founder.rank <= 3 ? ` lb-rank-mark--${founder.rank}` : ''}`}>{founder.rank === 1 && <Crown size={13} aria-hidden="true" />}#{founder.rank}</span></td>
                    <td data-label={scope === 'global' ? 'Domain Rank' : 'Global Rank'} title={scope === 'global' ? founder.domain : 'Across all domains'}><span className="lb-rank-mark">{rankLabel(scope === 'global' ? founder.domain_rank : founder.global_rank)}</span></td>
                    <td><div className="lb-row-identity"><Avatar founder={founder} /><div><strong id={`lb-name-${founder.id}`}>{founder.full_name}</strong><span>@{founder.username}{founder.is_current_user && <span className="lb-you">YOU</span>}</span></div></div></td>
                    <td data-label="Domain"><span className="lb-domain-label" style={{ '--domain-color': domain?.color || '#7e9cbe' }} title={founder.domains.map(item => item.name).join(' · ') || founder.domain}><span />{domain?.shortName || founder.domain}{founder.domains.length > 1 && <small>+{founder.domains.length - 1}</small>}</span></td>
                    <td className="lb-row-progress" data-label="Progress"><Progress founder={founder} /></td>
                    <td data-label="Badges"><span className="lb-row-badges"><Award size={15} />{founder.badges_count}</span></td>
                    <td className="lb-row-points" data-label="LabX Points">{points(founder.total_points)}</td>
                    <td><button id={`lb-view-${founder.id}`} type="button" className="lb-row-open" aria-label={`View founder: ${founder.full_name}`} onClick={() => setSelectedFounder(founder)}><ArrowRight size={17} /></button></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
            <p className="lb-list-count">{pageRows.length} founders {isSearching ? "found" : "beyond the podium"}</p>
          </> : <div className="lb-empty"><Search size={30} /><h3>{!isSearching && podium.length ? "All founders are on the podium" : "No founders found"}</h3><p>{!isSearching && podium.length ? "More rankings will appear as founders join this domain." : isSearching ? 'Try another name or clear your search. You can also explore a different domain.' : 'Founders will appear here as they join this domain.'}</p>{isSearching && <button type="button" className="lb-primary" onClick={() => { resetSearch(); searchInput.current?.focus() }}>Show all founders<ArrowRight size={16} /></button>}</div>}
        </section>
      </>}
      <p className="lb-demo-note"><Sparkles size={13} />Your points and badges match your achievements.</p>

      {selectedFounder && <FounderDetails founder={selectedFounder} scopeLabel={scopeLabel} onClose={() => setSelectedFounder(null)} />}
      {showRules && <Dialog titleId="lb-rules-title" closeLabel="Close ranking rules" onClose={() => setShowRules(false)}>
        <span className="lb-rules-trophy"><Trophy size={32} /></span><span className="lb-eyebrow">Every point has a purpose</span><h2 id="lb-rules-title">How rankings work</h2>
        <ul className="lb-rules-list">
          <li><Zap size={18} /><div><strong>Points set the pace</strong><p>Founders rank by their all-time LabX Points. Approved activity counts; pending points do not.</p></div></li>
          <li><Globe2 size={18} /><div><strong>Global Rank and Domain Rank</strong><p>Global brings all founders together. Domain compares founders with a completed project assessment in that field. On the Global board, Domain Rank refers to the founder's displayed domain.</p></div></li>
          <li><Medal size={18} /><div><strong>Equal points share a rank</strong><p>Ties share their place. Name searches keep the original rank within the selected scope.</p></div></li>
        </ul>
        <p className="lb-detail-note">Multiple projects never multiply your points. Your balance matches Achievements. LabX Points are recognition, with no cash value.</p>
        <Link to="/achievements" className="lb-primary lb-detail-action">See your points history<ArrowRight size={16} /></Link>
      </Dialog>}
    </div>
  )
}
