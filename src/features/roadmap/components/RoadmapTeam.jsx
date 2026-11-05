import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCheck, Crown, LockKeyhole, Plus, Users, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { createMockRoadmap } from '../services/mock_roadmap.js';
import { MISSION_NOTES_MIN_LENGTH } from '../services/roadmap_workflow.js';
import { CollaborationBadge, CollaborationFeedback, DirectInvitationForm, JoinRequests, PublishOpportunityForm } from './CollaborationPortal.jsx';
import { collaborationDate, useCollaborationAction, useCollaborationRefresh } from './collaboration_ui.js';
import { roadmapCollaborationPrototypeStore } from '../services/roadmap_collaboration_prototype.js';
import './RoadmapTeam.css';

const roleLabel = (role) => role === 'owner' ? 'Owner' : role === 'co-founder' ? 'Co-founder' : 'Member';
const missionStatus = (state) => ({ active: 'Available', locked: 'Locked', completed: 'Completed', credited: 'Placement credit' })[state];

function PrototypeTeamDialog({ project, user, onClose }) {
  const dialogRef = useRef(null);
  const [snapshot, setSnapshot] = useState(() => {
    try {
      return { data: roadmapCollaborationPrototypeStore.read(user.id, project.id), error: '' };
    } catch (err) {
      return { data: null, error: err.message };
    }
  });
  const [username, setUsername] = useState('');
  const [opportunity, setOpportunity] = useState({ title: '', contribution: '', skills: '', description: '', expectations: '' });
  const [notice, setNotice] = useState('');
  const { data, error } = snapshot;

  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [project.id, user.id]);

  function invite(event) {
    event.preventDefault();
    try {
      setSnapshot({ data: roadmapCollaborationPrototypeStore.inviteByUsername(user.id, project.id, username), error: '' });
      setUsername('');
      setNotice('Sample invitation saved for this roadmap in this browser.');
    } catch (err) {
      setSnapshot((current) => ({ ...current, error: err.message }));
      setNotice('');
    }
  }

  function publish(event) {
    event.preventDefault();
    try {
      setSnapshot({ data: roadmapCollaborationPrototypeStore.publishOpportunity(user.id, project.id, opportunity), error: '' });
      setOpportunity({ title: '', contribution: '', skills: '', description: '', expectations: '' });
      setNotice('Opportunity saved for this roadmap in this browser.');
    } catch (err) {
      setSnapshot((current) => ({ ...current, error: err.message }));
      setNotice('');
    }
  }

  return <dialog ref={dialogRef} className="roadmap-team-dialog" aria-labelledby="roadmap-team-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <header className="roadmap-team-heading"><div><span className="roadmap-team-kicker">Build together</span><h2 id="roadmap-team-title">Roadmap team</h2><p>{project.name}</p></div><button type="button" className="roadmap-team-close" onClick={onClose} aria-label="Close roadmap team"><X size={20} /></button></header>
    <p className="roadmap-team-note">Manage this sample roadmap’s team locally. Invitations and opportunities are saved in this browser for this roadmap only; they do not send messages or use an API.</p>
    {error && <p className="roadmap-team-error" role="alert">{error}</p>}
    {notice && <p className="roadmap-team-notice" role="status">{notice}</p>}
    <div className="roadmap-team-access" aria-label="Your team access"><span>Your role<strong>Owner</strong></span><span><Users size={15} />Team management</span></div>
    <article className="roadmap-team-member roadmap-team-owner" aria-label={`Owner: ${project.created_by || user.full_name}`}>
      <div className="roadmap-team-member-heading"><div><strong>{project.created_by || user.full_name} (you)</strong><span>Manages this roadmap and its collaboration posts</span></div><small>Owner</small></div>
    </article>
    <details className="roadmap-team-invite-details" open>
      <summary>Direct Member Invitation</summary>
      <div className="roadmap-team-opportunity">
        <form className="roadmap-prototype-form" onSubmit={invite}>
          <label htmlFor="roadmap-prototype-username">Username</label>
          <div><input id="roadmap-prototype-username" value={username} maxLength={41} onChange={(event) => setUsername(event.target.value)} placeholder="@username" required /><button className="roadmap-team-button roadmap-team-button--primary" type="submit" disabled={!data}>Invite</button></div>
          <p className="roadmap-team-note">This sample invitation is saved locally and does not notify an account.</p>
        </form>
        <h4>Invitation history <span>{data?.invitations.length ?? 0}</span></h4>
        {data?.invitations.length ? <ul className="roadmap-prototype-invitations">{data.invitations.map((invitation) => <li key={invitation.id}><span>@{invitation.username}<small>{collaborationDate(invitation.createdAt)}</small></span><strong>{invitation.status === 'pending' ? 'Pending' : invitation.status}</strong></li>)}</ul> : <p className="roadmap-team-empty">No invitations for this roadmap yet.</p>}
      </div>
    </details>
    <details className="roadmap-team-invite-details">
      <summary>Publish a post or review incoming join requests</summary>
      <div className="roadmap-team-opportunity">
        <form className="roadmap-prototype-form roadmap-prototype-opportunity" onSubmit={publish}>
          <label htmlFor="roadmap-prototype-title">Opportunity title</label>
          <input id="roadmap-prototype-title" value={opportunity.title} maxLength={100} onChange={(event) => setOpportunity({ ...opportunity, title: event.target.value })} required />
          <label htmlFor="roadmap-prototype-contribution">Role or contribution</label>
          <input id="roadmap-prototype-contribution" value={opportunity.contribution} maxLength={160} onChange={(event) => setOpportunity({ ...opportunity, contribution: event.target.value })} required />
          <label htmlFor="roadmap-prototype-skills">Skills or experience</label>
          <input id="roadmap-prototype-skills" value={opportunity.skills} maxLength={160} onChange={(event) => setOpportunity({ ...opportunity, skills: event.target.value })} required />
          <label htmlFor="roadmap-prototype-description">Description</label>
          <textarea id="roadmap-prototype-description" value={opportunity.description} maxLength={1000} rows={3} onChange={(event) => setOpportunity({ ...opportunity, description: event.target.value })} required />
          <label htmlFor="roadmap-prototype-expectations">Expectations <span>(optional)</span></label>
          <textarea id="roadmap-prototype-expectations" value={opportunity.expectations} maxLength={1000} rows={2} onChange={(event) => setOpportunity({ ...opportunity, expectations: event.target.value })} />
          <button className="roadmap-team-button roadmap-team-button--primary" type="submit" disabled={!data}>Publish opportunity</button>
        </form>
        <h4>Published opportunities <span>{data?.opportunities.length ?? 0}</span></h4>
        {data?.opportunities.length ? <ul className="roadmap-prototype-opportunities">{data.opportunities.map((item) => <li key={item.id}><strong>{item.title}</strong><p>{item.description}</p><small>{item.contribution} · {item.skills}</small>{item.expectations && <p>{item.expectations}</p>}</li>)}</ul> : <p className="roadmap-team-empty">No opportunities for this roadmap yet.</p>}
      </div>
    </details>
  </dialog>;
}

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

function AssignmentExitRequests({ requests, user, onChange }) {
  const action = useCollaborationAction();
  return <section className="roadmap-team-pending" aria-labelledby="roadmap-team-exit-requests-title">
    <h3 id="roadmap-team-exit-requests-title">Mission exit requests <span>{requests.filter((request) => request.status === 'pending').length}</span></h3>
    {requests.length ? <ul>{[...requests].reverse().map((request) => <li key={request.id}>
      <div><strong>{request.memberName}</strong><span>{request.mission ? `${request.mission.stageName} · Level ${request.mission.level} · ${request.mission.name}` : request.missionId}</span><span>Requested {collaborationDate(request.createdAt)}</span>{request.respondedAt && <span>Reviewed {collaborationDate(request.respondedAt)}</span>}</div>
      {request.status === 'pending' ? <div className="roadmap-team-request-actions"><button type="button" className="roadmap-team-button" disabled={action.busy} onClick={() => action.run(() => collaborationStore.respondAssignmentExit(request.id, 'declined', user.id), 'Exit request declined. The assignment remains active.', onChange)}>Decline</button><button type="button" className="roadmap-team-button roadmap-team-button--primary" disabled={action.busy} onClick={() => action.run(() => collaborationStore.respondAssignmentExit(request.id, 'approved', user.id), 'Exit request approved. The mission assignment was removed.', onChange)}>{action.busy ? 'Saving…' : 'Approve exit'}</button></div> : <span className={`project-status project-status--${request.status}`}>{request.status === 'approved' ? 'Approved' : request.status === 'declined' ? 'Declined' : 'Resolved'}</span>}
    </li>)}</ul> : <p className="roadmap-team-empty">No mission exit requests yet.</p>}
    <CollaborationFeedback action={action} />
  </section>;
}

function TeamDialog({ project, roadmap, user, onClose, onChange }) {
  const dialogRef = useRef(null);
  const refresh = useCollaborationRefresh();
  let team = { members: [], invitations: [], leaveRequests: [] }; let assignments = []; let isOwner = false; let readError = '';
  try {
    team = collaborationStore.getTeamOverview(project.id, project.owner_id, user.id);
    isOwner = team.role === 'owner';
    if (isOwner) team.invitations = collaborationStore.getTeam(project.id, user.id).invitations;
    assignments = collaborationStore.listAssignments(project.id, project.owner_id, user.id);
  } catch (err) { readError = project.visualDemo
    ? 'Team management is unavailable for this local interactive prototype.'
    : err.message; }
  const missionCatalog = (roadmap?.stages || createMockRoadmap(project.assessment_result).stages).flatMap((stage) => stage.levels.flatMap((level) => level.milestones));
  useEffect(() => { const trigger = document.activeElement; const dialog = dialogRef.current; dialog.showModal(); return () => { dialog.close(); if (trigger?.isConnected) trigger.focus(); }; }, []);
  function changed() { refresh(); onChange?.(); }
  return <dialog ref={dialogRef} className="roadmap-team-dialog" aria-labelledby="roadmap-team-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <header className="roadmap-team-heading"><div><span className="roadmap-team-kicker">Build together</span><h2 id="roadmap-team-title">Roadmap team</h2><p>{project.name}</p></div><button type="button" className="roadmap-team-close" onClick={onClose} aria-label="Close roadmap team"><X size={20} /></button></header>
    <p className="roadmap-team-note">{isOwner ? 'Invite your team, review join requests, and assign missions. Accepted public requests and direct invitations lead to the same team access.' : 'See your team and mission assignments. The roadmap owner manages invitations, assignments, and submitted work.'}</p>
    {readError && <p className="roadmap-team-error" role="alert">{readError}</p>}
    {!readError && <><div className="roadmap-team-access" aria-label="Your team access"><span>Your role<strong>{roleLabel(team.memberRole)}</strong></span><span>{isOwner ? <><Crown size={15} />Team management</> : <><LockKeyhole size={15} />Read-only team overview</>}</span></div>
      <article className="roadmap-team-member roadmap-team-owner" aria-label={`Owner: ${team.owner.full_name}`}><div className="roadmap-team-member-heading"><div><strong>{team.owner.full_name}{isOwner && ' (you)'}</strong><span>Manages the roadmap, membership, assignments, and founder review</span></div><small><Crown size={12} aria-hidden="true" />Owner</small></div></article>
      {isOwner && <><details className="roadmap-team-invite-details"><summary>Publish collaboration opportunity</summary><div className="roadmap-team-opportunity"><PublishOpportunityForm key={`opportunity:${user.id}:${project.id}`} project={project} user={user} onChange={changed} /><JoinRequests key={`requests:${user.id}:${project.id}`} project={project} user={user} founder /></div></details><details className="roadmap-team-invite-details"><summary>Direct Member Invitation</summary><DirectInvitationForm key={`${user.id}:${project.id}`} project={project} user={user} onChange={changed} /></details></>}
      <section className="roadmap-team-members" aria-labelledby="roadmap-team-members-title"><h3 id="roadmap-team-members-title">Members <span>{team.members.length}</span></h3><p className="roadmap-team-note">{isOwner ? 'Only joined members can receive assignments. The first mission belongs to the owner. Future missions can be assigned now and become actionable when they unlock.' : 'You can submit your assigned missions from the roadmap when they unlock. Contact the owner if you need an assignment.'}</p>{team.members.length === 0 ? <p className="roadmap-team-empty">No members yet. Accepted requests and invitations appear here.</p> : team.members.map((member) => <MemberAssignments key={member.id} member={member} project={project} missionCatalog={missionCatalog} assignments={assignments} user={user} isOwner={isOwner} onChange={changed} />)}</section>
      {isOwner && <AssignmentExitRequests requests={team.leaveRequests || []} user={user} onChange={changed} />}
      {isOwner && <section className="roadmap-team-pending" aria-labelledby="roadmap-team-invitations-title"><h3 id="roadmap-team-invitations-title">Invitation history</h3>{team.invitations.length ? <ul>{team.invitations.map((invitation) => <li key={invitation.id}><div><strong>{invitation.recipientName}</strong><span>Member ID: <code>{invitation.recipientId}</code> · {roleLabel(invitation.memberRole)}</span>{invitation.message && <span>{invitation.message}</span>}<span>{collaborationDate(invitation.createdAt)}</span></div><CollaborationBadge item={invitation} /></li>)}</ul> : <p className="roadmap-team-empty">No direct invitations for this startup yet.</p>}</section>}
    </>}
  </dialog>;
}

export function RoadmapTeam({ project, roadmap, onChange, showForPrototype = false }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user || user.role !== 'founder') return null;
  try { collaborationStore.getAccess(project.id, project.owner_id, user.id); } catch {
    if (!showForPrototype || !project.visualDemo) return null;
  }
  return <><button type="button" className="roadmap-team-button" onClick={() => setOpen(true)}><Users size={17} />Manage team</button>{open && (project.visualDemo
    ? <PrototypeTeamDialog key={`${user.id}:${project.id}`} project={project} user={user} onClose={() => setOpen(false)} />
    : <TeamDialog key={`${user.id}:${project.owner_id}:${project.id}`} project={project} roadmap={roadmap} user={user} onChange={onChange} onClose={() => setOpen(false)} />)}</>;
}
