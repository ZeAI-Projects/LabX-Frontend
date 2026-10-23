import { useId } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { CollaborationBadge, CollaborationFeedback } from '../components/CollaborationPortal.jsx';
import { collaborationDate, useCollaborationAction, useCollaborationRefresh } from '../components/collaboration_ui.js';
import { RoadmapPage } from './RoadmapPage.jsx';
import '../components/RoadmapTeam.css';

const roleLabel = (role) => role === 'co-founder' ? 'Co-founder' : 'Member';

export function JoinedRoadmaps() {
  const titleId = useId();
  const { user } = useAuth();
  useCollaborationRefresh();
  if (!user || user.role !== 'founder') return null;
  let joined = [];
  let error = '';
  try { joined = collaborationStore.listJoinedProjects(user.id); } catch (err) { error = err.message; }
  return <section className="roadmap-collaboration-list" aria-labelledby={titleId}>
    <h2 id={titleId}>Joined roadmaps</h2>
    <p>Teams you joined through an accepted request or invitation. Your assigned missions become actionable when they unlock.</p>
    {error ? <p className="roadmap-team-error" role="alert">{error}</p> : joined.length ? <ul>{joined.map((project) => <li key={`${project.owner_id}:${project.id}`}>
      <div><h3>{project.name}</h3><CollaborationBadge item={{ status: 'accepted' }} /><p>Owned by {project.created_by} · {roleLabel(project.memberRole)}</p><p>{project.assessment_result?.domain || 'Domain not set'} · {project.assignedMissionIds.length} assigned mission{project.assignedMissionIds.length === 1 ? '' : 's'}</p></div>
      <Link className="roadmap-team-button" to={`/roadmap/joined/${encodeURIComponent(project.owner_id)}/${encodeURIComponent(project.id)}`} aria-label={`Open joined roadmap: ${project.name}`}>Open roadmap<ArrowRight size={15} /></Link>
    </li>)}</ul> : <div className="roadmap-collaboration-empty">No joined roadmaps yet. Accept an invitation or have a join request accepted to find your team here.</div>}
  </section>;
}

function InvitationRow({ invitation, user, onChange }) {
  const action = useCollaborationAction();
  function respond(response) {
    action.run(() => collaborationStore.respondInvitation(invitation.id, response, user.id), response === 'accepted' ? 'Member Joins Startup Team. Your team is now in Joined roadmaps.' : 'Declined by Member. No team membership was created.', onChange);
  }
  return <li aria-label={`Invitation: ${invitation.project.name}`}>
    <div><h3>{invitation.project.name}</h3><p>{invitation.inviter?.full_name || invitation.project.created_by} invited you as a {roleLabel(invitation.memberRole).toLowerCase()}.</p>{invitation.message && <p className="collab-request-message">{invitation.message}</p>}<p>Invited {collaborationDate(invitation.createdAt)}{invitation.respondedAt && ` · Responded ${collaborationDate(invitation.respondedAt)}`}</p><p>{invitation.project.assessment_result?.domain || 'Domain not set'} · {invitation.project.assessment_completed ? 'Roadmap ready' : 'Assessment pending'}</p><CollaborationBadge item={invitation} /><CollaborationFeedback action={action} /></div>
    {invitation.status === 'pending' ? <div className="roadmap-invitation-actions" aria-busy={action.busy}><button type="button" className="roadmap-team-button" disabled={action.busy} onClick={() => respond('declined')}><X size={15} />Decline invitation</button><button type="button" className="roadmap-team-button roadmap-team-button--primary" disabled={action.busy} onClick={() => respond('accepted')}><Check size={15} />{action.busy ? 'Saving response…' : 'Accept invitation'}</button></div> : ['accepted', 'resolved'].includes(invitation.status) && <Link className="roadmap-team-button" to={`/roadmap/joined/${encodeURIComponent(invitation.ownerId)}/${encodeURIComponent(invitation.projectId)}`}>Open team & missions<ArrowRight size={15} /></Link>}
  </li>;
}

export function RoadmapInvitations({ pendingOnly = false }) {
  const titleId = useId();
  const { user } = useAuth();
  const refresh = useCollaborationRefresh();
  if (!user || user.role !== 'founder') return null;
  let invitations = []; let error = '';
  try { invitations = collaborationStore.listInvitations(user.id).filter((invitation) => !pendingOnly || invitation.status === 'pending'); } catch (err) { error = err.message; }
  return <section className="roadmap-collaboration-list" aria-labelledby={titleId}><h2 id={titleId}>{pendingOnly ? 'Pending invitations' : 'Roadmap invitations'} <span className="roadmap-count">{invitations.length}</span></h2><p>Review the founder’s invitation. Membership begins after you accept; completed responses stay in your history.</p>{error && <p className="roadmap-team-error" role="alert">{error}</p>}{invitations.length ? <ul>{invitations.map((invitation) => <InvitationRow key={`${user.id}:${invitation.id}`} invitation={invitation} user={user} onChange={refresh} />)}</ul> : !error && <div className="roadmap-collaboration-empty">{pendingOnly ? 'No pending invitations. Share your Member ID with a founder to receive an invitation.' : 'No roadmap invitations yet. Share your Member ID with a founder.'}</div>}</section>;
}

export function JoinedRoadmapRoute() {
  const { user } = useAuth();
  const { ownerId, projectId } = useParams();
  useCollaborationRefresh();
  if (!user || user.role !== 'founder') return <Navigate to="/dashboard" replace />;
  let access;
  try { access = collaborationStore.getAccess(projectId, ownerId, user.id); } catch { /* Same unavailable state for missing and unauthorized projects. */ }
  if (!access) return <section className="roadmap-collaboration-list"><h1>Roadmap unavailable</h1><p>This project is no longer available or you have not joined its team.</p><Link className="roadmap-team-button" to="/roadmap?join=1">Back to Join Roadmap</Link></section>;
  if (access.role === 'owner') return <Navigate to={`/roadmap/${encodeURIComponent(projectId)}`} replace />;
  if (!access.project.assessment_completed) return <section className="roadmap-collaboration-list"><h1>{access.project.name}</h1><p>The owner needs to complete this project’s assessment before its roadmap is ready.</p><Link className="roadmap-team-button" to="/roadmap?join=1&joinView=activity">Back to joined roadmaps</Link></section>;
  return <RoadmapPage key={`${ownerId}:${projectId}`} project={access.project} ownerId={ownerId} />;
}
