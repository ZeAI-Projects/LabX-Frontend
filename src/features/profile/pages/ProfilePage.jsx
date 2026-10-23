import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Award, Briefcase, CheckCircle2, Clock, Coins, Compass, Eye, FileText, Flag, Folder, Globe, GraduationCap, LockKeyhole, Mail, MapPin, Mountain, Pencil, Plus, Route, Shield, Sparkles, Target, Trophy, Users, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { getRoleLabel } from '../../../utils/roles.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { getDashboardSnapshot } from '../../dashboard/services/dashboard_snapshot.js'
import { ACHIEVEMENTS_CHANGE_EVENT } from '../../achievements/services/mock_achievements.js'
import { EVENT_CHANGE_EVENT, MOCK_EVENTS, eventStore } from '../../events/services/mock_events.js'
import { PROFILE_CHANGE_EVENT, profileStore } from '../services/profile_store.js'
import { PASSPORT_CHANGE_EVENT, passportStore } from '../services/passport_store.js'
import { ProfileAvatar, ProfileDialog } from '../components/ProfileDialog.jsx'
import { ProfileEditor } from '../components/ProfileEditor.jsx'
import { PassportPanel } from '../components/PassportPanel.jsx'
import '../components/ProfilePage.css'
import { Medal } from '../../../components/common/Medal.jsx'

const badgeIcons = { flag: Flag, compass: Compass, mountain: Mountain, route: Route, zap: Zap, trophy: Trophy }
const availabilityLabels = { unspecified: 'Not specified', open: 'Open to collaboration', selective: 'Open to selected opportunities', unavailable: 'Not available currently' }
const fundraisingLabels = { undisclosed: 'Not disclosed', not_raising: 'Not raising', preparing: 'Preparing to raise', raising: 'Raising' }
const date = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(value))

function PanelHeading({ icon: Icon, title, children }) {
  return <div className="pf-panel-heading"><h3><Icon size={17} aria-hidden="true" />{title}</h3>{children}</div>
}

function ProfileIdentity({ profile, preview = false }) {
  return <div className={`pf-identity${preview ? ' pf-identity--preview' : ''}`}>
    <ProfileAvatar profile={profile} />
    <div className="pf-identity-copy"><div className="pf-name-row"><h2>{profile.full_name}</h2><span className="pf-role-chip"><Sparkles size={12} aria-hidden="true" />{getRoleLabel(profile.role)}</span></div><p className="pf-handle">@{profile.username}</p>{profile.bio && <p className="pf-bio">{profile.bio}</p>}<div className="pf-identity-meta">{(profile.city || profile.country) && <span><MapPin size={13} aria-hidden="true" />{[profile.city, profile.country].filter(Boolean).join(', ')}</span>}{profile.availability && profile.availability !== 'unspecified' && <span><span className={`pf-availability-dot${profile.availability === 'unavailable' ? ' pf-availability-dot--off' : ''}`} />{availabilityLabels[profile.availability]}</span>}</div></div>
  </div>
}

function ProfileAbout({ profile, publicMode = false }) {
  const hasDetails = profile.skills?.length || profile.interests?.length || profile.goals || profile.professional_background || profile.education
  const links = [['website', 'Website', Globe], ['portfolio', 'Portfolio', Briefcase], ['linkedin', 'LinkedIn', Users]].filter(([key]) => profile[key])
  return <>
    <section className="pf-panel" aria-label="Profile details">
      <PanelHeading icon={Compass} title="The person behind the work" />
      {profile.skills?.length > 0 && <div className="pf-detail-group"><h4>Skills & expertise</h4><div className="pf-tags">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>}
      {profile.interests?.length > 0 && <div className="pf-detail-group"><h4>Interests</h4><div className="pf-tags pf-tags--muted">{profile.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div>}
      {profile.goals && <div className="pf-detail-group"><h4><Target size={14} aria-hidden="true" />Goals & collaboration</h4><p>{profile.goals}</p></div>}
      {profile.professional_background && <div className="pf-detail-group"><h4><Briefcase size={14} aria-hidden="true" />Professional background</h4><p>{profile.professional_background}</p></div>}
      {profile.education && <div className="pf-detail-group"><h4><GraduationCap size={14} aria-hidden="true" />Education</h4><p>{profile.education}</p></div>}
      {!hasDetails && <div className="pf-empty"><Compass size={27} aria-hidden="true" /><h4>{publicMode ? 'A story still taking shape' : 'Tell your story'}</h4><p>{publicMode ? 'No additional professional details have been shared.' : 'Add your expertise, interests, and goals to give your dossier more context.'}</p></div>}
    </section>
    {(links.length > 0 || profile.public_email || !publicMode) && <section className="pf-panel" aria-label="Links and public contact"><PanelHeading icon={Globe} title="Around the web" /><div className="pf-profile-links">{links.map(([key, label, Icon]) => <a href={profile[key]} key={key} target="_blank" rel="noopener noreferrer"><Icon size={17} aria-hidden="true" /><span><strong>{label}</strong><small>{profile[key]}</small></span><ArrowUpRight size={15} aria-hidden="true" /></a>)}{profile.public_email && <a href={`mailto:${profile.public_email}`}><Mail size={17} aria-hidden="true" /><span><strong>Public contact email</strong><small>{profile.public_email}</small></span><ArrowUpRight size={15} aria-hidden="true" /></a>}</div>{!links.length && !profile.public_email && <p className="pf-note">Add a portfolio, website, or optional public contact in Edit profile.</p>}</section>}
  </>
}

function VentureDetails({ profile, publicMode = false }) {
  if (profile.role !== 'founder') return null
  const startup = profile.startup
  const hasStartup = startup && Object.values(startup).some(Boolean)
  if (publicMode && !hasStartup && !profile.fundraising_status) return null
  return <section className="pf-panel" aria-label="Venture details"><PanelHeading icon={Briefcase} title="Venture dossier" /><p className="pf-note">Profile details supplied by the founder. Roadmap progress is shown separately.</p>{hasStartup ? <dl className="pf-dossier-facts">{[['name', 'Venture'], ['description', 'About'], ['problem', 'Problem'], ['solution', 'Solution'], ['product', 'Product / service'], ['team', 'Team'], ['milestones', 'Milestones shared by founder']].filter(([key]) => startup[key]).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{startup[key]}</dd></div>)}{startup.website && <div><dt>Venture website</dt><dd><a href={startup.website} target="_blank" rel="noopener noreferrer">{startup.website}<ArrowUpRight size={13} aria-hidden="true" /></a></dd></div>}</dl> : !publicMode && <p className="pf-note">No venture details added yet. Share the problem, solution, and team when you are ready.</p>}{profile.fundraising_status && profile.fundraising_status !== 'undisclosed' && <p className="pf-fundraising"><span className="pf-status"><span />{fundraisingLabels[profile.fundraising_status]}</span><small>Self-reported fundraising status</small></p>}</section>
}

function ProjectSection({ projects, preview = false }) {
  return <section className="pf-panel" aria-label="Project progression"><PanelHeading icon={Folder} title="Project progression">{!preview && <Link className="pf-text-link" to="/roadmap">All projects<ArrowUpRight size={14} aria-hidden="true" /></Link>}</PanelHeading>{projects.length ? <div className="pf-project-list">{projects.map((project) => {
    const progress = project.roadmap?.progressPercent ?? 0
    const completed = project.roadmap?.completedCount ?? 0
    return <article key={project.id} className="pf-project"><div className="pf-project-title"><span className="pf-project-icon"><Folder size={19} aria-hidden="true" /></span><div><h4>{project.name}</h4><p>{project.domain || 'Domain not set'}{project.stage && ` · ${project.stage} · Level ${project.level}`}</p></div>{!preview && <Link className="pf-icon-button" to={project.href} aria-label={`Open project: ${project.name}`}><ArrowUpRight size={17} aria-hidden="true" /></Link>}</div><div className="pf-project-progress-label"><span>{project.roadmap ? `${completed} approved missions` : `${project.answeredCount} of ${project.totalQuestions} assessment answers`}</span><strong>{project.roadmap ? `${progress}% covered` : 'Assessment pending'}</strong></div><div className="pf-progress" role="progressbar" aria-label={`${project.name} progression`} aria-valuemin={0} aria-valuemax={project.roadmap ? 100 : project.totalQuestions} aria-valuenow={project.roadmap ? progress : project.answeredCount}><span style={{ width: `${project.roadmap ? progress : project.answeredCount / project.totalQuestions * 100}%` }} /></div>{project.roadmap?.creditedCount > 0 && <p className="pf-note">Coverage includes {project.roadmap.creditedCount} placement credits; credits are not completed missions.</p>}</article>
  })}</div> : <div className="pf-empty"><Folder size={28} aria-hidden="true" /><h4>No projects to display</h4><p>{preview ? 'No projects have been shared on this profile.' : 'Your saved projects and their actual roadmap progress will appear here.'}</p>{!preview && <Link className="pf-button" to="/roadmap/new"><Plus size={15} aria-hidden="true" />Create a project</Link>}</div>}</section>
}

function BadgeSection({ achievements, preview = false }) {
  if (!achievements) return null
  const badges = achievements.badges.filter((badge) => badge.isEarned)
  return <section className="pf-panel" aria-label="Earned achievements"><PanelHeading icon={Award} title="Earned achievements">{!preview && <Link className="pf-text-link" to="/achievements">View all<ArrowUpRight size={14} aria-hidden="true" /></Link>}</PanelHeading>{badges.length ? <div className="pf-badge-grid">{badges.map((badge) => {
    const Icon = badgeIcons[badge.icon] || Award
    const content = <><span className="pf-medallion"><Medal icon={Icon} size={50} tone={badge.metric === 'milestones' ? 'gold' : 'violet'}/></span><strong>{badge.name}</strong><small>{badge.earnedAt ? date(badge.earnedAt) : 'Earned'}</small></>
    return preview ? <div className="pf-badge" key={badge.id}>{content}</div> : <Link className="pf-badge" key={badge.id} to={`/achievements?badge=${badge.id}`} aria-label={`View ${badge.name} badge`}>{content}</Link>
  })}</div> : <div className="pf-empty"><Award size={28} aria-hidden="true" /><h4>Your collection starts with action</h4><p>Earned recognition from approved roadmap work will appear here.</p></div>}<p className="pf-note">Earned badges recognise activity. They are separate from passport status or identity verification.</p></section>
}

function ActivitySection({ activity, preview = false }) {
  return <section className="pf-panel" aria-label="Recent activity"><PanelHeading icon={Clock} title="Recent activity" />{activity.length ? <ol className="pf-activity-list">{activity.slice(0, 6).map((item) => <li key={item.id}><span className="pf-activity-icon">{item.status === 'Pending' ? <Clock size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}</span><div><strong>{item.activity}</strong><span>{item.type} · {item.status}</span><time dateTime={item.date}>{date(item.date)}</time></div>{!preview && item.href && <Link className="pf-icon-button" to={item.href} aria-label={`View activity: ${item.activity}`}><ArrowUpRight size={15} aria-hidden="true" /></Link>}</li>)}</ol> : <div className="pf-empty"><Clock size={27} aria-hidden="true" /><h4>No activity to display</h4><p>Saved mission progress and event participation will appear here.</p></div>}</section>
}

function PublicPreview({ profile, publicProfile, snapshot, activity, onClose }) {
  return <ProfileDialog title="Public profile preview" eyebrow="Only the details you choose to share" wide onClose={onClose}>
    <div className="pf-dialog-content pf-public-preview">
      <p className="pf-note pf-form-intro">This is a local preview. It does not publish your profile or create a public link.</p>
      <div className="pf-preview-banner">{publicProfile.banner?.dataUrl ? <img src={publicProfile.banner.dataUrl} alt="Profile banner" /> : <span aria-hidden="true"><Sparkles size={35} /></span>}</div>
      <ProfileIdentity profile={publicProfile} preview />
      <ProfileAbout profile={publicProfile} publicMode />
      <VentureDetails profile={publicProfile} publicMode />
      {profile.role === 'founder' && profile.privacy.projects === true && <ProjectSection projects={snapshot.projects} preview />}
      {profile.role === 'founder' && profile.privacy.achievements === true && <BadgeSection achievements={snapshot.achievements} preview />}
      {profile.privacy.activity === true && <ActivitySection activity={activity} preview />}
    </div>
    <footer className="pf-dialog-actions"><button className="pf-button pf-button--primary" type="button" onClick={onClose}>Close preview</button></footer>
  </ProfileDialog>
}

function ProfileContent({ user, refreshUser }) {
  const { projects } = useProjects()
  const [params, setParams] = useSearchParams()
  const founder = user.role === 'founder'
  const [profile, setProfile] = useState(() => profileStore.read(user.id))
  const [application, setApplication] = useState(() => founder ? passportStore.read(user.id) : null)
  const [events, setEvents] = useState(() => eventStore.read(user))
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const [preview, setPreview] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const passportTab = founder && params.get('tab') === 'passport'
  const snapshot = getDashboardSnapshot({ user, projects, registrations: events.registrations })
  const participation = Object.entries(events.outcomes ?? {}).flatMap(([id, outcome]) => {
    const event = MOCK_EVENTS.find((item) => item.id === id)
    return event ? [{ id: `event-${id}`, activity: event.title, type: 'Participation record', status: 'Self-reported', source: 'event', date: outcome.updatedAt, href: `/events?view=completed&event=${encodeURIComponent(id)}` }] : []
  })
  const activity = [...(snapshot.achievements?.transactions ?? []), ...(snapshot.achievements?.recognitionActivity ?? []), ...participation].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const completedFields = [profile.bio, profile.city || profile.country, profile.skills.length, profile.interests.length, profile.goals, profile.website || profile.portfolio || profile.linkedin].filter(Boolean).length
  const completion = Math.round(completedFields / 6 * 100)
  function refresh(message) {
    setProfile(profileStore.read(user.id))
    if (founder) setApplication(passportStore.read(user.id))
    setEvents(eventStore.read(user))
    setRevision((value) => value + 1)
    if (message) setNotice(message)
  }
  useEffect(() => {
    const update = () => {
      try {
        setProfile(profileStore.read(user.id))
        setPreview(null)
        if (user.role === 'founder') setApplication(passportStore.read(user.id))
        setEvents(eventStore.read(user))
        setRevision((value) => value + 1)
      } catch { /* Auth provider handles a different signed-in account. */ }
    }
    const names = ['storage', 'focus', PROFILE_CHANGE_EVENT, PASSPORT_CHANGE_EVENT, ACHIEVEMENTS_CHANGE_EVENT, EVENT_CHANGE_EVENT]
    names.forEach((name) => window.addEventListener(name, update))
    return () => names.forEach((name) => window.removeEventListener(name, update))
  }, [user])
  function chooseTab(tab) {
    setParams((current) => { const next = new URLSearchParams(current); if (tab === 'passport') next.set('tab', 'passport'); else next.delete('tab'); return next })
    setNotice('')
  }
  async function saved(updated) {
    await refreshUser()
    setProfile(updated)
    setEditor(null)
    setNotice('Profile saved. Your public preview now uses your saved visibility choices.')
  }
  function openPreview() {
    try {
      setPreview(profileStore.publicPreview(user.id))
      setError('')
    } catch (err) { setError(err.message) }
  }
  return <div className="pf-page" data-profile-revision={revision}>
    <section className="pf-dossier" aria-label="Your profile">
      <div className="pf-dossier-banner">{profile.banner?.dataUrl ? <img src={profile.banner.dataUrl} alt="Your profile banner" /> : <><span className="pf-banner-grid" /><span className="pf-banner-orbit" /><span className="pf-banner-mark" aria-hidden="true">X</span></>}<span className="pf-eyebrow"><Shield size={13} aria-hidden="true" />{getRoleLabel(user.role)} dossier</span><span className="pf-dossier-label">YOUR STORY. YOUR NEXT CHAPTER.</span></div>
      <div className="pf-dossier-body"><ProfileIdentity profile={profile} /><div className="pf-header-actions"><button className="pf-button" type="button" onClick={openPreview}><Eye size={16} aria-hidden="true" />Public preview</button><button className="pf-button pf-button--primary" type="button" onClick={() => setEditor('basics')}><Pencil size={16} aria-hidden="true" />Edit profile</button></div></div>
      {founder && snapshot.achievements.badges.some(badge => badge.isEarned) && <div className="pf-featured-badges" aria-label="Featured earned badges"><span>Your collection</span>{snapshot.achievements.badges.filter(badge => badge.isEarned).slice(0, 3).map(badge => <Link key={badge.id} to={'/achievements?badge=' + badge.id} title={badge.name}><Medal icon={badgeIcons[badge.icon] || Award} size={25} tone={badge.metric === 'milestones' ? 'gold' : 'violet'}/><span>{badge.name}</span></Link>)}</div>}
      <div className="pf-account-strip"><span><LockKeyhole size={13} aria-hidden="true" /><span>Private account email</span><strong>{user.email}</strong></span><button type="button" className="pf-text-button" onClick={() => setEditor('visibility')}><Shield size={13} aria-hidden="true" />Manage visibility</button></div>
    </section>
    <nav className="pf-tabs" aria-label="Profile sections"><button type="button" aria-pressed={!passportTab} onClick={() => chooseTab('overview')}><FileText size={16} aria-hidden="true" />Overview</button>{founder && <button type="button" aria-pressed={passportTab} onClick={() => chooseTab('passport')}><Shield size={16} aria-hidden="true" />Founder Passport{application?.status === 'approved' && <span className="pf-nav-dot" />}</button>}<span className="pf-tab-caption">Your profile, your pace</span></nav>
    {notice && <p className="pf-message" role="status">{notice}</p>}
    {error && <p className="pf-message pf-message--error" role="alert">{error}</p>}
    {passportTab ? <PassportPanel user={user} profile={profile} application={application} projects={snapshot.projects} onChanged={refresh} /> : <>
      {founder && <section className="pf-stats" aria-label="Your founder activity">{[[Folder, snapshot.projectCount, 'Projects'], [CheckCircle2, snapshot.achievements.completedQuests, 'Completed quests'], [Award, snapshot.achievements.earnedBadgeCount, 'Earned badges'], [Coins, snapshot.achievements.pointsBalance, 'LabX Points']].map(([Icon, count, label]) => <div key={label}><span><Icon size={20} aria-hidden="true" /></span><dl><dt>{label}</dt><dd data-profile-stat={label}>{count}</dd></dl></div>)}</section>}
      <div className="pf-overview-grid">
        <div className="pf-overview-side"><section className="pf-panel pf-completion"><PanelHeading icon={Sparkles} title="Make it your own" /><div><strong>{completion}%</strong><span>of suggested profile details added</span></div><div className="pf-progress" role="progressbar" aria-label="Profile detail completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><span style={{ width: `${completion}%` }} /></div><p className="pf-note">Optional details help tell your story. This is not a verification score.</p><button className="pf-text-button" type="button" onClick={() => setEditor('details')}>Add your details<ArrowUpRight size={14} aria-hidden="true" /></button></section><ProfileAbout profile={profile} /><details className="pf-secondary"><summary>Community connections</summary><section className="pf-panel pf-connections" aria-label="Community connections"><PanelHeading icon={Users} title="Community connections" /><div className="pf-empty"><Users size={28} aria-hidden="true" /><h4>No connections to display</h4><p>Your connections and community activity will appear here.</p></div></section></details></div>
        <div className="pf-overview-main">
          {founder ? <><ProjectSection projects={snapshot.projects} /><BadgeSection achievements={snapshot.achievements} /><details className="pf-secondary"><summary>Venture details</summary><VentureDetails profile={profile} /></details></> : <section className="pf-panel"><PanelHeading icon={Briefcase} title={`${getRoleLabel(user.role)} preferences`} />{snapshot.profile.details.some((item) => item.value) ? <dl className="pf-dossier-facts">{snapshot.profile.details.filter((item) => item.value).map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : <p className="pf-note">Your role preferences have not been added yet.</p>}<Link className="pf-text-link" to={user.role === 'mentor' ? '/onboarding/mentor' : '/onboarding/investor'}>Edit role preferences<ArrowUpRight size={14} aria-hidden="true" /></Link></section>}
          <details className="pf-secondary"><summary>Recent activity</summary><ActivitySection activity={activity} /></details>
        </div>
      </div>
    </>}
    <p className="pf-page-note"><LockKeyhole size={12} aria-hidden="true" />Local profile preview · Your uploads and saved details stay on this browser</p>
    {editor && <ProfileEditor user={user} profile={profile} initialPanel={editor} onClose={() => setEditor(null)} onSaved={saved} />}
    {preview && <PublicPreview profile={profile} publicProfile={preview} snapshot={snapshot} activity={activity} onClose={() => setPreview(null)} />}
  </div>
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  return user ? <ProfileContent key={user.id} user={user} refreshUser={refreshUser} /> : null
}
