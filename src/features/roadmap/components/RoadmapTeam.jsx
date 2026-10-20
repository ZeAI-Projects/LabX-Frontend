import { useEffect, useReducer, useRef, useState } from 'react';
import { Mail, Plus, Users, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { collaborationStore, ROADMAP_CHANGE_EVENT } from '../services/roadmap_collaboration.js';
import { createMockRoadmap } from '../services/mock_roadmap.js';
import './RoadmapTeam.css';

const roleLabel = (role) => role === 'co-founder' ? 'Co-founder' : 'Member';

function TeamDialog({ project, roadmap, user, onClose, onChange }) {
  const dialogRef = useRef(null);
  const [revision, refresh] = useReducer((value) => value + 1, 0);
  const [email, setEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [selectedMissions, setSelectedMissions] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const missionCatalog = (roadmap?.stages || createMockRoadmap(project.assessment_result).stages)
    .flatMap((stage) => stage.levels.flatMap((level) => level.milestones));
  let team = { members: [], invitations: [] };
  let readError = '';
  try {
    team = collaborationStore.getTeam(project.id, user.id);
  } catch (err) {
    readError = err.message;
  }

  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { dialog.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);

  useEffect(() => {
    for (const event of ['storage', 'focus', ROADMAP_CHANGE_EVENT]) window.addEventListener(event, refresh);
    return () => { for (const event of ['storage', 'focus', ROADMAP_CHANGE_EVENT]) window.removeEventListener(event, refresh); };
  }, []);

  function update(action, message) {
    setError('');
    setNotice('');
    try {
      action();
      refresh();
      onChange?.();
      setNotice(message);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  function invite(event) {
    event.preventDefault();
    if (update(() => collaborationStore.inviteFounder(project.id, email, memberRole, user.id), 'Invitation saved. The Founder can respond from Roadmap invitations on this browser.')) {
      setEmail('');
    }
  }

  return <dialog ref={dialogRef} className="roadmap-team-dialog" aria-labelledby="roadmap-team-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <header className="roadmap-team-heading">
      <div><span className="roadmap-team-kicker">Build together</span><h2 id="roadmap-team-title">Roadmap team</h2><p>{project.name}</p></div>
      <button type="button" className="roadmap-team-close" onClick={onClose} aria-label="Close roadmap team"><X size={20} /></button>
    </header>
    <p className="roadmap-team-note">Invitations stay in this browser demo. No email is sent. Co-founders and members can work only on missions you assign; ownership stays with you.</p>
    {(readError || error) && <p className="roadmap-team-error" role="alert">{readError || error}</p>}
    {notice && <p className="roadmap-team-notice" role="status">{notice}</p>}
    {!readError && <>
      <form className="roadmap-team-invite" onSubmit={invite}>
        <label htmlFor="team-founder-email">Founder email<span className="required-mark" aria-hidden="true" /></label>
        <input id="team-founder-email" type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="founder@example.com" required maxLength={254} />
        <label htmlFor="team-founder-role">Roadmap role<span className="required-mark" aria-hidden="true" /></label>
        <select id="team-founder-role" value={memberRole} onChange={(event) => setMemberRole(event.target.value)} required><option value="member">Member</option><option value="co-founder">Co-founder</option></select>
        <button type="submit" className="roadmap-team-button roadmap-team-button--primary"><Mail size={16} />Save invitation</button>
      </form>
      <section className="roadmap-team-members" aria-labelledby="roadmap-team-members-title" data-revision={revision}>
        <h3 id="roadmap-team-members-title">Members <span>{team.members.length}</span></h3>
        <p className="roadmap-team-note">The first mission is yours to complete. Future missions can be assigned now and become actionable when they unlock. Assigning a mission to another member replaces its previous assignment.</p>
        {team.members.length === 0 ? <p className="roadmap-team-empty">Accepted invitations will appear here.</p> : team.members.map((member) => (
          <article key={member.id} className="roadmap-team-member" aria-label={`Member: ${member.full_name}`}>
            <div className="roadmap-team-member-heading"><div><strong>{member.full_name}</strong><span>{member.email}</span></div><small>{roleLabel(member.memberRole)}</small></div>
            <form className="roadmap-team-assignment" onSubmit={(event) => {
              event.preventDefault();
              const missionId = selectedMissions[member.id] || '';
              if (update(() => collaborationStore.assignMission(project.id, member.id, missionId, user.id), 'Mission assignment saved.')) {
                setSelectedMissions((current) => ({ ...current, [member.id]: '' }));
              }
            }}>
              <label htmlFor={`team-mission-${member.id}`}>Mission for {member.full_name}<span className="required-mark" aria-hidden="true" /></label>
              <div><select id={`team-mission-${member.id}`} value={selectedMissions[member.id] || ''} onChange={(event) => setSelectedMissions((current) => ({ ...current, [member.id]: event.target.value }))} required>
                <option value="">Choose a mission</option>
                {missionCatalog.filter((mission) => mission.id !== 'discover-l1-m1').map((mission) => <option key={mission.id} value={mission.id}>{mission.stageName} · Level {mission.level} · {mission.name}</option>)}
              </select><button type="submit" className="roadmap-team-button" aria-label={`Assign mission to ${member.full_name}`}><Plus size={15} />Assign mission</button></div>
            </form>
            {member.assignedMissionIds.length > 0 ? <ul className="roadmap-team-assigned">{member.assignedMissionIds.map((id) => {
              const mission = missionCatalog.find((item) => item.id === id);
              return <li key={id}><span>{mission ? `${mission.stageName} · Level ${mission.level} · ${mission.name}` : id}</span><button type="button" onClick={() => update(() => collaborationStore.removeAssignment(project.id, member.id, id, user.id), 'Mission assignment removed.')} aria-label={`Remove ${mission?.name || id} assignment from ${member.full_name}`}><X size={15} /></button></li>;
            })}</ul> : <p className="roadmap-team-empty">No missions assigned yet.</p>}
          </article>
        ))}
      </section>
      {team.invitations.length > 0 && <section className="roadmap-team-pending" aria-labelledby="roadmap-team-invitations-title"><h3 id="roadmap-team-invitations-title">Invitations</h3><ul>{team.invitations.map((invitation) => <li key={invitation.id}><div><strong>{invitation.recipientName}</strong><span>{invitation.recipientEmail} · {roleLabel(invitation.memberRole)}</span></div><span>{invitation.status === 'pending' ? 'Pending' : 'Declined'}</span></li>)}</ul></section>}
    </>}
  </dialog>;
}

export function RoadmapTeam({ project, roadmap, onChange }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user || user.role !== 'founder' || project.owner_id !== user.id) return null;
  return <>
    <button type="button" className="roadmap-team-button" onClick={() => setOpen(true)}><Users size={17} />Manage team</button>
    {open && <TeamDialog project={project} roadmap={roadmap} user={user} onChange={onChange} onClose={() => setOpen(false)} />}
  </>;
}
