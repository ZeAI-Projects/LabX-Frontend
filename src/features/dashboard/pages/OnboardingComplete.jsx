import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Award, CalendarDays, Check, CheckCircle2, CircleDashed, Coins, Compass, Flag, Folder, GraduationCap, LockKeyhole, Mountain, Plus, Rocket, Route, Shield, Sparkles, Target, Trophy, Users, X, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { EVENT_CHANGE_EVENT, eventStore } from '../../events/services/mock_events.js'
import { ACHIEVEMENTS_CHANGE_EVENT } from '../../achievements/services/mock_achievements.js'
import { getDashboardSnapshot } from '../services/dashboard_snapshot.js'
import { getRoleLabel } from '../../../utils/roles.js'
import { HeroCrystal } from '../components/HeroCrystal.jsx'
import '../components/Dashboard.css'

const stageNames = ['Discover', 'Validate', 'Build', 'Launch', 'Grow']
const stageIcons = [Compass, Target, Zap, Rocket, Trophy]
const badgeIcons = { flag: Flag, compass: Compass, mountain: Mountain, route: Route, zap: Zap, trophy: Trophy }
const shortDate = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))
const number = (value) => (value ?? 0).toLocaleString('en-IN')

function Progress({ value, max = 100, label }) {
  return <div className="db-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max || 1} aria-valuenow={value} aria-valuetext={max ? `${value} of ${max}` : 'No core quests configured'}><span style={{ width: `${max ? Math.min(100, value / max * 100) : 0}%` }} /></div>
}

function SectionTitle({ icon: Icon, title, children }) {
  return <div className="db-section-title"><h2><Icon size={17} aria-hidden="true" />{title}</h2>{children}</div>
}

function TextLink({ to, children, ...props }) {
  return <Link className="db-text-link" to={to} {...props}>{children}<ArrowUpRight size={14} aria-hidden="true" /></Link>
}

function Stat({ icon: Icon, label, value, note, to, tone = 'cyan' }) {
  return <Link className={`db-stat db-tone-${tone}`} to={to} aria-label={`${label}: ${value}. ${note}`}>
    <span className="db-stat-icon"><Icon size={19} aria-hidden="true" /></span>
    <div><span>{label}</span><strong data-dashboard-stat={label}>{value}</strong><small>{note}</small></div>
    <ArrowUpRight className="db-stat-arrow" size={15} aria-hidden="true" />
  </Link>
}

function PassportDialog({ onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const trigger = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => { dialog.close(); if (trigger?.isConnected) trigger.focus() }
  }, [])
  function trapFocus(event) {
    if (event.key !== 'Tab') return
    const nodes = [...ref.current.querySelectorAll('a[href], button:not([disabled])')]
    const first = nodes[0]
    const last = nodes.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return <dialog ref={ref} className="db-dialog" aria-labelledby="passport-title" onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <button className="db-dialog-close" type="button" aria-label="Close passport overview" onClick={onClose}><X size={20} /></button>
    <span className="db-emblem"><Shield size={30} aria-hidden="true" /></span>
    <span className="db-eyebrow">Your founder identity</span>
    <h2 id="passport-title">Founder Passport</h2>
    <p>An optional application to recognise your founder profile. You can keep building, attending events, and earning achievements without it.</p>
    <ol className="db-passport-steps">
      <li><span>01</span><div><strong>Prepare your application</strong><p>Add the required details and supporting evidence.</p></div></li>
      <li><span>02</span><div><strong>Application review</strong><p>The LabX team reviews your application and shares a decision.</p></div></li>
      <li><span>03</span><div><strong>Preview your passport</strong><p>Follow the demo review, optional interview, and decision in your profile.</p></div></li>
    </ol>
    <p className="db-notice">Try the application in your profile. Submissions and review decisions are saved locally for this demo.</p>
    <Link className="db-button db-button-primary" to="/profile?tab=passport">Open Founder Passport<ArrowRight size={15} /></Link>
  </dialog>
}

function FounderMission({ project, firstName }) {
  const ready = Boolean(project?.roadmap)
  const finished = project?.roadmap?.isComplete === true
  const placementUnavailable = project?.assessmentCompleted && !ready
  const milestone = project?.currentMilestone
  const title = finished ? 'Roadmap completed!' : ready ? milestone.name : placementUnavailable ? 'Your assessment is saved.' : project ? 'Map out your next move.' : 'Big ideas start with a small step.'
  return <section className="db-mission" aria-label="Current project">
    <div className="db-mission-copy">
      <span className="db-eyebrow"><span className="db-pulse" />Welcome back, {firstName}</span>
      <h2>{title}</h2>
      <p>{finished ? 'Every stage is covered. Celebrate your progress, revisit your work, or start your next idea.' : ready ? milestone.description : placementUnavailable ? 'This saved assessment has no valid roadmap placement. Review its result to see the available details.' : project ? 'Eight questions. A clearer starting point. Pick up your assessment where you left off.' : 'Name your project, discover your starting point, and turn your idea into a path forward.'}</p>
      {ready ? <div className="db-placement"><span><Compass size={13} />{project.roadmap.domain}</span><span>{stageNames[project.roadmap.currentStageIndex]} · Level {project.roadmap.currentLevel}</span></div> : <div className="db-placement"><span><Flag size={13} />{placementUnavailable ? 'Placement unavailable' : project ? 'Assessment in progress' : 'Your founder journey starts here'}</span></div>}
      {project && !placementUnavailable && <div className="db-mission-progress">
        <div><span>{finished ? 'Journey covered' : ready ? 'Current mission · Evidence checkpoint' : 'Assessment progress'}</span><strong>{ready ? finished ? '75 of 75' : '0 of 1' : `${project.answeredCount} of ${project.totalQuestions}`}</strong></div>
        <Progress value={ready ? finished ? 75 : 0 : project.answeredCount} max={ready ? finished ? 75 : 1 : project.totalQuestions} label={ready ? 'Current milestone progress' : 'Assessment progress'} />
        <small>{finished ? 'All eligible missions, levels, and stages are covered.' : ready ? 'Submit your work and evidence to unlock the next mission.' : 'Your answers are saved as you go.'}</small>
      </div>}
    </div>
    <div className="db-mission-next">
      <div className="db-crystal-scene" aria-hidden="true"><span className="db-orbit db-orbit-one" /><span className="db-orbit db-orbit-two" /><HeroCrystal /><span className="db-orbit-star">✦</span></div>
      <div className="db-next-copy"><span className="db-eyebrow">Your next move</span><strong>{finished ? 'Enjoy the view from here' : ready ? 'Complete your next mission' : placementUnavailable ? 'Review your assessment' : project ? 'Find your starting point' : 'Make room for your idea'}</strong><p>{finished ? 'Your completed missions and evidence are saved in your roadmap.' : ready ? 'One checkpoint at a time. Build, share evidence, and keep moving.' : placementUnavailable ? 'Your completed answers have been kept.' : project ? `${project.totalQuestions - project.answeredCount} questions left to shape your roadmap.` : 'Each project gets its own assessment and roadmap.'}</p>
        <Link className="db-button db-button-primary" to={ready && milestone ? `${project.href}?milestone=${encodeURIComponent(milestone.id)}` : project?.href || '/roadmap/new'}>
          {finished ? 'Review your roadmap' : ready ? 'Open current mission' : project ? project.action : 'Create your first project'}<ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>
}

function ProjectJourney({ project, projects }) {
  const roadmap = project?.roadmap
  return <section className="db-panel db-journey" aria-label="Project journey">
    <SectionTitle icon={Route} title="Your roadmap journey">{roadmap && <TextLink to={project.href}>View full roadmap</TextLink>}</SectionTitle>
    <div className="db-journey-caption"><p>Five stages. Twenty-five levels. Your own pace.</p><span>{roadmap ? `${roadmap.progressPercent}% complete` : 'Ready when you are'}</span></div>
    <ol className="db-stage-map" aria-label="Roadmap stages">
      {stageNames.map((name, index) => {
        const stage = roadmap?.stages[index]
        const Icon = stageIcons[index]
        const status = !stage ? 'Not assigned' : stage.isCurrent ? 'Current' : stage.isUnlocked ? 'Available' : 'Locked'
        const content = <><span className="db-stage-node"><Icon size={21} aria-hidden="true" />{stage && !stage.isUnlocked && <LockKeyhole size={9} className="db-stage-lock" aria-hidden="true" />}</span><strong>{name}</strong><small>{status}</small></>
        return <li key={name} className={stage?.isCurrent ? 'is-current' : stage?.isUnlocked ? 'is-available' : ''}>{roadmap ? <Link to={`${project.href}?stage=${name}`} aria-label={`${name} stage, ${status.toLowerCase()}`}>{content}</Link> : <div>{content}</div>}</li>
      })}
    </ol>
    <div className="db-journey-progress"><Progress value={(roadmap?.completedCount || 0) + (roadmap?.creditedCount || 0)} max={roadmap?.totalCount || 75} label="Project milestone completion" /><span>{roadmap ? `${roadmap.completedCount} of ${roadmap.totalCount} missions complete${roadmap.creditedCount ? ` · ${roadmap.creditedCount} placement credits` : ''}` : project?.assessmentCompleted ? 'Review your saved assessment to check its placement.' : 'Complete an assessment to reveal your starting point.'}</span></div>
    <div className="db-project-heading"><h3>Your projects <span>{projects.length}</span></h3><TextLink to="/roadmap">View projects</TextLink></div>
    {projects.length ? <ul className="db-project-list">{projects.slice(0, 3).map((item) => <li key={item.id} className={item.id === project?.id ? 'is-selected' : ''}>
      <span className="db-project-icon"><Folder size={16} aria-hidden="true" /></span>
      <div><strong title={item.name}>{item.name}</strong><span>{item.roadmap ? `${stageNames[item.roadmap.currentStageIndex]} · Level ${item.roadmap.currentLevel}` : item.assessmentCompleted ? 'Placement unavailable' : `${item.answeredCount} of ${item.totalQuestions} questions answered`}</span></div>
      <Link to={item.href} aria-label={`${item.action}: ${item.name}`}>{item.roadmap ? 'Open' : item.assessmentCompleted ? 'Review' : 'Continue'}<ArrowRight size={14} aria-hidden="true" /></Link>
    </li>)}</ul> : <div className="db-empty-inline"><Folder size={23} aria-hidden="true" /><div><strong>Your ideas belong here.</strong><p>Create your first project to start exploring.</p></div><Link to="/roadmap/new" aria-label="Add your first project"><Plus size={18} /></Link></div>}
    {projects.length > 3 && <p className="db-footnote">Showing your 3 most recently updated projects.</p>}
    {roadmap && <p className="db-footnote">Mission evaluation is simulated. Placement credits and completed missions are counted separately; neither awards LabX points in this demo.</p>}
  </section>
}

function AchievementPanel({ achievements }) {
  const next = achievements.nextAchievement
  const NextIcon = badgeIcons[next?.icon] || Trophy
  const earned = achievements.badges.filter((badge) => badge.isEarned).sort((a, b) => Date.parse(b.earnedAt) - Date.parse(a.earnedAt)).slice(0, 3)
  return <section className="db-panel db-achievements" aria-label="Achievement collection">
    <SectionTitle icon={Award} title="Small wins, big energy"><TextLink to="/achievements">View all</TextLink></SectionTitle>
    <div className="db-badge-shelf">{earned.length ? earned.map((badge) => {
      const Icon = badgeIcons[badge.icon] || Trophy
      return <Link key={badge.id} to={`/achievements?badge=${badge.id}`} aria-label={`View ${badge.name} badge`}><span><Icon size={25} aria-hidden="true" /></span><strong>{badge.name}</strong><small>Earned</small></Link>
    }) : <div className="db-empty-badges"><span><Trophy size={28} aria-hidden="true" /></span><p>Complete quests to earn your first achievement.</p></div>}</div>
    {next && <div className="db-next-badge"><div className="db-next-badge-heading"><span className="db-next-badge-icon"><NextIcon size={21} aria-hidden="true" /></span><div><span className="db-eyebrow">Next to unlock</span><h3>{next.name}</h3></div><LockKeyhole size={14} aria-hidden="true" /></div><p>{next.criteria}</p><Progress value={next.current} max={next.target} label={`Progress toward ${next.name}`} /><div className="db-next-badge-footer"><span>{next.current} / {next.target} {next.metric === 'quests' ? 'approved quests' : 'milestones'}</span><TextLink to={`/achievements?badge=${next.id}`}>Details</TextLink></div></div>}
  </section>
}

function EventsPanel({ upcoming, registered }) {
  const [view, setView] = useState('discover')
  const events = view === 'my' ? registered : upcoming
  return <section className="db-panel db-events" aria-label="Upcoming events">
    <SectionTitle icon={CalendarDays} title="On your radar"><TextLink to={`/events${view === 'my' ? '?view=my' : ''}`}>View all events</TextLink></SectionTitle>
    <div className="db-segment" aria-label="Event selection"><button type="button" aria-pressed={view === 'discover'} onClick={() => setView('discover')}>For you</button><button type="button" aria-pressed={view === 'my'} onClick={() => setView('my')}>My events</button></div>
    {events.length ? <ul className="db-event-list">{events.map((event) => <li key={event.id}><Link to={`/events?event=${encodeURIComponent(event.id)}${view === 'my' ? '&view=my' : ''}`} aria-label={`View event: ${event.title}`}><time dateTime={event.startsAt}><strong>{new Intl.DateTimeFormat('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(event.startsAt))}</strong><span>{new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(event.startsAt))}</span></time><div><small>{event.category} · {event.format}</small><h3>{event.title}</h3><span className={event.isRegistered ? 'is-registered' : ''}>{event.isRegistered ? 'Registered' : event.availability?.label === 'Register' ? 'Registration open' : event.availability?.label || 'View details'}</span></div><ArrowUpRight size={16} aria-hidden="true" /></Link></li>)}</ul> : <div className="db-empty"><CalendarDays size={27} aria-hidden="true" /><h3>{view === 'my' ? 'No upcoming registrations.' : 'No upcoming events scheduled.'}</h3><p>{view === 'my' ? 'View all events to revisit past registrations or find your next event.' : 'Explore the full catalogue for community opportunities.'}</p><TextLink to="/events">Explore events</TextLink></div>}
    <p className="db-footnote">Up to 3 upcoming events · Sample listings · Times in IST.</p>
  </section>
}

function ActivityPanel({ activity }) {
  return <section className="db-panel" aria-label="Recent activity">
    <SectionTitle icon={Zap} title="Your latest moves"><TextLink to="/achievements">Points history</TextLink></SectionTitle>
    {activity.length ? <ul className="db-activity-list">{activity.slice(0, 4).map((item) => <li key={item.id}><span className={`db-activity-dot ${item.status === 'Approved' ? 'is-approved' : ''}`}>{item.status === 'Approved' ? <Check size={12} /> : <CircleDashed size={12} />}</span><div><strong>{item.activity}</strong><small><time dateTime={item.date}>{shortDate(item.date)}</time> · {item.status}</small></div><span className={item.status === 'Approved' ? 'db-earned-points' : 'db-pending-points'}>{item.status === 'Approved' ? `+${item.amount}` : 'In review'}</span></li>)}</ul> : <div className="db-empty"><Sparkles size={27} aria-hidden="true" /><h3>Your story is just beginning.</h3><p>Your approved quests and milestones will appear here as you make progress.</p></div>}
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
      <section className="db-panel db-preferences"><SectionTitle icon={Users} title="Your preferences" />{completed ? <dl>{model.profile.details.filter((item) => item.value).map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : <div className="db-empty"><Compass size={28} /><h3>A few details go a long way.</h3><p>{mentor ? 'Tell us what you know and when you’re available.' : 'Tell us which domains and stages interest you.'}</p><TextLink to={`/onboarding/${user.role}`}>Set up your profile</TextLink></div>}</section>
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
  const [passportOpen, setPassportOpen] = useState(false)
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
  return <div className="db-page">
    <header className="db-header"><div><span className="db-eyebrow">Your command center</span><h1>Dashboard<span aria-hidden="true">.</span></h1><p>A little progress today. A bigger possibility tomorrow.</p></div><div className="db-header-actions"><span className="db-role"><Shield size={13} aria-hidden="true" />{getRoleLabel(user.role)}</span>{isFounder && <Link className="db-button db-button-primary" to="/roadmap/new"><Plus size={16} aria-hidden="true" />New project</Link>}</div></header>
    {isFounder ? <>
      {model.projects.length > 0 && <div className="db-project-picker"><label htmlFor="dashboard-project"><Folder size={15} aria-hidden="true" />Active project</label><select id="dashboard-project" value={project.id} onChange={(event) => setSelectedId(event.target.value)}>{model.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span aria-live="polite">{project.roadmap ? 'Roadmap ready' : project.assessmentCompleted ? 'Placement unavailable' : 'Assessment pending'}</span></div>}
      <FounderMission project={project} firstName={firstName} />
      <section className="db-stats" aria-label="Founder overview">
        <Stat icon={Coins} label="LabX Points" value={number(model.achievements.pointsBalance)} note="From approved activity" to="/achievements" tone="gold" />
        <Stat icon={Award} label="Earned badges" value={number(model.achievements.earnedBadgeCount)} note="Your growing collection" to="/achievements" tone="purple" />
        <Stat icon={Trophy} label="Global rank" value={model.leaderboard.userStanding ? `#${model.leaderboard.userStanding.rank}` : 'Unranked'} note="All-time · Demo rankings" to="/leaderboard" />
        <Stat icon={Route} label="Roadmaps ready" value={`${model.readyCount} / ${model.projects.length}`} note="One path for every idea" to="/roadmap" tone="mint" />
      </section>
      <div className="db-grid"><ProjectJourney project={project} projects={model.projects} /><AchievementPanel achievements={model.achievements} /><EventsPanel upcoming={model.upcomingEvents} registered={model.registeredEvents} /><ActivityPanel activity={model.activity} /></div>
      <div className="db-bottom-grid"><section className="db-community"><span className="db-emblem"><Users size={24} /></span><div><span className="db-eyebrow">Better, together</span><h2>Your domain community</h2><p>{project?.roadmap ? `Connect with builders in ${project.roadmap.domain}.` : 'Your project assessment will help you find your domain community.'}</p><span className="db-coming">Guilds · Coming soon</span></div></section><section className="db-passport"><span className="db-emblem"><Shield size={24} /></span><div><span className="db-eyebrow">Make your mark</span><h2>Your Founder Passport</h2><p>An optional next chapter for your founder identity.</p><button className="db-text-link" type="button" onClick={() => setPassportOpen(true)}>Passport overview<ArrowUpRight size={14} /></button></div></section></div>
    </> : <RoleDashboard user={user} model={model} firstName={firstName} />}
    <footer className="db-footer"><Sparkles size={13} aria-hidden="true" /><span>{isFounder ? `${model.achievements.isDemo ? 'Demo account activity' : 'Browser-local preview'}. Points and badges match Achievements; roadmap progress belongs to each project.` : 'Browser-local preview. Your saved preferences are private to this account.'}</span></footer>
    {passportOpen && <PassportDialog onClose={() => setPassportOpen(false)} />}
  </div>
}
