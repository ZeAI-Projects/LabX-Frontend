import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/use_auth.js'
import { OnboardingLayout } from '../components/layout/OnboardingLayout.jsx'
import { AppShell } from '../components/layout/AppShell.jsx'
import { FeaturePlaceholder } from '../components/common/FeaturePlaceholder.jsx'
import { OnboardingHandoff } from '../components/common/OnboardingHandoff.jsx'
import { AssessmentGate } from '../features/assessment/components/AssessmentGate.jsx'
import { getLoginDestination } from '../utils/onboarding.js'

const lazyPage = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })))
const IntroVideo = lazyPage(() => import('../features/authentication/pages/IntroVideo.jsx'), 'IntroVideo')
const Register = lazyPage(() => import('../features/authentication/pages/Register.jsx'), 'Register')
const Login = lazyPage(() => import('../features/authentication/pages/Login.jsx'), 'Login')
const ForgotPassword = lazyPage(() => import('../features/authentication/pages/ForgotPassword.jsx'), 'ForgotPassword')
const ResetPassword = lazyPage(() => import('../features/authentication/pages/ResetPassword.jsx'), 'ResetPassword')
const AssessmentWizard = lazyPage(() => import('../features/assessment/pages/AssessmentWizard.jsx'), 'AssessmentWizard')
const AssessmentResult = lazyPage(() => import('../features/assessment/pages/AssessmentResult.jsx'), 'AssessmentResult')
const OnboardingComplete = lazyPage(() => import('../features/dashboard/pages/OnboardingComplete.jsx'), 'OnboardingComplete')
const RoadmapPage = lazyPage(() => import('../features/roadmap/pages/RoadmapPage.jsx'), 'RoadmapPage')
const AchievementsPage = lazyPage(() => import('../features/achievements/pages/AchievementsPage.jsx'), 'AchievementsPage')
const EventsPage = lazyPage(() => import('../features/events/pages/EventsPage.jsx'), 'EventsPage')

function WelcomeRoute() {
  const { user, isAuthenticated } = useAuth()
  return isAuthenticated
    ? <Navigate to={getLoginDestination(user)} replace />
    : <IntroVideo />
}

function ProtectedLayout() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <OnboardingLayout><Outlet /></OnboardingLayout>
}

function ProtectedAppLayout() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AppShell><Outlet /></AppShell>
}

function FounderFeature() {
  const { user } = useAuth()
  return user.role === 'founder' ? <FeaturePlaceholder /> : <Navigate to="/dashboard" replace />
}

function AssessmentRoute() {
  const { user, assessmentCompleted } = useAuth()
  if (user.role === 'mentor') return <Navigate to="/mentor/assessment" replace />
  if (assessmentCompleted) {
    return <Navigate to="/assessment/result" replace />
  }
  return <AssessmentWizard />
}

function ResultRoute() {
  const { user, assessmentCompleted } = useAuth()
  if (user.role === 'mentor') return <Navigate to="/mentor/assessment" replace />
  if (!assessmentCompleted || !user.assessment_result) return <Navigate to="/assessment" replace />
  return <AssessmentResult result={user.assessment_result} />
}

function DashboardRoute() {
  const { user, assessmentCompleted } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const showReminder = user.role === 'founder' && !assessmentCompleted && location.state?.promptAssessment

  function dismissReminder() {
    navigate('/dashboard', { replace: true, state: null })
    requestAnimationFrame(() => {
      const visibleEntry = [...document.querySelectorAll('[data-roadmap-entry]')].find((entry) => entry.getClientRects().length > 0)
      visibleEntry?.focus()
    })
  }

  return (
    <>
      <OnboardingComplete />
      {showReminder && <AssessmentGate onDismiss={dismissReminder} onStart={() => navigate('/assessment', { replace: true })} />}
    </>
  )
}

function MentorRoute() {
  const { user } = useAuth()
  if (user.role !== 'mentor') return <Navigate to="/dashboard" replace />
  return <OnboardingHandoff />
}

function RoadmapRoute() {
  const { user, assessmentCompleted } = useAuth()
  if (user.role !== 'founder') return <Navigate to="/dashboard" replace />
  if (!assessmentCompleted || !user.assessment_result) {
    return <Navigate to="/dashboard" replace state={{ promptAssessment: true }} />
  }
  return <RoadmapPage />
}

export default function AppRouter() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <Suspense fallback={<div className="route-fallback" role="status" aria-label="Loading LabX"><div className="spinner" /></div>}>
      <Routes>
        <Route path="/" element={<WelcomeRoute />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/assessment" element={<AssessmentRoute />} />
          <Route path="/assessment/result" element={<ResultRoute />} />
          <Route path="/mentor/assessment" element={<MentorRoute />} />
        </Route>
        <Route element={<ProtectedAppLayout />}>
          <Route path="/q1" element={<Navigate to="/dashboard" replace />} />
          <Route path="/roadmap" element={<RoadmapRoute />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/profile" element={<FeaturePlaceholder />} />
          <Route path="/notifications" element={<FeaturePlaceholder />} />
          <Route path="/leaderboard" element={<FounderFeature />} />
          <Route path="/guild" element={<FounderFeature />} />
          <Route path="/social" element={<FounderFeature />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
