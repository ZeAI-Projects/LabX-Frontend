import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowDownUp, ArrowRight, ArrowUp, Compass, Crown, Filter, Globe2, Info, Medal, Search, Sparkles, Target, Trophy, Users, X as XIcon, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { getLeaderboardSnapshot, LEADERBOARD_DOMAINS } from '../services/mock_leaderboard.js'
import '../components/LeaderboardPage.css'

const points = value => value.toLocaleString('en-US')
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')
const rankLabel = rank => rank == null ? 'Not ranked' : `#${rank}`
const founderDomainIds = (userId, projects) => LEADERBOARD_DOMAINS.filter(domain =>
  projects.some(project => project?.owner_id === userId
    && project.assessment_completed === true
    && [project.roadmap_snapshot?.domain, project.assessment_result?.domain]
      .some(name => String(name ?? '').trim().toLocaleLowerCase() === domain.name.toLocaleLowerCase())),
).map(domain => domain.id)
const leaderboardProfileQuery = (scope, domainIds, mode) => {
  const params = new URLSearchParams({ scope })
  domainIds.forEach(id => params.append('domain', id))
  if (mode === 'momentum') params.set('mode', mode)
  return `?${params.toString()}`
}

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

function DomainName({ name }) {
  const tooltipId = useId()
  const textRef = useRef(null)
  const tooltipRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [position, setPosition] = useState(null)
  const visible = hovered || focused

  useLayoutEffect(() => {
    if (!visible) return undefined

    const updatePosition = () => {
      const text = textRef.current
      const tooltip = tooltipRef.current
      if (!text || !tooltip) return
      const textRect = text.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()
      const gap = 10
      const placement = textRect.top >= tooltipRect.height + gap + 8 ? 'above' : 'below'
      const left = Math.max(tooltipRect.width / 2 + 8, Math.min(
        textRect.left + textRect.width / 2,
        window.innerWidth - tooltipRect.width / 2 - 8,
      ))
      setPosition({
        left,
        top: placement === 'above' ? textRect.top - gap : textRect.bottom + gap,
        placement,
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [visible, name])

  return <>
    <span
      ref={textRef}
      className="lb-domain-name"
      tabIndex={0}
      aria-describedby={visible ? tooltipId : undefined}
      onMouseEnter={() => { setPosition(null); setHovered(true) }}
      onMouseLeave={() => { setHovered(false); if (!focused) setPosition(null) }}
      onFocus={() => { setPosition(null); setFocused(true) }}
      onBlur={() => { setFocused(false); if (!hovered) setPosition(null) }}
    >{name}</span>
    {visible && createPortal(
      <span
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className={`lb-domain-tooltip${position ? ` lb-domain-tooltip--${position.placement}` : ''}`}
        style={position
          ? { left: position.left, top: position.top }
          : { left: 0, top: 0, visibility: 'hidden' }}
      >{name}</span>,
      document.body,
    )}
  </>
}

function DomainListTooltip({ domains, count, label }) {
  const tooltipId = useId()
  const badgeRef = useRef(null)
  const tooltipRef = useRef(null)
  const hideTimer = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [position, setPosition] = useState(null)
  const visible = hovered || focused
  const cancelHide = () => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = null
  }
  const scheduleHide = () => {
    cancelHide()
    hideTimer.current = window.setTimeout(() => {
      setHovered(false)
      setPosition(null)
    }, 160)
  }

  useLayoutEffect(() => {
    if (!visible) return undefined

    const updatePosition = () => {
      const badge = badgeRef.current
      const tooltip = tooltipRef.current
      if (!badge || !tooltip) return
      const badgeRect = badge.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()
      const gap = 9
      const above = badgeRect.top >= tooltipRect.height + gap + 8
      const left = Math.max(tooltipRect.width / 2 + 8, Math.min(
        badgeRect.left + badgeRect.width / 2,
        window.innerWidth - tooltipRect.width / 2 - 8,
      ))
      const desiredTop = above ? badgeRect.top - gap : badgeRect.bottom + gap
      const top = Math.max(8, Math.min(desiredTop, window.innerHeight - tooltipRect.height - 8))
      const arrowLeft = badgeRect.left + badgeRect.width / 2 - (left - tooltipRect.width / 2)
      setPosition({ left, top, placement: above ? 'above' : 'below', arrowLeft })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [visible, domains])

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  return <>
    <button
      ref={badgeRef}
      type="button"
      className="lb-domain-more"
      aria-label={label}
      aria-describedby={visible ? tooltipId : undefined}
      onMouseEnter={() => { cancelHide(); setPosition(null); setHovered(true) }}
      onMouseLeave={scheduleHide}
      onFocus={() => { cancelHide(); setPosition(null); setFocused(true) }}
      onBlur={() => { setFocused(false); if (!hovered) setPosition(null) }}
    >+{count}</button>
    {visible && createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className={`lb-domain-list-tooltip${position ? ` lb-domain-list-tooltip--${position.placement}` : ''}`}
        style={position
          ? { left: position.left, top: position.top, '--lb-tooltip-arrow-left': `${position.arrowLeft}px` }
          : { left: 0, top: 0, visibility: 'hidden' }}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
      >
        <ul>{domains.map(domain => <li key={domain.id}><Globe2 size={12} aria-hidden="true" /><span>{domain.name}</span></li>)}</ul>
      </div>,
      document.body,
    )}
  </>
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

function ThemedMultiSelect({ selectedValues, options, onChange, onClear, ariaLabel, placeholder }) {
  const root = useRef(null)
  const trigger = useRef(null)
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const selectedLabels = options.filter(option => selectedValues.includes(option.value)).map(option => option.label)
  const label = selectedLabels.length === 1 ? selectedLabels[0]
    : selectedLabels.length ? `${selectedLabels.length} domains selected` : placeholder

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = event => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className={`lb-select${open ? ' is-open' : ''}`} ref={root}>
    <button ref={trigger} type="button" className="lb-select-trigger" aria-label={ariaLabel} aria-controls={menuId} aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span>{label}</span><span className="lb-select-chevron" aria-hidden="true" />
    </button>
    {open && <div id={menuId} className="lb-select-menu" role="group" aria-label={`${ariaLabel} options`}>
      {onClear && <button type="button" className={`lb-select-clear${selectedValues.length ? '' : ' lb-select-clear--hidden'}`} disabled={!selectedValues.length} aria-hidden={!selectedValues.length} onClick={onClear}>Clear selection</button>}
      {options.map(option => <button key={option.value} type="button" className="lb-select-option" aria-pressed={selectedValues.includes(option.value)} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>}
  </div>
}

function RankingRow({ founder, scope, mode, domains, effectiveDomainIds, highlightedId, personalPosition = false, onJumpToFounder, rowRef, pinnedHidden = false }) {
  const domain = domains.find(entry => entry.name === founder.domain)
  const profileQuery = leaderboardProfileQuery(scope, effectiveDomainIds, mode)
  const rowSuffix = founder.ranking_domain_id ? `-domain-${founder.ranking_domain_id}` : ''
  const rowId = personalPosition ? undefined : `lb-founder-${founder.id}${rowSuffix}`
  const nameId = personalPosition ? undefined : `lb-name-${founder.id}${rowSuffix}`
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
    data-founder-id={founder.id}
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
    <td data-label="Domain"><span className="lb-domain-label"><DomainName name={domain?.name || founder.domain} />{scope === 'global' && founder.domains.length > 1 && <DomainListTooltip
      domains={founder.domains.map(membership => ({
        id: membership.id,
        name: domains.find(entry => entry.id === membership.id)?.name || membership.name,
      }))}
      count={founder.domains.length - 1}
      label={`Show all ${founder.domains.length} domains`}
    />}</span></td>
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
        {showDomain && <span className="lb-podium-domain" title={founder.domain}>{domain?.name || founder.domain}</span>}
        <RankPair founder={founder} scope={scope} className="lb-podium-ranks" />
        <div className="lb-podium-points"><Zap size={15} /><strong>{points(founder.total_points)}</strong><span>LabX Points</span></div>
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
  const roadmapDomainIds = useMemo(() => founderDomainIds(user?.id, projects), [projects, user?.id])
  const scope = scopeParam === 'domain' ? 'domain' : scopeParam === 'global' ? 'global' : 'global'
  const hasDomainSelection = searchParams.has('domain')
  const selectedDomainIds = useMemo(() => {
    const requestedIds = hasDomainSelection ? searchParams.getAll('domain') : roadmapDomainIds
    return [...new Set(requestedIds.filter(id => LEADERBOARD_DOMAINS.some(domain => domain.id === id)))]
  }, [hasDomainSelection, roadmapDomainIds, searchParams])
  const mode = searchParams.get('mode') === 'momentum' ? 'momentum' : 'labx'
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [filterDomainIds, setFilterDomainIds] = useState([])
  const [stageFilter, setStageFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [sortColumn, setSortColumn] = useState('rank')
  const [sortDirection, setSortDirection] = useState('asc')
  const [highlightedId, setHighlightedId] = useState(null)
  const [pinnedUserVisible, setPinnedUserVisible] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterPopoverPosition, setFilterPopoverPosition] = useState({ placement: 'below', left: 0, top: 0, maxHeight: 280, constrained: false })
  const rankingTools = useRef(null)
  const filterAnchor = useRef(null)
  const filterPanel = useRef(null)
  const tableScroll = useRef(null)
  const originalUserRow = useRef(null)
  const pinnedUserElement = useRef(null)
  const tableHeading = useRef(null)
  const snapshot = useMemo(() => getLeaderboardSnapshot({
    user,
    projects,
    scope: scope || 'global',
    domainIds: selectedDomainIds,
    search,
    mode,
    filterDomainIds: scope === 'global' ? filterDomainIds : [],
    stage: stageFilter,
    level: levelFilter,
  }), [user, projects, scope, selectedDomainIds, search, mode, filterDomainIds, stageFilter, levelFilter])
  const { domains, rankings, podium, userStanding, globalUserStanding, requiresDomain, totalFounders, matchedCount, metrics } = snapshot
  const scopeLabel = scope === 'global' ? 'Global' : snapshot.selectedDomains.map(domain => domain.name).join(', ') || 'your selected domains'
  const isFiltering = Boolean(search || filterDomainIds.length || stageFilter || levelFilter)
  const activeFilterCount = (scope === 'global' ? filterDomainIds.length : selectedDomainIds.length)
    + [stageFilter, levelFilter].filter(Boolean).length
  const podiumIds = new Set(podium.map(founder => founder.id))
  const userVisible = Boolean(userStanding && rankings.some(founder => founder.id === userStanding.id))
  const showPodium = scope === 'global' && (!isFiltering || Boolean(userVisible && podiumIds.has(userStanding?.id)))
  const displayRankings = isFiltering ? rankings : snapshot.allRankings
  const allFoundersOnPodium = scope === 'global' && !isFiltering && totalFounders > 0 && podium.length === totalFounders
  const shouldPinUser = Boolean(scope === 'global' && userStanding?.rank > 3 && (userVisible || !isFiltering))
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
    const rows = [...displayRankings].filter(founder => !showPodium || !podiumIds.has(founder.id))
    rows.sort((left, right) => {
      if (scope === 'domain' && left.is_current_user !== right.is_current_user) return left.is_current_user ? -1 : 1
      const direction = scope === 'domain' && sortDirection === 'desc' ? -1 : 1
      const result = compareValues(getSortValue(left, sortColumn), getSortValue(right, sortColumn)) * direction
      if (result !== 0) return result
      if (scope === 'domain') {
        const domainResult = compareValues(left.domain, right.domain) * direction
        if (domainResult !== 0) return domainResult
      }
      return compareValues(left.rank ?? Number.MAX_SAFE_INTEGER, right.rank ?? Number.MAX_SAFE_INTEGER) * direction
    })
    return scope === 'global' && sortDirection === 'desc' ? rows.reverse() : rows
  }, [displayRankings, podiumIds, showPodium, scope, sortColumn, sortDirection])

  const scrollToFounder = id => {
    const target = document.getElementById('lb-founder-'+id)
      ?? [...document.querySelectorAll('[data-founder-id]')].find(row => row.dataset.founderId === id)
    if (!target) return
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    setHighlightedId(id)
  }
  const pageRows = useMemo(() => [...sortedRankings], [sortedRankings])
  const pinnedUserRow = shouldPinUser ? <RankingRow key={`personal-${userStanding.id}`} founder={{ ...userStanding, isPinned: true }} scope={scope} mode={mode} domains={domains} effectiveDomainIds={selectedDomainIds} highlightedId={highlightedId} onJumpToFounder={scrollToFounder} rowRef={pinnedUserElement} personalPosition pinnedHidden={!pinnedUserVisible} /> : null

  const levels = [...new Set(snapshot.allRankings
    .filter(founder => !stageFilter || founder.stage === stageFilter)
    .map(founder => founder.level)
    .filter(level => level != null))].sort((left, right) => left - right)
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
  }, [scope, mode, selectedDomainIds, shouldPinUser, pageRows])

  useEffect(() => {
    if (!showFilters) return
    const closeOnOutsideClick = event => {
      if (!rankingTools.current?.contains(event.target) && !filterPanel.current?.contains(event.target)) setShowFilters(false)
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

  useLayoutEffect(() => {
    if (!showFilters) return undefined
    const updatePosition = () => {
      const anchor = filterAnchor.current
      const panel = filterPanel.current
      if (!anchor || !panel) return
      const anchorRect = anchor.getBoundingClientRect()
      const gap = 8
      const belowSpace = Math.max(0, window.innerHeight - anchorRect.bottom - gap - 8)
      const aboveSpace = Math.max(0, anchorRect.top - gap - 8)
      const borderHeight = panel.offsetHeight - panel.clientHeight
      const naturalHeight = panel.scrollHeight + borderHeight
      const panelWidth = panel.getBoundingClientRect().width
      const minLeft = 8
      const maxLeft = Math.max(minLeft, window.innerWidth - panelWidth - 8)
      const left = Math.max(minLeft, Math.min(anchorRect.right - panelWidth, maxLeft))
      const placement = belowSpace < naturalHeight && aboveSpace > belowSpace ? 'above' : 'below'
      const availableSpace = placement === 'above' ? aboveSpace : belowSpace
      const maxHeight = Math.min(280, availableSpace)
      const panelHeight = Math.min(naturalHeight, maxHeight)
      const top = placement === 'above' ? anchorRect.top - gap - panelHeight : anchorRect.bottom + gap
      const constrained = availableSpace < naturalHeight
      setFilterPopoverPosition(current => {
        if (current.placement === placement && current.left === left && current.top === top && current.maxHeight === maxHeight && current.constrained === constrained) return current
        return { placement, left, top, maxHeight, constrained }
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [showFilters, filterDomainIds, stageFilter, levelFilter, selectedDomainIds])

  const resetFilters = () => { setSearch(''); setSearchDraft(''); setFilterDomainIds([]); setStageFilter(''); setLevelFilter('') }
  const setDomainSelection = ids => {
    resetFilters()
    const params = new URLSearchParams(searchParams)
    params.set('scope', 'domain')
    params.delete('domain')
    if (ids.length) ids.forEach(id => params.append('domain', id))
    else params.set('domain', '')
    setSearchParams(params)
  }
  const toggleDomain = (selectedIds, updateSelection, id) => {
    updateSelection(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id])
  }
  const switchScope = next => {
    if (next === scope) return
    resetFilters()
    const params = new URLSearchParams(searchParams)
    params.set('scope', next)
    if (next === 'domain' && !params.has('domain')) roadmapDomainIds.forEach(id => params.append('domain', id))
    setSearchParams(params)
  }
  const changeMode = nextMode => {
    if (nextMode === mode) return
    const params = new URLSearchParams(searchParams)
    params.set('scope', scope)
    if (nextMode === 'momentum') params.set('mode', nextMode)
    else params.delete('mode')
    setSearchParams(params)
  }
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
        { key: 'domain', label: 'Domain' },
        { key: 'stage', label: 'Stage / Level' },
        { key: 'points', label: 'LabX Points' },
      ]
    : [
        { key: 'rank', label: scope === 'global' ? 'Global Rank' : 'Domain Rank' },
        { key: 'founder', label: 'Founder' },
        { key: 'domain', label: 'Domain' },
        { key: 'stage', label: 'Stage / Level' },
        { key: 'streak', label: 'Streak' },
        { key: 'missions', label: 'Completed Mission' },
        { key: 'points', label: 'LabX Points' },
      ]

  return (
    <div className="lb-page">
      <header className="lb-header">
          <div className="lb-header-controls"><div className="lb-scope-toggle" data-active={scope} role="group" aria-label="Leaderboard scope">
            <button type="button" aria-pressed={scope === 'global'} onClick={() => switchScope('global')}><Globe2 size={16} />Global</button>
            <button type="button" aria-pressed={scope === 'domain'} onClick={() => switchScope('domain')}><Compass size={16} />Domain</button>
          </div><button type="button" className="lb-quiet-button lb-header-help" onClick={() => setShowRules(true)}><Info size={15} />How rankings work</button></div>
          <p>Big ideas. Real progress. Every step earns your spot.</p>
      </header>

      <div className="lb-dashboard">
      {!requiresDomain && <section key={`metrics-${scope}-${mode}-${selectedDomainIds.join('-')}`} className="lb-metrics lb-result-enter" aria-label={`${scope === 'global' ? 'Global' : 'Domain'} leaderboard metrics`}>
        <div><span><Users size={15} />Ranked founders</span><strong data-metric="founders">{points(metrics.totalFounders)}</strong><small>{scope === 'global' ? 'Across all domains' : 'In this domain'}</small></div>
        <div><span><Medal size={15} />Current Rank</span><strong data-metric="current-rank">{mode === 'momentum' && !userStanding ? '—' : rankLabel(userStanding?.rank)}</strong><small>{scope === 'global' ? 'Global founder ranking' : 'Selected domain ranking'}</small></div>
        <div><span><Crown size={15} />Leading LabX Score</span><strong data-metric="leading">{points(metrics.leadingPoints)}</strong><small>Approved LabX Points</small></div>
        <div><span><Zap size={15} />Your LabX Points</span><strong data-metric="labx-points">{points(globalUserStanding?.total_points ?? 0)}</strong><small>Total points earned</small></div>
      </section>}
      {requiresDomain ? <section className="lb-empty lb-empty--domain">
        <div className="lb-empty-icon"><Compass size={31} /></div><span className="lb-eyebrow">Find your field</span><h2>Choose domains</h2><p>{roadmapDomainIds.length ? 'Select one or more domains to see matching founders and rankings.' : 'No completed roadmap domains are associated with your account yet. Choose one or more domains to browse the leaderboard.'}</p>
        <div className="lb-domain-field lb-empty-domain-select"><label>Domains</label><ThemedMultiSelect ariaLabel="Choose domains" placeholder="Choose domains" selectedValues={selectedDomainIds} onChange={id => toggleDomain(selectedDomainIds, setDomainSelection, id)} options={domains.map(domain => ({ value: domain.id, label: domain.name }))} /></div>
      </section> : <>
        {mode === 'momentum' && <p className="lb-momentum-note"><Info size={14} />Pulse ranks using an equal-weight combination of LabX Points, current streak, and completed missions, normalized within this board. Sample-founder activity values are demo fixtures; live cohort-wide streak history is unavailable.</p>}
        <div className="lb-mode-toggle" data-active={mode} role="group" aria-label="Leaderboard ranking mode">
          <button type="button" aria-pressed={mode === 'labx'} onClick={() => changeMode('labx')}><Zap size={15} />LabX</button>
          <button type="button" aria-pressed={mode === 'momentum'} onClick={() => changeMode('momentum')}><Target size={15} />LabX Pulse</button>
        </div>

        {scope === 'global' && podium.length > 0 && <section key={`hall-${scope}-${mode}-${selectedDomainIds.join('-')}`} className={`lb-hall lb-result-enter${showPodium ? '' : ' lb-hall--reserved'}`} aria-labelledby="lb-hall-title" aria-hidden={!showPodium}>
          <div className="lb-section-heading"><div><span className="lb-eyebrow">{mode === 'labx' ? 'A little inspiration for your next big move' : 'Consistency and sustained founder activity'}</span><h2 id="lb-hall-title">Hall of Founders</h2></div></div>
          <Podium founders={podium} domains={domains} scope={scope} highlightedId={highlightedId} mode={mode} showDomain={scope === 'global'} onJumpToFounder={scrollToFounder} profileQuery={leaderboardProfileQuery(scope, selectedDomainIds, mode)} />
        </section>}

        <section key={`rankings-${scope}-${mode}`} className="lb-rankings lb-result-enter" aria-labelledby="lb-rankings-title">
          <div className="lb-section-heading lb-ranking-heading">
            <div className="lb-ranking-title-row">
              <h2 ref={tableHeading} tabIndex={-1} id="lb-rankings-title">{mode === 'labx' ? 'LabX Rankings' : 'LabX Pulse Rankings'}<span className="lb-count">{isFiltering ? matchedCount : totalFounders}</span></h2>
              <div ref={rankingTools} className="lb-ranking-tools">
                <div className="lb-filter-anchor" ref={filterAnchor}><button type="button" className={`lb-tool-button${showFilters ? ' is-active' : ''}`} aria-label="Toggle ranking filters" title="Filters" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><Filter size={16} />{activeFilterCount > 0 && <span className="lb-tool-count">{activeFilterCount}</span>}</button>
                {showFilters && createPortal(<div ref={filterPanel} className={`lb-compact-filter-panel lb-compact-filter-panel--${filterPopoverPosition.placement}${filterPopoverPosition.constrained ? ' lb-compact-filter-panel--constrained' : ''}`} style={{ left: `${filterPopoverPosition.left}px`, top: `${filterPopoverPosition.top}px`, maxHeight: `${filterPopoverPosition.maxHeight}px` }}>
                  <label className="lb-filter-field">Domain<ThemedMultiSelect ariaLabel="Domain filter" placeholder={scope === 'global' ? 'All domains' : 'Choose domains'} selectedValues={scope === 'global' ? filterDomainIds : selectedDomainIds} onChange={id => scope === 'global' ? toggleDomain(filterDomainIds, setFilterDomainIds, id) : toggleDomain(selectedDomainIds, setDomainSelection, id)} onClear={() => scope === 'global' ? setFilterDomainIds([]) : setDomainSelection([])} options={domains.map(domain => ({ value: domain.id, label: domain.name }))} /></label>
                  <label className="lb-filter-field">Stage<ThemedSelect ariaLabel="Stage filter" value={stageFilter} onChange={nextStage => {
                    setStageFilter(nextStage)
                    if (nextStage && levelFilter && !snapshot.allRankings.some(founder => founder.stage === nextStage && String(founder.level) === levelFilter)) setLevelFilter('')
                  }} options={[{ value: '', label: 'All stages' }, ...allStages.map(stage => ({ value: stage, label: stage }))]} /></label>
                  <label className="lb-filter-field">Level<ThemedSelect ariaLabel="Level filter" value={levelFilter} onChange={setLevelFilter} options={[{ value: '', label: 'All levels' }, ...levels.map(level => ({ value: String(level), label: `Level ${level}` }))]} /></label>
                  {isFiltering && <button type="button" className="lb-reset" onClick={() => { resetFilters(); setShowFilters(false) }}>Clear filters</button>}
                </div>, document.body)}</div>
                <form className="lb-compact-search" role="search" onSubmit={submitSearch}><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search founders" placeholder="Search founders..." value={searchDraft} onChange={event => setSearchDraft(event.target.value)} maxLength={100} enterKeyHint="search" /></form>
              </div>
            </div>
            <div className="lb-ranking-subheading">
              <p>{mode === 'labx' ? `${scopeLabel} · Ranked by approved LabX Points` : 'Ranked by an equal-weight combination of LabX Points, current streak, and completed missions.'}<span className={!isFiltering ? 'lb-filter-note--hidden' : undefined} aria-hidden={!isFiltering}> · Filters do not change rank positions.</span></p>
              <span className="lb-rows-caption"><Users size={14} />A community in motion</span>
            </div>
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
                    <RankingRow key={founder.ranking_domain_id ? `${founder.id}-${founder.ranking_domain_id}` : founder.id} founder={founder} scope={scope} mode={mode} domains={domains} effectiveDomainIds={selectedDomainIds} highlightedId={highlightedId} onJumpToFounder={scrollToFounder} rowRef={scope === 'global' && founder.id === userStanding?.id ? originalUserRow : undefined} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="lb-list-count">{pageRows.length} founders {isFiltering ? 'matched' : 'beyond the podium'}</p>
          </> : <div className="lb-empty"><Search size={30} /><h3>{allFoundersOnPodium ? 'All founders are on the podium' : 'No founders found'}</h3><p>{allFoundersOnPodium ? 'More rankings will appear as founders join this domain.' : 'Try adjusting or resetting the search and filters. Founder ranks will not be renumbered.'}</p>{isFiltering && <button type="button" className="lb-primary" onClick={resetFilters}>Show all founders<ArrowRight size={16} /></button>}</div>}
        </section>
      </>}
      <p className="lb-demo-note"><Sparkles size={13} />Development preview: leaderboard rankings and points use mock data. Domain-specific point allocation and ranks are not yet provided by the backend.</p>
      </div>

      {showRules && <Dialog titleId="lb-rules-title" closeLabel="Close ranking rules" onClose={() => setShowRules(false)}>
        <span className="lb-rules-trophy"><Trophy size={32} /></span><span className="lb-eyebrow">Every point has a purpose</span><h2 id="lb-rules-title">How rankings work</h2>
        <ul className="lb-rules-list">
          <li><Zap size={18} /><div><strong>Points set the pace</strong><p>Founders rank by their all-time LabX Points. Approved activity counts; pending points do not.</p></div></li>
          <li><Target size={18} /><div><strong>LabX Pulse</strong><p>Pulse combines normalized LabX Points, current streak, and completed missions with equal weight. The consolidated score is used only to rank founders and is not displayed. The signed-in founder's values use available approved activity dates; sample founders are clearly marked demo fixtures.</p></div></li>
          <li><Globe2 size={18} /><div><strong>Global Rank and Domain Rank</strong><p>Global brings all founders together. Domain compares founders with a completed project assessment in that field. Each board displays only its own scope's rank.</p></div></li>
          <li><Medal size={18} /><div><strong>Ties share a rank</strong><p>LabX ties share a rank when points match; Pulse ties share a rank when their combined scores match. Name searches keep the original rank within the selected scope. Your row is surfaced before Rank #4 in the default list without changing your rank.</p></div></li>
        </ul>
        <p className="lb-detail-note">Multiple projects never multiply your points. Your balance matches Achievements. LabX Points are recognition, with no cash value.</p>
        <Link to="/achievements" className="lb-primary lb-detail-action">See your points history<ArrowRight size={16} /></Link>
      </Dialog>}
    </div>
  )
}
