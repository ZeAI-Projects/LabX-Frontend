import { useEffect, useRef, useState } from 'react';
import { JoinRoadmapTrigger } from './JoinRoadmapTrigger.jsx';
import { ArrowRight, Check, ClipboardCheck, Crown, LockKeyhole, Plus, Users, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { createMockRoadmap } from '../services/mock_roadmap.js';
import { MISSION_NOTES_MIN_LENGTH } from '../services/roadmap_workflow.js';
import { CollaborationBadge, CollaborationFeedback, DirectInvitationForm } from './CollaborationPortal.jsx';
import { collaborationDate, useCollaborationAction, useCollaborationRefresh } from './collaboration_ui.js';
import './RoadmapTeam.css';

const roleLabel = (role) => role === 'owner' ? 'Owner' : role === 'co-founder' ? 'Co-founder' : 'Member';
const missionStatus = (state) => ({ active: 'Available', locked: 'Locked', completed: 'Completed', credited: 'Placement credit' })[state];

function MemberAssignments({ member, project, missionCatalog, assignments, user, isOwner, onChange }) {
  const [missionId, setMissionId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const action = useCollaborationAction();
  const mission = missionCatalog.find((item) => item.id === missionId);
  const existing = assignments.find((item) => item.missionId === missionId);
  function confirm() {
    action.run(() => collaborationStore.assignMission(project.id, member.id, missionId, user.id, { instructions }), 'Assigned. This mission is now in the member’s assigned work.', () => { setReviewing(false); setMissionId(''); setInstructions(''); onChange?.(); });
  }
  return <article className="roadmap-team-member" aria-label={`Member: ${member.full_name}`}>
    <div className="roadmap-team-member-heading"><div><strong>{member.full_name}{member.id === user.id && ' (you)'}</strong><span>Member ID: <code>{member.id}</code></span></div><small>{roleLabel(member.memberRole)}</small></div>
    <p className="roadmap-team-membership"><Check size={13} aria-hidden="true" />Member Joins Startup Team</p>
    {isOwner && <form className="roadmap-team-assignment" onSubmit={(event) => { event.preventDefault(); if (missionId) setReviewing(true); else action.setError('Choose a mission to review.'); }} noValidate aria-busy={action.busy}>
      <label htmlFor={`team-mission-${member.id}`}>Mission for {member.full_name}<span className="required-mark" aria-hidden="true" /></label>
      <div><select id={`team-mission-${member.id}`} value={missionId} disabled={reviewing || action.busy} onChange={(event) => { setMissionId(event.target.value); action.setError(''); action.setNotice(''); }} required><option value="">Choose a mission</option>{missionCatalog.filter((item) => item.id !== 'discover-l1-m1' && !['completed', 'credited'].includes(item.state)).map((item) => <option key={item.id} value={item.id}>{item.stageName} · Level {item.level} · {item.name}{item.state === 'locked' ? ' (locked)' : ''}</option>)}</select>{!reviewing && <button type="submit" className="roadmap-team-button" disabled={action.busy} aria-label={`Review assignment for ${member.full_name}`}><Plus size={15} />Review assignment</button>}</div>
      {!reviewing && <div className="collab-field roadmap-assignment-instructions"><label htmlFor={`assignment-instructions-${member.id}`}>Founder instructions <span>(optional)</span></label><textarea id={`assignment-instructions-${member.id}`} rows={2} value={instructions} disabled={action.busy} onChange={(event) => setInstructions(event.target.value)} /></div>}
    </form>}
    {reviewing && mission && <section className="roadmap-assignment-review" aria-label={`Review assignment for ${member.full_name}`}><h4><ClipboardCheck size={16} />Review mission assignment</h4><dl><div><dt>Startup / project</dt><dd>{project.name}</dd></div><div><dt>Mission</dt><dd>{mission.stageName} · Level {mission.level} · {mission.name}</dd></div><div><dt>Assigned member</dt><dd>{member.full_name}</dd></div><div><dt>Description</dt><dd>{mission.description}</dd></div><div><dt>Expected evidence</dt><dd>Explain the completed work in at least {mission.requirements?.notesMinLength || MISSION_NOTES_MIN_LENGTH} characters. Add an evidence link or a file up to 5 MB.</dd></div>{instructions.trim() && <div><dt>Founder instructions</dt><dd>{instructions}</dd></div>}</dl>{mission.state === 'locked' && <p>This mission is locked. You can assign it now; the member can begin after its prerequisites are completed.</p>}{existing && existing.memberId !== member.id && <p>This replaces the mission’s current assignment. Each mission has one assignee.</p>}<div className="collab-actions"><button type="button" className="roadmap-team-button" onClick={() => setReviewing(false)} disabled={action.busy}>Edit assignment</button><button type="button" className="roadmap-team-button roadmap-team-button--primary" onClick={confirm} disabled={action.busy}><Check size={15} />{action.busy ? 'Assigning…' : 'Confirm assignment'}</button></div></section>}
    <CollaborationFeedback action={action} />
    <h4 className="roadmap-team-assignment-title">{member.id === user.id ? 'Your assigned missions' : 'Assigned missions'} <span>{member.assignedMissionIds.length}</span></h4>
    {member.assignedMissionIds.length > 0 ? <ul className="roadmap-team-assigned">{member.assignedMissionIds.map((id) => { const assigned = missionCatalog.find((item) => item.id === id); const detail = assignments.find((item) => item.missionId === id && item.memberId === member.id); return <li key={id}><span>{assigned ? `${assigned.stageName} · Level ${assigned.level} · ${assigned.name}` : id}<small className="roadmap-team-assigned-detail">Assigned · {missionStatus(assigned?.state) || 'Waiting to start'}{detail?.assignedAt && ` · ${collaborationDate(detail.assignedAt)}`}</small>{detail?.instructions && <small className="roadmap-team-assigned-detail">Founder instructions: {detail.instructions}</small>}</span>{isOwner && <button type="button" disabled={action.busy} onClick={() => action.run(() => collaborationStore.removeAssignment(project.id, member.id, id, user.id), 'Mission assignment removed.', onChange)} aria-label={`Remove ${assigned?.name || id} assignment from ${member.full_name}`}><X size={15} /></button>}</li>; })}</ul> : <p className="roadmap-team-empty">No missions assigned yet.</p>}
  </article>;
}

function TeamDialog({ project, roadmap, user, onClose, onChange }) {
  const dialogRef = useRef(null);
  const refresh = useCollaborationRefresh();
  let team = { members: [], invitations: [] }; let assignments = []; let isOwner = false; let readError = '';
  try {
    team = collaborationStore.getTeamOverview(project.id, project.owner_id, user.id);
    isOwner = team.role === 'owner';
    if (isOwner) team.invitations = collaborationStore.getTeam(project.id, user.id).invitations;
    assignments = collaborationStore.listAssignments(project.id, project.owner_id, user.id);
  } catch (err) { readError = err.message; }
  const missionCatalog = (roadmap?.stages || createMockRoadmap(project.assessment_result).stages).flatMap((stage) => stage.levels.flatMap((level) => level.milestones));
  useEffect(() => { const trigger = document.activeElement; const dialog = dialogRef.current; dialog.showModal(); return () => { dialog.close(); if (trigger?.isConnected) trigger.focus(); }; }, []);
  function changed() { refresh(); onChange?.(); }
  return <dialog ref={dialogRef} className="roadmap-team-dialog" aria-labelledby="roadmap-team-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <header className="roadmap-team-heading"><div><span className="roadmap-team-kicker">Build together</span><h2 id="roadmap-team-title">Roadmap team</h2><p>{project.name}</p></div><button type="button" className="roadmap-team-close" onClick={onClose} aria-label="Close roadmap team"><X size={20} /></button></header>
    <p className="roadmap-team-note">{isOwner ? 'Invite your team, review join requests, and assign missions. Accepted public requests and direct invitations lead to the same team access.' : 'See your team and mission assignments. The roadmap owner manages invitations, assignments, and submitted work.'}</p>
    {readError && <p className="roadmap-team-error" role="alert">{readError}</p>}
    {!readError && <><div className="roadmap-team-access" aria-label="Your team access"><span>Your role<strong>{roleLabel(team.memberRole)}</strong></span><span>{isOwner ? <><Crown size={15} />Team management</> : <><LockKeyhole size={15} />Read-only team overview</>}</span></div>
      <article className="roadmap-team-member roadmap-team-owner" aria-label={`Owner: ${team.owner.full_name}`}><div className="roadmap-team-member-heading"><div><strong>{team.owner.full_name}{isOwner && ' (you)'}</strong><span>Manages the roadmap, membership, assignments, and founder review</span></div><small><Crown size={12} aria-hidden="true" />Owner</small></div></article>
      {isOwner && <><JoinRoadmapTrigger className="collab-text-link roadmap-team-portal-link" projectId={project.id} view="founder" onOpen={onClose}>Publish a post or review incoming join requests<ArrowRight size={15} /></JoinRoadmapTrigger><details className="roadmap-team-invite-details"><summary>Direct Member Invitation</summary><DirectInvitationForm key={`${user.id}:${project.id}`} project={project} user={user} onChange={changed} /></details></>}
      <section className="roadmap-team-members" aria-labelledby="roadmap-team-members-title"><h3 id="roadmap-team-members-title">Members <span>{team.members.length}</span></h3><p className="roadmap-team-note">{isOwner ? 'Only joined members can receive assignments. The first mission belongs to the owner. Future missions can be assigned now and become actionable when they unlock.' : 'You can submit your assigned missions from the roadmap when they unlock. Contact the owner if you need an assignment.'}</p>{team.members.length === 0 ? <p className="roadmap-team-empty">No members yet. Accepted requests and invitations appear here.</p> : team.members.map((member) => <MemberAssignments key={member.id} member={member} project={project} missionCatalog={missionCatalog} assignments={assignments} user={user} isOwner={isOwner} onChange={changed} />)}</section>
      {isOwner && <section className="roadmap-team-pending" aria-labelledby="roadmap-team-invitations-title"><h3 id="roadmap-team-invitations-title">Invitation history</h3>{team.invitations.length ? <ul>{team.invitations.map((invitation) => <li key={invitation.id}><div><strong>{invitation.recipientName}</strong><span>Member ID: <code>{invitation.recipientId}</code> · {roleLabel(invitation.memberRole)}</span>{invitation.message && <span>{invitation.message}</span>}<span>{collaborationDate(invitation.createdAt)}</span></div><CollaborationBadge item={invitation} /></li>)}</ul> : <p className="roadmap-team-empty">No direct invitations for this startup yet.</p>}</section>}
    </>}
  </dialog>;
}

export function RoadmapTeam({ project, roadmap, onChange }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user || user.role !== 'founder') return null;
  try { collaborationStore.getAccess(project.id, project.owner_id, user.id); } catch { return null; }
  return <><button type="button" className="roadmap-team-button" onClick={() => setOpen(true)}><Users size={17} />Manage team</button>{open && <TeamDialog key={`${user.id}:${project.owner_id}:${project.id}`} project={project} roadmap={roadmap} user={user} onChange={onChange} onClose={() => setOpen(false)} />}</>;
}
