import { useMemo, useState } from 'react'
import { ACTIONS, CURRENT_DOMAIN, USERS } from '../services/mockLeaderboard.js'

export function useLeaderboard() {
  const [period, setPeriod] = useState('weekly')
  const [scope, setScope] = useState('all')
  const [domain, setDomain] = useState('')
  const [eligibility, setEligibility] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const founders = useMemo(() => USERS
    .filter((user) => scope !== 'domain' || user.domain === CURRENT_DOMAIN)
    .filter((user) => !domain || user.domain === domain)
    .filter((user) => eligibility === 'all' || user.eligible === (eligibility === 'eligible'))
    .filter((user) => `${user.full_name} ${user.username} ${user.domain}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((first, second) => second.points[period] - first.points[period])
    .map((user, index) => ({ ...user, rank: index + 1, total_points: user.points[period] })),
  [period, scope, domain, eligibility, search])

  const domains = [...new Set(USERS.map((user) => user.domain))]
  const userStanding = founders.find((user) => user.is_current_user)
  const openAction = (action, founder = userStanding || founders[0]) => {
    if (founder) setModal({ action, founder })
  }
  const clearFilters = () => {
    setSearch('')
    setDomain('')
    setEligibility('all')
    setScope('all')
  }

  return {
    actions: ACTIONS,
    clearFilters,
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
  }
}

