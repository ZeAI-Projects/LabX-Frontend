import { lazy, Suspense, useEffect } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/use_auth.js'
import { OnboardingLayout } from '../components/layout/OnboardingLayout.jsx'
import { AppShell } from '../components/layout/AppShell.jsx'
import { FeaturePlaceholder } from '../components/common/FeaturePlaceholder.jsx'
import { useProjects } from '../features/projects/hooks/use_projects.js'
import { getLoginDestination } from '../utils/onboarding.js'

const lazyPage = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })))
const IntroVideo = lazyPage(() => import('../features/authentication/pages/IntroVideo.jsx'), 'IntroVideo')
const Register = lazyPage(() => import('../features/authentication/pages/Register.jsx'), 'Register')
const Login = lazyPage(() => import('../features/authentication/pages/Login.jsx'), 'Login')
const VerifyEmail = lazyPage(() => import('../features/authentication/pages/VerifyEmail.jsx'), 'VerifyEmail')
const RoleOnboarding = lazyPage(() => import('../features/authentication/pages/RoleOnboarding.jsx'), 'RoleOnboarding')
const ForgotPassword = lazyPage(() => import('../features/authentication/pages/ForgotPassword.jsx'), 'ForgotPassword')
const ResetPassword = lazyPage(() => import('../features/authentication/pages/ResetPassword.jsx'), 'ResetPassword')
const AssessmentWizard = lazyPage(() => import('../features/assessment/pages/AssessmentWizard.jsx'), 'AssessmentWizard')
const AssessmentResult = lazyPage(() => import('../features/assessment/pages/AssessmentResult.jsx'), 'AssessmentResult')
const OnboardingComplete = lazyPage(() => import('../features/dashboard/pages/OnboardingComplete.jsx'), 'OnboardingComplete')
const RoadmapPage = lazyPage(() => import('../features/roadmap/pages/RoadmapPage.jsx'), 'RoadmapPage')
const AchievementsPage = lazyPage(() => import('../features/achievements/pages/AchievementsPage.jsx'), 'AchievementsPage')
const LeaderboardPage = lazyPage(() => import('../features/leaderboard/pages/LeaderboardPage.jsx'), 'LeaderboardPage')
const EventsPage = lazyPage(() => import('../features/events/pages/EventsPage.jsx'), 'EventsPage')
const ProfilePage = lazyPage(() => import('../features/profile/pages/ProfilePage.jsx'), 'ProfilePage')
const ProjectsPage = lazyPage(() => import('../features/projects/pages/ProjectsPage.jsx'), 'ProjectsPage')
const NewProjectPage = lazyPage(() => import('../features/projects/pages/NewProjectPage.jsx'), 'NewProjectPage')
const JoinedRoadmapRoute = lazyPage(() => import('../features/roadmap/pages/JoinedRoadmaps.jsx'), 'JoinedRoadmapRoute')

function EntryRoute() {
  const { user, isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? getLoginDestination(user) : '/login'} replace />
}

function ProtectedLayout() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <OnboardingLayout key={user.id}><Outlet /></OnboardingLayout>
}

function ProtectedAppLayout() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AppShell key={user.id}><Outlet /></AppShell>
}

function FounderFeature() {
  const { user } = useAuth()
  return user.role === 'founder' ? <FeaturePlaceholder /> : <Navigate to="/dashboard" replace />
}

function FounderOnly({ children }) {
  const { user } = useAuth()
  return user.role === 'founder' ? children : <Navigate to="/dashboard" replace />
}

// Keep existing assessment bookmarks useful as assessments move under projects.
function LegacyAssessmentRoute({ result = false }) {
  const { user } = useAuth()
  const { projects } = useProjects()
  if (user.role === 'mentor') return <Navigate to="/onboarding/mentor" replace />
  if (user.role !== 'founder') return <Navigate to="/dashboard" replace />
  const completed = projects.find(project => project.assessment_completed)
  const destination = result
    ? completed ? `/roadmap/${completed.id}/result` : '/roadmap'
    : '/roadmap/new'
  return <Navigate to={destination} replace />
}

function ProjectRoute({ view }) {
  const { user } = useAuth()
  const { projectId } = useParams()
  const { projects } = useProjects()
  if (user.role !== 'founder') return <Navigate to="/dashboard" replace />
  const project = projects.find(entry => entry.id === projectId)
  if (!project) return (
    <section className="glass-card" style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <h1>Project not found</h1>
      <p style={{ margin: '16px 0' }}>This project may have been deleted or belongs to another account.</p>
      <Link to="/roadmap" className="btn btn-primary">All projects</Link>
    </section>
  )
  const base = `/roadmap/${project.id}`
  if (view === 'assessment') {
    return project.assessment_completed
      ? <Navigate to={`${base}/result`} replace />
      : <AssessmentWizard key={project.id} project={project} />
  }
  if (!project.assessment_completed) return <Navigate to={`${base}/assessment`} replace />
  return view === 'result'
    ? <AssessmentResult key={project.id} project={project} result={project.assessment_result} />
    : <RoadmapPage key={project.id} project={project} />
}

function MentorRoute() {
  const { user } = useAuth()
  if (user.role !== 'mentor') return <Navigate to="/dashboard" replace />
  return <Navigate to="/onboarding/mentor" replace />
}

function RoleOnboardingRoute() {
  const { user } = useAuth()
  const { role } = useParams()
  if (!['investor', 'mentor'].includes(role) || user.role !== role) {
    return <Navigate to="/dashboard" replace />
  }
  return <RoleOnboarding key={user.id} />
}

export default function AppRouter() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <Suspense fallback={<div className="route-fallback" role="status" aria-label="Loading LabX"><div className="spinner" /></div>}>
      <Routes>
        <Route path="/" element={<EntryRoute />} />
        <Route path="/intro" element={<IntroVideo />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/onboarding/:role" element={<RoleOnboardingRoute />} />
          <Route path="/assessment" element={<LegacyAssessmentRoute />} />
          <Route path="/assessment/result" element={<LegacyAssessmentRoute result />} />
          <Route path="/roadmap/:projectId/assessment" element={<ProjectRoute view="assessment" />} />
          <Route path="/roadmap/:projectId/result" element={<ProjectRoute view="result" />} />
          <Route path="/mentor/assessment" element={<MentorRoute />} />
        </Route>
        <Route element={<ProtectedAppLayout />}>
          <Route path="/q1" element={<Navigate to="/dashboard" replace />} />
          <Route path="/roadmap" element={<FounderOnly><ProjectsPage /></FounderOnly>} />
          <Route path="/roadmap/new" element={<FounderOnly><NewProjectPage /></FounderOnly>} />
          <Route path="/roadmap/joined/:ownerId/:projectId" element={<JoinedRoadmapRoute />} />
          <Route path="/roadmap/:projectId" element={<ProjectRoute view="roadmap" />} />
          <Route path="/dashboard" element={<OnboardingComplete />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<FeaturePlaceholder />} />
          <Route path="/leaderboard" element={<FounderOnly><LeaderboardPage /></FounderOnly>} />
          <Route path="/guild" element={<FounderFeature />} />
          <Route path="/social" element={<FounderFeature />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
