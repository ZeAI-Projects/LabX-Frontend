import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { Sidebar } from './components/common/Sidebar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CipherScreen } from './components/common/CipherScreen';

import './pages/FounderWorlds.css';

const lazyNamed = (loader, exportName) => React.lazy(() =>
  loader().then((module) => ({ default: module[exportName] }))
);

const Login = lazyNamed(() => import('./components/auth/Login'), 'Login');
const Register = lazyNamed(() => import('./components/auth/Register'), 'Register');
const IntroVideo = lazyNamed(() => import('./components/auth/IntroVideo'), 'IntroVideo');
const AssessmentWizard = lazyNamed(() => import('./components/assessment/AssessmentWizard'), 'AssessmentWizard');
const AssessmentResult = lazyNamed(() => import('./components/assessment/AssessmentResult'), 'AssessmentResult');
const DashboardPage = lazyNamed(() => import('./pages/DashboardPage'), 'DashboardPage');
const RoadmapPage = lazyNamed(() => import('./pages/RoadmapPage'), 'RoadmapPage');
const MilestoneQuestPage = lazyNamed(() => import('./pages/MilestoneQuestPage'), 'MilestoneQuestPage');
const LeaderboardPage = lazyNamed(() => import('./pages/LeaderboardPage'), 'LeaderboardPage');
const GuildPage = lazyNamed(() => import('./pages/GuildPage'), 'GuildPage');
const SocialPage = lazyNamed(() => import('./pages/SocialPage'), 'SocialPage');
const EventsPage = lazyNamed(() => import('./pages/EventsPage'), 'EventsPage');
const AchievementsPage = lazyNamed(() => import('./pages/AchievementsPage'), 'AchievementsPage');
const NotificationsPage = lazyNamed(() => import('./pages/NotificationsPage'), 'NotificationsPage');
const ProfilePage = lazyNamed(() => import('./pages/ProfilePage'), 'ProfilePage');
const AdminDashboardPage = lazyNamed(() => import('./pages/AdminDashboardPage'), 'AdminDashboardPage');
const AdminVerificationPage = lazyNamed(() => import('./pages/AdminVerificationPage'), 'AdminVerificationPage');
const AdminQuestsPage = lazyNamed(() => import('./pages/AdminQuestsPage'), 'AdminQuestsPage');
const AdminRoadmapPage = lazyNamed(() => import('./pages/AdminRoadmapPage'), 'AdminRoadmapPage');
const AdminFoundersPage = lazyNamed(() => import('./pages/AdminFoundersPage'), 'AdminFoundersPage');
const AdminEventsPage = lazyNamed(() => import('./pages/AdminEventsPage'), 'AdminEventsPage');

const RouteFallback = () => (
  <div className="route-fallback" role="status" aria-label="Loading page">
    <div className="spinner" />
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, loading, isAuthenticated, assessmentCompleted } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Founder assessment check
  if (user?.role === 'founder' && !assessmentCompleted && location.pathname !== '/assessment') {
    return <Navigate to="/assessment" replace />;
  }

  // Admin access check
  if (roleRequired && user?.role !== roleRequired) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

// Layout Shell with Sidebar
const AppShell = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const isFullscreenRoute =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/assessment' ||
    location.pathname.startsWith('/assessment');

  if (!isAuthenticated || isFullscreenRoute) return children;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

const DefaultRedirect = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/register" replace />;
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

export function App() {
  const [assessmentResult, setAssessmentResult] = React.useState(null);

  return (
    <AuthProvider>
      <Router>
        <ErrorBoundary>
          <AppShell>
            <React.Suspense fallback={<RouteFallback />}>
              <CipherScreen><Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<IntroVideo />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Founder Assessment */}
            <Route
              path="/assessment"
              element={
                <ProtectedRoute roleRequired="founder">
                  {assessmentResult ? (
                    <AssessmentResult result={assessmentResult} />
                  ) : (
                    <AssessmentWizard onComplete={(res) => setAssessmentResult(res)} />
                  ) }
                </ProtectedRoute>
              }
            />

            {/* Founder Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roleRequired="founder">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roadmap"
              element={
                <ProtectedRoute roleRequired="founder">
                  <RoadmapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute roleRequired="founder">
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roadmap/milestones/:milestoneId"
              element={
                <ProtectedRoute roleRequired="founder">
                  <MilestoneQuestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guild"
              element={
                <ProtectedRoute roleRequired="founder">
                  <GuildPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social"
              element={
                <ProtectedRoute roleRequired="founder">
                  <SocialPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute roleRequired="founder">
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute roleRequired="founder">
                  <AchievementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute roleRequired="founder">
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute roleRequired="founder">
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute roleRequired="founder">
                  <ProfilePage />
                </ProtectedRoute>
              }
            />


            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roleRequired="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verification"
              element={
                <ProtectedRoute roleRequired="admin">
                  <AdminVerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/quests"
              element={
                <ProtectedRoute roleRequired="admin">
                  <AdminQuestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/roadmap"
              element={
                <ProtectedRoute roleRequired="admin">
                  <AdminRoadmapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/founders"
              element={
                <ProtectedRoute roleRequired="admin">
                  <AdminFoundersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute roleRequired="admin">
                  <AdminEventsPage />
                </ProtectedRoute>
              }
            />

            {/* Default Catch-all Redirect */}
            <Route path="*" element={<DefaultRedirect />} />
              </Routes></CipherScreen>
            </React.Suspense>
          </AppShell>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
