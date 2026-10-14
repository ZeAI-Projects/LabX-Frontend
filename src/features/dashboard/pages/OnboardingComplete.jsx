import { ArrowRight, Award, CheckCircle2, CircleDashed, Compass, Shield, Sparkles, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/use_auth.js'
import { HeroCrystal } from '../components/HeroCrystal.jsx'
import '../components/Dashboard.css'

const stages = [
  { name: 'Discover', color: '#c084fc', shade: '#9333ea' },
  { name: 'Validate', color: '#38bdf8', shade: '#0369a1' },
  { name: 'Build', color: '#2dd4bf', shade: '#115e59' },
  { name: 'Launch', color: '#fbbf24', shade: '#854d0e' },
  { name: 'Grow', color: '#f472b6', shade: '#9d174d' },
]

export function OnboardingComplete() {
  const { user } = useAuth()
  const isMentor = user?.role === 'mentor'
  const completed = Boolean(user?.assessment_completed)
  const result = completed ? user?.assessment_result : null
  const name = user?.full_name?.trim() || 'LabX member'
  const firstName = name.split(/\s+/)[0]
  const roleLabel = isMentor ? 'Mentor' : 'Founder'
  const assessmentPath = isMentor ? '/mentor/assessment' : '/assessment'
  const assessmentStatus = completed ? 'Complete' : user?.assessment_skipped ? 'Skipped for now' : 'Not completed'
  const startingPoint = result?.stage
    ? `${result.stage}${result.level ? ` · Level ${result.level}` : ''}`
    : 'Not assigned'

  return (
    <div className="dashboard-hud dashboard-home">
      <header className="dashboard-hud__bar">
        <div>
          <span className="dashboard-home__eyebrow">Your LabX workspace</span>
          <h1>Dashboard</h1>
        </div>
        <span className="dashboard-home__role"><Shield size={14} />{roleLabel} account</span>
      </header>

      <section className="dashboard-hud__hero" aria-labelledby="dashboard-greeting">
        <div className="dashboard-home__welcome">
          <HeroCrystal />
          <div>
            <p className="dashboard-home__eyebrow">Build Tomorrow.</p>
            <h2 id="dashboard-greeting">Welcome back, {firstName}.</h2>
            <p>{isMentor
              ? 'Your place to support founders and share your experience.'
              : completed
                ? 'Your starting point is ready. Take the next step on your founder journey.'
                : 'Your founder journey starts here. Explore your dashboard and complete your assessment when you are ready.'}</p>
          </div>
        </div>
        <div className="dashboard-home__status-card">
          <div className="dashboard-home__status-heading">
            {completed ? <CheckCircle2 size={20} /> : <CircleDashed size={20} />}
            <span>{isMentor ? 'Mentor Assessment' : 'Initial Assessment'}</span>
          </div>
          <strong>{assessmentStatus}</strong>
          <p>{completed
            ? 'Your responses are saved to your account.'
            : isMentor
              ? 'Continue to your separate mentor assessment.'
              : 'Complete seven questions to unlock your personalized roadmap.'}</p>
          <Link className="btn btn-primary" to={completed && !isMentor ? '/assessment/result' : assessmentPath}>
            {isMentor ? 'Mentor Assessment' : completed ? 'View my results' : 'Start Assessment'}<ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="dashboard-hud__stats" aria-label="Account overview">
        <div className="dashboard-home__stat">
          <span className="dashboard-home__stat-icon"><Compass size={22} /></span>
          <div><p>{isMentor ? 'Account type' : 'Your domain'}</p><strong>{isMentor ? 'Mentor' : result?.domain || 'Choose in your assessment'}</strong></div>
        </div>
        <div className="dashboard-home__stat">
          <span className="dashboard-home__stat-icon dashboard-home__stat-icon--gold"><Award size={22} /></span>
          <div><p>{isMentor ? 'Assessment status' : 'Starting point'}</p><strong>{isMentor ? assessmentStatus : startingPoint}</strong></div>
        </div>
        <div className="dashboard-home__stat">
          <span className="dashboard-home__stat-icon dashboard-home__stat-icon--purple"><Users size={22} /></span>
          <div><p>{isMentor ? 'Account status' : 'Assigned guild'}</p><strong>{isMentor ? 'Registered' : result?.guild || 'Assigned after assessment'}</strong></div>
        </div>
      </section>

      <section className={`dashboard-hud__middle ${isMentor ? 'dashboard-hud__middle--mentor' : ''}`}>
        {!isMentor && (
          <div className="dashboard-home__panel dashboard-home__roadmap">
            <div className="dashboard-home__panel-heading"><Compass size={18} /><h2>Your Roadmap</h2></div>
            <p>From discovering a problem to growing your venture, see the path ahead.</p>
            <ol className="dashboard-home__stages" aria-label="Roadmap stages">
              {stages.map((stage) => (
                <li key={stage.name} style={{ '--stage-color': stage.color, '--stage-shade': stage.shade }}>
                  <span className={`dashboard-home__stage-node ${result?.stage === stage.name ? 'is-current' : ''}`} aria-hidden="true"><span /></span>
                  <span>{stage.name}</span>
                  {result?.stage === stage.name && <small>Current</small>}
                </li>
              ))}
            </ol>
            <p className="dashboard-home__roadmap-note">{completed
              ? 'Your roadmap is ready to explore.'
              : 'Your initial assessment unlocks your roadmap. You can start whenever you are ready.'}</p>
            <Link className="btn btn-primary" to="/roadmap">Open Roadmap<ArrowRight size={17} /></Link>
          </div>
        )}

        <div className="dashboard-home__panel dashboard-home__profile">
          <div className="dashboard-home__panel-heading"><UserRound size={18} /><h2>Your account</h2></div>
          <dl>
            <div><dt>Full name</dt><dd>{name}</dd></div>
            <div><dt>Email address</dt><dd>{user?.email || 'Not available'}</dd></div>
            <div><dt>Role</dt><dd>{roleLabel}</dd></div>
          </dl>
          <div className="dashboard-home__saved-note"><Sparkles size={15} /><span>Mock profile · Saved in this browser</span></div>
        </div>
      </section>
    </div>
  )
}
