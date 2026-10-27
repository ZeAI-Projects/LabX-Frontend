import assert from 'node:assert/strict'
import test from 'node:test'
import { DOMAIN_OPTIONS, SUPPORTED_DOMAIN_OPTIONS } from '../src/features/assessment/services/mock_assessment.js'
import { getAchievementsSnapshot } from '../src/features/achievements/services/mock_achievements.js'
import { getLeaderboardSnapshot, LEADERBOARD_DOMAINS } from '../src/features/leaderboard/services/mock_leaderboard.js'

const LEGACY_DOMAIN_OPTIONS = LEADERBOARD_DOMAINS.slice(0, 12).map(domain => domain.name)

const demoUser = { id: 'demo-founder', role: 'founder', full_name: 'Founder', username: 'founder', total_points: 999999, badges_count: 99 }
const newUser = { id: 'new-founder', role: 'founder', full_name: 'New Founder', username: 'newfounder', total_points: 999999 }
const project = (owner, domainIndex, overrides = {}) => ({
  id: `project-${domainIndex}`,
  owner_id: owner.id,
  assessment_completed: true,
  updated_at: '2026-10-20T10:00:00Z',
  assessment_result: { domain: LEGACY_DOMAIN_OPTIONS[domainIndex], stage: 'Launch', level: 5 },
  ...overrides,
})

test('leaderboard supports the new problem areas and preserves legacy domain ids', () => {
  const excluded = ['Other / Not listed', 'Not sure yet']
  const eligible = SUPPORTED_DOMAIN_OPTIONS.filter(name => !excluded.includes(name))
  assert.equal(LEADERBOARD_DOMAINS.length, eligible.length)
  assert.deepEqual(new Set(LEADERBOARD_DOMAINS.map((domain) => domain.name)), new Set(eligible))
  assert.ok(DOMAIN_OPTIONS.filter(name => !excluded.includes(name)).every(name => LEADERBOARD_DOMAINS.some(domain => domain.name === name)))
  const previousNames = [...LEGACY_DOMAIN_OPTIONS, ...SUPPORTED_DOMAIN_OPTIONS.filter(name => !LEGACY_DOMAIN_OPTIONS.includes(name))]
  assert.ok(LEADERBOARD_DOMAINS.every(domain => domain.id === String(previousNames.indexOf(domain.name) + 1)))
  assert.ok(LEADERBOARD_DOMAINS.every((domain) => domain.shortName && /^#[a-f0-9]{6}$/i.test(domain.color)))
})

test('placeholder assessments keep a global rank without creating a domain category or rank', () => {
  for (const domain of ['Other / Not listed', 'Not sure yet', 'Others / Not Sure Yet']) {
    const user = { ...newUser, assessment_completed: true, assessment_result: { domain, stage: 'Build', level: 2 } }
    const snapshot = getLeaderboardSnapshot({ user })
    assert.ok(snapshot.userStanding.global_rank > 0)
    assert.equal(snapshot.userStanding.domain_rank, null)
    assert.equal(snapshot.domainUserStanding, null)
    assert.deepEqual(snapshot.userStanding.domain_ranks, [])
    assert.equal(snapshot.domains.some(entry => entry.name === domain), false)
  }
})

test('global and domain ranks stay consistent across scopes, ties, multiple projects and search', () => {
  const projects = [project(demoUser, 9), project(demoUser, 11)]
  const global = getLeaderboardSnapshot({ user: demoUser, projects })
  assert.equal(global.userStanding.global_rank, global.userStanding.rank)
  assert.equal(global.userStanding.domain_rank, 2, '450 points ties Anika in Smart Cities')
  assert.deepEqual(global.userStanding.domain_ranks.map(({ id, rank }) => [id, rank]), [['10', 2], ['12', 1]])
  assert.equal(global.userStanding.primary_domain.id, '10')
  assert.equal(global.domainUserStanding.rank, 2)
  for (const domainId of ['10', '12']) {
    const scoped = getLeaderboardSnapshot({ user: demoUser, projects, scope: 'domain', domainId, search: demoUser.full_name })
    const expected = global.userStanding.domain_ranks.find(entry => entry.id === domainId).rank
    assert.equal(scoped.userStanding.rank, expected)
    assert.equal(scoped.userStanding.domain_rank, expected)
    assert.equal(scoped.userStanding.global_rank, global.userStanding.rank)
    assert.equal(scoped.globalUserStanding.rank, global.userStanding.rank)
    assert.equal(scoped.domainUserStanding.rank, expected)
    assert.deepEqual(scoped.userStanding.domain_ranks, global.userStanding.domain_ranks)
  }
  const unjoined = getLeaderboardSnapshot({ user: demoUser, projects, scope: 'domain', domainId: '2' })
  assert.equal(unjoined.userStanding, null)
  assert.equal(unjoined.domainUserStanding, null)
  assert.equal(unjoined.globalUserStanding.rank, global.userStanding.rank)
})

test('scope metrics aggregate approved points and badges once per founder and survive name filtering', () => {
  const projects = [project(demoUser, 11), project(demoUser, 11, { id: 'another-project' })]
  const options = { user: demoUser, projects, scope: 'domain', domainId: '12' }
  const domain = getLeaderboardSnapshot(options)
  assert.deepEqual(domain.metrics, { totalFounders: 3, totalPoints: 850, totalBadges: 4, leadingPoints: 450 })
  assert.deepEqual(getLeaderboardSnapshot({ ...options, search: 'Samira' }).metrics, domain.metrics)
  const global = getLeaderboardSnapshot({ user: demoUser, projects })
  assert.equal(global.metrics.totalFounders, 25)
  assert.equal(global.metrics.totalPoints, global.allRankings.reduce((sum, founder) => sum + founder.total_points, 0))
  assert.equal(global.metrics.totalBadges, global.allRankings.reduce((sum, founder) => sum + founder.badges_count, 0))
  assert.equal(global.metrics.leadingPoints, 4800)
  const emptyDomain = LEADERBOARD_DOMAINS.find(entry => entry.name === 'LegalTech')
  assert.deepEqual(getLeaderboardSnapshot({ scope: 'domain', domainId: emptyDomain.id }).metrics,
    { totalFounders: 0, totalPoints: 0, totalBadges: 0, leadingPoints: 0 })
})

test('new problem areas accept current founders without fabricating other members', () => {
  const legal = LEADERBOARD_DOMAINS.find(domain => domain.name === 'LegalTech')
  const empty = getLeaderboardSnapshot({ scope: 'domain', domainId: legal.id })
  assert.equal(empty.totalFounders, 0)
  assert.equal(empty.leader, null)
  const completed = project(newUser, 0, { assessment_result: { domain: 'LegalTech', stage: 'Launch', level: 5 } })
  const scoped = getLeaderboardSnapshot({ user: newUser, projects: [completed], scope: 'domain', domainId: legal.id })
  assert.equal(scoped.totalFounders, 1)
  assert.equal(scoped.userStanding.id, newUser.id)
  assert.equal(scoped.userStanding.domain, 'LegalTech')
})

test('global founders sort by approved points and the podium follows their ranks', () => {
  const snapshot = getLeaderboardSnapshot()
  assert.equal(snapshot.totalFounders, 24)
  assert.equal(snapshot.leader.full_name, 'Amara Okafor')
  assert.equal(snapshot.leader.total_points, 4800)
  assert.deepEqual(snapshot.podium.map(({ full_name, rank }) => [full_name, rank]), [
    ['Amara Okafor', 1], ['Rohan Patel', 2], ['Sofia Chen', 3],
  ])
  assert.ok(snapshot.allRankings.every((founder, index, rows) => index === 0 || rows[index - 1].total_points >= founder.total_points))
  assert.equal(new Set(snapshot.allRankings.map((founder) => founder.id)).size, 24)
  assert.equal(snapshot.userStanding, null)
  assert.equal(snapshot.nextRankGap, null)
})

test('Pulse ranks founders by momentum and keeps filter matches at their original ranks', () => {
  const pulse = getLeaderboardSnapshot({ mode: 'momentum' })
  assert.equal(pulse.totalFounders, 24)
  assert.deepEqual(pulse.podium.map(({ full_name, rank }) => [full_name, rank]), [
    ['Amara Okafor', 1], ['Rohan Patel', 2], ['Sofia Chen', 3],
  ])
  assert.deepEqual(pulse.podium.map(({ id, rank, momentum }) => [id, rank, momentum]),
    pulse.allRankings.slice(0, 3).map(({ id, rank, momentum }) => [id, rank, momentum]))
  assert.ok(pulse.allRankings.every((founder) => founder.momentum?.source === 'demo'))
  assert.equal(pulse.momentumMetrics.rankedFounders, pulse.totalFounders)

  const filtered = getLeaderboardSnapshot({ mode: 'momentum', stage: 'Build' })
  assert.ok(filtered.rankings.length > 0)
  assert.ok(filtered.rankings.every((founder) => founder.stage === 'Build'))
  assert.deepEqual(filtered.allRankings, pulse.allRankings)
  assert.equal(filtered.matchedCount, filtered.rankings.length)
})

test('Pulse includes a founder without activity and keeps their ranked position', () => {
  const user = { id: 'pulse-founder', role: 'founder', full_name: 'Pulse Founder', username: 'pulsefounder' }
  const projectForDomain = project(user, 0)
  const global = getLeaderboardSnapshot({ user, mode: 'momentum' })
  const domain = getLeaderboardSnapshot({ user, projects: [projectForDomain], scope: 'domain', domainId: '1', mode: 'momentum' })

  assert.equal(global.userStanding.momentum.currentStreakDays, 0)
  assert.equal(global.userStanding.momentum.activeDays, 0)
  assert.ok(global.userStanding.rank > 0)
  assert.equal(domain.userStanding.id, user.id)
  assert.equal(domain.userStanding.momentum.activeDays, 0)
  assert.ok(domain.userStanding.rank > 0)
})

test('each explicitly selected domain has its own leader and reranks members within that scope', () => {
  for (const domain of LEADERBOARD_DOMAINS.slice(0, 12)) {
    const snapshot = getLeaderboardSnapshot({ scope: 'domain', domainId: domain.id })
    assert.equal(snapshot.requiresDomain, false)
    assert.equal(snapshot.totalFounders, 2)
    assert.equal(snapshot.domain.name, domain.name)
    assert.equal(snapshot.leader.rank, 1)
    assert.deepEqual(snapshot.allRankings.map((founder) => founder.rank), [1, 2])
    assert.ok(snapshot.allRankings.every((founder) => founder.domains.some((entry) => entry.id === domain.id)))
  }
  assert.equal(getLeaderboardSnapshot({ scope: 'domain', domainId: '2' }).leader.full_name, 'Rohan Patel')
  assert.equal(getLeaderboardSnapshot({ scope: 'domain', domainId: '8' }).leader.full_name, 'Sofia Chen')
})

test('blank or unknown domain selections remain empty and global ignores stale domain selections', () => {
  for (const domainId of ['', 'unknown', '0', '999']) {
    const snapshot = getLeaderboardSnapshot({ user: demoUser, projects: [project(demoUser, 0)], scope: 'domain', domainId })
    assert.equal(snapshot.requiresDomain, true)
    assert.equal(snapshot.domain, null)
    assert.deepEqual(snapshot.rankings, [])
    assert.deepEqual(snapshot.podium, [])
    assert.equal(snapshot.leader, null)
    assert.equal(snapshot.userStanding, null)
    assert.equal(snapshot.totalFounders, 0)
    assert.equal(snapshot.nextRankGap, null)
  }
  assert.equal(getLeaderboardSnapshot({ scope: 'global', domainId: '2' }).totalFounders, 24)
})

test('search trims and folds case, whitespace, and accents without promoting results or changing the podium', () => {
  const before = getLeaderboardSnapshot({ user: demoUser })
  const searched = getLeaderboardSnapshot({ user: demoUser, search: '  ELENA   garcia  ' })
  assert.equal(searched.matchedCount, 1)
  assert.equal(searched.rankings[0].full_name, 'Elena García')
  assert.equal(searched.rankings[0].rank, before.allRankings.find((founder) => founder.full_name === 'Elena García').rank)
  assert.ok(searched.rankings[0].rank > 3)
  assert.deepEqual(searched.podium, before.podium)
  assert.deepEqual(searched.leader, before.leader)
  assert.deepEqual(searched.userStanding, before.userStanding)
  assert.equal(searched.totalFounders, before.totalFounders)
  assert.equal(getLeaderboardSnapshot({ search: '@ELENACREATES' }).matchedCount, 1)
  assert.equal(getLeaderboardSnapshot({ search: '   ' }).matchedCount, 24)
})

test('an empty search result retains the selected scope, original ranks, and leader', () => {
  const before = getLeaderboardSnapshot({ scope: 'domain', domainId: '2' })
  const snapshot = getLeaderboardSnapshot({ scope: 'domain', domainId: '2', search: 'no-such-founder' })
  assert.deepEqual(snapshot.rankings, [])
  assert.equal(snapshot.matchedCount, 0)
  assert.equal(snapshot.totalFounders, 2)
  assert.deepEqual(snapshot.podium, before.podium)
  assert.deepEqual(snapshot.leader, before.leader)
  assert.equal(snapshot.requiresDomain, false)
})

test('demo points and badges match achievements and ignore inflated profile values', () => {
  const snapshot = getLeaderboardSnapshot({ user: demoUser })
  const achievements = getAchievementsSnapshot(demoUser)
  assert.equal(snapshot.totalFounders, 25)
  assert.equal(snapshot.userStanding.total_points, 450)
  assert.equal(snapshot.userStanding.total_points, achievements.pointsBalance)
  assert.equal(snapshot.userStanding.badges_count, 3)
  assert.equal(snapshot.userStanding.badges_count, achievements.earnedBadgeCount)
  assert.equal(snapshot.userStanding.domain, 'Domain not set')
  assert.equal(snapshot.userStanding.stage, null)
  assert.equal(snapshot.userStanding.level, null)
  assert.deepEqual(snapshot.userStanding.domains, [])
  assert.equal(snapshot.nextRankGap, 51, '450 points needs 51 to exceed the next distinct 500-point score')
  const tied = snapshot.allRankings.filter((founder) => founder.total_points === 450)
  assert.equal(tied.length, 2)
  assert.equal(tied[0].rank, tied[1].rank)
  const tieEnd = snapshot.allRankings.findIndex(founder => founder.id === tied[1].id)
  assert.equal(snapshot.allRankings[tieEnd + 1].rank, tied[0].rank + 2, 'The next rank accounts for both tied founders')
})

test('new founders receive no points or badges from completed assessments or projects', () => {
  const snapshot = getLeaderboardSnapshot({ user: newUser, projects: [project(newUser, 1)] })
  assert.equal(snapshot.userStanding.total_points, 0)
  assert.equal(snapshot.userStanding.badges_count, 0)
  assert.equal(snapshot.userStanding.stage, 'Launch')
  assert.equal(snapshot.userStanding.level, 5)
  assert.equal(snapshot.nextRankGap, 101)
  assert.equal(snapshot.userStanding.rank, snapshot.allRankings.find((founder) => founder.full_name === 'Samira Noor').rank)
})

test('current founder domain memberships deduplicate own completed projects without duplicating global ranks', () => {
  const projects = [
    project(demoUser, 1),
    project(demoUser, 1, { id: 'duplicate-domain' }),
    project(demoUser, 7),
    project({ id: 'other-founder' }, 0),
    project(demoUser, 2, { assessment_completed: false }),
    project(demoUser, 3, { assessment_result: null }),
    project(demoUser, 4, { assessment_result: { domain: 'Not a real domain', stage: 'Grow', level: 99 } }),
  ]
  const global = getLeaderboardSnapshot({ user: demoUser, projects })
  assert.equal(global.allRankings.filter((founder) => founder.is_current_user).length, 1)
  assert.deepEqual(global.userStanding.domains.map((domain) => domain.id), ['2', '8'])
  assert.equal(global.userStanding.domain, LEGACY_DOMAIN_OPTIONS[1])
  for (const domainId of ['2', '8']) {
    const scoped = getLeaderboardSnapshot({ user: demoUser, projects, scope: 'domain', domainId })
    assert.equal(scoped.totalFounders, 3)
    assert.equal(scoped.userStanding.domain, LEGACY_DOMAIN_OPTIONS[Number(domainId) - 1])
  }
  for (const domainId of ['1', '3', '4', '5']) {
    assert.equal(getLeaderboardSnapshot({ user: demoUser, projects, scope: 'domain', domainId }).userStanding, null)
  }
})

test('the most recent valid own placement is selected without depending on project array order', () => {
  const old = project(newUser, 1, { id: 'old', updated_at: '2026-10-19T10:00:00Z', assessment_result: { domain: LEGACY_DOMAIN_OPTIONS[1], stage: 'Validate', level: 2 } })
  const recent = project(newUser, 1, { id: 'new', updated_at: '2026-10-20T10:00:00Z' })
  const first = getLeaderboardSnapshot({ user: newUser, projects: [old, recent] })
  const second = getLeaderboardSnapshot({ user: newUser, projects: [recent, old] })
  assert.equal(first.userStanding.stage, 'Launch')
  assert.deepEqual(first.userStanding, second.userStanding)
})

test('legacy completed assessment is a fallback and cannot override valid project memberships', () => {
  const user = { ...newUser, assessment_completed: true, assessment_result: { domain: LEGACY_DOMAIN_OPTIONS[4], stage: 'Build', level: 3 } }
  const legacy = getLeaderboardSnapshot({ user })
  assert.deepEqual(legacy.userStanding.domains.map((domain) => domain.id), ['5'])
  assert.equal(legacy.userStanding.stage, 'Build')
  const current = getLeaderboardSnapshot({ user, projects: [project(user, 1)] })
  assert.deepEqual(current.userStanding.domains.map((domain) => domain.id), ['2'])
  assert.equal(getLeaderboardSnapshot({ user: { ...user, assessment_completed: false } }).userStanding.level, null)
})

test('the current founder can lead a selected domain and then has no next-rank gap', () => {
  const snapshot = getLeaderboardSnapshot({ user: demoUser, projects: [project(demoUser, 11)], scope: 'domain', domainId: '12' })
  assert.equal(snapshot.leader.id, demoUser.id)
  assert.equal(snapshot.userStanding.rank, 1)
  assert.equal(snapshot.nextRankGap, null)
})

test('nonfounders and missing users are not inserted or attributed another account progress', () => {
  for (const user of [null, { ...demoUser, role: 'mentor' }, { ...demoUser, role: 'investor' }, { ...demoUser, role: undefined }, { role: 'founder' }]) {
    const snapshot = getLeaderboardSnapshot({ user, projects: [project(demoUser, 0)] })
    assert.equal(snapshot.totalFounders, 24)
    assert.equal(snapshot.userStanding, null)
    assert.ok(snapshot.allRankings.every((founder) => !founder.is_current_user))
  }
  const snapshot = getLeaderboardSnapshot({ user: newUser, projects: [project(demoUser, 0)] })
  assert.deepEqual(snapshot.userStanding.domains, [])
  assert.equal(snapshot.userStanding.stage, null)
})

test('matching sample ids cannot duplicate the current account and rank tie ordering is deterministic', () => {
  const user = { ...newUser, id: 'sample-founder-samira-noor', full_name: 'Samira Noor' }
  const first = getLeaderboardSnapshot({ user })
  const second = getLeaderboardSnapshot({ user })
  assert.equal(first.totalFounders, 24)
  assert.equal(first.allRankings.filter((founder) => founder.id === user.id).length, 1)
  assert.deepEqual(first.allRankings, second.allRankings)
})

test('snapshots are deeply immutable and neither mutate nor retain caller data', () => {
  const user = { ...newUser }
  const projects = [project(user, 1)]
  const original = JSON.stringify({ user, projects })
  const snapshot = getLeaderboardSnapshot({ user, projects })
  assert.equal(JSON.stringify({ user, projects }), original)
  assert.throws(() => { snapshot.rankings.pop() }, TypeError)
  assert.throws(() => { snapshot.userStanding.total_points = 99 }, TypeError)
  assert.throws(() => { snapshot.userStanding.domains[0].name = 'Changed' }, TypeError)
  assert.throws(() => { snapshot.userStanding.domain_ranks[0].rank = 99 }, TypeError)
  assert.throws(() => { snapshot.metrics.totalPoints = 99 }, TypeError)
  assert.throws(() => { snapshot.domains[0].color = 'red' }, TypeError)
  assert.throws(() => { LEADERBOARD_DOMAINS[0].id = 'changed' }, TypeError)
  user.full_name = 'Updated Name'
  projects[0].assessment_result.stage = 'Grow'
  assert.equal(snapshot.userStanding.full_name, 'New Founder')
  assert.equal(snapshot.userStanding.stage, 'Launch')
  assert.equal(getLeaderboardSnapshot({ user: newUser }).userStanding.stage, null)
})
