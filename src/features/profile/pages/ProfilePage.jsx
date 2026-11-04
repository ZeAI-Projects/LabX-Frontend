import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Award, BadgeCheck, Briefcase, CheckCircle2, Coins, Compass, FileText, Flag, Folder, Globe, GraduationCap, LockKeyhole, MapPin, Mountain, Pencil, Plus, Route, Shield, Sparkles, Target, Trophy, Users, Zap } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { getRoleLabel } from '../../../utils/roles.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { getDashboardSnapshot } from '../../dashboard/services/dashboard_snapshot.js'
import { ACHIEVEMENTS_CHANGE_EVENT } from '../../achievements/services/mock_achievements.js'
import { PROFILE_CHANGE_EVENT, profileStore } from '../services/profile_store.js'
import { PASSPORT_CHANGE_EVENT, passportStore } from '../services/passport_store.js'
import { mostRecent } from '../services/profile_overview.js'
import { projectProgressPercent } from '../services/project_progression.js'
import { readMockPublicProfile } from '../../social/services/mock_public_profiles.js'
import { ProfileAvatar } from '../components/ProfileDialog.jsx'
import { ProfileEditor } from '../components/ProfileEditor.jsx'
import { ProfileSocialSummary } from '../components/ProfileSocialSummary.jsx'
import { PassportPanel } from '../components/PassportPanel.jsx'
import '../components/ProfilePage.css'
import { Medal } from '../../../components/common/Medal.jsx'

const badgeIcons = { flag: Flag, compass: Compass, mountain: Mountain, route: Route, zap: Zap, trophy: Trophy }
const availabilityLabels = { unspecified: 'Not specified', open: 'Open to collaboration', selective: 'Open to selected opportunities', unavailable: 'Not available currently' }
const date = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(value))

function PanelHeading({ icon: Icon, title, children }) {
  return <div className="pf-panel-heading"><h3><Icon size={17} aria-hidden="true" />{title}</h3>{children}</div>
}

function ProfileCompletionAvatar({ profile, completion }) {
  const [hovered, setHovered] = useState(false)
  const [toggled, setToggled] = useState(false)
  const flipped = hovered || toggled
  function handlePointerEnter(event) {
    if (event.pointerType === 'mouse') {
      setToggled(false)
      setHovered(true)
    }
  }

  function handlePointerLeave(event) {
    if (event.pointerType === 'mouse') setHovered(false)
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'touch') setToggled((value) => !value)
  }

  return <span
    className={`pf-completion-avatar-wrap${flipped ? ' pf-completion-avatar-wrap--active' : ''}`}
  >
    <button
      type="button"
      className={`pf-completion-avatar${flipped ? ' pf-completion-avatar--flipped' : ''}`}
      aria-label={`Profile picture, ${completion}% complete. Tap or press Enter to ${flipped ? 'show the picture' : 'show completion'}.`}
      aria-describedby="pf-completion-avatar-label"
      aria-pressed={flipped}
      data-completion={completion}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onClick={(event) => { if (event.detail === 0) setToggled((value) => !value) }}
    >
      <span className="pf-completion-avatar__flipper">
        <span className="pf-completion-avatar__face pf-completion-avatar__front"><ProfileAvatar profile={profile} /></span>
        <span className="pf-completion-avatar__face pf-completion-avatar__back" aria-hidden="true"><span>{completion}%</span></span>
      </span>
      <svg className="pf-completion-avatar__ring" viewBox="0 0 84 84" role="img" aria-label={`Profile completion ${completion}%`}>
        <circle className="pf-completion-avatar__ring-track" cx="42" cy="42" r="40" />
        <circle
          className="pf-completion-avatar__ring-progress"
          cx="42"
          cy="42"
          r="40"
          pathLength="100"
          style={{ strokeDasharray: 100, strokeDashoffset: 100 - completion }}
        />
      </svg>
    </button>
    <span id="pf-completion-avatar-label" className="pf-completion-avatar__label" role="tooltip">Profile Completion Percentage</span>
  </span>
}

function ProfileIdentity({ profile, completion, application }) {
  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(', ')
  return <div className="pf-identity">
    {completion === null ? <ProfileAvatar profile={profile} /> : <ProfileCompletionAvatar profile={profile} completion={completion} />}
    <div className="pf-identity-copy">
      <div className="pf-name-row">
        <span className="pf-name-with-verification">
          <h2>{profile.full_name}</h2>
          {profile.role === 'founder' && application?.status === 'approved' && <span className="pf-verified-badge" title="Verified Founder" aria-label="Verified Founder" role="img"><BadgeCheck size={17} aria-hidden="true" /></span>}
        </span>
        <span className="pf-role-chip"><Sparkles size={12} aria-hidden="true" />{getRoleLabel(profile.role)}</span>
      </div>
      <p className="pf-handle">@{profile.username}</p>
      <div className="pf-identity-meta">
        {location && <span><MapPin size={13} aria-hidden="true" />{location}</span>}
        {profile.availability && profile.availability !== 'unspecified' && <span><span className={`pf-availability-dot${profile.availability === 'unavailable' ? ' pf-availability-dot--off' : ''}`} />{availabilityLabels[profile.availability]}</span>}
      </div>
    </div>
  </div>
}

function ProfileDetailsSection({ profile, publicView = false }) {
  const hasDetails = profile.skills?.length || profile.interests?.length || profile.goals || profile.professional_background || profile.education
  return <section className="pf-panel pf-overview-tile--details" aria-label="Profile details">
      <PanelHeading icon={Compass} title="The person behind the work" />
      <div className="pf-panel-content" aria-label="Profile details content" tabIndex={0}>
        {profile.skills?.length > 0 && <div className="pf-detail-group"><h4>Skills & expertise</h4><div className="pf-tags">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>}
        {profile.interests?.length > 0 && <div className="pf-detail-group"><h4>Interests</h4><div className="pf-tags pf-tags--muted">{profile.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div>}
        {profile.goals && <div className="pf-detail-group"><h4><Target size={14} aria-hidden="true" />Goals & collaboration</h4><p>{profile.goals}</p></div>}
        {profile.professional_background && <div className="pf-detail-group"><h4><Briefcase size={14} aria-hidden="true" />Professional background</h4><p>{profile.professional_background}</p></div>}
        {profile.education && <div className="pf-detail-group"><h4><GraduationCap size={14} aria-hidden="true" />Education</h4><p>{profile.education}</p></div>}
        {!hasDetails && <div className="pf-empty"><Compass size={27} aria-hidden="true" /><h4>{publicView ? 'No public details shared' : 'Tell your story'}</h4>{!publicView && <p>Add your expertise, interests, and goals to give your profile more context.</p>}</div>}
      </div>
    </section>
}

function ProfileLinksSection({ profile, publicView = false }) {
  const links = [['website', 'Website', Globe], ['portfolio', 'Portfolio', Briefcase], ['linkedin', 'LinkedIn', Users]].filter(([key]) => profile[key]).slice(0, 3)
  return <section className="pf-panel pf-overview-tile--links" aria-label="Links"><PanelHeading icon={Globe} title="Around the web" /><div className="pf-panel-content" aria-label="Profile links content" tabIndex={0}><div className="pf-profile-links">{links.map(([key, label, Icon]) => <a href={profile[key]} key={key} target="_blank" rel="noopener noreferrer"><Icon size={17} aria-hidden="true" /><span><strong>{label}</strong><small>{profile[key]}</small></span><ArrowUpRight size={15} aria-hidden="true" /></a>)}</div>{!links.length && <p className="pf-note">{publicView ? 'No public links are available.' : 'Add a portfolio, website, or LinkedIn profile in Edit profile.'}</p>}</div></section>
}

function ProfileAbout({ profile }) {
  return <><ProfileDetailsSection profile={profile} /><ProfileLinksSection profile={profile} /></>
}

function ProjectSection({ projects, publicView = false }) {
  const recentProjects = mostRecent(projects, 'createdAt')
  return <section className="pf-panel pf-overview-tile--progression" aria-label="Project progression"><PanelHeading icon={Folder} title="Project progression">{!publicView && <Link className="pf-text-link" to="/roadmap">View all roadmaps<ArrowUpRight size={14} aria-hidden="true" /></Link>}</PanelHeading>{recentProjects.length ? <div className="pf-project-list" aria-label="Three most recently created roadmaps" tabIndex={0}>{recentProjects.map((project) => {
    const progress = projectProgressPercent(project)
    const completed = project.roadmap?.completedCount ?? 0
    return <article key={project.id} className="pf-project" data-created-at={project.createdAt ?? ''}><div className="pf-project-title"><span className="pf-project-icon"><Folder size={19} aria-hidden="true" /></span><div><h4>{project.name}</h4><p>{project.domain || 'Domain not set'}{project.stage && ` · ${project.stage} · Level ${project.level}`}</p></div><Link className="pf-icon-button" to={project.href} aria-label={`Open project: ${project.name}`}><ArrowUpRight size={17} aria-hidden="true" /></Link></div><div className="pf-project-progress-label"><span>{project.roadmap ? `${completed} approved missions` : `${project.answeredCount} of ${project.totalQuestions} assessment answers`}</span><strong>{Math.round(progress)}% complete</strong></div><div className="pf-progress" role="progressbar" aria-label={`${project.name} progression`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>{project.roadmap?.creditedCount > 0 && <p className="pf-note">Coverage includes {project.roadmap.creditedCount} placement credits; credits are not completed missions.</p>}</article>
  })}</div> : <div className="pf-panel-content" aria-label="Project progression content" tabIndex={0}><div className="pf-empty"><Folder size={28} aria-hidden="true" /><h4>{publicView ? 'No public projects shared' : 'No projects to display'}</h4>{!publicView && <><p>Your saved projects and their actual roadmap progress will appear here.</p><Link className="pf-button" to="/roadmap/new"><Plus size={15} aria-hidden="true" />Create a project</Link></>}</div></div>}</section>
}

function BadgeSection({ achievements, publicView = false }) {
  if (!achievements) return null
  const badges = mostRecent(achievements.badges.filter((badge) => badge.isEarned), 'earnedAt')
  return <section className="pf-panel pf-overview-tile--achievements" aria-label="Earned achievements"><PanelHeading icon={Award} title="Earned achievements">{!publicView && <Link className="pf-text-link" to="/achievements">View all achievements<ArrowUpRight size={14} aria-hidden="true" /></Link>}</PanelHeading><div className="pf-panel-content" aria-label="Earned achievements content" tabIndex={0}>{badges.length ? <div className="pf-badge-grid">{badges.map((badge) => {
    const Icon = badgeIcons[badge.icon] || Award
    const content = <><span className="pf-medallion"><Medal icon={Icon} size={50} tone={badge.metric === 'milestones' ? 'gold' : 'violet'}/></span><strong>{badge.name}</strong><small>{badge.earnedAt ? date(badge.earnedAt) : 'Earned'}</small></>
    return <Link className="pf-badge" key={badge.id} to={`/achievements?badge=${badge.id}`} aria-label={`View ${badge.name} badge`} data-earned-at={badge.earnedAt ?? ''}>{content}</Link>
  })}</div> : <div className="pf-empty"><Award size={28} aria-hidden="true" /><h4>{publicView ? 'No public achievements available' : 'Your collection starts with action'}</h4>{!publicView && <p>Earned recognition from approved roadmap work will appear here.</p>}</div>}</div></section>
}

function PublicProfileContent({ userId }) {
  const profile = readMockPublicProfile(userId)
  if (!profile) return <div className="pf-page"><section className="pf-panel pf-profile-unavailable" role="status"><h2>Profile unavailable</h2><p>This public demo profile could not be found.</p></section></div>

  return <div className="pf-page pf-public-profile">
    <section className="pf-dossier" aria-label={`${profile.full_name}'s public profile`}>
      <div className="pf-dossier-banner"><span className="pf-banner-grid" /><span className="pf-banner-orbit" /><span className="pf-banner-mark" aria-hidden="true">X</span><span className="pf-eyebrow"><Shield size={13} aria-hidden="true" />Public founder profile</span><span className="pf-dossier-label">FOUNDER PROFILE</span></div>
      <div className="pf-dossier-body"><ProfileIdentity profile={profile} completion={null} application={null} /></div>
      <p className="pf-public-profile__notice" role="note">Demo profile. Only public directory information is available.</p>
    </section>
    <div className="pf-overview-grid pf-overview-grid--founder">
      <ProfileDetailsSection profile={profile} publicView />
      <ProfileLinksSection profile={profile} publicView />
      <ProjectSection projects={[]} publicView />
      <BadgeSection achievements={{ badges: [] }} publicView />
    </div>
  </div>
}

function ProfileContent({ user, refreshUser }) {
  const { projects } = useProjects()
  const [params, setParams] = useSearchParams()
  const founder = user.role === 'founder'
  const [profile, setProfile] = useState(() => profileStore.read(user.id))
  const [application, setApplication] = useState(() => founder ? passportStore.read(user.id) : null)
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const [notice, setNotice] = useState('')
  const passportTab = founder && params.get('tab') === 'passport'
  const snapshot = getDashboardSnapshot({ user, projects })
  const completedFields = [profile.city || profile.country, profile.skills.length, profile.interests.length, profile.goals, profile.website || profile.portfolio || profile.linkedin].filter(Boolean).length
  const completion = Math.round(completedFields / 5 * 100)
  function refresh(message) {
    setProfile(profileStore.read(user.id))
    if (founder) setApplication(passportStore.read(user.id))
    setRevision((value) => value + 1)
    if (message) setNotice(message)
  }
  useEffect(() => {
    const update = () => {
      try {
        setProfile(profileStore.read(user.id))
        if (user.role === 'founder') setApplication(passportStore.read(user.id))
        setRevision((value) => value + 1)
      } catch { /* Auth provider handles a different signed-in account. */ }
    }
    const names = ['storage', 'focus', PROFILE_CHANGE_EVENT, PASSPORT_CHANGE_EVENT, ACHIEVEMENTS_CHANGE_EVENT]
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
    setNotice('Profile saved.')
  }
  return <div className="pf-page" data-profile-revision={revision}>
    <section className="pf-dossier" aria-label="Your profile">
      <div className="pf-dossier-banner">{profile.banner?.dataUrl ? <img src={profile.banner.dataUrl} alt="Your profile banner" /> : <><span className="pf-banner-grid" /><span className="pf-banner-orbit" /><span className="pf-banner-mark" aria-hidden="true">X</span></>}<span className="pf-eyebrow"><Shield size={13} aria-hidden="true" />{getRoleLabel(user.role)} profile</span><span className="pf-dossier-label">YOUR STORY. YOUR NEXT CHAPTER.</span></div>
      <div className="pf-dossier-body"><ProfileIdentity profile={profile} completion={founder ? completion : null} application={application} />{founder && <ProfileSocialSummary />}</div>
      <div className="pf-account-strip"><button type="button" className="pf-text-button" onClick={() => setEditor('basics')}><Pencil size={13} aria-hidden="true" />Edit profile</button></div>
    </section>
    <nav className="pf-tabs" aria-label="Profile sections"><button type="button" aria-pressed={!passportTab} onClick={() => chooseTab('overview')}><FileText size={16} aria-hidden="true" />Overview</button>{founder && <button type="button" aria-pressed={passportTab} onClick={() => chooseTab('passport')}><Shield size={16} aria-hidden="true" />Founder Passport{application?.status === 'approved' && <span className="pf-nav-dot" />}</button>}<span className="pf-tab-caption">Your profile, your pace</span></nav>
    {notice && <p className="pf-message" role="status">{notice}</p>}
    {passportTab ? <PassportPanel user={user} profile={profile} application={application} projects={snapshot.projects} onChanged={refresh} /> : <>
      {founder && <section className="pf-stats" aria-label="Your founder activity">{[[Folder, snapshot.projectCount, 'Projects'], [CheckCircle2, snapshot.achievements.completedQuests, 'Completed Missions'], [Award, snapshot.achievements.earnedBadgeCount, 'Earned badges'], [Coins, snapshot.achievements.pointsBalance, 'LabX Points']].map(([Icon, count, label]) => <div key={label}><span><Icon size={20} aria-hidden="true" /></span><dl><dt>{label}</dt><dd data-profile-stat={label}>{count}</dd></dl></div>)}</section>}
      {founder ? <div className="pf-overview-grid pf-overview-grid--founder"><ProfileDetailsSection profile={profile} /><ProfileLinksSection profile={profile} /><ProjectSection projects={snapshot.projects} /><BadgeSection achievements={snapshot.achievements} /></div> : <div className="pf-overview-grid">
        <div className="pf-overview-side"><ProfileAbout profile={profile} /></div>
        <div className="pf-overview-main"><section className="pf-panel"><PanelHeading icon={Briefcase} title={`${getRoleLabel(user.role)} preferences`} />{snapshot.profile.details.some((item) => item.value) ? <dl className="pf-dossier-facts">{snapshot.profile.details.filter((item) => item.value).map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : <p className="pf-note">Your role preferences have not been added yet.</p>}<Link className="pf-text-link" to={user.role === 'mentor' ? '/onboarding/mentor' : '/onboarding/investor'}>Edit role preferences<ArrowUpRight size={14} aria-hidden="true" /></Link></section></div>
      </div>}
    </>}
    <p className="pf-page-note"><LockKeyhole size={12} aria-hidden="true" />Your profile details and uploads stay on this browser</p>
    {editor && <ProfileEditor user={user} profile={profile} initialPanel={editor} onClose={() => setEditor(null)} onSaved={saved} />}
  </div>
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { userId } = useParams()
  if (!user) return null
  return userId ? <PublicProfileContent key={userId} userId={userId} /> : <ProfileContent key={user.id} user={user} refreshUser={refreshUser} />
}
