import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Clock3, Fingerprint, LoaderCircle, Megaphone, Search, Send, UserRoundPlus, X } from 'lucide-react';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { collaborationDate, collaborationStatus, useCollaborationAction, useCollaborationRefresh } from './collaboration_ui.js';
import './CollaborationPortal.css';

export function CollaborationFeedback({ action }) {
  return <>{action.error && <p className="roadmap-team-error" role="alert">{action.error}</p>}{action.notice && <p className="roadmap-team-notice" role="status">{action.notice}</p>}</>;
}

export function CollaborationBadge({ item, kind }) {
  const Icon = item.status === 'pending' ? Clock3 : item.status === 'declined' ? X : CheckCircle2;
  return <span className={`collab-status collab-status--${item.status}`}><Icon size={14} aria-hidden="true" />{collaborationStatus(item, kind)}</span>;
}

function FormField({ label, name, value, onChange, error, multiline = false, optional = false, prefix }) {
  const id = `${prefix}-${name}`;
  const props = { id, name, value, onChange: (event) => onChange(name, event.target.value), required: !optional, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined };
  return <div className="collab-field"><label htmlFor={id}>{label} {optional ? <span>(optional)</span> : <span className="required-mark" aria-hidden="true" />}</label>{multiline ? <textarea {...props} rows={3} /> : <input {...props} />}{error && <p id={`${id}-error`} className="collab-field-error">{error}</p>}</div>;
}

export function PublishOpportunityForm({ project, user, onChange }) {
  const prefix = useId();
  const empty = { title: '', description: '', contribution: '', skills: '', expectations: '' };
  const [form, setForm] = useState(empty);
  const [fields, setFields] = useState({});
  const token = useRef(globalThis.crypto.randomUUID());
  const action = useCollaborationAction();
  const update = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setFields((current) => ({ ...current, [name]: '' })); };
  function publish(event) {
    event.preventDefault();
    const errors = Object.fromEntries(['title', 'description', 'contribution', 'skills'].filter((field) => !form[field].trim()).map((field) => [field, `Enter ${field === 'contribution' ? 'the role or contribution needed' : field === 'skills' ? 'relevant skills or experience' : `an opportunity ${field}`}.`]));
    setFields(errors);
    if (Object.keys(errors).length) { action.setError('Complete the required fields before publishing.'); document.getElementById(`${prefix}-${Object.keys(errors)[0]}`)?.focus(); return; }
    action.run(() => collaborationStore.publishOpportunity(project.id, { ...form, clientToken: token.current }, user.id), 'Collaboration post published. Members can now request to join.', () => { setForm(empty); token.current = globalThis.crypto.randomUUID(); onChange?.(); }, (err) => setFields(err.fields || {}));
  }
  return <form className="collab-form" onSubmit={publish} noValidate aria-busy={action.busy}>
    <div className="collab-panel-heading"><Megaphone size={21} /><div><h3>Publish a collaboration opportunity</h3><p>Founder action · Applications go to you for review.</p></div></div>
    <p className="collab-project-context">Startup / project <strong>{project.name}</strong></p>
    <fieldset disabled={action.busy} className="collab-fieldset">
      <FormField prefix={prefix} label="Opportunity title" name="title" value={form.title} onChange={update} error={fields.title} />
      <FormField prefix={prefix} label="Opportunity description" name="description" value={form.description} onChange={update} error={fields.description} multiline />
      <div className="collab-form-grid"><FormField prefix={prefix} label="Role or contribution needed" name="contribution" value={form.contribution} onChange={update} error={fields.contribution} /><FormField prefix={prefix} label="Skills or experience" name="skills" value={form.skills} onChange={update} error={fields.skills} /></div>
      <FormField prefix={prefix} label="Additional expectations" name="expectations" value={form.expectations} onChange={update} error={fields.expectations} optional multiline />
    </fieldset>
    <CollaborationFeedback action={action} />
    <button className="roadmap-team-button roadmap-team-button--primary" type="submit" disabled={action.busy}>{action.busy ? <LoaderCircle className="collab-spin" size={16} /> : <Megaphone size={16} />}{action.busy ? 'Publishing…' : 'Publish Collaboration Post'}</button>
  </form>;
}

export function DirectInvitationForm({ project, user, onChange }) {
  const prefix = useId();
  const [memberId, setMemberId] = useState('');
  const [selected, setSelected] = useState(null);
  const [searched, setSearched] = useState(false);
  const [memberRole, setMemberRole] = useState('member');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState('');
  const search = useCollaborationAction();
  const send = useCollaborationAction();
  const busy = search.busy || send.busy;
  let restriction = '';
  if (selected) {
    try {
      const team = collaborationStore.getTeam(project.id, user.id);
      restriction = selected.id === user.id ? 'You already own this startup. Choose another member.'
        : team.members.some((member) => member.id === selected.id) ? 'Already a team member. This person can receive mission assignments.'
          : team.invitations.some((invitation) => invitation.recipientId === selected.id && invitation.status === 'pending') ? 'Pending Member Response. This member already has an invitation to this startup.' : '';
    } catch (err) { restriction = err.message; }
  }
  function find(event) {
    event.preventDefault();
    setFieldError(''); setSelected(null); setSearched(false); send.setNotice(''); send.setError('');
    if (!memberId.trim()) { setFieldError('Enter the exact Member ID.'); document.getElementById(`${prefix}-member`)?.focus(); return; }
    search.run(() => collaborationStore.searchMember(project.id, memberId.trim(), user.id), '', (result) => { setSelected(result); setSearched(true); });
  }
  function invite() {
    if (!selected || restriction) return;
    send.run(() => collaborationStore.inviteMember(project.id, selected.id, { memberRole, message }, user.id), 'Pending Member Response. The invitation is available to this member in this browser.', () => { onChange?.(); });
  }
  return <section className="collab-form" aria-label="Direct Member Invitation">
    <div className="collab-panel-heading"><UserRoundPlus size={21} /><div><h3>Invite a specific member</h3><p>Founder sends · Member accepts or declines.</p></div></div>
    <p className="collab-project-context">Startup / project <strong>{project.name}</strong></p>
    <form onSubmit={find} noValidate aria-busy={search.busy}>
      <div className="collab-field"><label htmlFor={`${prefix}-member`}>Member ID <span className="required-mark" aria-hidden="true" /></label><div className="collab-search-row"><input id={`${prefix}-member`} autoComplete="off" autoCapitalize="none" spellCheck={false} value={memberId} disabled={busy} onChange={(event) => { setMemberId(event.target.value); setSelected(null); setSearched(false); setFieldError(''); send.setError(''); send.setNotice(''); search.setError(''); }} aria-invalid={Boolean(fieldError)} aria-describedby={`${prefix}-member-hint${fieldError ? ` ${prefix}-member-error` : ''}`} /><button type="submit" className="roadmap-team-button" disabled={busy}>{search.busy ? <LoaderCircle className="collab-spin" size={16} /> : <Search size={16} />}{search.busy ? 'Searching…' : 'Search Member'}</button></div><small id={`${prefix}-member-hint`}>Use the complete, case-sensitive Member ID shown in the member’s Join Roadmap popup.</small>{fieldError && <p id={`${prefix}-member-error`} className="collab-field-error">{fieldError}</p>}</div>
    </form>
    <CollaborationFeedback action={search} />
    <div aria-live="polite">{searched && !selected && <p className="collab-no-result">No member found for this Member ID. Check the full ID and try again.</p>}{selected && <div className="collab-member-result"><span className="collab-avatar" aria-hidden="true">{selected.full_name?.slice(0, 1) || 'M'}</span><div><strong>{selected.full_name}</strong>{selected.username && <span>@{selected.username}</span>}<span>Member ID: <code>{selected.id}</code></span></div><CheckCircle2 size={19} aria-label="Member identified" /></div>}</div>
    <fieldset disabled={busy} className="collab-fieldset"><div className="collab-field"><label htmlFor={`${prefix}-role`}>Team role</label><select id={`${prefix}-role`} value={memberRole} onChange={(event) => setMemberRole(event.target.value)}><option value="member">Member</option><option value="co-founder">Co-founder</option></select></div><div className="collab-field"><label htmlFor={`${prefix}-message`}>Invitation message <span>(optional)</span></label><textarea id={`${prefix}-message`} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></div></fieldset>
    <CollaborationFeedback action={send} />
    <button type="button" className="roadmap-team-button roadmap-team-button--primary" onClick={invite} disabled={!selected || busy || Boolean(send.notice) || Boolean(restriction)} aria-describedby={!selected || restriction ? `${prefix}-send-hint` : undefined}>{send.busy ? <LoaderCircle className="collab-spin" size={16} /> : <Send size={16} />}{send.busy ? 'Sending invitation…' : 'Send Invitation'}</button>{(!selected || restriction) && <small id={`${prefix}-send-hint`} className="collab-muted">{restriction || 'Search and identify a member before sending.'}</small>}
  </section>;
}

function OpportunityCard({ opportunity, user, onChange }) {
  const prefix = useId();
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState('');
  const action = useCollaborationAction();
  const eligible = opportunity.relationship === 'available' && opportunity.status === 'published';
  function submit(event) {
    event.preventDefault();
    if (!message.trim()) { setFieldError('Explain your interest or intended contribution.'); return; }
    action.run(() => collaborationStore.requestToJoin(opportunity.id, { message }, user.id), 'Pending Founder Review. Your request has been saved; membership begins only after acceptance.', () => { setApplying(false); onChange?.(); });
  }
  return <article className="collab-opportunity" aria-label={`Opportunity: ${opportunity.title}`}>
    <div className="collab-card-topline"><span>{opportunity.project.name}</span><span className="collab-open">{opportunity.status === 'published' ? 'Open opportunity' : 'Unavailable'}</span></div>
    <h3>{opportunity.title}</h3><p className="collab-byline">Published by {opportunity.founder?.full_name || opportunity.project.created_by}</p><p className="collab-description">{opportunity.description}</p>
    <dl className="collab-details"><div><dt>Contribution</dt><dd>{opportunity.contribution}</dd></div><div><dt>Skills / experience</dt><dd>{opportunity.skills}</dd></div>{opportunity.expectations && <div><dt>Expectations</dt><dd>{opportunity.expectations}</dd></div>}</dl>
    {eligible && !applying && <button className="roadmap-team-button" type="button" onClick={() => setApplying(true)}><UserRoundPlus size={16} />Request to Join</button>}
    {opportunity.relationship === 'owner' && <span className="collab-muted">Your startup · Review incoming requests in Founder workspace.</span>}
    {opportunity.relationship === 'member' && <span className="collab-status collab-status--accepted"><CheckCircle2 size={14} />Already a team member</span>}
    {opportunity.relationship === 'pending' && <div><span className="collab-muted">Request pending</span><CollaborationBadge item={opportunity.ownRequest || { status: 'pending' }} kind="request" /></div>}
    {opportunity.relationship === 'declined' && <CollaborationBadge item={opportunity.ownRequest || { status: 'declined' }} kind="request" />}
    {opportunity.relationship === 'unavailable' && <span className="collab-muted">This opportunity is not accepting requests.</span>}
    {applying && eligible && <form className="collab-request-form" onSubmit={submit} noValidate aria-busy={action.busy}><h4>Request to join {opportunity.project.name}</h4><p>Applying as <strong>{user.full_name}</strong> · Member ID <code>{user.id}</code></p><div className="collab-field"><label htmlFor={`${prefix}-interest`}>Your interest or contribution <span className="required-mark" aria-hidden="true" /></label><textarea id={`${prefix}-interest`} rows={3} autoFocus required value={message} disabled={action.busy} onChange={(event) => { setMessage(event.target.value); setFieldError(''); }} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? `${prefix}-interest-error` : undefined} />{fieldError && <p className="collab-field-error" id={`${prefix}-interest-error`}>{fieldError}</p>}</div><div className="collab-actions"><button className="roadmap-team-button" type="button" onClick={() => setApplying(false)} disabled={action.busy}>Cancel</button><button className="roadmap-team-button roadmap-team-button--primary" type="submit" disabled={action.busy}>{action.busy ? 'Submitting request…' : 'Submit Join Request'}<ArrowRight size={15} /></button></div></form>}
    <CollaborationFeedback action={action} />
  </article>;
}

export function PublicOpportunities({ user }) {
  const refresh = useCollaborationRefresh();
  let opportunities = []; let error = '';
  try { opportunities = collaborationStore.listOpportunities(user.id); } catch (err) { error = err.message; }
  return <section className="collab-section" aria-labelledby="collab-opportunities-title"><div className="collab-section-heading"><div><h2 id="collab-opportunities-title">Discover collaboration opportunities</h2><p>Member action · Find a startup and tell the founder how you can contribute.</p></div><span className="roadmap-count">{opportunities.length} published</span></div>{error && <p className="roadmap-team-error" role="alert">{error}</p>}{opportunities.length ? <div className="collab-opportunities">{opportunities.map((opportunity) => <OpportunityCard key={`${user.id}:${opportunity.id}`} opportunity={opportunity} user={user} onChange={refresh} />)}</div> : !error && <div className="roadmap-collaboration-empty"><Megaphone size={24} /><h3>No collaboration posts yet</h3><p>Published opportunities will appear here. Founders can create the first post in Founder workspace.</p></div>}</section>;
}

function RequestRow({ request, user, founder, onChange }) {
  const action = useCollaborationAction();
  function respond(response) {
    action.run(() => collaborationStore.respondJoinRequest(request.id, response, user.id), response === 'accepted' ? 'Member Joins Startup Team. The member can now receive mission assignments.' : 'Declined by Founder. No team membership was created.', onChange);
  }
  return <li className="collab-request-row"><div><div className="collab-card-topline"><strong>{founder ? request.applicantName : request.project?.name}</strong><CollaborationBadge item={request} kind="request" /></div><h3>{request.opportunity?.title || 'Collaboration request'}</h3>{founder && <p><Fingerprint size={13} />Member ID: <code>{request.applicantId}</code></p>}<p className="collab-request-message">{request.message}</p><p>Requested {collaborationDate(request.createdAt)}{request.respondedAt && ` · Decision ${collaborationDate(request.respondedAt)}`}</p>{founder && request.status === 'pending' && <div className="collab-actions"><button type="button" className="roadmap-team-button" disabled={action.busy} onClick={() => respond('declined')}><X size={15} />Decline</button><button type="button" className="roadmap-team-button roadmap-team-button--primary" disabled={action.busy} onClick={() => respond('accepted')}><Check size={15} />{action.busy ? 'Saving decision…' : 'Accept'}</button></div>}{request.status === 'accepted' && <Link className="collab-text-link" to={founder ? `/roadmap/${encodeURIComponent(request.projectId)}` : `/roadmap/joined/${encodeURIComponent(request.ownerId)}/${encodeURIComponent(request.projectId)}`}>{founder ? 'Open team and assign missions' : 'Open team and assigned missions'}<ArrowRight size={14} /></Link>}<CollaborationFeedback action={action} /></div></li>;
}

export function JoinRequests({ project, user, founder = false }) {
  const refresh = useCollaborationRefresh();
  const id = useId();
  let requests = []; let error = '';
  try { requests = founder ? collaborationStore.listJoinRequests(project.id, user.id) : collaborationStore.listMyJoinRequests(user.id); } catch (err) { error = err.message; }
  return <section className="roadmap-collaboration-list collab-section" aria-labelledby={`${id}-requests`}><h2 id={`${id}-requests`}>{founder ? 'Incoming join requests' : 'Your join requests'} <span className="roadmap-count">{requests.length}</span></h2><p>{founder ? `Review applications for ${project.name}. Acceptance adds the member to this startup team.` : 'Track founder decisions. Pending requests do not grant team or mission access.'}</p>{error && <p className="roadmap-team-error" role="alert">{error}</p>}{requests.length ? <ul>{requests.map((request) => <RequestRow key={request.id} request={request} user={user} founder={founder} onChange={refresh} />)}</ul> : !error && <div className="roadmap-collaboration-empty">{founder ? 'No join requests for this project yet.' : 'No join requests yet. Browse the published opportunities to get started.'}</div>}</section>;
}

export function OutgoingInvitations({ project, user }) {
  useCollaborationRefresh();
  const id = useId();
  let invitations = []; let error = '';
  try { invitations = collaborationStore.getTeam(project.id, user.id).invitations; } catch (err) { error = err.message; }
  return <section className="roadmap-collaboration-list collab-section" aria-labelledby={`${id}-outgoing`}><h2 id={`${id}-outgoing`}>Sent invitations <span className="roadmap-count">{invitations.length}</span></h2><p>Direct invitations for {project.name}. Only the invited member can accept or decline.</p>{error && <p className="roadmap-team-error" role="alert">{error}</p>}{invitations.length ? <ul>{invitations.map((invitation) => <li key={invitation.id}><div><h3>{invitation.recipientName}</h3><p>Member ID: <code>{invitation.recipientId}</code></p>{invitation.message && <p className="collab-request-message">{invitation.message}</p>}<p>Sent {collaborationDate(invitation.createdAt)}{invitation.respondedAt && ` · Responded ${collaborationDate(invitation.respondedAt)}`}</p></div><CollaborationBadge item={invitation} /></li>)}</ul> : !error && <div className="roadmap-collaboration-empty">No direct invitations for this project yet.</div>}</section>;
}
