import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Award, CalendarDays, Check, CheckCircle2, CircleDashed, Compass, Flag, Folder, GraduationCap, LockKeyhole, Mountain, Rocket, Route, Shield, Sparkles, Target, Trophy, Users, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { EVENT_CHANGE_EVENT, eventStore } from '../../events/services/mock_events.js'
import { ACHIEVEMENTS_CHANGE_EVENT } from '../../achievements/services/mock_achievements.js'
import { getDashboardSnapshot } from '../services/dashboard_snapshot.js'
import { getRoleLabel } from '../../../utils/roles.js'
import { HeroCrystal } from '../components/HeroCrystal.jsx'
import { DailySideQuestCard } from '../components/DailySideQuests.jsx'
import '../components/Dashboard.css'

const stageNames = ['Discover', 'Validate', 'Build', 'Launch', 'Grow']
const stageIcons = [Compass, Target, Zap, Rocket, Trophy]
const badgeIcons = { flag: Flag, compass: Compass, mountain: Mountain, route: Route, zap: Zap, trophy: Trophy }
const shortDate = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))
const number = (value) => (value ?? 0).toLocaleString('en-IN')
const isCovered = (mission) => ['completed', 'credited'].includes(mission.state)

function Progress({ value, max = 100, label }) {
  return <div className="db-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max || 1} aria-valuenow={value} aria-valuetext={max ? value + ' of ' + max : 'No missions configured'}><span style={{ width: (max ? Math.min(100, value / max * 100) : 0) + '%' }} /></div>
}

function SectionTitle({ icon: Icon, title, children }) {
  return <div className="db-section-title"><h2><Icon size={17} aria-hidden="true" />{title}</h2>{children}</div>
}

function TextLink({ to, children, ...props }) {
  return <Link className="db-text-link" to={to} {...props}>{children}<ArrowUpRight size={14} aria-hidden="true" /></Link>
}

function Stat({ icon: Icon, label, value, note, tone = 'cyan' }) {
  return <div className={'db-stat db-tone-' + tone}>
    <span className="db-stat-icon"><Icon size={19} aria-hidden="true" /></span>
    <div><span>{label}</span><strong data-dashboard-stat={label}>{value}</strong><small>{note}</small></div>
  </div>
}

function FounderProgress({ project, firstName }) {
  const roadmap = project?.roadmap
  const completed = roadmap?.completedCount || 0
  const credited = roadmap?.creditedCount || 0
  const total = roadmap?.totalCount || 0
  const covered = completed + credited
  const remaining = Math.max(0, total - covered)
  const answered = project?.answeredCount || 0
  const questions = project?.totalQuestions || 8
  const percent = roadmap ? Math.round(covered / total * 100) : project ? Math.round(answered / questions * 100) : 0
  return <section className="db-progress-overview" aria-label="Current project">
    <div className="db-progress-ring" style={{ '--progress': percent + '%' }} aria-hidden="true"><strong>{percent}<small>%</small></strong><span>{roadmap ? 'covered' : 'setup'}</span></div>
    <div className="db-overview-copy"><span className="db-eyebrow">Welcome back, {firstName}</span><h2>{project?.name || 'Your progress starts here'}</h2>
      <p>{roadmap ? (roadmap.isComplete ? 'Every mission is covered. Your completed work is saved.' : stageNames[roadmap.currentStageIndex] + ' · Level ' + roadmap.currentLevel + ' · ' + roadmap.domain) : project?.assessmentCompleted ? 'Your assessment is saved. Review the result to check your starting point.' : project ? 'Complete your assessment to unlock your project roadmap.' : 'Create a project in Roadmap to start tracking your journey.'}</p>
      {roadmap ? <><Progress value={covered} max={total} label="Roadmap progress" /><p className="db-next-mission">{roadmap.isComplete ? 'Roadmap complete' : 'Up next: ' + (project.currentMilestone?.name || 'Your next mission')}</p></> : project && !project.assessmentCompleted ? <><Progress value={answered} max={questions} label="Assessment progress" /><p className="db-next-mission">{answered} of {questions} questions answered · {questions - answered} left</p></> : null}
    </div>
    <dl className="db-progress-breakdown"><div><dt>Completed missions</dt><dd data-dashboard-stat="Completed missions">{number(completed)}</dd></div><div><dt>Missions remaining</dt><dd data-dashboard-stat="Missions remaining">{roadmap ? number(remaining) : '—'}</dd></div><div><dt>Placement credits</dt><dd data-dashboard-stat="Placement credits">{number(credited)}</dd></div></dl>
  </section>
}

function ProjectJourney({ project, projects }) {
  const roadmap = project?.roadmap
  const levelsCovered = roadmap?.stages.flatMap((stage) => stage.levels).filter((level) => level.milestones.every(isCovered)).length || 0
  const stagesCovered = roadmap?.stages.filter((stage) => stage.levels.every((level) => level.milestones.every(isCovered))).length || 0
  return <section className="db-panel db-journey" aria-label="Project journey">
    <SectionTitle icon={Route} title="Roadmap overview"><TextLink to={project?.href || '/roadmap'}>{project ? project.action : 'Open Roadmap'}</TextLink></SectionTitle>
    <div className="db-coverage-summary"><span><strong>{levelsCovered} / {roadmap ? 25 : 0}</strong> levels covered</span><span><strong>{stagesCovered} / {roadmap ? 5 : 0}</strong> stages covered</span></div>
    {roadmap ? <ol className="db-stage-summary" aria-label="Roadmap stages">{roadmap.stages.map((stage, index) => {
      const Icon = stageIcons[index]
      const missions = stage.levels.flatMap((level) => level.milestones)
      const covered = missions.filter(isCovered).length
      const status = covered === missions.length ? 'Covered' : stage.isCurrent ? 'Current' : stage.isUnlocked ? 'Available' : 'Locked'
      return <li key={stage.name} className={stage.isCurrent ? 'is-current' : ''}><span className="db-stage-summary-icon"><Icon size={17} aria-hidden="true" /></span><div><div className="db-stage-summary-label"><strong>{stage.name}</strong><span>{status} · {covered}/{missions.length}</span></div><Progress value={covered} max={missions.length} label={stage.name + ' missions covered'} /></div></li>
    })}</ol> : <p className="db-overview-empty">{project?.assessmentCompleted ? 'Roadmap placement is unavailable for this saved assessment.' : project ? 'Your five-stage roadmap appears after the assessment.' : 'No roadmap yet. Your stages, levels, and mission progress will appear here.'}</p>}
    <div className="db-project-heading"><h3>Your projects <span>{projects.length}</span></h3><span className="db-project-caption">{projects.filter((item) => item.roadmap).length} ready</span></div>
    {projects.length ? <ul className="db-project-list">{projects.slice(0, 3).map((item) => <li key={item.id} className={item.id === project?.id ? 'is-selected' : ''}><span className="db-project-icon"><Folder size={16} aria-hidden="true" /></span><div><strong title={item.name}>{item.name}</strong><span>{item.roadmap ? stageNames[item.roadmap.currentStageIndex] + ' · Level ' + item.roadmap.currentLevel : item.assessmentCompleted ? 'Placement unavailable' : item.answeredCount + ' of ' + item.totalQuestions + ' questions answered'}</span></div><span className="db-project-percentage">{item.roadmap ? item.roadmap.progressPercent + '%' : 'Setup'}</span></li>)}</ul> : <p className="db-overview-empty">No projects created.</p>}
    {projects.length > 3 && <p className="db-footnote">Showing your 3 most recently updated projects. Use the active project selector to see another.</p>}
    {roadmap && <p className="db-footnote">Coverage includes completed missions and placement credits. Credits are shown separately from submitted work.</p>}
  </section>
}

function AchievementPanel({ achievements }) {
  const next = achievements.nextAchievement
  const NextIcon = badgeIcons[next?.icon] || Trophy
  const badgeTotal = achievements.badges.length
  return <section className="db-panel db-achievements" aria-label="Achievement collection">
    <SectionTitle icon={Award} title="Achievements"><TextLink to="/achievements">View achievements</TextLink></SectionTitle>
    <div className="db-metric-pair"><div><strong data-dashboard-stat="Earned badges">{number(achievements.earnedBadgeCount)}</strong><span>Badges earned</span></div><div><strong>{number(Math.max(0, badgeTotal - achievements.earnedBadgeCount))}</strong><span>Still to unlock</span></div></div>
    <Progress value={achievements.earnedBadgeCount} max={badgeTotal} label="Achievement collection progress" />
    {next ? <div className="db-next-badge"><div className="db-next-badge-heading"><span className="db-next-badge-icon"><NextIcon size={21} aria-hidden="true" /></span><div><span className="db-eyebrow">Next to unlock</span><h3>{next.name}</h3></div><LockKeyhole size={14} aria-hidden="true" /></div><p>{next.criteria}</p><Progress value={next.current} max={next.target} label={'Progress toward ' + next.name} /><div className="db-next-badge-footer"><span>{next.current} / {next.target} {next.metric === 'quests' ? 'approved quests' : 'milestones'}</span></div></div> : <p className="db-footnote">{achievements.earnedBadgeCount ? 'Every available badge earned.' : 'Complete approved quests to start your collection.'}</p>}
  </section>
}

function EventsPanel({ upcoming, registered }) {
  const [view, setView] = useState('discover')
  const events = view === 'my' ? registered : upcoming
  return <section className="db-panel db-events" aria-label="Upcoming events">
    <SectionTitle icon={CalendarDays} title="Events overview"><TextLink to={'/events' + (view === 'my' ? '?view=my' : '')}>View all events</TextLink></SectionTitle>
    <div className="db-segment" aria-label="Event selection"><button type="button" aria-pressed={view === 'discover'} onClick={() => setView('discover')}>For you</button><button type="button" aria-pressed={view === 'my'} onClick={() => setView('my')}>My events</button></div>
    {events.length ? <ul className="db-event-list">{events.map((event) => <li key={event.id}><div className="db-event-row"><time dateTime={event.startsAt}><strong>{new Intl.DateTimeFormat('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(event.startsAt))}</strong><span>{new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(event.startsAt))}</span></time><div><small>{event.category} · {event.format}</small><h3>{event.title}</h3><span className={event.isRegistered ? 'is-registered' : ''}>{event.isRegistered ? 'Registered' : event.availability?.label === 'Register' ? 'Registration open' : event.availability?.label || 'View details'}</span></div></div></li>)}</ul> : <p className="db-overview-empty">{view === 'my' ? 'No upcoming registrations.' : 'No upcoming events scheduled.'}</p>}
    <p className="db-footnote">{view === 'my' ? registered.length + ' upcoming registration' + (registered.length === 1 ? '' : 's') + ' shown' : 'Up to 3 upcoming events'} · Sample listings · Times in IST.</p>
  </section>
}

function ActivityPanel({ activity }) {
  return <section className="db-panel" aria-label="Recent activity">
    <SectionTitle icon={Zap} title="Recent activity" />
    {activity.length ? <ul className="db-activity-list">{activity.slice(0, 4).map((item) => <li key={item.id}><span className={'db-activity-dot ' + (item.status === 'Approved' ? 'is-approved' : '')}>{item.status === 'Approved' ? <Check size={12} /> : <CircleDashed size={12} />}</span><div><strong>{item.activity}</strong><small><time dateTime={item.date}>{shortDate(item.date)}</time> · {item.status}</small></div><span className={item.status === 'Approved' ? 'db-earned-points' : 'db-pending-points'}>{item.status === 'Approved' ? '+' + item.amount : 'In review'}</span></li>)}</ul> : <p className="db-overview-empty">No activity yet. Approved quests and milestones will appear here.</p>}
  </section>
}

function RoleDashboard({ user, model, firstName }) {
  const mentor = user.role === 'mentor'
  const [mentorView, setMentorView] = useState('Active')
  const completed = model.profile.completed
  return <>
    <section className="db-mission db-role-mission">
      <div className="db-mission-copy"><span className="db-eyebrow"><span className="db-pulse" />Welcome back, {firstName}</span><h2>{mentor ? 'Help the next big idea grow.' : 'Discover potential. Build possibility.'}</h2><p>{mentor ? 'Bring your experience to a founder’s next chapter. Your expertise and availability are the starting point.' : 'Keep your investment interests in focus and get ready to connect with the ideas that matter to you.'}</p><div className="db-placement"><span><Shield size={13} />{getRoleLabel(user.role)} account</span><span>{completed ? 'Preferences saved' : 'Profile setup in progress'}</span></div></div>
      <div className="db-mission-next"><div className="db-crystal-scene" aria-hidden="true"><span className="db-orbit db-orbit-one" /><HeroCrystal /></div><div className="db-next-copy"><span className="db-eyebrow">Your next move</span><strong>{completed ? 'Keep your profile up to date' : 'Let’s get to know you'}</strong><p>{mentor ? 'Share your expertise, experience, and monthly availability.' : 'Add your investment focus, preferred stage, and organisation.'}</p><Link className="db-button db-button-primary" to={`/onboarding/${user.role}`}>{completed ? 'Edit profile preferences' : 'Continue profile setup'}<ArrowRight size={16} /></Link></div></div>
    </section>
    <div className="db-role-summary" aria-label="Account overview"><div><CheckCircle2 size={20} /><span>Account status<strong>Registered</strong></span></div><div><Users size={20} /><span>Profile preferences<strong>{completed ? 'Completed' : 'Not completed'}</strong></span></div><div><LockKeyhole size={20} /><span>{mentor ? 'Mentoring connections' : 'Investor verification'}<strong>{mentor ? 'No assignments yet' : 'Not submitted'}</strong></span></div></div>
    <div className="db-grid">
      <section className="db-panel">
        <SectionTitle icon={mentor ? GraduationCap : Shield} title={mentor ? 'Your mentoring journey' : 'Your investor journey'} />
        <ol className="db-role-journey">{(mentor ? [
          ['Set your preferences', 'Add your expertise and the time you can offer.', completed],
          ['Connect with a founder', 'A mentorship request starts the conversation.', false],
          ['Meet, then grow together', 'A trial session helps both of you decide what comes next.', false],
        ] : [
          ['Complete your profile', 'Set your investment focus and preferred stage.', completed],
          ['Submit for review', 'Your application is checked by the LabX team.', false],
          ['Unlock verified features', 'An accepted application enables verified investor access.', false],
        ]).map(([title, description, done], index) => <li key={title} className={done ? 'is-done' : ''}><span>{done ? <Check size={15} /> : `0${index + 1}`}</span><div><strong>{title}</strong><p>{description}</p></div>{index === 0 && <small>{done ? 'Done' : 'Next step'}</small>}</li>)}</ol>
        <p className="db-notice">{mentor ? 'Mentorship requests, trial sessions, and assignments are not available in this preview.' : 'Application submission and admin review are not available in this preview. Saving preferences does not verify your investor account.'}</p>
      </section>
      <section className="db-panel db-preferences"><SectionTitle icon={Users} title="Your preferences" />{completed ? <dl>{model.profile.details.filter((item) => item.value).map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : <div className="db-empty"><Compass size={28} /><h3>A few details go a long way.</h3><p>{mentor ? 'Tell us what you know and when you’re available.' : 'Tell us which domains and stages interest you.'}</p></div>}</section>
      {mentor && <section className="db-panel"><SectionTitle icon={GraduationCap} title="Your founders" /><div className="db-segment" aria-label="Mentoring status">{['Active', 'Trial', 'Past'].map((view) => <button key={view} type="button" aria-pressed={view === mentorView} onClick={() => setMentorView(view)}>{view}</button>)}</div><div className="db-empty" role="status"><Users size={28} /><h3>No {mentorView.toLowerCase()} mentorships yet.</h3><p>{mentorView === 'Past' ? 'Past engagements will stay here for reference.' : mentorView === 'Trial' ? 'Accepted requests will lead to a trial session.' : 'Confirmed mentorships will appear here after a trial.'}</p></div></section>}
      <EventsPanel upcoming={model.upcomingEvents} registered={model.registeredEvents} />
      {!mentor && <section className="db-panel db-investor-access"><span className="db-emblem"><LockKeyhole size={27} /></span><h2>Ready for what’s next.</h2><p>Verified investor features will become available after application approval. In the meantime, keep your profile current and explore the community.</p><TextLink to="/profile">View your profile</TextLink></section>}
    </div>
  </>
}

export function OnboardingComplete() {
  const { user } = useAuth()
  const { projects } = useProjects()
  const [selectedId, setSelectedId] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [, setActivityVersion] = useState(0)
  useEffect(() => {
    const refresh = () => { setNow(Date.now()); setActivityVersion((version) => version + 1) }
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener(EVENT_CHANGE_EVENT, refresh)
    window.addEventListener(ACHIEVEMENTS_CHANGE_EVENT, refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener(EVENT_CHANGE_EVENT, refresh)
      window.removeEventListener(ACHIEVEMENTS_CHANGE_EVENT, refresh)
    }
  }, [])
  const registrations = eventStore.read(user).registrations
  const model = getDashboardSnapshot({ user, projects, registrations, now })
  const isFounder = user.role === 'founder'
  const firstName = (user.full_name?.trim() || 'LabX member').split(/\s+/)[0]
  const project = model.projects.find((item) => item.id === selectedId) || model.projects[0]
  const standing = model.leaderboard?.userStanding
  return <div className="db-page">
    <header className="db-header"><div><span className="db-eyebrow">Your progress at a glance</span><h1>Dashboard<span aria-hidden="true">.</span></h1><p>See how far you have come, and what is left to do.</p></div><span className="db-role"><Shield size={13} aria-hidden="true" />{getRoleLabel(user.role)}</span></header>
    {isFounder ? <>
      {model.projects.length > 0 && <div className="db-project-picker"><label htmlFor="dashboard-project"><Folder size={15} aria-hidden="true" />Active project</label><select id="dashboard-project" value={project.id} onChange={(event) => setSelectedId(event.target.value)}>{model.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span aria-live="polite">{project.roadmap ? 'Roadmap ready' : project.assessmentCompleted ? 'Placement unavailable' : 'Assessment pending'}</span></div>}
      <FounderProgress project={project} firstName={firstName} />
      <section className="db-stats db-statistics" aria-label="Founder overview">
        <DailySideQuestCard user={user} variant="stat" />
        <Stat icon={Route} label="Roadmaps ready" value={model.readyCount + ' / ' + model.projects.length} note={model.draftCount + ' assessments in progress'} tone="mint" />
        <div className="db-ranks" role="group" aria-label="Your rankings">
          <Stat icon={Trophy} label="Global Rank" value={standing ? '#' + standing.global_rank : 'Unranked'} note="Across all founders" />
          <Stat icon={Compass} label="Domain Rank" value={standing?.domain_rank ? '#' + standing.domain_rank : 'Unranked'} note={standing?.primary_domain?.name || 'Choose a domain in your assessment'} tone="purple" />
          <TextLink to="/leaderboard">View leaderboards</TextLink>
        </div>
      </section>
      <div className="db-dashboard-columns">
        <div className="db-dashboard-stack"><ProjectJourney project={project} projects={model.projects} />{!project?.roadmap && <EventsPanel upcoming={model.upcomingEvents} registered={model.registeredEvents} />}</div>
        <div className="db-dashboard-stack"><AchievementPanel achievements={model.achievements} />{project?.roadmap && <EventsPanel upcoming={model.upcomingEvents} registered={model.registeredEvents} />}</div>
      </div>
      <details className="db-secondary"><summary>Recent activity</summary><ActivityPanel activity={model.activity} /></details>
    </> : <RoleDashboard user={user} model={model} firstName={firstName} />}
    <footer className="db-footer"><Sparkles size={13} aria-hidden="true" /><span>{isFounder ? 'Roadmap progress belongs to the selected project. Points and badges reflect your account.' : 'Your saved preferences are private to this account.'}</span></footer>
  </div>
}
