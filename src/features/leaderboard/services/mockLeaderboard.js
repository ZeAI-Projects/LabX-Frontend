const emoji = (codePoint) => String.fromCodePoint(codePoint)
export const CURRENT_DOMAIN = 'Artificial Intelligence'

// Demo records keep the leaderboard usable while no backend is connected.
export const USERS = [
  { id: 'u1', full_name: 'Maya Chen', username: 'mayacreates', domain: 'Artificial Intelligence', domain_icon: emoji(0x1f9e0), eligible: true, badges_count: 8, stage: 'Stage 4', level: 'Level 12', quest: 'Build an AI co-pilot', is_current_user: true, points: { daily: 480, weekly: 2480, monthly: 8420 } },
  { id: 'u2', full_name: 'Arjun Rao', username: 'arjunbuilds', domain: 'Logistics', domain_icon: emoji(0x1f69a), eligible: true, badges_count: 6, stage: 'Stage 3', level: 'Level 10', quest: 'Map a smarter supply chain', points: { daily: 425, weekly: 2210, monthly: 7930 } },
  { id: 'u3', full_name: 'Sofia Martinez', username: 'sofia.designs', domain: 'Design', domain_icon: emoji(0x1f3a8), eligible: false, badges_count: 7, stage: 'Stage 3', level: 'Level 9', quest: 'Design an accessible journey', points: { daily: 390, weekly: 2040, monthly: 7350 } },
  { id: 'u4', full_name: 'Noah Williams', username: 'noah.codes', domain: 'Technology', domain_icon: emoji(0x1f4bb), eligible: true, badges_count: 5, stage: 'Stage 2', level: 'Level 8', quest: 'Ship your first integration', points: { daily: 360, weekly: 1890, monthly: 6920 } },
  { id: 'u5', full_name: 'Priya Nair', username: 'priyanair', domain: 'Sustainability', domain_icon: emoji(0x1f331), eligible: true, badges_count: 4, stage: 'Stage 2', level: 'Level 7', quest: 'Prototype a circular solution', points: { daily: 310, weekly: 1675, monthly: 6410 } },
  { id: 'u6', full_name: 'Leo Kim', username: 'leokim', domain: 'Artificial Intelligence', domain_icon: emoji(0x1f9e0), eligible: false, badges_count: 4, stage: 'Stage 2', level: 'Level 7', quest: 'Train a responsible model', points: { daily: 275, weekly: 1540, monthly: 5980 } },
  { id: 'u7', full_name: 'Amara Okafor', username: 'amaraokafor', domain: 'Logistics', domain_icon: emoji(0x1f69a), eligible: true, badges_count: 3, stage: 'Stage 2', level: 'Level 6', quest: 'Reduce last-mile delays', points: { daily: 240, weekly: 1430, monthly: 5525 } },
  { id: 'u8', full_name: 'Ethan Park', username: 'ethanpark', domain: 'Design', domain_icon: emoji(0x1f3a8), eligible: true, badges_count: 3, stage: 'Stage 1', level: 'Level 5', quest: 'Create a product story', points: { daily: 205, weekly: 1280, monthly: 5090 } },
  { id: 'u9', full_name: 'Zara Ahmed', username: 'zara.ahmed', domain: 'Health', domain_icon: emoji(0x1fa7a), eligible: true, badges_count: 2, stage: 'Stage 1', level: 'Level 4', quest: 'Explore a healthier habit', points: { daily: 180, weekly: 1120, monthly: 4660 } },
  { id: 'u10', full_name: 'Dev Patel', username: 'devpatel', domain: 'Education', domain_icon: emoji(0x1f4da), eligible: false, badges_count: 2, stage: 'Stage 1', level: 'Level 3', quest: 'Make learning more engaging', points: { daily: 150, weekly: 980, monthly: 4210 } },
]

export const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

export const ACTIONS = [
  { id: 'badge', label: 'View Badge' },
  { id: 'history', label: 'View Points History' },
  { id: 'leaderboard', label: 'View Leaderboard' },
  { id: 'quest', label: 'Open Related Quest' },
]

export function getDomainIcon(domain) {
  return USERS.find((user) => user.domain === domain)?.domain_icon ?? '•'
}
