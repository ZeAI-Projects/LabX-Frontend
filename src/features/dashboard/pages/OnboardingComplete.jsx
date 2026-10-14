import { ArrowRight, Award, CheckCircle2, CircleDashed, Compass, Shield, Sparkles, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/use_auth.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
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
  const { projects } = useProjects()
  const isMentor = user?.role === 'mentor'
  const readyCount = projects.filter(project => project.assessment_completed).length
  const draftCount = projects.length - readyCount
  const name = user?.full_name?.trim() || 'LabX member'
  const firstName = name.split(/\s+/)[0]
  const roleLabel = isMentor ? 'Mentor' : 'Founder'
  const assessmentPath = isMentor ? '/mentor/assessment' : '/roadmap/new'

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
              : 'Give every idea its own path. Create projects, complete their assessments, and explore each roadmap.'}</p>
          </div>
        </div>
        <div className="dashboard-home__status-card">
          <div className="dashboard-home__status-heading">
            {readyCount ? <CheckCircle2 size={20} /> : <CircleDashed size={20} />}
            <span>{isMentor ? 'Mentor Assessment' : 'Your projects'}</span>
          </div>
          <strong>{isMentor ? 'Not completed' : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}</strong>
          <p>{isMentor
            ? 'Continue to your separate mentor assessment.'
            : 'Start with a project name, then answer seven questions to create its roadmap.'}</p>
          <Link className="btn btn-primary" to={assessmentPath}>
            {isMentor ? 'Mentor Assessment' : 'New project'}<ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="dashboard-hud__stats" aria-label="Account overview">
        <div className="dashboard-home__stat">
          <span className="dashboard-home__stat-icon"><Compass size={22} /></span>
          <div><p>{isMentor ? 'Account type' : 'Projects'}</p><strong>{isMentor ? 'Mentor' : projects.length}</strong></div>
        </div>
        <div className="dashboard-home__stat">
          <span className="dashboard-home__stat-icon dashboard-home__stat-icon--gold"><Award size={22} /></span>
          <div><p>{isMentor ? 'Assessment status' : 'Roadmaps ready'}</p><strong>{isMentor ? 'Not completed' : readyCount}</strong></div>
        </div>
        <div className="dashboard-home__stat">
          <span className="dashboard-home__stat-icon dashboard-home__stat-icon--purple"><Users size={22} /></span>
          <div><p>{isMentor ? 'Account status' : 'Assessments in progress'}</p><strong>{isMentor ? 'Registered' : draftCount}</strong></div>
        </div>
      </section>

      <section className={`dashboard-hud__middle ${isMentor ? 'dashboard-hud__middle--mentor' : ''}`}>
        {!isMentor && (
          <div className="dashboard-home__panel dashboard-home__roadmap">
            <div className="dashboard-home__panel-heading"><Compass size={18} /><h2>Your project roadmaps</h2></div>
            <p>From discovering a problem to growing a venture, every project has its own starting point.</p>
            <ol className="dashboard-home__stages" aria-label="Roadmap stages">
              {stages.map((stage) => (
                <li key={stage.name} style={{ '--stage-color': stage.color, '--stage-shade': stage.shade }}>
                  <span className="dashboard-home__stage-node" aria-hidden="true"><span /></span>
                  <span>{stage.name}</span>
                </li>
              ))}
            </ol>
            <p className="dashboard-home__roadmap-note">Open your project grid to explore a roadmap or pick up an unfinished assessment.</p>
            <Link className="btn btn-primary" to="/roadmap">View projects<ArrowRight size={17} /></Link>
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
