import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Clapperboard,
  EllipsisVertical,
  Filter,
  Factory,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Landmark,
  Leaf,
  Plus,
  Scale,
  Search,
  SendHorizonal,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { guildDomains, initialGuilds, initialMessages, initialUnreadCounts } from '../services/mock_guilds.js'
import '../components/GuildsPage.css'

const defaultForm = { name: '', description: '', domain: guildDomains[0], membership: 'open' }
const domainIcons = {
  'Healthcare & MedTech': HeartPulse,
  Education: GraduationCap,
  'Finance & FinTech': Landmark,
  Cybersecurity: Shield,
  'Mobility & Logistics': Truck,
  'Agriculture & FoodTech': Sprout,
  'Climate & Sustainability': Leaf,
  'Smart Cities & Infrastructure': Building2,
  'Women Safety & Social Impact': HeartHandshake,
  'Media & CreatorTech': Clapperboard,
  DefenceTech: ShieldCheck,
  LegalTech: Scale,
  'Consumer Products': ShoppingBag,
  'Manufacturing & Industry': Factory,
  'Retail & Commerce': Store,
}

function isOwnedGuild(guild) {
  return guild.isOwner || guild.membership === 'owner'
}

function isApprovedMember(guild, joinedIds) {
  return joinedIds.includes(guild.id) || guild.membership === 'member'
}

export function GuildsPage() {
  const { user } = useAuth()
  const currentUserName = user?.full_name || user?.username || 'LabX Member'
  const [guilds, setGuilds] = useState(initialGuilds)
  const [activeTab, setActiveTab] = useState('all')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [draftCategoryFilter, setDraftCategoryFilter] = useState('All')
  const [selectedGuildId, setSelectedGuildId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showMemberView, setShowMemberView] = useState(false)
  const [showGuildDetails, setShowGuildDetails] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [joinDialogGuildId, setJoinDialogGuildId] = useState(null)
  const [joinMessage, setJoinMessage] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [appliedMemberSearch, setAppliedMemberSearch] = useState('')
  const [applicantSearch, setApplicantSearch] = useState('')
  const [appliedApplicantSearch, setAppliedApplicantSearch] = useState('')
  const [selectedApplicant, setSelectedApplicant] = useState(null)
  const [memberMenuId, setMemberMenuId] = useState(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 680 : false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [editingGuildId, setEditingGuildId] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [chatInput, setChatInput] = useState('')
  const [messagesByGuild, setMessagesByGuild] = useState(initialMessages)
  const [unreadCounts, setUnreadCounts] = useState(initialUnreadCounts)
  const [joinedIds, setJoinedIds] = useState(() => initialGuilds.filter((guild) => guild.membership === 'member').map((guild) => guild.id))
  const [pendingIds, setPendingIds] = useState(() => initialGuilds.filter((guild) => guild.membership === 'pending').map((guild) => guild.id))
  const messageHistoryRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 680)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const visibleGuildGroups = useMemo(() => {
    const normalizedQuery = appliedQuery.trim().toLowerCase()
    const filteredGuilds = guilds.filter((guild) => {
      const matchesQuery = !normalizedQuery
        || guild.name.toLowerCase().includes(normalizedQuery)
        || guild.description.toLowerCase().includes(normalizedQuery)
        || guild.domain.toLowerCase().includes(normalizedQuery)
      const matchesDomain = categoryFilter === 'All' || guild.domain === categoryFilter
      return matchesQuery && matchesDomain
    })
    return activeTab === 'all'
      ? [
        {
          key: 'joined',
          title: 'Joined Guilds',
          guilds: filteredGuilds.filter((guild) => isApprovedMember(guild, joinedIds) || isOwnedGuild(guild)),
        },
        {
          key: 'discover',
          title: 'Discover Guilds',
          guilds: filteredGuilds.filter((guild) => !isApprovedMember(guild, joinedIds) && !isOwnedGuild(guild)),
        },
      ]
      : [{ key: 'owned', title: 'Created by You', guilds: filteredGuilds.filter(isOwnedGuild) }]
  }, [activeTab, appliedQuery, categoryFilter, guilds, joinedIds])

  const visibleGuildCount = visibleGuildGroups.reduce((count, group) => count + group.guilds.length, 0)

  const selectedGuild = guilds.find((guild) => guild.id === selectedGuildId) || null
  const currentMessages = selectedGuild ? (messagesByGuild[selectedGuild.id] || []) : []
  const joinDialogGuild = guilds.find((guild) => guild.id === joinDialogGuildId) || null
  const selectedMembers = selectedGuild?.members || []
  const visibleMembers = selectedMembers
    .map((member) => ({
      ...member,
      isCurrentUser: member.id === 'you' || member.name === 'You',
      displayName: member.id === 'you' || member.name === 'You' ? currentUserName : member.name,
    }))
    .filter((member, index, members) => !member.isCurrentUser
      || members.findIndex((entry) => entry.isCurrentUser) === index)
    .filter((member) => member.displayName.toLowerCase().includes(appliedMemberSearch.trim().toLowerCase()))
  const visibleApplications = (selectedGuild?.applications || [])
    .filter((application) => application.status === 'pending')
    .filter((application) => application.applicant.toLowerCase().includes(appliedApplicantSearch.trim().toLowerCase()))
  const showListPanel = !isMobile || !showMobileChat
  const showChatPanel = !isMobile || showMobileChat

  useEffect(() => {
    const history = messageHistoryRef.current
    if (history) history.scrollTop = history.scrollHeight
  }, [selectedGuildId, currentMessages.length])

  function updateGuild(id, updater) {
    setGuilds((current) => current.map((guild) => guild.id === id ? updater(guild) : guild))
  }

  function selectGuild(guildId) {
    const guild = guilds.find((entry) => entry.id === guildId)
    const opensChat = guild && (isApprovedMember(guild, joinedIds) || isOwnedGuild(guild))
    setSelectedGuildId(guildId)
    setShowCreate(false)
    setEditingGuildId(null)
    setForm(defaultForm)
    setShowMemberView(false)
    setShowGuildDetails(Boolean(guild && !opensChat))
    setShowMenu(false)
    setShowFilters(false)
    setMemberSearch('')
    setAppliedMemberSearch('')
    setApplicantSearch('')
    setAppliedApplicantSearch('')
    setSelectedApplicant(null)
    if (opensChat) setUnreadCounts((current) => ({ ...current, [guildId]: 0 }))
    if (isMobile) setShowMobileChat(true)
  }

  function handleJoin(guild) {
    if (guild.membership === 'rejected' || guild.membership === 'pending' || pendingIds.includes(guild.id)) return
    setJoinDialogGuildId(guild.id)
    setJoinMessage('')
  }

  function confirmJoin() {
    if (!joinDialogGuild) return
    const joiningGuild = joinDialogGuild
    const isOpen = joiningGuild.membershipType === 'open'
    const applicationId = `app-${Date.now()}`

    updateGuild(joiningGuild.id, (current) => {
      const members = current.members || []
      const alreadyMember = members.some((member) => member.id === 'you')
      return {
        ...current,
        membership: isOpen ? 'member' : 'pending',
        memberCount: isOpen && !alreadyMember ? current.memberCount + 1 : current.memberCount,
        applications: isOpen ? current.applications : [
          ...(current.applications || []),
          {
            id: applicationId,
            applicantId: 'you',
            applicant: currentUserName,
            status: 'pending',
            message: joinMessage.trim(),
          },
        ],
        members: isOpen && !alreadyMember
          ? [...members, { id: 'you', name: currentUserName, role: 'Member' }]
          : current.members,
      }
    })

    setJoinDialogGuildId(null)
    setSelectedGuildId(joiningGuild.id)
    setShowGuildDetails(false)
    setShowMemberView(false)
    if (isOpen) {
      setJoinedIds((current) => current.includes(joiningGuild.id) ? current : [...current, joiningGuild.id])
      setUnreadCounts((current) => ({ ...current, [joiningGuild.id]: 0 }))
    }
    else setPendingIds((current) => current.includes(joiningGuild.id) ? current : [...current, joiningGuild.id])
    if (isMobile) setShowMobileChat(true)
  }

  function handleCreateGuild(event) {
    event.preventDefault()
    const errors = {}
    if (!form.name.trim()) errors.name = 'Guild name is required.'
    if (!form.description.trim()) errors.description = 'Description is required.'
    setFormErrors(errors)
    if (Object.keys(errors).length) return

    if (editingGuildId) {
      updateGuild(editingGuildId, (guild) => ({
        ...guild,
        name: form.name.trim(),
        description: form.description.trim(),
        domain: form.domain,
        membershipType: form.membership,
      }))
      setShowCreate(false)
      setShowGuildDetails(false)
      setSelectedGuildId(editingGuildId)
      setEditingGuildId(null)
      setForm(defaultForm)
      setFormErrors({})
      return
    }

    const baseId = `${form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-guild`
    const createdId = guilds.some((guild) => guild.id === baseId) ? `${baseId}-${Date.now()}` : baseId
    const createdGuild = {
      id: createdId,
      name: form.name.trim(),
      description: form.description.trim(),
      domain: form.domain,
      memberCount: 1,
      owner: currentUserName,
      membershipType: form.membership,
      membership: 'owner',
      isOwner: true,
      applications: [],
      members: [{ id: 'you', name: currentUserName, role: 'Founder' }],
    }

    setGuilds((current) => [createdGuild, ...current])
    setShowCreate(false)
    setShowMemberView(false)
    setShowGuildDetails(false)
    setSelectedGuildId(createdId)
    setEditingGuildId(null)
    setForm(defaultForm)
    setFormErrors({})
    if (isMobile) setShowMobileChat(true)
  }

  function handleSendMessage() {
    if (!selectedGuild || !accessAllowed || !chatInput.trim()) return

    const nextMessage = {
      id: `msg-${Date.now()}`,
      sender: 'You',
      avatar: 'YO',
      isCurrentUser: true,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessagesByGuild((current) => ({
      ...current,
      [selectedGuild.id]: [...(current[selectedGuild.id] || []), nextMessage],
    }))
    setChatInput('')
  }

  function handleApplicationDecision(guildId, applicationId, status) {
    const targetGuild = guilds.find((guild) => guild.id === guildId)
    if (!targetGuild || !isOwnedGuild(targetGuild)) return
    const targetApplication = targetGuild.applications?.find((application) => application.id === applicationId)
    if (!targetApplication || targetApplication.status !== 'pending') return
    const isCurrentUser = targetApplication.applicantId === 'you' || targetApplication.applicant === 'You'
    const applicantId = targetApplication.applicantId
      || targetApplication.applicant.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const applicantName = isCurrentUser ? currentUserName : targetApplication.applicant

    updateGuild(guildId, (guild) => {
      const application = (guild.applications || []).find((entry) => entry.id === applicationId)
      if (!application || application.status !== 'pending') return guild
      const members = guild.members || []
      const alreadyMember = members.some((member) => member.id === applicantId)
      const updatedMembers = status === 'approved' && !alreadyMember
        ? [...members, { id: applicantId, name: applicantName, role: 'Member' }]
        : members
      return {
        ...guild,
        memberCount: status === 'approved' ? updatedMembers.length : guild.memberCount,
        membership: isCurrentUser ? status === 'approved' ? 'member' : 'rejected' : guild.membership,
        members: status === 'approved' ? updatedMembers : guild.members,
        applications: guild.applications.map((entry) => entry.id === applicationId
          ? { ...entry, status }
          : entry),
      }
    })
    if (isCurrentUser) {
      if (status === 'approved') {
        setJoinedIds((current) => current.includes(guildId) ? current : [...current, guildId])
        setPendingIds((current) => current.filter((id) => id !== guildId))
        setSelectedGuildId(guildId)
        setShowGuildDetails(false)
        setShowMemberView(false)
        setUnreadCounts((current) => ({ ...current, [guildId]: 0 }))
        if (isMobile) setShowMobileChat(true)
      } else {
        setPendingIds((current) => current.filter((id) => id !== guildId))
      }
    }
  }

  function handleGuildSearch(event) {
    event.preventDefault()
    setAppliedQuery(query)
  }

  function startEditingGuild(guild) {
    if (!isOwnedGuild(guild)) return
    setEditingGuildId(guild.id)
    setForm({
      name: guild.name,
      description: guild.description,
      domain: guild.domain,
      membership: guild.membershipType || 'open',
    })
    setFormErrors({})
    setShowCreate(true)
    setShowMemberView(false)
    setShowGuildDetails(false)
    setShowMenu(false)
    if (isMobile) setShowMobileChat(true)
  }

  function handleMemberSearch(event) {
    event.preventDefault()
    setAppliedMemberSearch(memberSearch)
  }

  function handleApplicantSearch(event) {
    event.preventDefault()
    setAppliedApplicantSearch(applicantSearch)
  }

  function removeMember(guildId, memberId) {
    updateGuild(guildId, (guild) => ({
      ...guild,
      memberCount: Math.max(0, guild.memberCount - 1),
      members: (guild.members || []).filter((member) => member.id !== memberId),
    }))
    setMemberMenuId(null)
  }

  const accessAllowed = selectedGuild && (joinedIds.includes(selectedGuild.id) || selectedGuild.membership === 'owner' || selectedGuild.membership === 'member')
  const isPendingApplicant = selectedGuild && pendingIds.includes(selectedGuild.id)
  const isRejectedApplicant = selectedGuild?.membership === 'rejected'

  function renderGuildRow(guild, groupKey) {
    const isSelected = selectedGuildId === guild.id
    const isOwner = isOwnedGuild(guild)
    const isJoined = isApprovedMember(guild, joinedIds) && !isOwner
    const isDiscoverable = groupKey === 'discover'
    const isPending = guild.membership === 'pending' || pendingIds.includes(guild.id)
    const unreadCount = unreadCounts[guild.id] || 0

    return (
      <button
        key={guild.id}
        type="button"
        className={`guild-row ${isDiscoverable ? 'guild-row--discover' : ''} ${isSelected ? 'guild-row--active' : ''}`}
        aria-pressed={isSelected}
        onClick={() => selectGuild(guild.id)}
      >
        <span className="guild-row__avatar"><BriefcaseBusiness size={15} /></span>
        <span className="guild-row__content">
          <span className="guild-row__header">
            <strong>{guild.name}</strong>
            {isOwner && <span className="guild-row__badge guild-row__badge--owner">Owner</span>}
            {isJoined && <span className="guild-row__badge">Member</span>}
            {isDiscoverable && isPending && <span className="guild-row__badge guild-row__badge--pending">Pending Approval</span>}
          </span>
          <span className="guild-row__meta">{guild.domain}</span>
          <span className="guild-row__preview">{guild.description}</span>
        </span>
        {unreadCount > 0 && (
          <span className="guild-row__unread" aria-label={`${unreadCount} unread messages`}>{unreadCount}</span>
        )}
      </button>
    )
  }

  return (
    <div className="guilds-page">
      <div className="guilds-toolbar-row">
        <div className="guilds-guild-actions">
          <div className="guilds-filter-wrap">
            <button
              type="button"
              className={`guilds-icon-button ${showFilters ? 'guilds-pill-button--active' : ''}`}
              aria-label="Filter guilds"
              title="Filter by domain"
              aria-expanded={showFilters}
              onClick={() => {
                if (showFilters) {
                  setDraftCategoryFilter(categoryFilter)
                  setShowFilters(false)
                } else {
                  setDraftCategoryFilter(categoryFilter)
                  setShowFilters(true)
                }
              }}
            >
              <Filter size={16} />
            </button>
            {showFilters && (
              <div className="guilds-filters" role="dialog" aria-label="Filter guilds by domain">
                <div className="guilds-filter-heading">
                  <strong>Filter by domain</strong>
                  <div className="guilds-filter-heading__actions">
                    <button type="button" className="guilds-text-button" onClick={() => setDraftCategoryFilter('All')}>Clear</button>
                    <button
                      type="button"
                      className="guilds-icon-button guilds-icon-button--small"
                      aria-label="Close domain filters"
                      onClick={() => {
                        setDraftCategoryFilter(categoryFilter)
                        setShowFilters(false)
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="guilds-domain-list">
                  {guildDomains.map((domain) => {
                    const DomainIcon = domainIcons[domain] || BriefcaseBusiness
                    return (
                    <button
                      type="button"
                      key={domain}
                      aria-pressed={draftCategoryFilter === domain}
                      className={`guilds-domain-option ${draftCategoryFilter === domain ? 'guilds-domain-option--active' : ''}`}
                      onClick={() => setDraftCategoryFilter((current) => current === domain ? 'All' : domain)}
                    >
                      <DomainIcon size={14} />
                      <span>{domain}</span>
                      {draftCategoryFilter === domain && <span className="guilds-domain-check">Selected</span>}
                    </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  className="guilds-primary-button guilds-filter-apply"
                  onClick={() => {
                    setCategoryFilter(draftCategoryFilter)
                    setShowFilters(false)
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
          <button type="button" className="guilds-icon-button guilds-icon-button--create" aria-label="Create Guild" title="Create Guild" onClick={() => {
            setEditingGuildId(null)
            setForm(defaultForm)
            setShowCreate(true)
            setShowMemberView(false)
            setShowGuildDetails(false)
            if (isMobile) setShowMobileChat(true)
          }}>
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="guilds-shell">
        {showListPanel && (
          <aside className="guilds-sidebar" aria-label="Guild list panel">
            <div className="guilds-tabs" role="tablist" aria-label="Guild tabs">
              <button type="button" className="guilds-tab" role="tab" aria-selected={activeTab === 'all'} onClick={() => setActiveTab('all')}>
                All Guilds
              </button>
              <button type="button" className="guilds-tab" role="tab" aria-selected={activeTab === 'my'} onClick={() => setActiveTab('my')}>
                My Guilds
              </button>
            </div>

            <form className="guilds-search guilds-sidebar__search" onSubmit={handleGuildSearch} role="search">
              <label className="guilds-search__field">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    if (!event.target.value) setAppliedQuery('')
                  }}
                  placeholder="Search guilds..."
                  aria-label="Search guilds"
                />
              </label>
              <button type="submit" className="guilds-search__submit" aria-label="Search guilds">
                <ArrowRight size={15} />
              </button>
            </form>

            {visibleGuildCount === 0 ? (
              activeTab === 'all' && !appliedQuery.trim() && categoryFilter === 'All' ? (
                <div className="guilds-empty-state">
                  <h3>No joined guilds yet.</h3>
                  <p>Explore or join communities through the available discovery experience.</p>
                </div>
              ) : activeTab === 'my' && !appliedQuery.trim() && categoryFilter === 'All' ? (
                <div className="guilds-empty-state">
                  <h3>You haven't created any guilds yet.</h3>
                  <p>Create a guild to start your own community.</p>
                  <button type="button" className="guilds-primary-button" onClick={() => {
                    setEditingGuildId(null)
                    setForm(defaultForm)
                    setShowCreate(true)
                    setShowMemberView(false)
                    setShowGuildDetails(false)
                    if (isMobile) setShowMobileChat(true)
                  }}>Create Guild</button>
                </div>
              ) : (
                <div className="guilds-empty-state">
                  <h3>No guilds found</h3>
                  <p>Try a different search or domain filter.</p>
                  <button type="button" className="guilds-secondary-button" onClick={() => {
                    setQuery('')
                    setAppliedQuery('')
                    setCategoryFilter('All')
                  }}>Clear filters</button>
                </div>
              )
            ) : (
              <div className="guilds-list" aria-live="polite">
                {visibleGuildGroups.map((group) => group.guilds.length > 0 && (
                  <section className="guilds-list-section" key={group.key} aria-label={group.title}>
                    <h3 className="guilds-list-section__heading">{group.title}</h3>
                    {group.guilds.map((guild) => renderGuildRow(guild, group.key))}
                  </section>
                ))}
              </div>
            )}
          </aside>
        )}

        {showChatPanel && (
          <main className="guild-chat-panel" aria-label="Selected guild conversation">
            {showCreate ? (
              <div className="guilds-create-panel">
                <div className="guild-chat-header">
                  <div>
                    <span className="guilds-eyebrow">{editingGuildId ? 'Edit Guild' : 'Create Guild'}</span>
                    <h2>{editingGuildId ? 'Update your community' : 'Start a new community'}</h2>
                  </div>
                  {isMobile && (
                    <button type="button" className="guilds-link-button" onClick={() => {
                      setShowCreate(false)
                      setEditingGuildId(null)
                      setForm(defaultForm)
                      if (isMobile) setShowMobileChat(false)
                    }}>
                      <ArrowLeft size={14} /> Back
                    </button>
                  )}
                </div>

                <form className="guilds-form" onSubmit={handleCreateGuild} noValidate>
                  <label className="guilds-field">
                    <span>Guild Name *</span>
                    <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                    {formErrors.name && <span className="guilds-form__error">{formErrors.name}</span>}
                  </label>

                  <label className="guilds-field">
                    <span>Description *</span>
                    <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                    {formErrors.description && <span className="guilds-form__error">{formErrors.description}</span>}
                  </label>

                  <div className="guilds-form__row">
                    <label className="guilds-field">
                      <span>Domain</span>
                      <select value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))}>
                        {guildDomains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                      </select>
                    </label>

                    <label className="guilds-field">
                      <span>Membership</span>
                      <select value={form.membership} onChange={(event) => setForm((current) => ({ ...current, membership: event.target.value }))}>
                        <option value="open">Open joining</option>
                        <option value="application">Application-based</option>
                      </select>
                    </label>
                  </div>

                  <div className="guilds-form__actions">
                    <button type="submit" className="guilds-primary-button">{editingGuildId ? 'Save Changes' : 'Create Guild'}</button>
                    <button type="button" className="guilds-secondary-button" onClick={() => {
                      setShowCreate(false)
                      setEditingGuildId(null)
                      setForm(defaultForm)
                      if (isMobile) setShowMobileChat(false)
                    }}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : !selectedGuild ? (
              <div className="guilds-empty-state guilds-empty-state--chat">
                <div>
                  <h3>Select a guild</h3>
                  <p>Choose a guild from the list to view its conversation.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="guild-chat-header">
                  <div className="guild-chat-header__identity">
                    <span className="guild-row__avatar guild-row__avatar--large"><BriefcaseBusiness size={17} /></span>
                    <div className="guild-chat-header__copy">
                      <h2>{selectedGuild.name}</h2>
                      <p>{selectedGuild.description}</p>
                    </div>
                  </div>

                  <div className="guild-chat-header__info">
                    <span className="guild-header-count"><Users size={14} /> {selectedGuild.memberCount} members</span>
                  </div>

                  <div className="guild-chat-header__actions">
                    {accessAllowed && (
                      <div className="guild-header-tabs" role="tablist" aria-label="Guild view">
                        <button type="button" role="tab" aria-selected={!showMemberView} onClick={() => {
                          setShowMemberView(false)
                          setShowGuildDetails(false)
                        }}>Chat</button>
                        <button type="button" role="tab" aria-selected={showMemberView} onClick={() => {
                          setShowMemberView(true)
                          setShowGuildDetails(false)
                        }}><Users size={14} /> Member</button>
                      </div>
                    )}
                    <div className="guilds-menu-wrap">
                      <button type="button" className="guilds-icon-button" aria-label="Guild actions" onClick={() => setShowMenu((current) => !current)}>
                        <EllipsisVertical size={16} />
                      </button>
                      {showMenu && (
                        <div className="guilds-menu">
                          {isOwnedGuild(selectedGuild) && <button type="button" onClick={() => startEditingGuild(selectedGuild)}>Edit Guild</button>}
                          <button type="button" onClick={() => {
                            setShowGuildDetails(true)
                            setShowMemberView(false)
                            setShowMenu(false)
                          }}>View Details</button>
                          <button type="button" onClick={() => { setShowMenu(false) }}>Report</button>
                        </div>
                      )}
                    </div>
                    {isMobile && (
                      <button type="button" className="guilds-link-button" onClick={() => setShowMobileChat(false)}>
                        <ArrowLeft size={14} /> Guilds
                      </button>
                    )}
                  </div>
                </div>

                {showGuildDetails ? (
                  <section className="guilds-details-view" aria-label="Guild details">
                    <div className="guilds-details-hero">
                      <span className="guild-row__avatar guild-row__avatar--large"><BriefcaseBusiness size={20} /></span>
                      <div>
                        <span className="guilds-eyebrow">{selectedGuild.domain}</span>
                        <h3>{selectedGuild.name}</h3>
                        <p>{selectedGuild.memberCount} members · {selectedGuild.membershipType === 'open' ? 'Open to join' : 'Approval required'}</p>
                      </div>
                    </div>
                    <section className="guilds-about">
                      <h4>About</h4>
                      <p>{selectedGuild.description}</p>
                    </section>
                    <dl className="guilds-details-list">
                      <div><dt>Domain</dt><dd>{selectedGuild.domain}</dd></div>
                      <div><dt>Founder</dt><dd>{selectedGuild.owner === 'You' ? currentUserName : selectedGuild.owner}</dd></div>
                      <div><dt>Members</dt><dd>{selectedGuild.memberCount}</dd></div>
                      <div><dt>Access type</dt><dd>{selectedGuild.membershipType === 'open' ? 'Open' : 'Application required'}</dd></div>
                    </dl>
                    {isPendingApplicant ? (
                      <p className="guilds-pending-note">Your request is pending owner approval. Private guild content is not available yet.</p>
                    ) : isRejectedApplicant ? (
                      <p className="guilds-pending-note">Your request was declined. Private guild content is not available.</p>
                    ) : !isApprovedMember(selectedGuild, joinedIds) && !isOwnedGuild(selectedGuild) && (
                      <button type="button" className="guilds-primary-button guilds-join-button" onClick={() => handleJoin(selectedGuild)}>
                        {selectedGuild.membershipType === 'application' ? 'Request to Join' : 'Join Guild'}
                      </button>
                    )}
                  </section>
                ) : showMemberView ? (
                  <div className="guilds-member-panel">
                    <div className="guilds-member-heading">
                      <div>
                        <h3>Members</h3>
                        <p className="guilds-muted-copy">{selectedGuild.memberCount} people in this guild</p>
                      </div>
                      <form className="guilds-search guilds-member-search" onSubmit={handleMemberSearch} role="search">
                        <label className="guilds-search__field">
                          <Search size={14} />
                          <input
                            value={memberSearch}
                            onChange={(event) => {
                              setMemberSearch(event.target.value)
                              if (!event.target.value) setAppliedMemberSearch('')
                            }}
                            placeholder="Search founders..."
                            aria-label="Search members"
                          />
                        </label>
                        <button type="submit" className="guilds-search__submit" aria-label="Search members"><ArrowRight size={14} /></button>
                      </form>
                    </div>
                    <div className="guild-member-list">
                      {visibleMembers.length === 0 ? <p className="guilds-muted-copy">No members match your search.</p> : visibleMembers.map((member) => (
                        <div className={`guild-member-row ${member.isCurrentUser ? 'guild-member-row--current' : ''}`} key={member.id}>
                          <span className="guild-member-card__avatar">{member.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
                          <div className="guild-member-row__identity">
                            <strong>
                              {member.displayName}
                              {member.isCurrentUser && <span className="guild-member-you-badge"> (You)</span>}
                            </strong>
                            <small>{member.isCurrentUser && isOwnedGuild(selectedGuild) ? 'Owner' : member.role}</small>
                          </div>
                          {isOwnedGuild(selectedGuild) && !member.isCurrentUser && (
                            <div className="guilds-menu-wrap">
                              <button type="button" className="guilds-icon-button" aria-label={`Actions for ${member.name}`} onClick={() => setMemberMenuId((current) => current === member.id ? null : member.id)}>
                                <EllipsisVertical size={16} />
                              </button>
                              {memberMenuId === member.id && <div className="guilds-menu">
                                <button type="button" onClick={() => removeMember(selectedGuild.id, member.id)}>Remove from guild</button>
                              </div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {isOwnedGuild(selectedGuild) && (
                      <section className="guilds-applications" aria-label="Membership applications">
                        <h4>Pending applications</h4>
                        <form className="guilds-search guilds-applications__search" onSubmit={handleApplicantSearch} role="search">
                          <label className="guilds-search__field">
                            <Search size={14} />
                            <input
                              value={applicantSearch}
                              onChange={(event) => {
                                setApplicantSearch(event.target.value)
                                if (!event.target.value) setAppliedApplicantSearch('')
                              }}
                              placeholder="Search founders..."
                              aria-label="Search applicants"
                            />
                          </label>
                          <button type="submit" className="guilds-search__submit" aria-label="Search applicants"><ArrowRight size={14} /></button>
                        </form>
                        {visibleApplications.length === 0 ? (
                          <p className="guilds-muted-copy">There are no pending applications.</p>
                        ) : visibleApplications.map((application) => (
                            <div className="guilds-application" key={application.id}>
                              <span>{application.applicant}</span>
                              <div>
                                <button type="button" className="guilds-secondary-button" onClick={() => setSelectedApplicant(application)}>View Profile</button>
                                <button type="button" className="guilds-secondary-button" onClick={() => handleApplicationDecision(selectedGuild.id, application.id, 'rejected')}>Reject</button>
                                <button type="button" className="guilds-primary-button" onClick={() => handleApplicationDecision(selectedGuild.id, application.id, 'approved')}>Approve</button>
                              </div>
                            </div>
                          ))}
                      </section>
                    )}
                  </div>
                ) : accessAllowed ? (
                  <>
                    <div className="guild-chat-body" aria-live="polite" ref={messageHistoryRef}>
                      {currentMessages.length === 0 ? (
                        <div className="guild-chat-empty">
                          <h3>No messages yet</h3>
                          <p>Start the first message in this guild.</p>
                        </div>
                      ) : (
                        currentMessages.map((message) => (
                          <div key={message.id} className={`guild-message ${message.isCurrentUser ? 'guild-message--self' : ''}`}>
                            <div className="guild-message__meta">
                              <span className="guild-message__avatar">{message.avatar}</span>
                              <strong>{message.sender}</strong>
                              <span>{message.time}</span>
                            </div>
                            <div className="guild-message__bubble">{message.text}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="guild-chat-composer">
                      <input
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder="Type a message"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <button type="button" className="guilds-primary-button" onClick={handleSendMessage} disabled={!chatInput.trim()}>
                        <SendHorizonal size={15} /> Send
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="guilds-empty-state guilds-empty-state--chat">
                    <div>
                      <h3>{isPendingApplicant ? 'Pending approval' : isRejectedApplicant ? 'Application declined' : 'Access restricted'}</h3>
                      <p>{isPendingApplicant ? 'This guild is waiting for owner approval.' : isRejectedApplicant ? 'Your application was declined, so this conversation is not available.' : 'Join this guild to unlock the conversation.'}</p>
                      {!isPendingApplicant && !isRejectedApplicant && (
                        <button type="button" className="guilds-primary-button" onClick={() => handleJoin(selectedGuild)}>
                          {selectedGuild.membershipType === 'application' ? 'Request to Join' : 'Join Guild'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        )}
      </div>
      {joinDialogGuild && createPortal(
        <div className="guilds-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setJoinDialogGuildId(null)
        }}>
          <section className="guilds-join-dialog" role="dialog" aria-modal="true" aria-labelledby="guild-join-title">
            <header className="guilds-join-dialog__header">
              <div>
                <span className="guilds-eyebrow">{joinDialogGuild.membershipType === 'open' ? 'Open membership' : 'Application required'}</span>
                <h2 id="guild-join-title">{joinDialogGuild.membershipType === 'open' ? 'Join guild' : 'Request to join guild'}</h2>
              </div>
              <button type="button" className="guilds-icon-button" aria-label="Close dialog" onClick={() => setJoinDialogGuildId(null)}><X size={16} /></button>
            </header>
            <div className="guilds-join-summary">
              <span className="guild-row__avatar guild-row__avatar--large"><BriefcaseBusiness size={18} /></span>
              <div><strong>{joinDialogGuild.name}</strong><p>{joinDialogGuild.domain} · {joinDialogGuild.memberCount} members</p></div>
            </div>
            <div className="guilds-access-info">
              <strong>Access type</strong>
              <p>{joinDialogGuild.membershipType === 'open'
                ? 'Membership is granted immediately after you confirm.'
                : 'The owner will review your request. Guild chat stays private until approval.'}</p>
            </div>
            {joinDialogGuild.membershipType === 'application' && (
              <label className="guilds-field">
                <span>Message to the owner <small>(optional)</small></span>
                <textarea value={joinMessage} onChange={(event) => setJoinMessage(event.target.value)} placeholder="Introduce yourself and share why you would like to join." />
              </label>
            )}
            <div className="guilds-form__actions">
              <button type="button" className="guilds-secondary-button" onClick={() => setJoinDialogGuildId(null)}>Cancel</button>
              <button type="button" className="guilds-primary-button" onClick={confirmJoin}>
                {joinDialogGuild.membershipType === 'open' ? 'Confirm and Join' : 'Submit Request'}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
      {selectedApplicant && selectedGuild && isOwnedGuild(selectedGuild) && createPortal(
        <div className="guilds-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedApplicant(null)
        }}>
          <section className="guilds-applicant-dialog" role="dialog" aria-modal="true" aria-labelledby="guild-applicant-title">
            <header className="guilds-join-dialog__header">
              <div>
                <span className="guilds-eyebrow">Pending application</span>
                <h2 id="guild-applicant-title">Applicant profile</h2>
              </div>
              <button type="button" className="guilds-icon-button" aria-label="Close applicant profile" onClick={() => setSelectedApplicant(null)}><X size={16} /></button>
            </header>
            <div className="guilds-applicant-identity">
              <span className="guilds-applicant-avatar">
                {selectedApplicant.applicant.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <h3>{selectedApplicant.applicant}</h3>
            </div>
            {selectedApplicant.message && (
              <section className="guilds-applicant-detail">
                <h4>Application message</h4>
                <p>{selectedApplicant.message}</p>
              </section>
            )}
            {['headline', 'bio', 'skills', 'interests'].map((field) => {
              const value = selectedApplicant.profile?.[field] ?? selectedApplicant.applicantProfile?.[field] ?? selectedApplicant[field]
              if (!value || (Array.isArray(value) && value.length === 0)) return null
              return (
                <section className="guilds-applicant-detail" key={field}>
                  <h4>{field[0].toUpperCase() + field.slice(1)}</h4>
                  <p>{Array.isArray(value) ? value.join(', ') : value}</p>
                </section>
              )
            })}
            <div className="guilds-form__actions">
              <button type="button" className="guilds-secondary-button" onClick={() => setSelectedApplicant(null)}>Close</button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}
