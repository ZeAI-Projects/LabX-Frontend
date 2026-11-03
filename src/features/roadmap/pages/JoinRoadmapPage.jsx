import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Fingerprint, Leaf, Megaphone, Send, UserRoundPlus, Users, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { projectStore } from '../../projects/services/project_store.js';
import { DailySideQuestCard } from '../../dashboard/components/DailySideQuests.jsx';
import { JoinedRoadmaps, RoadmapInvitations } from './JoinedRoadmaps.jsx';
import { CollaborationWorkflow } from '../components/CollaborationWorkflow.jsx';
import { DirectInvitationForm, JoinRequests, OutgoingInvitations, PublicOpportunities, PublishOpportunityForm } from '../components/CollaborationPortal.jsx';
import { useCollaborationRefresh } from '../components/collaboration_ui.js';
import { closeJoinRoadmapSearch } from '../services/join_roadmap_navigation.js';
import { ROADMAP_COLLABORATION_VISUAL_MOCK_DATA } from '../services/roadmap_collaboration_visual_mock_data.js';
import '../components/RoadmapTeam.css';
import './JoinRoadmapPopup.css';

function DemoOpportunities({ requests, onRequest }) {
  return <section className="collab-section join-roadmap-demo-section" aria-labelledby="demo-opportunities-title">
    <div className="collab-section-heading"><div><h2 id="demo-opportunities-title">Discover collaboration opportunities</h2><p>Find a startup and share how you can contribute.</p></div><span className="roadmap-count">{ROADMAP_COLLABORATION_VISUAL_MOCK_DATA.opportunities.length} open</span></div>
    <div className="join-roadmap-demo-opportunities">{ROADMAP_COLLABORATION_VISUAL_MOCK_DATA.opportunities.map((item) => {
      const requested = requests.includes(item.id);
      return <article key={item.id} className="join-roadmap-demo-card" aria-label={`Opportunity: ${item.title}`}>
        <div className="join-roadmap-demo-card__topline"><span>{item.project.name}</span><span className="collab-open">Open</span></div>
        <h3>{item.title}</h3><p>{item.description}</p>
        <div className="join-roadmap-demo-card__meta"><span>{item.contribution}</span><span>{item.skills}</span></div>
        {requested ? <span className="collab-status collab-status--pending"><Clock3 size={14} />Request pending</span> : <button type="button" className="roadmap-team-button roadmap-team-button--primary" onClick={() => onRequest(item.id)}><UserRoundPlus size={15} />Request to Join</button>}
      </article>;
    })}</div>
  </section>;
}

function DemoFounderWorkspace({ requestStatus, invitationSent, onRequestStatus, onSendInvitation }) {
  const { founder } = ROADMAP_COLLABORATION_VISUAL_MOCK_DATA;
  return <section className="collab-section join-roadmap-demo-section" aria-labelledby="demo-founder-title">
    <div className="collab-section-heading"><div><h2 id="demo-founder-title">Your startup workspace</h2><p>Preview collaboration activity across your project.</p></div><span className="collab-open">Sample workspace</span></div>
    <article className="join-roadmap-demo-workspace">
      <div className="join-roadmap-demo-project"><span className="join-roadmap-demo-project__icon"><Leaf size={19} /></span><div><strong>{founder.project.name}</strong><span>{founder.project.domain} · {founder.project.stage} · Level {founder.project.level}</span></div><span className="collab-status collab-status--accepted"><CheckCircle2 size={14} />Roadmap ready</span></div>
      <div className="join-roadmap-demo-workspace__grid">
        <div className="join-roadmap-demo-activity"><span className="projects-eyebrow">Opportunity</span><strong>{founder.opportunity.title}</strong><p>{founder.opportunity.requests} members have shown interest.</p><span className="collab-open">Published</span></div>
        <div className="join-roadmap-demo-activity"><span className="projects-eyebrow">Incoming request</span><strong>{founder.request.name} · {founder.request.role}</strong><p>{founder.request.summary}</p>{requestStatus === 'pending' ? <div className="collab-actions"><button type="button" className="roadmap-team-button" onClick={() => onRequestStatus('declined')}>Decline</button><button type="button" className="roadmap-team-button roadmap-team-button--primary" onClick={() => onRequestStatus('accepted')}>Accept</button></div> : <span className={`collab-status collab-status--${requestStatus}`}><CheckCircle2 size={14} />{requestStatus === 'accepted' ? 'Accepted · member joined' : 'Declined'}</span>}</div>
        <div className="join-roadmap-demo-activity join-roadmap-demo-activity--invitation"><span className="projects-eyebrow">Direct invitation</span><strong>{founder.invitation.name} · {founder.invitation.role}</strong><p>{founder.invitation.message}</p>{invitationSent ? <span className="collab-status collab-status--pending"><Clock3 size={14} />Invitation pending</span> : <button type="button" className="roadmap-team-button" onClick={onSendInvitation}><Send size={14} />Send sample invitation</button>}</div>
      </div>
    </article>
  </section>;
}

function DemoActivity({ requests, invitationStatus, onInvitationStatus }) {
  const { activity } = ROADMAP_COLLABORATION_VISUAL_MOCK_DATA;
  const requestOpportunities = ROADMAP_COLLABORATION_VISUAL_MOCK_DATA.opportunities.filter(({ id }) => requests.includes(id));
  return <section className="collab-section join-roadmap-demo-section" aria-labelledby="demo-activity-title">
    <div className="collab-section-heading"><div><h2 id="demo-activity-title">Your collaboration activity</h2><p>Invitations, requests, and teams connected to your account.</p></div><span className="roadmap-count">{activity.joined.length} joined</span></div>
    <div className="join-roadmap-demo-activity-grid">
      <article className="join-roadmap-demo-activity"><span className="projects-eyebrow">Invitation</span><strong>{activity.invitation.projectName}</strong><p>{activity.invitation.inviter} invited you as a {activity.invitation.role.toLowerCase()}.</p><p>{activity.invitation.message}</p>{invitationStatus === 'pending' ? <div className="collab-actions"><button type="button" className="roadmap-team-button" onClick={() => onInvitationStatus('declined')}>Decline</button><button type="button" className="roadmap-team-button roadmap-team-button--primary" onClick={() => onInvitationStatus('accepted')}>Accept</button></div> : <span className={`collab-status collab-status--${invitationStatus}`}><CheckCircle2 size={14} />{invitationStatus === 'accepted' ? 'Accepted · added to joined roadmaps' : 'Declined'}</span>}</article>
      <article className="join-roadmap-demo-activity"><span className="projects-eyebrow">Join request</span>{requestOpportunities.length ? requestOpportunities.map((item) => <div key={item.id}><strong>{item.project.name}</strong><p>{item.title}</p><span className="collab-status collab-status--pending"><Clock3 size={14} />Pending Founder Review</span></div>) : <><strong>{activity.request.projectName}</strong><p>{activity.request.title}</p><span className="collab-status collab-status--pending"><Clock3 size={14} />{activity.request.status}</span></>}</article>
      <article className="join-roadmap-demo-activity join-roadmap-demo-activity--joined"><span className="projects-eyebrow">Joined roadmaps</span>{activity.joined.map((project) => <div className="join-roadmap-demo-joined" key={project.projectName}><strong>{project.projectName}</strong><span>{project.owner} · {project.role} · {project.stage} · Level {project.level}</span></div>)}</article>
    </div>
  </section>;
}

function JoinRoadmapSession({ user }) {
  const [params, setParams] = useSearchParams();
  const method = params.get('joinMethod') === 'direct' ? 'direct' : 'public';
  function setMethod(next) { setParams((current) => { const copy = new URLSearchParams(current); copy.set('joinMethod', next); return copy; }, { replace: true }); }
  const tabRefs = useRef([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [demoFounderRequestStatus, setDemoFounderRequestStatus] = useState('pending');
  const [demoFounderInvitationSent, setDemoFounderInvitationSent] = useState(false);
  const [demoInvitationStatus, setDemoInvitationStatus] = useState('pending');
  useCollaborationRefresh();
  const projects = projectStore.listProjects(user.id);
  const selected = projects.find((project) => project.id === params.get('joinProject')) || projects[0];
  const view = ['browse', 'founder', 'activity'].includes(params.get('joinView')) ? params.get('joinView') : 'browse';
  function changeView(next, nextMethod) {
    setParams((current) => { const copy = new URLSearchParams(current); copy.set('joinView', next); if (nextMethod) copy.set('joinMethod', nextMethod); return copy; }, { replace: true });
  }
  function navigateTabs(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    const next = ['browse', 'founder', 'activity'][nextIndex];
    tabRefs.current[nextIndex]?.focus();
    changeView(next);
  }
  return <div className="join-roadmap-page">
    <div className="join-roadmap-account"><Fingerprint size={20} aria-hidden="true" /><p>Signed in as <strong>{user.full_name || user.username || 'Founder'}</strong><span>Founders can identify your account by name. Collaboration is saved locally in this browser.</span></p></div>
    <nav className="collab-navigation" aria-label="Collaboration views"><div role="tablist">{[['browse', 'Browse opportunities'], ['founder', 'Founder workspace'], ['activity', 'My activity']].map(([id, title], index) => <button ref={(element) => { tabRefs.current[index] = element; }} key={id} id={`join-roadmap-tab-${id}`} role="tab" aria-selected={view === id} aria-controls={`join-roadmap-panel-${id}`} tabIndex={view === id ? 0 : -1} type="button" className={view === id ? 'is-active' : ''} onKeyDown={(event) => navigateTabs(event, index)} onClick={() => changeView(id)}>{title}</button>)}</div></nav>
    <div key={view} id={`join-roadmap-panel-${view}`} role="tabpanel" aria-labelledby={`join-roadmap-tab-${view}`} className="join-roadmap-view-panel">
    {view === 'browse' && (import.meta.env.DEV ? <DemoOpportunities requests={demoRequests} onRequest={(id) => setDemoRequests((items) => items.includes(id) ? items : [...items, id])} /> : <PublicOpportunities key={user.id} user={user} />)}
    {view === 'founder' && (import.meta.env.DEV ? <DemoFounderWorkspace requestStatus={demoFounderRequestStatus} invitationSent={demoFounderInvitationSent} onRequestStatus={setDemoFounderRequestStatus} onSendInvitation={() => setDemoFounderInvitationSent(true)} /> : <section className="collab-founder" aria-label="Founder workspace">
      <div className="collab-section-heading"><div><h2>Your startup workspace</h2><p>Publish opportunities, send invitations, and review requests for the selected project.</p></div>{selected && <Link className="roadmap-team-button" to={`/roadmap/${encodeURIComponent(selected.id)}`}>Open team & missions<ArrowRight size={15} /></Link>}</div>
      <DailySideQuestCard user={user} />
      {projects.length ? <><div className="collab-field collab-project-picker"><label htmlFor="collaboration-project">Startup / project</label><select id="collaboration-project" value={selected.id} onChange={(event) => setParams((current) => { const copy = new URLSearchParams(current); copy.set('joinProject', event.target.value); return copy; }, { replace: true })}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><nav className="collab-method-switch" aria-label="Founder collaboration method"><button type="button" className={method === 'public' ? 'is-active' : ''} aria-pressed={method === 'public'} onClick={() => setMethod('public')}><Megaphone size={15} />Public Collaboration Post</button><button type="button" className={method === 'direct' ? 'is-active' : ''} aria-pressed={method === 'direct'} onClick={() => setMethod('direct')}><UserRoundPlus size={15} />Direct Member Invitation</button></nav>{method === 'public' ? <PublishOpportunityForm key={`post:${user.id}:${selected.id}`} project={selected} user={user} /> : <DirectInvitationForm key={`invite:${user.id}:${selected.id}`} project={selected} user={user} />}<JoinRequests key={`requests:${user.id}:${selected.id}`} project={selected} user={user} founder /></> : <div className="roadmap-collaboration-empty"><h3>Create your startup project first</h3><p>Each collaboration post and invitation belongs to a project you manage.</p><Link className="roadmap-team-button" to="/roadmap/new">Create project<ArrowRight size={15} /></Link></div>}
      {selected && <OutgoingInvitations key={`outgoing:${user.id}:${selected.id}`} project={selected} user={user} />}
    </section>)}
    {view === 'activity' && (import.meta.env.DEV ? <DemoActivity requests={demoRequests} invitationStatus={demoInvitationStatus} onInvitationStatus={setDemoInvitationStatus} /> : <div className="collab-activity"><RoadmapInvitations key={`invitations:${user.id}`} /><JoinRequests user={user} /><JoinedRoadmaps /></div>)}
    </div>
    <CollaborationWorkflow />
    <p className="join-roadmap-help">Founders manage their own startup projects. Members contribute to teams they join. Invitations are local records; this preview does not send external messages.</p>
  </div>;
}

export function JoinRoadmapPopup() {
  const { user } = useAuth();
  const location = useLocation();
  const [, setParams] = useSearchParams();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      queueMicrotask(() => {
        if (document.querySelector('dialog[open]')) return;
        // Nested quest dialogs finish their own cleanup before the outer lock
        // is released when navigation unmounts both dialogs together.
        document.body.style.overflow = originalOverflow;
        const focused = document.activeElement;
        if (focused && focused !== document.body && !dialog.contains(focused)) return;
        const target = opener?.isConnected && opener !== document.body ? opener : document.querySelector('[data-join-roadmap-trigger]');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);

  function close() {
    setParams(closeJoinRoadmapSearch(location.search), { replace: true });
  }

  function keepFocusInside(event) {
    if (event.key !== 'Tab' || event.target.closest('dialog') !== dialogRef.current) return;
    const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex]')]
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  return <dialog ref={dialogRef} className={`join-roadmap-dialog${import.meta.env.DEV ? ' join-roadmap-dialog--prototype' : ''}`} aria-labelledby="join-roadmap-dialog-title" aria-describedby="join-roadmap-dialog-description" onKeyDown={keepFocusInside} onCancel={(event) => { if (event.target === event.currentTarget) { event.preventDefault(); close(); } }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <header className="join-roadmap-dialog-heading">
      <div><span className="roadmap-team-kicker"><Users size={14} aria-hidden="true" />Build together</span><h2 id="join-roadmap-dialog-title">Join Roadmap</h2><p id="join-roadmap-dialog-description">Discover a team, invite collaborators, and manage your requests.</p></div>
      <button ref={closeRef} type="button" className="roadmap-team-close" onClick={close} aria-label="Close Join Roadmap"><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="join-roadmap-dialog-body"><JoinRoadmapSession key={user.id} user={user} /></div>
  </dialog>;
}
