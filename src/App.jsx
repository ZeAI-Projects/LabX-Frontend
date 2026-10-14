import { AuthContext } from '../Sample FE/frontend/src/contexts/auth-context';
import { api } from '../Sample FE/frontend/src/services/api';
import { Sidebar } from '../Sample FE/frontend/src/components/common/Sidebar';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import DemoDestination from './features/dashboard/pages/DemoDestination';
import '../Sample FE/frontend/src/index.css';
import '../Sample FE/frontend/src/pages/FounderWorlds.css';

// The standalone preview uses the same response shapes as the sample backend,
// while keeping the dashboard available without signing in or running an API.
const demoProgress = {
  profile: { domains: { name: 'Clean Energy' }, guilds: { name: 'Climate Builders' } },
  current_stage: { name: 'Validate' }, current_level: { level_order: 2 },
  current_milestone: { id: 'demo-milestone', name: 'Validate the Problem' },
  milestone_progress_percentage: 60, core_quests_completed: 3, core_quests_total: 5,
  overall_progress_percentage: 42, total_points: 1280,
  next_quest: { title: 'Interview 5 potential customers', description: 'Talk to people who experience the problem and capture what you learn.' },
};

api.getProgress = async () => ({ data: demoProgress });
api.getRoadmap = async () => ({ data: {
  domain: { name: 'Clean Energy' },
  stages: [
    { name: 'Discover', slug: 'discover', is_completed: true, levels: [{}, {}] },
    { name: 'Validate', slug: 'validate', is_completed: false, levels: [{}, {}] },
    { name: 'Build', slug: 'build', is_completed: false, levels: [{}, {}] },
    { name: 'Launch', slug: 'launch', is_completed: false, levels: [{}, {}] },
    { name: 'Scale', slug: 'scale', is_completed: false, levels: [{}, {}] },
  ],
} });
api.getAchievements = async () => ({ data: [
  { name: 'First Quest Completed', description: 'You completed your first quest.', is_earned: true },
  { name: 'First Milestone Completed', description: 'You reached your first milestone.', is_earned: true },
  { name: 'Community Builder', description: 'You joined your domain guild.', is_earned: true },
] });
api.getAnnouncements = async () => ({ data: [
  { id: 1, type: 'event', event_date: '2026-10-19T00:00:00', event_time: '4:00 PM', title: 'Founder feedback circle', description: 'Bring one challenge and get peer feedback.' },
  { id: 2, type: 'event', event_date: '2026-10-23T00:00:00', event_time: '11:30 AM', title: 'Customer discovery workshop', description: 'Practice interviews with a mentor.' },
] });
api.getMyGuild = async () => ({ data: { name: 'Climate Builders', member_count: 24, online_count: 8, posts_today: 12 } });

const demoUser = { id: 'demo-founder', role: 'founder', full_name: 'Aarav Sharma', assessment_completed: true };
const authValue = {
  user: demoUser, token: null, loading: false, isAuthenticated: true, isFounder: true,
  isAdmin: false, assessmentCompleted: true, login: async () => {}, register: async () => {},
  logout: () => {}, refreshUser: async () => {}, updateUserState: () => {},
};

export default function App() {
  return <AuthContext.Provider value={authValue}>
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/roadmap" element={<DemoDestination />} />
            <Route path="/roadmap/milestones/:milestoneId" element={<DemoDestination />} />
            <Route path="/leaderboard" element={<DemoDestination />} />
            <Route path="/guild" element={<DemoDestination />} />
            <Route path="/social" element={<DemoDestination />} />
            <Route path="/events" element={<DemoDestination />} />
            <Route path="/achievements" element={<DemoDestination />} />
            <Route path="/profile" element={<DemoDestination />} />
            <Route path="/notifications" element={<DemoDestination />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  </AuthContext.Provider>;
}
