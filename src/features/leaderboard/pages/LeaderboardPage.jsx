import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowDownUp, ArrowRight, ArrowUp, Award, Compass, Crown, Filter, Globe2, Info, Medal, Search, Sparkles, Target, Trophy, Users, X as XIcon, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { getLeaderboardSnapshot, LEADERBOARD_DOMAINS } from '../services/mock_leaderboard.js'
import '../components/LeaderboardPage.css'

const points = value => value.toLocaleString('en-US')
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')
const rankLabel = rank => rank == null ? 'Not ranked' : `#${rank}`

function RankPair({ founder, scope, className = '' }) {
 return <dl className={'lb-rank-pair '+className}><div><dt>{scope === 'domain' ? 'Domain Rank' : 'Global Rank'}</dt><dd>{rankLabel(founder?.rank)}</dd></div></dl>
}
function ProfileLink({ founder, children, avatar = false, profileQuery = '' }) {
 const href = founder.is_current_user ? '/profile' : `/leaderboard/founders/${encodeURIComponent(founder.id)}${profileQuery}`
 return <Link className="lb-profile-link" to={href} aria-label={avatar ? `View profile: ${founder.full_name}` : undefined}>{children}</Link>
}

function Avatar({ founder, large = false }) {
  return <span className={`lb-avatar${large ? ' lb-avatar--large' : ''}`} style={{ '--avatar-color': founder.avatarColor || '#7c91ef' }} aria-hidden="true">{initials(founder.full_name)}</span>
}

function Progress({ founder }) {
  return founder.stage
    ? <><strong>{founder.stage}</strong><span>{founder.level ? `Level ${founder.level}` : 'Level not set'}</span></>
    : <><strong>Getting started</strong><span>Assessment ahead</span></>
}

function ThemedSelect({ value, options, onChange, ariaLabel, className = '' }) {
  const root = useRef(null)
  const trigger = useRef(null)
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  const close = () => setOpen(false)
  const selectOption = option => {
    onChange(option.value)
    close()
    trigger.current?.focus()
  }
  const handleKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      trigger.current?.focus()
      return
    }
    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (direction) {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        requestAnimationFrame(() => root.current?.querySelectorAll('[role="option"]')[selectedIndex]?.focus())
      } else {
        const optionsInMenu = [...root.current.querySelectorAll('[role="option"]')]
        const currentIndex = optionsInMenu.indexOf(document.activeElement)
        optionsInMenu[(currentIndex + direction + optionsInMenu.length) % optionsInMenu.length]?.focus()
      }
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      if (!open) setOpen(true)
      requestAnimationFrame(() => {
        const optionsInMenu = root.current?.querySelectorAll('[role="option"]')
        optionsInMenu?.[event.key === 'Home' ? 0 : optionsInMenu.length - 1]?.focus()
      })
    }
  }
  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = event => {
      if (!root.current?.contains(event.target)) close()
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])
  const selected = options[selectedIndex]
  return <div className={`lb-select${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`} ref={root} onKeyDown={handleKeyDown}>
    <button ref={trigger} type="button" className="lb-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span>{selected?.label ?? ''}</span><span className="lb-select-chevron" aria-hidden="true" />
    </button>
    {open && <div className="lb-select-menu" role="listbox" aria-label={ariaLabel} aria-activedescendant={`lb-option-${ariaLabel.replace(/[^a-z0-9]/gi, '-')}-${selected?.value ?? 'empty'}`}>
      {options.map(option => <button key={option.value || 'empty'} id={`lb-option-${ariaLabel.replace(/[^a-z0-9]/gi, '-')}-${option.value || 'empty'}`} type="button" role="option" aria-selected={option.value === value} className="lb-select-option" onClick={() => selectOption(option)}>{option.label}</button>)}
    </div>}
  </div>
}

function RankingRow({ founder, scope, mode, domains, effectiveDomainId, highlightedId, personalPosition = false, onJumpToFounder, rowRef, pinnedHidden = false }) {
  const domain = domains.find(entry => entry.name === founder.domain)
  const profileQuery = `?scope=${scope}${effectiveDomainId ? `&domain=${effectiveDomainId}` : ''}${mode === 'momentum' ? '&mode=momentum' : ''}`
  const rowId = personalPosition ? undefined : `lb-founder-${founder.id}`
  const nameId = personalPosition ? undefined : `lb-name-${founder.id}`
  const positionLabel = founder.is_current_user || personalPosition
  const clickable = Boolean(founder.is_current_user || personalPosition)
  const handleRowClick = event => {
    if (!clickable || event.target.closest('a, button, input, select')) return
    onJumpToFounder(founder.id)
  }
  const handleRowKeyDown = event => {
    if (!clickable || !['Enter', ' '].includes(event.key) || event.target.closest('a, button, input, select')) return
    event.preventDefault()
    onJumpToFounder(founder.id)
  }
  return <tr ref={rowRef} id={rowId}
    className={`${founder.is_current_user || personalPosition ? 'lb-row-you' : ''}${personalPosition ? ` lb-row-you-pinned${pinnedHidden ? ' lb-row-you-pinned--hidden' : ''}` : ''}${clickable ? ' lb-row-jumpable' : ''}${!personalPosition && highlightedId === founder.id ? ' lb-jump-highlight' : ''}`}
    data-personal-position={personalPosition ? 'pinned' : undefined}
    aria-hidden={personalPosition ? pinnedHidden : undefined}
    aria-label={clickable ? `Your position, rank ${founder.rank}. Click to jump to your ranked position.` : undefined}
    aria-labelledby={nameId}
    tabIndex={clickable ? 0 : -1}
    onClick={handleRowClick}
    onKeyDown={handleRowKeyDown}>
    <td data-label={scope === 'global' ? 'Global Rank' : 'Domain Rank'}><span className={`lb-rank-mark${founder.rank <= 3 ? ` lb-rank-mark--${founder.rank}` : ''}`}>{founder.rank === 1 && <Crown size={13} aria-hidden="true" />}#{founder.rank}</span></td>
    <td><div className="lb-row-identity"><ProfileLink founder={founder} avatar profileQuery={profileQuery}><Avatar founder={founder} /></ProfileLink><div><strong id={nameId}><ProfileLink founder={founder} profileQuery={profileQuery}>{founder.full_name}</ProfileLink></strong><span><ProfileLink founder={founder} profileQuery={profileQuery}>@{founder.username}</ProfileLink>{founder.is_current_user && <span className="lb-you">YOU</span>}{positionLabel && <span className="lb-position-label">Your position</span>}</span></div></div></td>
    {scope === 'global' && <td data-label="Domain"><span className="lb-domain-label" style={{ '--domain-color': domain?.color || '#7e9cbe' }} title={founder.domains.map(item => item.name).join(' · ') || founder.domain}><span />{domain?.shortName || founder.domain}{founder.domains.length > 1 && <small>+{founder.domains.length - 1}</small>}</span></td>}
    <td className="lb-row-progress" data-label="Progress"><Progress founder={founder} /></td>
    {mode === 'labx' ? <td className="lb-row-points" data-label="LabX Points">{points(founder.total_points)}</td>
      : <><td data-label="Current Streak">{founder.momentum ? `${founder.momentum.currentStreakDays} days` : 'Unavailable'}</td><td data-label="Completed Mission">{founder.momentum?.completedMissions ?? 'Unavailable'}</td><td className="lb-row-points" data-label="LabX Points">{points(founder.total_points)}</td></>}
  </tr>
}

function Dialog({ titleId, closeLabel = 'Close founder details', onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
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
    <button type="button" autoFocus className="lb-dialog-close" aria-label={closeLabel} onClick={onClose}><XIcon size={20} /></button>
    {children}
  </dialog>
}

function Podium({ founders, domains, mode, showDomain, scope, highlightedId, profileQuery, onJumpToFounder }) {
  return <div className={`lb-podium${founders.length < 3 ? ' lb-podium--small' : ''}`}>
    {founders.map((founder, index) => {
      const domain = domains.find(entry => entry.name === founder.domain)
      const champion = founder.rank === 1
      const clickable = Boolean(founder.is_current_user)
      const handleClick = event => {
        if (event.target.closest('a, button, input, select')) return
        onJumpToFounder(founder.id)
      }
      const handleKeyDown = event => {
        if (!['Enter', ' '].includes(event.key) || event.target.closest('a, button, input, select')) return
        event.preventDefault()
        onJumpToFounder(founder.id)
      }
      return <article key={founder.id} id={`lb-founder-${founder.id}`} tabIndex={clickable ? 0 : -1}
        className={`lb-podium-card lb-podium-card--${index + 1}${champion ? ' is-champion' : ''}${highlightedId === founder.id ? ' lb-jump-highlight' : ''}`}
        aria-label={clickable ? `Your podium position, rank ${founder.rank}. Click to highlight your position.` : `Rank ${founder.rank}: ${founder.full_name}`}
        onClick={clickable ? handleClick : undefined}
        onKeyDown={clickable ? handleKeyDown : undefined}>
        <div className="lb-podium-topline">{champion ? <Crown size={19} /> : <Medal size={17} />}<span>{champion ? 'Top founder' : index === 1 ? 'Runner-up' : 'On the podium'}</span><strong>#{founder.rank}</strong></div>
        <div className="lb-podium-person"><div className="lb-podium-avatar"><ProfileLink founder={founder} avatar profileQuery={profileQuery}><Avatar founder={founder} large /></ProfileLink><span className="lb-podium-rank">{founder.rank}</span></div>
          <h3><ProfileLink founder={founder} profileQuery={profileQuery}>{founder.full_name}</ProfileLink>{founder.is_current_user && <span className="lb-you">YOU</span>}</h3><p><ProfileLink founder={founder} profileQuery={profileQuery}>@{founder.username}</ProfileLink></p>
        </div>
        {showDomain && <span className="lb-podium-domain" title={founder.domain}>{domain?.shortName || founder.domain}</span>}
        <RankPair founder={founder} scope={scope} className="lb-podium-ranks" />
        {mode === 'labx' ? <>
          <div className="lb-podium-points"><Zap size={15} /><strong>{points(founder.total_points)}</strong><span>LabX Points</span></div>
        </> : <dl className="lb-podium-momentum">
          <div><dt><Target size={13} />Current streak</dt><dd>{founder.momentum ? `${founder.momentum.currentStreakDays} days` : 'Unavailable'}</dd></div>
          <div><dt><Medal size={13} />Active days</dt><dd>{founder.momentum ? founder.momentum.activeDays : 'Unavailable'}</dd></div>
          <div><dt><Award size={13} />Approved missions</dt><dd>{founder.momentum ? founder.momentum.completedMissions : 'Unavailable'}</dd></div>
        </dl>}
        <p className="lb-podium-progress">{founder.stage || 'Getting started'}{founder.level ? ` · Level ${founder.level}` : ''}</p>
        <div className="lb-podium-footer"><span>{founder.momentum?.source === 'demo' && mode === 'momentum' ? <span className="lb-demo-tag">DEMO DATA</span> : null}</span>{!founder.is_current_user && <span>Demo profile unavailable</span>}</div>
      </article>
    })}
  </div>
}

export function LeaderboardPage() {
  const { user } = useAuth()
  const { projects } = useProjects()
  const [searchParams, setSearchParams] = useSearchParams()
  const scopeParam = searchParams.get('scope')
  const roadmapDomainId = useMemo(() => {
    const completedProjects = projects.filter(project => project?.owner_id === user?.id && project.assessment_completed === true)
      .slice().sort((left, right) => {
        const time = project => {
          const value = Date.parse(project.assessment_completed_at || project.updated_at || project.created_at || '')
          return Number.isFinite(value) ? value : 0
        }
        return time(right) - time(left) || String(left.id ?? '').localeCompare(String(right.id ?? ''))
      })
    const domainName = completedProjects.map(project => project.roadmap_snapshot?.domain || project.assessment_result?.domain)
      .find(name => LEADERBOARD_DOMAINS.some(domain => domain.name.toLocaleLowerCase() === String(name ?? '').trim().toLocaleLowerCase()))
      ?? user?.assessment_result?.domain
    return LEADERBOARD_DOMAINS.find(domain => domain.name.toLocaleLowerCase() === String(domainName ?? '').trim().toLocaleLowerCase())?.id ?? ''
  }, [projects, user])
  const scope = scopeParam === 'domain' ? 'domain' : scopeParam === 'global' ? 'global' : 'global'
  const domainId = searchParams.get('domain')
  const mode = searchParams.get('mode') === 'momentum' ? 'momentum' : 'labx'
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [filterDomainId, setFilterDomainId] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [sortColumn, setSortColumn] = useState('rank')
  const [sortDirection, setSortDirection] = useState('asc')
  const [highlightedId, setHighlightedId] = useState(null)
  const [pinnedUserVisible, setPinnedUserVisible] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const searchInput = useRef(null)
  const rankingTools = useRef(null)
  const tableScroll = useRef(null)
  const originalUserRow = useRef(null)
  const pinnedUserElement = useRef(null)
  const tableHeading = useRef(null)
  const pendingFocus = useRef(null)
  const effectiveDomainId = domainId ?? roadmapDomainId
  const snapshot = useMemo(() => getLeaderboardSnapshot({
    user,
    projects,
    scope: scope || 'global',
    domainId: effectiveDomainId,
    search,
    mode,
    filterDomainId: scope === 'global' ? filterDomainId : '',
    stage: stageFilter,
    level: levelFilter,
  }), [user, projects, scope, effectiveDomainId, search, mode, filterDomainId, stageFilter, levelFilter])
  const { domains, rankings, podium, leader, userStanding, globalUserStanding, requiresDomain, totalFounders, matchedCount, metrics, momentumMetrics } = snapshot
  const scopeLabel = scope === 'global' ? 'Global' : snapshot.domain?.name || 'your selected domain'
  const isFiltering = Boolean(search || filterDomainId || stageFilter || levelFilter)
  const activeFilterCount = [scope === 'global' ? filterDomainId : effectiveDomainId, stageFilter, levelFilter].filter(Boolean).length
  const podiumIds = new Set(podium.map(founder => founder.id))
  const userVisible = Boolean(userStanding && rankings.some(founder => founder.id === userStanding.id))
  const shouldPinUser = Boolean(userStanding?.rank > 3 && (userVisible || !isFiltering))
  const allStages = ['Discover', 'Validate', 'Build', 'Launch', 'Grow']
  const stageOrder = Object.fromEntries(allStages.map((stage, index) => [stage, index + 1]))
  const getSortValue = (founder, column) => {
    switch (column) {
      case 'founder': return founder.full_name.toLowerCase()
      case 'domain': return founder.domain?.toLowerCase() ?? ''
      case 'stage': {
        const stageLevel = stageOrder[founder.stage] ?? 0
        return stageLevel * 100 + (Number(founder.level) || 0)
      }
      case 'streak': return founder.momentum?.currentStreakDays ?? 0
      case 'missions': return founder.momentum?.completedMissions ?? founder.momentum?.approvedMissions ?? 0
      case 'points': return founder.total_points ?? 0
      default: return founder.rank ?? Number.MAX_SAFE_INTEGER
    }
  }

  const compareValues = (left, right) => {
    if (left === right) return 0
    if (left == null) return 1
    if (right == null) return -1
    if (typeof left === 'string' && typeof right === 'string') return left.localeCompare(right)
    return left < right ? -1 : 1
  }

  const sortedRankings = useMemo(() => {
    const rows = [...rankings].filter(founder => !podiumIds.has(founder.id))
    rows.sort((left, right) => {
      const result = compareValues(getSortValue(left, sortColumn), getSortValue(right, sortColumn))
      if (result !== 0) return result
      return compareValues(left.rank ?? Number.MAX_SAFE_INTEGER, right.rank ?? Number.MAX_SAFE_INTEGER)
    })
    return sortDirection === 'desc' ? rows.reverse() : rows
  }, [rankings, podiumIds, shouldPinUser, userStanding, sortColumn, sortDirection])

  const scrollToFounder = id => {
    const target = document.getElementById('lb-founder-'+id)
    if (!target) return
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    setHighlightedId(id)
  }
  const pageRows = useMemo(() => [...sortedRankings], [sortedRankings])
  const pinnedUserRow = shouldPinUser ? <RankingRow key={`personal-${userStanding.id}`} founder={{ ...userStanding, isPinned: true }} scope={scope} mode={mode} domains={domains} effectiveDomainId={effectiveDomainId} highlightedId={highlightedId} onJumpToFounder={scrollToFounder} rowRef={pinnedUserElement} personalPosition pinnedHidden={!pinnedUserVisible} /> : null

  const showPodium = !isFiltering || Boolean(userVisible && podiumIds.has(userStanding?.id))
  const levels = [...new Set(snapshot.allRankings
    .filter(founder => !stageFilter || founder.stage === stageFilter)
    .map(founder => founder.level)
    .filter(level => level != null))].sort((left, right) => left - right)
  useEffect(() => {
    if (pendingFocus.current) { scrollToFounder(pendingFocus.current); pendingFocus.current = null }
  }, [rankings])
  useEffect(() => {
    if (!highlightedId) return
    const timer = window.setTimeout(() => setHighlightedId(null), 2400)
    return () => window.clearTimeout(timer)
  }, [highlightedId])

  useEffect(() => {
    const scrollRegion = tableScroll.current
    if (!scrollRegion || !shouldPinUser || !originalUserRow.current || !pinnedUserElement.current) {
      setPinnedUserVisible(true)
      return undefined
    }
    let frame = 0
    const updatePinnedVisibility = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const originalRect = originalUserRow.current?.getBoundingClientRect()
        const regionRect = scrollRegion.getBoundingClientRect()
        if (!originalRect) return
        setPinnedUserVisible(originalRect.top >= regionRect.bottom + 16)
      })
    }
    updatePinnedVisibility()
    scrollRegion.addEventListener('scroll', updatePinnedVisibility, { passive: true })
    window.addEventListener('resize', updatePinnedVisibility)
    return () => {
      cancelAnimationFrame(frame)
      scrollRegion.removeEventListener('scroll', updatePinnedVisibility)
      window.removeEventListener('resize', updatePinnedVisibility)
    }
  }, [scope, mode, effectiveDomainId, shouldPinUser, pageRows])

  useEffect(() => {
    if (!showFilters) return
    const closeOnOutsideClick = event => {
      if (!rankingTools.current?.contains(event.target)) setShowFilters(false)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setShowFilters(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showFilters])

  const resetFilters = () => { setSearch(''); setSearchDraft(''); setFilterDomainId(''); setStageFilter(''); setLevelFilter('') }
  const setDomainId = id => { resetFilters(); setSearchParams({ scope: 'domain', domain: id, ...(mode === 'momentum' ? { mode } : {}) }) }
  const switchScope = next => {
    if (next === scope) return
    resetFilters()
    const params = { scope: next }
    if (domainId) params.domain = domainId
    if (mode === 'momentum') params.mode = mode
    setSearchParams(params)
  }
  const changeMode = nextMode => {
    if (nextMode === mode) return
    const params = { scope }
    if (domainId) params.domain = domainId
    if (nextMode === 'momentum') params.mode = nextMode
    setSearchParams(params)
  }
  const revealMyRank = () => { pendingFocus.current = userStanding.id; resetFilters() }
  const submitSearch = event => { event.preventDefault(); setSearch(searchDraft.trim()) }
  const changeSort = column => {
    if (sortColumn === column) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortColumn(column)
    setSortDirection('asc')
  }
  const getHeaderSortIcon = column => sortColumn !== column
    ? <ArrowDownUp size={14} aria-hidden="true" />
    : sortDirection === 'asc'
      ? <ArrowUp size={14} aria-hidden="true" />
      : <ArrowDown size={14} aria-hidden="true" />
  const headers = mode === 'labx'
    ? [
        { key: 'rank', label: scope === 'global' ? 'Global Rank' : 'Domain Rank' },
        { key: 'founder', label: 'Founder' },
        ...(scope === 'global' ? [{ key: 'domain', label: 'Domain' }] : []),
        { key: 'stage', label: 'Stage / Level' },
        { key: 'points', label: 'LabX Points' },
      ]
    : [
        { key: 'rank', label: scope === 'global' ? 'Global Rank' : 'Domain Rank' },
        { key: 'founder', label: 'Founder' },
        ...(scope === 'global' ? [{ key: 'domain', label: 'Domain' }] : []),
        { key: 'stage', label: 'Stage / Level' },
        { key: 'streak', label: 'Streak' },
        { key: 'missions', label: 'Completed Mission' },
        { key: 'points', label: 'LabX Points' },
      ]

  return (
    <div className="lb-page">
      <header className="lb-header">
        <div className="lb-header-main"><span className="lb-eyebrow"><Trophy size={14} />The founder arena</span><h1>LabX Leaderboard<span className="lb-title-dot" aria-hidden="true">.</span></h1>
          <div className="lb-header-controls"><div className="lb-scope-toggle" data-active={scope} role="group" aria-label="Leaderboard scope">
            <button type="button" aria-pressed={scope === 'global'} onClick={() => switchScope('global')}><Globe2 size={16} />Global</button>
            <button type="button" aria-pressed={scope === 'domain'} onClick={() => switchScope('domain')}><Compass size={16} />Domain</button>
          </div><button type="button" className="lb-quiet-button lb-header-help" onClick={() => setShowRules(true)}><Info size={15} />How rankings work</button></div>
          <p>Big ideas. Real progress. Every step earns your spot.</p></div>
      </header>

      <div className="lb-dashboard">
      {!requiresDomain && <section key={`metrics-${scope}-${mode}-${effectiveDomainId}`} className="lb-metrics lb-result-enter" aria-label={`${scope === 'global' ? 'Global' : 'Domain'} ${mode === 'labx' ? 'LabX' : 'LabX Pulse'} leaderboard metrics`}>
        <div><span><Users size={15} />Ranked founders</span><strong data-metric="founders">{points(mode === 'labx' ? metrics.totalFounders : momentumMetrics.rankedFounders)}</strong><small>{scope === 'global' ? 'Across all domains' : 'In this domain'}</small></div>
        <div><span><Medal size={15} />{mode === 'labx' ? 'Current Rank' : 'Current Pulse Rank'}</span><strong data-metric="current-rank">{mode === 'momentum' && !userStanding ? '—' : rankLabel(userStanding?.rank)}</strong><small>{scope === 'global' ? 'Global founder ranking' : 'Selected domain ranking'}</small></div>
        <div><span>{mode === 'labx' ? <Crown size={15} /> : <Target size={15} />}{mode === 'labx' ? 'Leading LabX Score' : 'Leading Streak / Consistency'}</span><strong data-metric="leading">{mode === 'labx'
          ? leader ? points(leader.total_points) : 'Unavailable'
          : leader ? `${leader.momentum.currentStreakDays}d · ${leader.momentum.activeDays} active` : 'Unavailable'}</strong><small>{mode === 'labx' ? 'Approved LabX Points' : leader ? 'Current streak · active days' : 'No activity metrics available'}</small></div>
        <div><span><Zap size={15} />Your LabX Points</span><strong data-metric="labx-points">{points(globalUserStanding?.total_points ?? 0)}</strong><small>Total points earned</small></div>
      </section>}
      {requiresDomain ? <section className="lb-empty lb-empty--domain">
        <div className="lb-empty-icon"><Compass size={31} /></div><span className="lb-eyebrow">Find your field</span><h2>Choose a domain</h2><p>Select a domain to see its founders and rankings.</p>
        <div className="lb-domain-field lb-empty-domain-select"><label>Domain</label><ThemedSelect ariaLabel="Choose a domain" value={effectiveDomainId} onChange={setDomainId} options={[{ value: '', label: 'Choose a domain' }, ...domains.map(domain => ({ value: domain.id, label: domain.name }))]} /></div>
      </section> : <>
        {mode === 'momentum' && <p className="lb-momentum-note"><Info size={14} />Pulse ranks current streak, active days, approved missions, then completed milestones. Sample-founder values are demo fixtures; live cohort-wide streak history is unavailable.</p>}
        <div className="lb-mode-toggle" data-active={mode} role="group" aria-label="Leaderboard ranking mode">
          <button type="button" aria-pressed={mode === 'labx'} onClick={() => changeMode('labx')}><Zap size={15} />LabX</button>
          <button type="button" aria-pressed={mode === 'momentum'} onClick={() => changeMode('momentum')}><Target size={15} />LabX Pulse</button>
        </div>

        {showPodium && podium.length > 0 && <section key={`hall-${scope}-${mode}-${effectiveDomainId}`} className="lb-hall lb-result-enter" aria-labelledby="lb-hall-title">
          <div className="lb-section-heading"><div><span className="lb-eyebrow">{mode === 'labx' ? 'A little inspiration for your next big move' : 'Consistency and sustained founder activity'}</span><h2 id="lb-hall-title">Hall of Founders</h2></div></div>
          <Podium founders={podium} domains={domains} scope={scope} highlightedId={highlightedId} mode={mode} showDomain={scope === 'global'} onJumpToFounder={scrollToFounder} profileQuery={`?scope=${scope}${effectiveDomainId ? `&domain=${effectiveDomainId}` : ''}${mode === 'momentum' ? '&mode=momentum' : ''}`} />
        </section>}

        <section key={`rankings-${scope}-${mode}-${effectiveDomainId}`} className="lb-rankings lb-result-enter" aria-labelledby="lb-rankings-title">
          <div className="lb-section-heading lb-ranking-heading">
            <div><h2 ref={tableHeading} tabIndex={-1} id="lb-rankings-title">{isFiltering ? 'Matching founders' : mode === 'labx' ? 'LabX Rankings' : 'LabX Pulse Rankings'}<span className="lb-count">{isFiltering ? matchedCount : totalFounders}</span></h2><p>{mode === 'labx' ? `${scopeLabel} · Ranked by approved LabX Points` : 'Ranked by current streak, active days, approved missions, then completed milestones.'}{isFiltering ? ' · Filters do not change rank positions.' : ''}</p>
              <div ref={rankingTools} className="lb-ranking-tools">
                <form className="lb-compact-search" role="search" onSubmit={submitSearch}><Search size={16} aria-hidden="true" /><input ref={searchInput} type="search" aria-label="Search founders" placeholder="Search founders..." value={searchDraft} onChange={event => setSearchDraft(event.target.value)} maxLength={100} enterKeyHint="search" /><button type="submit" aria-label="Apply founder search"><ArrowRight size={15} /></button>{(search || searchDraft) && <button type="button" aria-label="Clear search" onClick={() => { setSearch(''); setSearchDraft('') }}><XIcon size={14} /></button>}</form>
                <div className="lb-filter-anchor"><button type="button" className={`lb-tool-button${showFilters ? ' is-active' : ''}`} aria-label="Toggle ranking filters" title="Filters" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><Filter size={16} />{activeFilterCount > 0 && <span className="lb-tool-count">{activeFilterCount}</span>}</button>
                {showFilters && <div className="lb-compact-filter-panel">
                  <label className="lb-filter-field">Domain<ThemedSelect ariaLabel={scope === 'global' ? 'Domain filter' : 'Domain'} value={scope === 'global' ? filterDomainId : effectiveDomainId} onChange={nextDomain => scope === 'global' ? setFilterDomainId(nextDomain) : setDomainId(nextDomain)} options={[{ value: '', label: scope === 'global' ? 'All domains' : 'Choose a domain' }, ...domains.map(domain => ({ value: domain.id, label: domain.name }))]} /></label>
                  <label className="lb-filter-field">Stage<ThemedSelect ariaLabel="Stage filter" value={stageFilter} onChange={nextStage => {
                    setStageFilter(nextStage)
                    if (nextStage && levelFilter && !snapshot.allRankings.some(founder => founder.stage === nextStage && String(founder.level) === levelFilter)) setLevelFilter('')
                  }} options={[{ value: '', label: 'All stages' }, ...allStages.map(stage => ({ value: stage, label: stage }))]} /></label>
                  <label className="lb-filter-field">Level<ThemedSelect ariaLabel="Level filter" value={levelFilter} onChange={setLevelFilter} options={[{ value: '', label: 'All levels' }, ...levels.map(level => ({ value: String(level), label: `Level ${level}` }))]} /></label>
                  {isFiltering && <button type="button" className="lb-reset" onClick={() => { resetFilters(); setShowFilters(false) }}>Clear filters</button>}
                </div>}</div>
                {!userStanding ? mode !== 'momentum' && <span role="status">Not ranked</span> : !userVisible && <span className="lb-jump-message" role="status">Not visible in current filters <button type="button" className="lb-reset" onClick={revealMyRank}>Reveal my position</button></span>}
              </div>
            </div>
            <span className="lb-rows-caption"><Users size={14} />A community in motion</span>
          </div>
          <p className="lb-sr-only" role="status">{requiresDomain ? 'Choose a domain.' : `${matchedCount} founders shown in ${scopeLabel}${isFiltering ? ' with the current search and filters.' : '.'}`}</p>
          {pageRows.length ? <>
            <div ref={tableScroll} className="lb-table-scroll" role="region" aria-label="Founder rankings table" tabIndex={0}>
              <table aria-label={mode === 'labx' ? 'Founder rankings' : 'LabX Pulse rankings'} data-scope={scope}>
                <thead>
                  <tr>{headers.map((header) => (
                    <th key={header.key} scope="col" aria-sort={sortColumn === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'} className={header.key === 'points' ? 'lb-points-heading' : ''}>
                      <button type="button" className="lb-sort-column" onClick={() => changeSort(header.key)} aria-label={`Sort by ${header.label}`}>
                        <span>{header.label}</span>
                        <span className="lb-sort-indicator">{getHeaderSortIcon(header.key)}</span>
                      </button>
                    </th>
                  ))}</tr>
                </thead>
                <tbody>
                  {pinnedUserRow}
                  {pageRows.map(founder => (
                    <RankingRow key={founder.id} founder={founder} scope={scope} mode={mode} domains={domains} effectiveDomainId={effectiveDomainId} highlightedId={highlightedId} onJumpToFounder={scrollToFounder} rowRef={founder.id === userStanding?.id ? originalUserRow : undefined} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="lb-list-count">{pageRows.length} founders {isFiltering ? 'matched' : 'beyond the podium'}</p>
          </> : <div className="lb-empty"><Search size={30} /><h3>{!isFiltering && podium.length ? 'All founders are on the podium' : 'No founders found'}</h3><p>{!isFiltering && podium.length ? 'More rankings will appear as founders join this domain.' : 'Try adjusting or resetting the search and filters. Founder ranks will not be renumbered.'}</p>{isFiltering && <button type="button" className="lb-primary" onClick={resetFilters}>Show all founders<ArrowRight size={16} /></button>}</div>}
        </section>
      </>}
      <p className="lb-demo-note"><Sparkles size={13} />Your LabX Points reflect your achievements.</p>
      </div>

      {showRules && <Dialog titleId="lb-rules-title" closeLabel="Close ranking rules" onClose={() => setShowRules(false)}>
        <span className="lb-rules-trophy"><Trophy size={32} /></span><span className="lb-eyebrow">Every point has a purpose</span><h2 id="lb-rules-title">How rankings work</h2>
        <ul className="lb-rules-list">
          <li><Zap size={18} /><div><strong>Points set the pace</strong><p>Founders rank by their all-time LabX Points. Approved activity counts; pending points do not.</p></div></li>
          <li><Target size={18} /><div><strong>LabX Pulse</strong><p>Pulse ranks by current streak, active days, approved missions, then completed milestones. The signed-in founder's values use available approved activity dates; sample founders are clearly marked demo fixtures.</p></div></li>
          <li><Globe2 size={18} /><div><strong>Global Rank and Domain Rank</strong><p>Global brings all founders together. Domain compares founders with a completed project assessment in that field. Each board displays only its own scope's rank.</p></div></li>
          <li><Medal size={18} /><div><strong>Equal points share a rank</strong><p>Ties share their place. Name searches keep the original rank within the selected scope. Your row is surfaced before Rank #4 in the default list without changing your rank.</p></div></li>
        </ul>
        <p className="lb-detail-note">Multiple projects never multiply your points. Your balance matches Achievements. LabX Points are recognition, with no cash value.</p>
        <Link to="/achievements" className="lb-primary lb-detail-action">See your points history<ArrowRight size={16} /></Link>
      </Dialog>}
    </div>
  )
}
