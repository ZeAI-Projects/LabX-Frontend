import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Filter, Route, Search, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { ProjectFilterSelect, SortHeading } from '../../projects/components/ProjectsCollectionControls.jsx';
import { projectDetails, projectDomains, PROJECT_SORTS, PROJECT_STATUSES, selectAllProjects, UNSET_DOMAIN } from '../../projects/services/project_list.js';
import { ROADMAP_VISUAL_MOCK_DATA } from '../../projects/services/roadmap_visual_mock_data.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { CollaborationBadge, CollaborationFeedback } from '../components/CollaborationPortal.jsx';
import { collaborationDate, useCollaborationAction, useCollaborationRefresh, useCollaborationVersion } from '../components/collaboration_ui.js';
import { RoadmapPage } from './RoadmapPage.jsx';
import '../components/RoadmapTeam.css';

const roleLabel = (role) => role === 'co-founder' ? 'Co-founder' : 'Member';

export function JoinedRoadmaps({ demoProjects = [], onPreview = () => {}, compact = false }) {
  const titleId = useId();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [domainFilterOpen, setDomainFilterOpen] = useState(false);
  const [searchDraftState, setSearchDraftState] = useState({ query: '', value: '' });
  const domainFilterRef = useRef(null);
  const collaborationRevision = useCollaborationVersion();
  const joinedSnapshot = useMemo(() => {
    try { return { joined: user?.role === 'founder' ? collaborationStore.listJoinedProjects(user.id) : [], error: '', revision: collaborationRevision }; }
    catch (err) { return { joined: [], error: err.message, revision: collaborationRevision }; }
  }, [user, collaborationRevision]);
  const { joined, error } = joinedSnapshot;
  const allJoined = useMemo(() => [...joined, ...demoProjects], [joined, demoProjects]);
  const query = searchParams.get('q') || '';
  const status = PROJECT_STATUSES.some(([value]) => value === searchParams.get('status')) ? searchParams.get('status') : '';
  const domain = searchParams.get('domain') || '';
  const sort = PROJECT_SORTS.some(([value]) => value === searchParams.get('sort')) ? searchParams.get('sort') : 'updated';
  const searchDraft = searchDraftState.query === query ? searchDraftState.value : query;
  const setSearchDraft = (value) => setSearchDraftState({ query, value });
  const domains = useMemo(() => projectDomains([...allJoined, ...ROADMAP_VISUAL_MOCK_DATA]), [allJoined]);
  const selection = useMemo(() => ({ query, status, domain, sort }), [query, status, domain, sort]);
  const results = useMemo(() => selectAllProjects(allJoined, selection), [allJoined, selection]);
  const visibleProjects = results.items;
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

  if (!user || user.role !== 'founder') return null;
  if (compact) return <section className="projects-listing projects-listing--joined" aria-label="Joined roadmaps">
    {error && <p className="roadmap-team-error" role="alert">{error}</p>}
    <div className="projects-controls" aria-label="Search and filter joined roadmaps">
      <form className="projects-compact-search" role="search" onSubmit={submitSearch}>
        <Search size={16} aria-hidden="true" />
        <input id="joined-roadmap-search" type="search" aria-label="Search projects" placeholder="Search projects..." value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={100} enterKeyHint="search" />
        <button type="submit" aria-label="Apply project search"><ArrowRight size={15} aria-hidden="true" /></button>
        {(query || searchDraft) && <button type="button" aria-label="Clear search" onClick={() => { setSearchDraft(''); updateControl('q', ''); }}><X size={14} aria-hidden="true" /></button>}
      </form>
      <div className="projects-filter-anchor" ref={domainFilterRef}>
        <button type="button" className={`projects-filter-button${domainFilterOpen ? ' is-active' : ''}`} aria-label="Toggle project filters" title="Filters" aria-expanded={domainFilterOpen} onClick={() => setDomainFilterOpen((value) => !value)}>
          <Filter size={16} aria-hidden="true" />{activeFilterCount > 0 && <span className="projects-filter-count">{activeFilterCount}</span>}
        </button>
        {domainFilterOpen && <div className="projects-filter-panel">
          <ProjectFilterSelect label="Status" value={status} options={[['', 'All statuses'], ...PROJECT_STATUSES]} onChange={(value) => updateControl('status', value)} />
          <ProjectFilterSelect label="Domain" value={domain} options={[['', 'All domains'], ...[...new Set([...domains, ...(domain ? [domain] : [])])].map((value) => [value, value === UNSET_DOMAIN ? 'Domain not set yet' : value])]} onChange={(value) => updateControl('domain', value)} />
          {domain && <button type="button" onClick={() => updateControl('domain', '')}>Clear domain</button>}
        </div>}
      </div>
    </div>
    <div className="projects-results-summary"><p role="status" aria-live="polite">{hasFilters ? `${results.total} of ${allJoined.length} roadmaps match` : `${visibleProjects.length} of ${results.total} roadmaps shown`}</p>{hasFilters && <button type="button" onClick={clearFilters}><X size={14} aria-hidden="true" />Clear filters</button>}</div>
    {results.total ? <div className="projects-list" role="region" aria-label="Joined roadmap list" tabIndex={0}>
      <table className="projects-table projects-table--joined">
        <caption className="projects-sr-only">Joined roadmaps by project, creator, status, domain, and progress</caption>
        <colgroup><col className="projects-table__project" /><col className="projects-table__status" /><col className="projects-table__domain" /><col className="projects-table__creator" /><col className="projects-table__progress" /><col className="projects-table__actions" /></colgroup>
        <thead><tr>
          <th scope="col" aria-sort={sort === 'name-asc' ? 'ascending' : sort === 'name-desc' ? 'descending' : 'none'}><SortHeading label="Project" ascending="name-asc" descending="name-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
          <th scope="col" aria-sort={sort === 'status-asc' ? 'ascending' : sort === 'status-desc' ? 'descending' : 'none'}><SortHeading label="Status" ascending="status-asc" descending="status-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
          <th scope="col" aria-sort={sort === 'domain-asc' ? 'ascending' : sort === 'domain-desc' ? 'descending' : 'none'}><SortHeading label="Domain" ascending="domain-asc" descending="domain-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
          <th scope="col" aria-sort={sort === 'creator-asc' ? 'ascending' : sort === 'creator-desc' ? 'descending' : 'none'}><SortHeading label="Created by" ascending="creator-asc" descending="creator-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
          <th scope="col" aria-sort={sort === 'progress-asc' ? 'ascending' : sort === 'progress-desc' ? 'descending' : 'none'}><SortHeading label="Progress" ascending="progress-asc" descending="progress-desc" sort={sort} onSort={(value) => updateControl('sort', value)} /></th>
          <th scope="col" aria-hidden="true" />
        </tr></thead>
        <tbody>{visibleProjects.map((project) => {
          const details = projectDetails(project);
          const progress = details.progressPercent;
          const status = details.status;
          const statusLabel = { pending: 'Assessment pending', 'in-progress': 'In progress', ready: 'Roadmap ready', completed: 'Roadmap completed' }[status] || 'Roadmap ready';
          const projectDomain = details.domain || 'Domain not set yet';
          const stage = details.stage;
          const level = details.level;
          const owner = project.visualDemo ? project.created_by : project.created_by || 'Founder';
          const mission = project.visualDemo ? project.currentMission : '';
          const stageNumber = project.visualDemo ? project.stageNumber : null;
          return <tr className={`project-row${status === 'completed' ? ' project-row--ready' : ''}`} key={`${project.visualDemo ? 'demo' : project.owner_id}:${project.id}`}>
            <th scope="row"><div className="project-row__identity"><span className="project-row__icon" aria-hidden="true"><Route size={18} /></span><div><h2 title={project.name}>{project.name}</h2><p className="project-row__description" title={project.description || ''}>{project.description || `Roadmap shared by ${owner}.`}</p></div></div></th>
            <td data-label="Status"><span className={`project-status project-status--${status}`}>{status === 'completed' ? <CheckCircle2 size={13} aria-hidden="true" /> : <span className="project-status__dot" aria-hidden="true" />}{statusLabel}</span></td>
            <td data-label="Domain"><span className="project-row__domain" title={projectDomain}>{projectDomain}</span></td>
            <td data-label="Created by"><span className="project-row__creator" title={owner}>{owner}</span></td>
            <td data-label="Progress"><div className="project-progress"><div className="project-progress__summary"><strong>{progress === null || progress === undefined ? '—' : `${progress}%`}</strong></div><div className="project-progress__track" role="progressbar" aria-label={`Roadmap progress for ${project.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0}><span style={{ width: `${progress ?? 0}%` }} /></div>{stage && <span className="project-progress__placement">{stageNumber ? `Stage ${stageNumber} · ` : ''}{stage}{level ? ` · Level ${level}` : ''}</span>}{mission && <span className="project-row__mission">Next mission · {mission}</span>}</div></td>
            <td className="project-row__actions-cell"><div className="project-row__actions">{project.visualDemo ? <button type="button" className="projects-button project-row__open" onClick={() => onPreview(project)} aria-label={`Preview roadmap: ${project.name}`}><span>Continue</span></button> : <Link className="projects-button project-row__open" to={`/roadmap/joined/${encodeURIComponent(project.owner_id)}/${encodeURIComponent(project.id)}`} aria-label={`Continue roadmap: ${project.name}`}><span>Continue</span></Link>}</div></td>
          </tr>;
        })}</tbody>
      </table>
      {visibleProjects.length > 4 && <p className="projects-list__more" role="status">Scroll to view the remaining joined roadmaps</p>}
    </div> : hasFilters ? <section className="projects-no-results" aria-labelledby="joined-roadmaps-no-results-title"><Search size={28} aria-hidden="true" /><h3 id="joined-roadmaps-no-results-title">No projects match your search</h3><p>Try another name, status, or domain.</p><button type="button" className="projects-button" onClick={clearFilters}>Clear search and filters</button></section> : !error && <div className="roadmap-collaboration-empty">No joined roadmaps yet. Accept an invitation or have a join request accepted to find your team here.</div>}
  </section>;
  return <section className="roadmap-collaboration-list" aria-labelledby={titleId}>
    <h2 id={titleId}>Joined roadmaps</h2>
    <p>Teams you joined through an accepted request or invitation. Your assigned missions become actionable when they unlock.</p>
    {error && <p className="roadmap-team-error" role="alert">{error}</p>}
    {allJoined.length ? <ul>
      {joined.map((project) => <li key={`${project.owner_id}:${project.id}`}>
        <div><h3>{project.name}</h3><CollaborationBadge item={{ status: 'accepted' }} /><p>Owned by {project.created_by} · {roleLabel(project.memberRole)}</p><p>{project.assessment_result?.domain || 'Domain not set'} · {project.assignedMissionIds.length} assigned mission{project.assignedMissionIds.length === 1 ? '' : 's'}</p></div>
        <Link className="roadmap-team-button" to={`/roadmap/joined/${encodeURIComponent(project.owner_id)}/${encodeURIComponent(project.id)}`} aria-label={`Open joined roadmap: ${project.name}`}>Open roadmap<ArrowRight size={15} /></Link>
      </li>)}
      {demoProjects.map((project) => <li key={`demo:${project.id}`}>
        <div><h3>{project.name}</h3><CollaborationBadge item={{ status: 'accepted' }} /><p>Owned by {project.created_by} · {roleLabel(project.memberRole || 'member')}</p><p>{project.domain} · {project.stage} · Level {project.level}</p></div>
        <button type="button" className="roadmap-team-button" onClick={() => onPreview(project)} aria-label={`Preview joined roadmap: ${project.name}`}>Preview roadmap<ArrowRight size={15} /></button>
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
