const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

// Illustrative recognition criteria and approved activity for the built-in demo only.
// Assessment placement never creates points, quests, milestones, or badges.
const BADGES = freeze([
  { id: 'first-quest', name: 'First Steps', icon: 'flag', description: 'A first approved quest on your founder journey.', criteria: 'Complete 1 approved quest.', metric: 'quests', target: 1 },
  { id: 'quest-explorer', name: 'Quest Explorer', icon: 'compass', description: 'Keep learning by turning ideas into completed work.', criteria: 'Complete 3 approved quests.', metric: 'quests', target: 3 },
  { id: 'milestone-maker', name: 'Milestone Maker', icon: 'mountain', description: 'Celebrate reaching a meaningful milestone.', criteria: 'Complete 1 milestone.', metric: 'milestones', target: 1 },
  { id: 'quest-momentum', name: 'Quest Momentum', icon: 'zap', description: 'Build momentum through consistent progress.', criteria: 'Complete 5 approved quests.', metric: 'quests', target: 5 },
  { id: 'pathfinder', name: 'Pathfinder', icon: 'route', description: 'Turn a series of milestones into a path forward.', criteria: 'Complete 3 milestones.', metric: 'milestones', target: 3 },
  { id: 'quest-champion', name: 'Quest Champion', icon: 'trophy', description: 'Grow your collection with more approved quests.', criteria: 'Complete 10 approved quests.', metric: 'quests', target: 10 },
])

const DEMO_TRANSACTIONS = freeze([
  { id: 'DEMO-001', date: '2026-10-05T10:00:00Z', type: 'Quest approval', activity: 'Define your problem', metric: 'quests', amount: 100, status: 'Approved' },
  { id: 'DEMO-002', date: '2026-10-08T11:00:00Z', type: 'Quest approval', activity: 'Explore your audience', metric: 'quests', amount: 100, status: 'Approved' },
  { id: 'DEMO-003', date: '2026-10-10T09:30:00Z', type: 'Quest approval', activity: 'Write your value proposition', metric: 'quests', amount: 100, status: 'Approved' },
  { id: 'DEMO-004', date: '2026-10-11T12:00:00Z', type: 'Milestone completion', activity: 'Problem discovery', metric: 'milestones', amount: 150, status: 'Approved' },
  { id: 'DEMO-005', date: '2026-10-12T10:00:00Z', type: 'Quest submission', activity: 'Plan customer interviews', metric: 'quests', amount: 100, status: 'Pending' },
])

function transactionsFor(user) {
  return user?.id === 'demo-founder' && user?.role !== 'mentor' ? DEMO_TRANSACTIONS : []
}

export function getMockPointsBalance(user) {
  return transactionsFor(user).reduce((balance, entry) => balance + (entry.status === 'Approved' ? entry.amount : 0), 0)
}

export function getAchievementsSnapshot(user) {
  const transactions = transactionsFor(user)
  const approved = transactions.filter((entry) => entry.status === 'Approved')
  const quests = approved.filter((entry) => entry.metric === 'quests')
  const milestones = approved.filter((entry) => entry.metric === 'milestones')
  const badges = BADGES.map((badge) => {
    const activities = badge.metric === 'quests' ? quests : milestones
    const isEarned = activities.length >= badge.target
    return {
      ...badge,
      isEarned,
      earnedAt: isEarned ? activities[badge.target - 1].date : null,
      current: Math.min(activities.length, badge.target),
      progress: Math.min(100, Math.round(activities.length / badge.target * 100)),
    }
  })
  const nextAchievement = badges.filter((badge) => !badge.isEarned).sort((a, b) => b.progress - a.progress || a.target - b.target)[0] ?? null
  const pointsBalance = getMockPointsBalance(user)
  return freeze({
    isDemo: transactions.length > 0,
    pointsBalance,
    approvedPoints: pointsBalance,
    earnedBadgeCount: badges.filter((badge) => badge.isEarned).length,
    completedQuests: quests.length,
    completedMilestones: milestones.length,
    questProgress: { completed: quests.length, target: 10 },
    milestoneProgress: { completed: milestones.length, target: 3 },
    badges,
    transactions: [...transactions].reverse(),
    nextAchievement,
  })
}
