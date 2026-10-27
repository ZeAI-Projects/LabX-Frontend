import { SUPPORTED_DOMAIN_OPTIONS } from '../../assessment/services/mock_assessment.js'
import { getAchievementsSnapshot } from '../../achievements/services/mock_achievements.js'

const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

// Existing numeric domain IDs also identify saved views and preview founders.
// Keep those IDs stable when assessment choices change.
const legacyDomainStyles = {
  'Artificial Intelligence & Machine Learning': ['AI & ML', '#67e8f9'],
  'Healthcare & MedTech': ['Healthcare', '#6ee7b7'],
  'Smart Education': ['Education', '#c4b5fd'],
  'Women Safety & Social Impact': ['Social Impact', '#f9a8d4'],
  'Cybersecurity': ['Cybersecurity', '#93c5fd'],
  'FinTech & Digital Economy': ['FinTech', '#fcd34d'],
  'Smart Mobility & Logistics': ['Mobility', '#fdba74'],
  'Sustainability': ['Sustainability', '#86efac'],
  'Agriculture & Food Technology': ['Agri & Food', '#bef264'],
  'Smart Cities & Infrastructure': ['Smart Cities', '#a5b4fc'],
  'Media, Entertainment & Creator Technology': ['Creator Tech', '#f0abfc'],
  'Space, Robotics & Advanced Technology': ['Space & Robotics', '#7dd3fc'],
}
const domainStyles = {
  ...legacyDomainStyles,
  'Education': ['Education', '#c4b5fd'],
  'Finance & FinTech': ['FinTech', '#fcd34d'],
  'Mobility & Logistics': ['Mobility', '#fdba74'],
  'Agriculture & FoodTech': ['Agri & Food', '#bef264'],
  'Climate & Sustainability': ['Climate', '#86efac'],
  'Media & CreatorTech': ['Creator Tech', '#f0abfc'],
  'DefenceTech': ['DefenceTech', '#93c5fd'],
  'LegalTech': ['LegalTech', '#a5b4fc'],
  'Consumer Products': ['Consumer', '#f9a8d4'],
  'Manufacturing & Industry': ['Industry', '#fdba74'],
  'Retail & Commerce': ['Commerce', '#6ee7b7'],
}
const domainNames = [
  ...Object.keys(legacyDomainStyles),
  ...SUPPORTED_DOMAIN_OPTIONS.filter((name) => !Object.hasOwn(legacyDomainStyles, name)),
]

// Filter after assigning IDs so saved domain links keep their original meaning.
const excludedDomains = new Set(['Other / Not listed', 'Not sure yet', 'Others / Not Sure Yet'])
export const LEADERBOARD_DOMAINS = freeze(domainNames.map((name, index) => ({
  id: String(index + 1),
  name,
  shortName: domainStyles[name]?.[0] ?? name,
  color: domainStyles[name]?.[1] ?? '#94a3b8',
})).filter(({ name }) => !excludedDomains.has(name)))

const normalizeText = (value) => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase()
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0
const domainById = (id) => LEADERBOARD_DOMAINS.find((domain) => domain.id === String(id)) ?? null
const domainByName = (name) => typeof name === 'string'
  ? LEADERBOARD_DOMAINS.find((domain) => normalizeText(domain.name) === normalizeText(name)) ?? null
  : null

// Fictional, fixed preview founders. These are not other accounts on this browser.
const sampleProfiles = [
  ['amara-okafor', 'Amara Okafor', 'amarao', '1', 4800, 8, 'Grow', 4, 'Making useful AI tools easier for small teams to adopt.'],
  ['rohan-patel', 'Rohan Patel', 'rohanbuilds', '2', 4600, 8, 'Grow', 3, 'Improving access to practical, everyday healthcare.'],
  ['sofia-chen', 'Sofia Chen', 'sofiasprout', '8', 4300, 7, 'Launch', 5, 'Helping communities make less waste and better use of resources.'],
  ['maya-rao', 'Maya Rao', 'mayalearns', '3', 3950, 6, 'Launch', 4, 'Building learning experiences that meet students where they are.'],
  ['zara-ali', 'Zara Ali', 'zaraconnects', '4', 3680, 6, 'Launch', 3, 'Designing safer, more connected local communities.'],
  ['noah-kim', 'Noah Kim', 'noahsecures', '5', 3420, 5, 'Launch', 2, 'Making security habits easier for growing teams.'],
  ['aarav-shah', 'Aarav Shah', 'aaravfin', '6', 3200, 5, 'Build', 5, 'Turning complex financial workflows into clearer next steps.'],
  ['priya-menon', 'Priya Menon', 'priyamoves', '7', 2960, 5, 'Build', 4, 'Finding simpler ways for goods to reach their destination.'],
  ['diego-alvarez', 'Diego Alvarez', 'diegogrows', '9', 2720, 4, 'Build', 4, 'Connecting food producers with the people they serve.'],
  ['lina-park', 'Lina Park', 'linacities', '10', 2540, 4, 'Build', 3, 'Exploring more accessible and efficient shared spaces.'],
  ['elena-garcia', 'Elena García', 'elenacreates', '11', 2380, 4, 'Build', 3, 'Helping independent creators find a sustainable rhythm.'],
  ['ishaan-mehta', 'Ishaan Mehta', 'ishaanexplores', '12', 400, 1, 'Validate', 2, 'Testing practical applications for a new robotics idea.'],
  ['theo-martin', 'Theo Martin', 'theoml', '1', 1960, 3, 'Build', 2, 'Learning where automation can save meaningful time.'],
  ['aisha-khan', 'Aisha Khan', 'aishacares', '2', 1740, 3, 'Build', 1, 'Listening to care teams before building their next tool.'],
  ['oliver-chen', 'Oliver Chen', 'oliverclass', '3', 1580, 3, 'Validate', 5, 'Testing better ways for teachers to share useful feedback.'],
  ['nia-brooks', 'Nia Brooks', 'niatogether', '4', 1420, 2, 'Validate', 4, 'Working with communities to understand their safety needs.'],
  ['leo-santos', 'Leo Santos', 'leoshields', '5', 1200, 2, 'Validate', 3, 'Exploring accessible security tools for new businesses.'],
  ['mei-tan', 'Mei Tan', 'meiledger', '6', 1000, 2, 'Validate', 2, 'Helping small businesses understand their cash flow.'],
  ['arjun-das', 'Arjun Das', 'arjunroutes', '7', 800, 2, 'Validate', 1, 'Learning from the teams behind everyday deliveries.'],
  ['yara-haddad', 'Yara Haddad', 'yarareuses', '8', 650, 1, 'Discover', 5, 'Exploring local demand for reuse and repair services.'],
  ['luca-rossi', 'Luca Rossi', 'lucaharvests', '9', 500, 1, 'Discover', 4, 'Mapping challenges faced by smaller food producers.'],
  ['anika-bose', 'Anika Bose', 'anikaspaces', '10', 450, 1, 'Discover', 3, 'Talking with residents about the places they share.'],
  ['ethan-wu', 'Ethan Wu', 'ethanstories', '11', 100, 0, 'Discover', 2, 'Finding a first problem worth solving for creators.'],
  ['samira-noor', 'Samira Noor', 'samirabuilds', '12', 0, 0, 'Discover', 1, 'Beginning a founder journey in advanced technology.'],
]

const SAMPLE_FOUNDERS = freeze(sampleProfiles.map(([id, full_name, username, domainId, total_points, badges_count, stage, level, bio], index) => {
  const domain = domainById(domainId)
  return {
    id: `sample-founder-${id}`,
    full_name,
    username,
    domain: domain.name,
    domains: [{ id: domain.id, name: domain.name }],
    stage,
    level,
    badges_count,
    total_points,
    momentum: {
      currentStreakDays: Math.max(1, 24 - index),
      activeDays: Math.max(4, 42 - index),
      completedMissions: Math.max(1, 30 - index),
      completedMilestones: Math.max(0, 9 - Math.floor(index / 3)),
      source: 'demo',
    },
    is_current_user: false,
    avatarColor: domain.color,
    bio,
  }
}))

function currentMemberships(user, projects) {
  const memberships = new Map()
  // Stable ordering picks the most recently completed/updated project in each
  // domain; ties use project id rather than the caller's array order.
  const ownProjects = (Array.isArray(projects) ? projects : [])
    .filter((project) => project?.owner_id === user.id && project.assessment_completed === true)
    .slice()
    .sort((left, right) => {
      const time = (project) => {
        const value = Date.parse(project.assessment_completed_at || project.updated_at || project.created_at || '')
        return Number.isFinite(value) ? value : 0
      }
      return time(right) - time(left) || compareText(String(left.id ?? ''), String(right.id ?? ''))
    })
  for (const project of ownProjects) {
    const workflow = project.roadmap_snapshot
    const result = workflow ? {
      ...project.assessment_result,
      stage: workflow.stages[workflow.currentStageIndex].name,
      level: workflow.currentLevel,
    } : project.assessment_result
    const domain = domainByName(result?.domain)
    if (domain && !memberships.has(domain.id)) memberships.set(domain.id, { domain, result })
  }
  if (!memberships.size && user.assessment_completed === true) {
    const domain = domainByName(user.assessment_result?.domain)
    if (domain) memberships.set(domain.id, { domain, result: user.assessment_result })
  }
  return LEADERBOARD_DOMAINS.filter((domain) => memberships.has(domain.id)).map((domain) => memberships.get(domain.id))
}

function currentFounder(user, projects, selectedDomain) {
  if (user?.role !== 'founder' || typeof user.id !== 'string' || !user.id) return null
  const memberships = currentMemberships(user, projects)
  const placement = memberships.find((entry) => entry.domain.id === selectedDomain?.id) ?? memberships[0]
  const achievements = getAchievementsSnapshot(user)
  const activityDates = [...new Set([
    ...achievements.transactions.filter((entry) => entry.status === 'Approved'),
    ...achievements.recognitionActivity,
  ].map((entry) => new Date(entry.date).toISOString().slice(0, 10)))]
  let currentStreakDays = 0
  const activeDateSet = new Set(activityDates)
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  if (!activeDateSet.has(todayKey)) today.setUTCDate(today.getUTCDate() - 1)
  while (activeDateSet.has(today.toISOString().slice(0, 10))) {
    currentStreakDays += 1
    today.setUTCDate(today.getUTCDate() - 1)
  }
  const fullName = typeof user.full_name === 'string' && user.full_name.trim() ? user.full_name.trim() : 'You'
  return {
    id: user.id,
    full_name: fullName,
    username: typeof user.username === 'string' ? user.username.trim() : '',
    domain: placement?.domain.name ?? 'Domain not set',
    domains: memberships.map(({ domain }) => ({ id: domain.id, name: domain.name })),
    stage: typeof placement?.result.stage === 'string' && placement.result.stage.trim() ? placement.result.stage.trim() : null,
    level: Number.isInteger(placement?.result.level) && placement.result.level > 0 ? placement.result.level : null,
    badges_count: achievements.earnedBadgeCount,
    total_points: achievements.pointsBalance,
    momentum: {
      currentStreakDays,
      activeDays: activityDates.length,
      completedMissions: achievements.completedQuests,
      completedMilestones: achievements.completedMilestones,
      source: achievements.isDemo ? 'demo' : 'live',
    },
    is_current_user: true,
    avatarColor: placement?.domain.color ?? '#94a3b8',
    bio: 'Your founder progress, based on approved LabX activity.',
  }
}

function rankFounders(founders) {
  const sorted = founders.slice().sort((left, right) =>
    right.total_points - left.total_points
    || compareText(normalizeText(left.full_name), normalizeText(right.full_name))
    || compareText(left.id, right.id))
  let rank = 0
  return sorted.map((founder, index) => {
    if (index === 0 || founder.total_points !== sorted[index - 1].total_points) rank = index + 1
    return { ...founder, domains: founder.domains.map((domain) => ({ ...domain })), rank }
  })
}

function rankMomentumFounders(founders) {
  const sorted = founders.slice().sort((left, right) =>
    right.momentum.currentStreakDays - left.momentum.currentStreakDays
    || right.momentum.activeDays - left.momentum.activeDays
    || right.momentum.completedMissions - left.momentum.completedMissions
    || right.momentum.completedMilestones - left.momentum.completedMilestones
    || compareText(normalizeText(left.full_name), normalizeText(right.full_name))
    || compareText(left.id, right.id))
  let rank = 0
  return sorted.map((founder, index) => {
    const current = founder.momentum
    const previous = sorted[index - 1]?.momentum
    if (index === 0 || current.currentStreakDays !== previous.currentStreakDays
      || current.activeDays !== previous.activeDays
      || current.completedMissions !== previous.completedMissions
      || current.completedMilestones !== previous.completedMilestones) rank = index + 1
    return { ...founder, rank }
  })
}

export function getLeaderboardSnapshot({
  user = null,
  projects = [],
  scope = 'global',
  domainId = '',
  search = '',
  mode = 'labx',
  filterDomainId = '',
  stage = '',
  level = '',
} = {}) {
  const selectedScope = scope === 'domain' ? 'domain' : 'global'
  const domain = selectedScope === 'domain' ? domainById(domainId) : null
  const requiresDomain = selectedScope === 'domain' && !domain
  const current = currentFounder(user, projects, domain)
  const founders = SAMPLE_FOUNDERS.filter((founder) => founder.id !== current?.id)
  if (current) founders.push(current)
  const domainBoards = new Map(LEADERBOARD_DOMAINS.map((entry) => [entry.id,
    rankFounders(founders.filter((founder) => founder.domains.some((membership) => membership.id === entry.id))),
  ]))
  const globalRankings = rankFounders(founders).map((founder) => {
    const domainRanks = founder.domains.map((membership) => ({
      ...membership,
      rank: domainBoards.get(membership.id).find((entry) => entry.id === founder.id).rank,
    }))
    const placement = domainRanks.find((entry) => entry.name === founder.domain)
    return {
      ...founder,
      global_rank: founder.rank,
      domain_rank: placement?.rank ?? null,
      domain_ranks: domainRanks,
      primary_domain: domainRanks[0] ?? null,
    }
  })
  const scopedRankings = requiresDomain ? [] : selectedScope === 'domain'
    ? rankFounders(globalRankings.filter((founder) => founder.domains.some((membership) => membership.id === domain.id)))
    : globalRankings
  const allRankings = mode === 'momentum' ? rankMomentumFounders(scopedRankings) : scopedRankings
  const query = normalizeText(search)
  const rankings = allRankings.filter((founder) => (!query || normalizeText(`${founder.full_name} @${founder.username}`).includes(query))
    && (!filterDomainId || founder.domains.some((membership) => membership.id === String(filterDomainId)))
    && (!stage || founder.stage === stage)
    && (!level || String(founder.level) === String(level)))
  const userStanding = allRankings.find((founder) => founder.is_current_user) ?? null
  const globalUserStanding = globalRankings.find((founder) => founder.is_current_user) ?? null
  const standingDomain = domain ?? globalUserStanding?.primary_domain
  const domainUserStanding = globalUserStanding && standingDomain
    ? domainBoards.get(standingDomain.id)?.find((founder) => founder.is_current_user) ?? null
    : null
  const nextPoints = userStanding
    ? allRankings.filter((founder) => founder.total_points > userStanding.total_points).at(-1)?.total_points
    : undefined
  return freeze({
    domains: LEADERBOARD_DOMAINS.map((entry) => ({ ...entry })),
    scope: selectedScope,
    domain: domain ? { ...domain } : null,
    requiresDomain,
    rankings,
    allRankings,
    podium: allRankings.slice(0, 3),
    leader: allRankings[0] ?? null,
    userStanding,
    globalUserStanding,
    domainUserStanding: domainUserStanding ? { ...globalUserStanding, rank: domainUserStanding.rank, domain_rank: domainUserStanding.rank } : null,
    totalFounders: allRankings.length,
    matchedCount: rankings.length,
    nextRankGap: nextPoints === undefined ? null : nextPoints - userStanding.total_points + 1,
    metrics: {
      totalFounders: allRankings.length,
      totalPoints: allRankings.reduce((sum, founder) => sum + founder.total_points, 0),
      totalBadges: allRankings.reduce((sum, founder) => sum + founder.badges_count, 0),
      leadingPoints: allRankings[0]?.total_points ?? 0,
    },
    momentumMetrics: {
      rankedFounders: allRankings.length,
      totalActiveDays: allRankings.reduce((sum, founder) => sum + (founder.momentum?.activeDays ?? 0), 0),
      completedMissions: allRankings.reduce((sum, founder) => sum + (founder.momentum?.completedMissions ?? 0), 0),
      leadingStreak: allRankings[0]?.momentum?.currentStreakDays ?? 0,
    },
  })
}
