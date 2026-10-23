import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Fingerprint, Megaphone, UserRoundPlus, Users, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { projectStore } from '../../projects/services/project_store.js';
import { DailySideQuestCard } from '../../dashboard/components/DailySideQuests.jsx';
import { JoinedRoadmaps, RoadmapInvitations } from './JoinedRoadmaps.jsx';
import { CollaborationWorkflow } from '../components/CollaborationWorkflow.jsx';
import { DirectInvitationForm, JoinRequests, OutgoingInvitations, PublicOpportunities, PublishOpportunityForm } from '../components/CollaborationPortal.jsx';
import { useCollaborationRefresh } from '../components/collaboration_ui.js';
import { closeJoinRoadmapSearch } from '../services/join_roadmap_navigation.js';
import '../components/RoadmapTeam.css';
import './JoinRoadmapPopup.css';

function JoinRoadmapSession({ user }) {
  const [params, setParams] = useSearchParams();
  const method = params.get('joinMethod') === 'direct' ? 'direct' : 'public';
  function setMethod(next) { setParams((current) => { const copy = new URLSearchParams(current); copy.set('joinMethod', next); return copy; }, { replace: true }); }
  const workspaceRef = useRef(null);
  useCollaborationRefresh();
  const projects = projectStore.listProjects(user.id);
  const selected = projects.find((project) => project.id === params.get('joinProject')) || projects[0];
  const view = ['browse', 'founder', 'activity'].includes(params.get('joinView')) ? params.get('joinView') : 'browse';
  function changeView(next, nextMethod) {
    setParams((current) => { const copy = new URLSearchParams(current); copy.set('joinView', next); if (nextMethod) copy.set('joinMethod', nextMethod); return copy; }, { replace: true });
    requestAnimationFrame(() => { workspaceRef.current?.focus({ preventScroll: true }); workspaceRef.current?.scrollIntoView({ block: 'nearest' }); });
  }
  return <div className="join-roadmap-page">
    <div className="join-roadmap-account"><Fingerprint size={20} aria-hidden="true" /><p>Your Member ID <strong><code>{user.id}</code></strong><span>Share this exact ID for direct invitations. Collaboration is saved locally in this browser.</span></p></div>
    <nav ref={workspaceRef} tabIndex={-1} className="collab-navigation" aria-label="Collaboration views">{[['browse', 'Browse opportunities'], ['founder', 'Founder workspace'], ['activity', 'My activity']].map(([id, title]) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined} className={view === id ? 'is-active' : ''} onClick={() => changeView(id)}>{title}</button>)}</nav>
    {view === 'browse' && <PublicOpportunities key={user.id} user={user} />}
    {view === 'founder' && <section className="collab-founder" aria-label="Founder workspace">
      <div className="collab-section-heading"><div><h2>Your startup workspace</h2><p>Publish opportunities, send invitations, and review requests for the selected project.</p></div>{selected && <Link className="roadmap-team-button" to={`/roadmap/${encodeURIComponent(selected.id)}`}>Open team & missions<ArrowRight size={15} /></Link>}</div>
      <DailySideQuestCard user={user} />
      {projects.length ? <><div className="collab-field collab-project-picker"><label htmlFor="collaboration-project">Startup / project</label><select id="collaboration-project" value={selected.id} onChange={(event) => setParams((current) => { const copy = new URLSearchParams(current); copy.set('joinProject', event.target.value); return copy; }, { replace: true })}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><nav className="collab-method-switch" aria-label="Founder collaboration method"><button type="button" className={method === 'public' ? 'is-active' : ''} aria-pressed={method === 'public'} onClick={() => setMethod('public')}><Megaphone size={15} />Public Collaboration Post</button><button type="button" className={method === 'direct' ? 'is-active' : ''} aria-pressed={method === 'direct'} onClick={() => setMethod('direct')}><UserRoundPlus size={15} />Direct Member Invitation</button></nav>{method === 'public' ? <PublishOpportunityForm key={`post:${user.id}:${selected.id}`} project={selected} user={user} /> : <DirectInvitationForm key={`invite:${user.id}:${selected.id}`} project={selected} user={user} />}<JoinRequests key={`requests:${user.id}:${selected.id}`} project={selected} user={user} founder /></> : <div className="roadmap-collaboration-empty"><h3>Create your startup project first</h3><p>Each collaboration post and invitation belongs to a project you manage.</p><Link className="roadmap-team-button" to="/roadmap/new">Create project<ArrowRight size={15} /></Link></div>}
      {selected && <OutgoingInvitations key={`outgoing:${user.id}:${selected.id}`} project={selected} user={user} />}
    </section>}
    {view === 'activity' && <div className="collab-activity"><RoadmapInvitations key={`invitations:${user.id}`} /><JoinRequests user={user} /><JoinedRoadmaps /></div>}
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

  return <dialog ref={dialogRef} className="join-roadmap-dialog" aria-labelledby="join-roadmap-dialog-title" aria-describedby="join-roadmap-dialog-description" onKeyDown={keepFocusInside} onCancel={(event) => { if (event.target === event.currentTarget) { event.preventDefault(); close(); } }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <header className="join-roadmap-dialog-heading">
      <div><span className="roadmap-team-kicker"><Users size={14} aria-hidden="true" />Build together</span><h2 id="join-roadmap-dialog-title">Join Roadmap</h2><p id="join-roadmap-dialog-description">Discover a team, invite collaborators, and manage your requests.</p></div>
      <button ref={closeRef} type="button" className="roadmap-team-close" onClick={close} aria-label="Close Join Roadmap"><X size={20} aria-hidden="true" /></button>
    </header>
    <div className="join-roadmap-dialog-body"><JoinRoadmapSession key={user.id} user={user} /></div>
  </dialog>;
}
