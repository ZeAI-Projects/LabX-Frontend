export const dashboardSeed = {
  founder: 'Aarav Sharma', domain: 'Clean Energy', stage: 'Validate', level: 2,
  milestone: 'Validate the Problem', completed: 3, total: 5, points: 1280,
  guild: 'Climate Builders', members: 24, online: 8, streak: 6,
  stages: [
    { name: 'Discover', state: 'done', detail: 'Find a problem worth solving' },
    { name: 'Validate', state: 'current', detail: 'Test your assumptions' },
    { name: 'Build', state: 'locked', detail: 'Create your first solution' },
    { name: 'Launch', state: 'locked', detail: 'Reach your first customers' },
    { name: 'Scale', state: 'locked', detail: 'Grow your impact' },
  ],
  quests: [
    { title: 'Interview 5 potential customers', description: 'Talk to people who experience the problem and capture what you learn.', reward: 120, done: false },
    { title: 'Map the existing solutions', description: 'Compare alternatives and identify where they fall short.', reward: 80, done: false },
    { title: 'Write your problem statement', description: 'Summarize who has the problem, what it is, and why it matters.', reward: 100, done: true },
  ],
  achievements: [
    { icon: '✦', title: 'First Steps', detail: 'Completed your first quest', color: 'gold' },
    { icon: '⚡', title: 'On a Roll', detail: 'Built a 3 day streak', color: 'cyan' },
    { icon: '◈', title: 'Community Builder', detail: 'Joined your domain guild', color: 'purple' },
  ],
  events: [
    { date: '2026-10-19', time: '4:00 PM', title: 'Founder feedback circle', detail: 'Bring one challenge and get peer feedback.' },
    { date: '2026-10-23', time: '11:30 AM', title: 'Customer discovery workshop', detail: 'Practice interview techniques with a mentor.' },
  ],
};

const STORAGE_KEY = 'labx-dashboard-demo-v1';
export function loadDashboard() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.quests?.length) return saved;
  } catch { /* use the seed when storage is unavailable */ }
  return dashboardSeed;
}
export function saveDashboard(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* keep the session working in memory */ }
}
