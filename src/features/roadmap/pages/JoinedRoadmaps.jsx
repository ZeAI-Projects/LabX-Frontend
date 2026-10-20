import { useEffect, useReducer, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { collaborationStore, ROADMAP_CHANGE_EVENT } from '../services/roadmap_collaboration.js';
import { RoadmapPage } from './RoadmapPage.jsx';
import '../components/RoadmapTeam.css';

const roleLabel = (role) => role === 'co-founder' ? 'Co-founder' : 'Member';

function useCollaborationRefresh() {
  const [, refresh] = useReducer((value) => value + 1, 0);
  useEffect(() => {
    for (const event of ['storage', 'focus', ROADMAP_CHANGE_EVENT]) window.addEventListener(event, refresh);
    return () => { for (const event of ['storage', 'focus', ROADMAP_CHANGE_EVENT]) window.removeEventListener(event, refresh); };
  }, []);
  return refresh;
}

export function JoinedRoadmaps() {
  const { user } = useAuth();
  useCollaborationRefresh();
  if (!user || user.role !== 'founder') return null;
  let joined = [];
  let error = '';
  try { joined = collaborationStore.listJoinedProjects(user.id); } catch (err) { error = err.message; }
  return <section className="roadmap-collaboration-list" aria-labelledby="joined-roadmaps-title">
    <h2 id="joined-roadmaps-title">Joined roadmaps</h2>
    <p>Shared projects you have accepted. You can work on your assigned missions when they unlock; the owner controls the roadmap.</p>
    {error ? <p className="roadmap-team-error" role="alert">{error}</p> : joined.length ? <ul>{joined.map((project) => <li key={`${project.owner_id}:${project.id}`}>
      <div><h3>{project.name}</h3><p>Owned by {project.created_by} · {roleLabel(project.memberRole)}</p><p>{project.assessment_result?.domain || 'Domain not set'} · {project.assignedMissionIds.length} assigned mission{project.assignedMissionIds.length === 1 ? '' : 's'}</p></div>
      <Link className="roadmap-team-button" to={`/roadmap/joined/${encodeURIComponent(project.owner_id)}/${encodeURIComponent(project.id)}`} aria-label={`Open joined roadmap: ${project.name}`}>Open roadmap<ArrowRight size={15} /></Link>
    </li>)}</ul> : <div className="roadmap-collaboration-empty">No joined roadmaps yet. Accept an invitation to find a shared project here.</div>}
  </section>;
}

export function RoadmapInvitations() {
  const { user } = useAuth();
  const refresh = useCollaborationRefresh();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (!user || user.role !== 'founder') return null;
  let invitations = [];
  let readError = '';
  try { invitations = collaborationStore.listInvitations(user.id); } catch (err) { readError = err.message; }
  function respond(id, response) {
    setError('');
    setNotice('');
    try {
      collaborationStore.respondInvitation(id, response, user.id);
      refresh();
      setNotice(response === 'accepted' ? 'Invitation accepted. The project is now in Joined roadmaps.' : 'Invitation declined.');
    } catch (err) { setError(err.message); }
  }
  return <section className="roadmap-collaboration-list" aria-labelledby="roadmap-invitations-title">
    <h2 id="roadmap-invitations-title">Roadmap invitations</h2>
    <p>Invitations from registered Founders on this browser. No invitation emails are sent in this demo.</p>
    {(readError || error) && <p className="roadmap-team-error" role="alert">{readError || error}</p>}
    {notice && <p className="roadmap-team-notice" role="status">{notice}</p>}
    {invitations.length ? <ul>{invitations.map((invitation) => <li key={invitation.id} aria-label={`Invitation: ${invitation.project.name}`}>
      <div><h3>{invitation.project.name}</h3><p>{invitation.project.created_by} invited you as a {roleLabel(invitation.memberRole).toLowerCase()}.</p></div>
      {invitation.status === 'pending' ? <div className="roadmap-invitation-actions">
        <button type="button" className="roadmap-team-button" onClick={() => respond(invitation.id, 'declined')}><X size={15} />Decline invitation</button>
        <button type="button" className="roadmap-team-button roadmap-team-button--primary" onClick={() => respond(invitation.id, 'accepted')}><Check size={15} />Accept invitation</button>
      </div> : <span className="roadmap-invitation-status">{invitation.status === 'accepted' ? 'Accepted' : 'Declined'}</span>}
    </li>)}</ul> : !readError && <div className="roadmap-collaboration-empty">No roadmap invitations yet.</div>}
  </section>;
}

export function JoinedRoadmapRoute() {
  const { user } = useAuth();
  const { ownerId, projectId } = useParams();
  useCollaborationRefresh();
  if (!user || user.role !== 'founder') return <Navigate to="/dashboard" replace />;
  let access;
  try { access = collaborationStore.getAccess(projectId, ownerId, user.id); } catch { /* Show the same unavailable state for missing and unauthorized projects. */ }
  if (!access) return <section className="roadmap-collaboration-list"><h1>Roadmap unavailable</h1><p>This project is no longer available or you have not accepted its invitation.</p><Link className="roadmap-team-button" to="/roadmap">Back to Roadmap</Link></section>;
  if (access.role === 'owner') return <Navigate to={`/roadmap/${encodeURIComponent(projectId)}`} replace />;
  if (!access.project.assessment_completed) return <section className="roadmap-collaboration-list"><h1>{access.project.name}</h1><p>The owner needs to complete this project’s assessment before its roadmap is ready.</p><Link className="roadmap-team-button" to="/roadmap">Back to Roadmap</Link></section>;
  return <RoadmapPage key={`${ownerId}:${projectId}`} project={access.project} ownerId={ownerId} />;
}
