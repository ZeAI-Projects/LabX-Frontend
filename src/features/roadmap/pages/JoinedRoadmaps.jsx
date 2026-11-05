import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Filter, LogOut, Search, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { ProjectFilterSelect, ProjectsPagination, SortHeading } from '../../projects/components/ProjectsCollectionControls.jsx';
import { formatRoadmapDate, PROJECTS_PER_PAGE, UNSET_DOMAIN } from '../../projects/services/project_list.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { CollaborationBadge, CollaborationFeedback } from '../components/CollaborationPortal.jsx';
import { collaborationDate, useCollaborationAction, useCollaborationRefresh, useCollaborationVersion } from '../components/collaboration_ui.js';
import { createMockRoadmap } from '../services/mock_roadmap.js';
import { RoadmapPage } from './RoadmapPage.jsx';
import '../components/RoadmapTeam.css';

const roleLabel = (role) => role === 'co-founder' ? 'Co-founder' : 'Member';
const assignmentStatuses = [['assigned', 'Assigned'], ['exit-requested', 'Exit requested']];
const assignmentSorts = ['project-asc', 'project-desc', 'founder-asc', 'founder-desc', 'domain-asc', 'domain-desc', 'mission-asc', 'mission-desc', 'joined-asc', 'joined-desc', 'expires-asc', 'expires-desc', 'status-asc', 'status-desc'];
const assignmentStatus = (assignment) => assignment.leaveRequest ? 'exit-requested' : 'assigned';

function demoAssignmentsFrom(projects, leaveRequests) {
  return projects.map((project) => {
    const level = Number.isInteger(project.level) ? project.level : 1;
    const roadmap = createMockRoadmap({ domain: project.domain, stage: project.stage, level });
    const stage = roadmap.stages.find((item) => item.name === project.stage) || roadmap.stages[0];
    const selectedLevel = stage.levels.find((item) => item.number === level) || stage.levels[0];
    const mission = selectedLevel.milestones.find((item) => item.name === project.currentMission) || selectedLevel.milestones[0];
    return {
      id: `demo-assignment:${project.id}`,
      ownerId: '',
      projectId: project.id,
      missionId: mission.id,
      assignedAt: project.updated_at || '',
      joinedAt: project.joinedAt || null,
      expiresAt: project.expiresAt || null,
      status: 'assigned',
      leaveRequest: leaveRequests.has(project.id) ? { status: 'pending', visualDemo: true } : null,
      project: { ...project, owner_id: '' },
      mission,
      visualDemo: true,
    };
  });
}

function selectAssignmentRows(rows, { query, status, domain, sort }) {
  const needle = query.trim().toLocaleLowerCase();
  const filtered = rows.filter((assignment) => {
    const projectDomain = assignment.project.assessment_result?.domain || assignment.project.domain || '';
    const description = `${assignment.project.name} ${assignment.project.created_by || ''} ${projectDomain} ${assignment.mission.name} ${assignment.mission.stageName} level ${assignment.mission.level}`.toLocaleLowerCase();
    return (!needle || description.includes(needle))
      && (!status || assignmentStatus(assignment) === status)
      && (!domain || (domain === UNSET_DOMAIN ? !projectDomain : projectDomain === domain));
  });
  const separator = sort.lastIndexOf('-');
  const field = sort.slice(0, separator);
  const direction = sort.slice(separator + 1) === 'desc' ? -1 : 1;
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  filtered.sort((a, b) => {
    const values = {
      project: [a.project.name, b.project.name],
      founder: [a.project.created_by || '', b.project.created_by || ''],
      domain: [a.project.assessment_result?.domain || a.project.domain || '', b.project.assessment_result?.domain || b.project.domain || ''],
      mission: [`${a.mission.stageName} ${a.mission.level} ${a.mission.name}`, `${b.mission.stageName} ${b.mission.level} ${b.mission.name}`],
      joined: [a.joinedAt || '', b.joinedAt || ''],
      expires: [a.expiresAt || '', b.expiresAt || ''],
      status: [assignmentStatus(a), assignmentStatus(b)],
    }[field] || [a.project.name, b.project.name];
    const left = ['joined', 'expires'].includes(field) ? Date.parse(values[0]) || 0 : values[0];
    const right = ['joined', 'expires'].includes(field) ? Date.parse(values[1]) || 0 : values[1];
    const comparison = typeof left === 'number' ? left - right : collator.compare(left, right);
    return comparison * direction || collator.compare(a.id, b.id);
  });
  return filtered;
}

function AssignmentExitAction({ assignment, userId, onChange, onDemoRequest }) {
  const action = useCollaborationAction();
  const dialogRef = useRef(null);
  const disabled = action.busy || Boolean(assignment.leaveRequest);
  const label = assignment.leaveRequest
      ? `Exit request pending for ${assignment.mission.name}`
      : `Request to leave ${assignment.mission.name}`;
  const requestExit = () => action.run(
      () => assignment.visualDemo
        ? onDemoRequest(assignment.projectId)
        : collaborationStore.requestAssignmentExit(assignment.projectId, assignment.ownerId, assignment.missionId, userId),
      assignment.visualDemo
        ? 'Exit request saved for this sample mission. It remains assigned until founder approval.'
        : 'Exit request sent to the roadmap founder. Your assignment stays active until it is approved.',
      () => { dialogRef.current?.close(); onChange(); },
    );
  return <div className="projects-assignment-exit">
    <button type="button" className="project-row__action project-row__action--danger" aria-label={label} title={label} disabled={disabled || action.busy} onClick={() => dialogRef.current?.showModal()}>
      <LogOut size={16} aria-hidden="true" />
    </button>
    {!assignment.leaveRequest && <dialog ref={dialogRef} className="roadmap-team-dialog roadmap-exit-dialog" aria-labelledby={`exit-request-title-${assignment.id}`}>
      <div className="roadmap-team-heading">
        <div><span className="roadmap-team-kicker">Mission exit request</span><h2 id={`exit-request-title-${assignment.id}`}>Request to leave this mission?</h2></div>
        <button type="button" className="roadmap-team-close" aria-label="Close exit request confirmation" onClick={() => dialogRef.current?.close()}><X size={18} aria-hidden="true" /></button>
      </div>
      <p className="roadmap-team-note">This sends a request to the founder for <strong>{assignment.mission.name}</strong> in <strong>{assignment.project.name}</strong>. You remain assigned until the founder approves it.</p>
      <CollaborationFeedback action={action} />
      <div className="roadmap-team-toolbar">
        <button type="button" className="roadmap-team-button" disabled={action.busy} onClick={() => dialogRef.current?.close()}>Cancel</button>
        <button type="button" className="roadmap-team-button roadmap-team-button--primary" disabled={action.busy} onClick={requestExit}>{action.busy ? 'Sending…' : 'Send exit request'}</button>
      </div>
    </dialog>}
    <CollaborationFeedback action={action} />
  </div>;
}

export function JoinedRoadmaps({ demoProjects = [], compact = false }) {
  const titleId = useId();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [domainFilterOpen, setDomainFilterOpen] = useState(false);
  const [searchDraftState, setSearchDraftState] = useState({ query: '', value: '' });
  const [demoLeaveRequests, setDemoLeaveRequests] = useState(() => new Set());
  const domainFilterRef = useRef(null);
  const collaborationRevision = useCollaborationVersion();
  const joinedSnapshot = useMemo(() => {
    try {
      return user?.role === 'founder'
        ? { joined: collaborationStore.listJoinedProjects(user.id), assignments: collaborationStore.listMyAssignments(user.id), error: '', revision: collaborationRevision }
        : { joined: [], assignments: [], error: '', revision: collaborationRevision };
    } catch (err) { return { joined: [], assignments: [], error: err.message, revision: collaborationRevision }; }
  }, [user, collaborationRevision]);
  const { joined, assignments = [], error } = joinedSnapshot;
  const allJoined = useMemo(() => [...joined, ...demoProjects], [joined, demoProjects]);
  const assignmentRows = useMemo(() => [...assignments, ...demoAssignmentsFrom(demoProjects, demoLeaveRequests)], [assignments, demoProjects, demoLeaveRequests]);
  const query = searchParams.get('q') || '';
  const status = assignmentStatuses.some(([value]) => value === searchParams.get('status')) ? searchParams.get('status') : '';
  const domain = searchParams.get('domain') || '';
  const sort = assignmentSorts.includes(searchParams.get('sort')) ? searchParams.get('sort') : 'joined-desc';
  const searchDraft = searchDraftState.query === query ? searchDraftState.value : query;
  const setSearchDraft = (value) => setSearchDraftState({ query, value });
  const domains = useMemo(() => [...new Set(assignmentRows.map((row) => row.project.assessment_result?.domain || row.project.domain || UNSET_DOMAIN))]
    .sort((a, b) => a === UNSET_DOMAIN ? 1 : b === UNSET_DOMAIN ? -1 : a.localeCompare(b)), [assignmentRows]);
  const filteredAssignments = useMemo(() => selectAssignmentRows(assignmentRows, { query, status, domain, sort }), [assignmentRows, query, status, domain, sort]);
  const pageParam = searchParams.get('page') || '1';
  const pages = Math.max(1, Math.ceil(filteredAssignments.length / PROJECTS_PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(Number(pageParam)) ? Number(pageParam) : 1));
  const from = filteredAssignments.length ? (page - 1) * PROJECTS_PER_PAGE + 1 : 0;
  const to = Math.min(page * PROJECTS_PER_PAGE, filteredAssignments.length);
  const visibleAssignments = filteredAssignments.slice(from - 1, to);
  const hasFilters = Boolean(query || status || domain);
  const activeFilterCount = Number(Boolean(status)) + Number(Boolean(domain));

  useEffect(() => {
    if (!domainFilterOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!domainFilterRef.current?.contains(event.target)) setDomainFilterOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setDomainFilterOpen(false); };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [domainFilterOpen]);

  const updateControl = (key, value) => {
    setSearchParams(() => {
      const next = new URLSearchParams(window.location.search);
      if (value && !(key === 'sort' && value === 'updated')) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    }, { replace: true });
  };
  const clearFilters = () => {
    setSearchParams(() => {
      const next = new URLSearchParams(window.location.search);
      ['q', 'status', 'domain', 'page'].forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
    setSearchDraft('');
    setDomainFilterOpen(false);
  };
  const submitSearch = (event) => {
    event.preventDefault();
    updateControl('q', searchDraft.trim());
  };
  const updatePage = (nextPage) => {
    setSearchParams(() => {
      const next = new URLSearchParams(window.location.search);
      if (nextPage > 1) next.set('page', String(nextPage));
      else next.delete('page');
      return next;
    }, { replace: true });
  };
  const refresh = useCollaborationRefresh();
  const requestDemoExit = (projectId) => setDemoLeaveRequests((previous) => new Set(previous).add(projectId));

  if (!user || user.role !== 'founder') return null;
  if (compact) return <section className="projects-listing projects-listing--joined" aria-label="Joined as Member assignments">
    {error && <p className="roadmap-team-error" role="alert">{error}</p>}
    <div className="projects-controls" aria-label="Search and filter assigned missions">
      <form className="projects-compact-search" role="search" onSubmit={submitSearch}>
        <Search size={16} aria-hidden="true" />
        <input id="joined-roadmap-search" type="search" aria-label="Search assigned missions" placeholder="Search missions or roadmaps..." value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={100} enterKeyHint="search" />
        <button type="submit" aria-label="Apply mission search"><ArrowRight size={15} aria-hidden="true" /></button>
        {(query || searchDraft) && <button type="button" aria-label="Clear search" onClick={() => { setSearchDraft(''); updateControl('q', ''); }}><X size={14} aria-hidden="true" /></button>}
      </form>
      <div className="projects-filter-anchor" ref={domainFilterRef}>
        <button type="button" className={`projects-filter-button${domainFilterOpen ? ' is-active' : ''}`} aria-label="Toggle mission filters" title="Filters" aria-expanded={domainFilterOpen} onClick={() => setDomainFilterOpen((value) => !value)}>
          <Filter size={16} aria-hidden="true" />{activeFilterCount > 0 && <span className="projects-filter-count">{activeFilterCount}</span>}
        </button>
        {domainFilterOpen && <div className="projects-filter-panel">
          <ProjectFilterSelect label="Status" value={status} options={[['', 'All statuses'], ...assignmentStatuses]} onChange={(value) => updateControl('status', value)} />
          <ProjectFilterSelect label="Domain" value={domain} options={[['', 'All domains'], ...domains.map((value) => [value, value === UNSET_DOMAIN ? 'Domain not set yet' : value])]} onChange={(value) => updateControl('domain', value)} />
          {(domain || status) && <button type="button" onClick={clearFilters}>Clear filters</button>}
        </div>}
      </div>
    </div>
    <div className="projects-results-summary"><p role="status" aria-live="polite">{hasFilters ? `${filteredAssignments.length} of ${assignmentRows.length} missions match` : `${assignmentRows.length} assigned missions`}</p>{hasFilters && <button type="button" onClick={clearFilters}><X size={14} aria-hidden="true" />Clear filters</button>}</div>
    {filteredAssignments.length ? <>
      <div className="projects-list" role="region" aria-label="Assigned missions table" tabIndex={0}>
        <table className="projects-table projects-table--assignments">
          <caption className="projects-sr-only">Missions assigned to you, their roadmaps and founders, dates, status, and exit request action</caption>
          <colgroup><col className="projects-table__mission" /><col className="projects-table__project" /><col className="projects-table__creator" /><col className="projects-table__date" /><col className="projects-table__date" /><col className="projects-table__status" /><col className="projects-table__actions" /></colgroup>
          <thead><tr>
            <th scope="col" aria-sort={sort.startsWith('mission-') ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'}><SortHeading label="Mission" ascending="mission-asc" descending="mission-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
            <th scope="col" aria-sort={sort.startsWith('project-') ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'}><SortHeading label="Project" ascending="project-asc" descending="project-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
            <th scope="col" aria-sort={sort.startsWith('founder-') ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'}><SortHeading label="Founder" ascending="founder-asc" descending="founder-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
            <th scope="col" aria-sort={sort.startsWith('joined-') ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'}><SortHeading label="Joined at" ascending="joined-asc" descending="joined-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
            <th scope="col" aria-sort={sort.startsWith('expires-') ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'}><SortHeading label="Expire Date" ascending="expires-asc" descending="expires-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
            <th scope="col" aria-sort={sort.startsWith('status-') ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'}><SortHeading label="Status" ascending="status-asc" descending="status-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
            <th scope="col">Action</th>
          </tr></thead>
          <tbody>{visibleAssignments.map((assignment) => {
            const projectDomain = assignment.project.assessment_result?.domain || assignment.project.domain || 'Domain not set yet';
            const statusValue = assignmentStatus(assignment);
            const route = assignment.visualDemo
              ? `/roadmap/demo/${encodeURIComponent(assignment.projectId)}`
              : `/roadmap/joined/${encodeURIComponent(assignment.ownerId)}/${encodeURIComponent(assignment.projectId)}`;
            const missionUrl = `${route}?milestone=${encodeURIComponent(assignment.missionId)}`;
            return <tr className="project-row" key={assignment.id}>
              <th scope="row" data-label="Mission"><Link className="projects-assignment-mission" to={missionUrl}>{assignment.mission.name}<small>{assignment.mission.stageName} · Level {assignment.mission.level}</small></Link></th>
              <td data-label="Project"><div className="project-row__identity"><div><h2 title={assignment.project.name}><Link className="project-row__title-link" to={route}>{assignment.project.name}</Link></h2><span className="project-row__domain" title={projectDomain}>{projectDomain}</span></div></div></td>
              <td data-label="Founder"><span className="project-row__creator">{assignment.project.created_by || 'Founder'}</span></td>
              <td data-label="Joined at" className="project-row__date">{formatRoadmapDate(assignment.joinedAt)}</td>
              <td data-label="Expire Date" className="project-row__date" title={assignment.expiresAt ? undefined : 'No expiry date is set'}>{formatRoadmapDate(assignment.expiresAt)}</td>
              <td data-label="Status"><span className={`project-status project-status--${statusValue}`}>{statusValue === 'exit-requested' ? 'Exit requested' : 'Assigned'}</span></td>
              <td className="project-row__actions-cell" data-label="Action"><div className="project-row__actions"><AssignmentExitAction assignment={assignment} userId={user.id} onChange={refresh} onDemoRequest={requestDemoExit} /></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <ProjectsPagination total={filteredAssignments.length} from={from} to={to} page={page} pages={pages} onPageChange={updatePage} itemLabel="missions" />
    </> : hasFilters ? <section className="projects-no-results" aria-labelledby="joined-missions-no-results-title"><Search size={28} aria-hidden="true" /><h3 id="joined-missions-no-results-title">No missions match your filters</h3><p>Try another mission, roadmap, founder, status, or domain.</p><button type="button" className="projects-button" onClick={clearFilters}>Clear search and filters</button></section> : !error && <div className="roadmap-collaboration-empty">No missions have been assigned to you yet. Accepted roadmap assignments will appear here.</div>}
  </section>;
  return <section className="roadmap-collaboration-list" aria-labelledby={titleId}>
    <h2 id={titleId}>Joined as Member</h2>
    <p>Teams you joined through an accepted request or invitation. Your assigned missions become actionable when they unlock.</p>
    {error && <p className="roadmap-team-error" role="alert">{error}</p>}
    {allJoined.length ? <ul>
      {joined.map((project) => <li key={`${project.owner_id}:${project.id}`}>
        <div><h3>{project.name}</h3><CollaborationBadge item={{ status: 'accepted' }} /><p>Owned by {project.created_by} · {roleLabel(project.memberRole)}</p><p>{project.assessment_result?.domain || 'Domain not set'} · {project.assignedMissionIds.length} assigned mission{project.assignedMissionIds.length === 1 ? '' : 's'}</p></div>
        <Link className="roadmap-team-button" to={`/roadmap/joined/${encodeURIComponent(project.owner_id)}/${encodeURIComponent(project.id)}`} aria-label={`Open joined roadmap: ${project.name}`}>Open roadmap<ArrowRight size={15} /></Link>
      </li>)}
      {demoProjects.map((project) => <li key={`demo:${project.id}`}>
        <div><h3>{project.name}</h3><CollaborationBadge item={{ status: 'accepted' }} /><p>Owned by {project.created_by} · {roleLabel(project.memberRole || 'member')}</p><p>{project.domain} · {project.stage} · Level {project.level}</p></div>
        <Link className="roadmap-team-button" to={`/roadmap/demo/${encodeURIComponent(project.id)}`} aria-label={`Open joined roadmap: ${project.name}`}>Open roadmap<ArrowRight size={15} /></Link>
      </li>)}
    </ul> : !error && <div className="roadmap-collaboration-empty">No joined roadmaps yet. Accept an invitation or have a join request accepted to find your team here.</div>}
  </section>;
}

function InvitationRow({ invitation, user, onChange, onDemoRespond }) {
  const action = useCollaborationAction();
  function respond(response) {
    if (invitation.visualDemo) {
      onDemoRespond(invitation.id, response);
      return;
    }
    action.run(() => collaborationStore.respondInvitation(invitation.id, response, user.id), response === 'accepted' ? 'Member Joins Startup Team. Your team is now in Joined roadmaps.' : 'Declined by Member. No team membership was created.', onChange);
  }
  return <li aria-label={`Invitation: ${invitation.project.name}`}>
    <div><h3>{invitation.project.name}</h3><p>{invitation.inviter?.full_name || invitation.project.created_by} invited you as a {roleLabel(invitation.memberRole).toLowerCase()}.</p>{invitation.message && <p className="collab-request-message">{invitation.message}</p>}<p>Invited {collaborationDate(invitation.createdAt)}{invitation.respondedAt && ` · Responded ${collaborationDate(invitation.respondedAt)}`}</p><p>{invitation.project.assessment_result?.domain || 'Domain not set'} · {invitation.project.assessment_completed ? 'Roadmap ready' : 'Assessment pending'}</p><CollaborationBadge item={invitation} /><CollaborationFeedback action={action} /></div>
    {invitation.status === 'pending' ? <div className="roadmap-invitation-actions" aria-busy={action.busy}><button type="button" className="roadmap-team-button" disabled={action.busy} onClick={() => respond('declined')}><X size={15} />Decline invitation</button><button type="button" className="roadmap-team-button roadmap-team-button--primary" disabled={action.busy} onClick={() => respond('accepted')}><Check size={15} />{action.busy ? 'Saving response…' : 'Accept invitation'}</button></div> : invitation.visualDemo ? <span className="roadmap-invitation-status">{invitation.status === 'accepted' ? 'Accepted — added to Joined roadmaps' : 'Invitation declined'}</span> : ['accepted', 'resolved'].includes(invitation.status) && <Link className="roadmap-team-button" to={`/roadmap/joined/${encodeURIComponent(invitation.ownerId)}/${encodeURIComponent(invitation.projectId)}`}>Open team & missions<ArrowRight size={15} /></Link>}
  </li>;
}

export function RoadmapInvitations({ pendingOnly = false, demoInvitations = [], onDemoRespond = () => {} }) {
  const titleId = useId();
  const { user } = useAuth();
  const refresh = useCollaborationRefresh();
  if (!user || user.role !== 'founder') return null;
  let invitations = []; let error = '';
  try { invitations = collaborationStore.listInvitations(user.id); } catch (err) { error = err.message; }
  invitations = [...invitations, ...demoInvitations].filter((invitation) => !pendingOnly || invitation.status === 'pending');
  return <section className="roadmap-collaboration-list" aria-labelledby={titleId}><h2 id={titleId}>{pendingOnly ? 'Pending invitations' : 'Roadmap invitations'} <span className="roadmap-count">{invitations.length}</span></h2><p>Review the founder’s invitation. Membership begins after you accept; completed responses stay in your history.</p>{error && <p className="roadmap-team-error" role="alert">{error}</p>}{invitations.length ? <ul>{invitations.map((invitation) => <InvitationRow key={`${user.id}:${invitation.id}`} invitation={invitation} user={user} onChange={refresh} onDemoRespond={onDemoRespond} />)}</ul> : !error && <div className="roadmap-collaboration-empty">{pendingOnly ? 'No pending invitations. Share your Member ID with a founder to receive an invitation.' : 'No roadmap invitations yet. Share your Member ID with a founder.'}</div>}</section>;
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
