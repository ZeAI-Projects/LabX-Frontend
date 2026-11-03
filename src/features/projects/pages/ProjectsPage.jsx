import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronRight, Ellipsis, Filter, Folder, FolderPlus, Pencil, Plus, Route, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { useProjects } from '../hooks/use_projects.js';
import { projectDetails, projectDomains, PROJECTS_PER_PAGE, PROJECT_SORTS, PROJECT_STATUSES, selectAllProjects, UNSET_DOMAIN } from '../services/project_list.js';
import { ROADMAP_VISUAL_INVITATION_DATA, ROADMAP_VISUAL_JOINED_DATA, ROADMAP_VISUAL_MOCK_DATA, ROADMAP_VISUAL_MY_DATA } from '../services/roadmap_visual_mock_data.js';
import { ProjectFilterSelect, SortHeading } from '../components/ProjectsCollectionControls.jsx';
import { JoinedRoadmaps, RoadmapInvitations } from '../../roadmap/pages/JoinedRoadmaps.jsx';
import { JoinRoadmapTrigger } from '../../roadmap/components/JoinRoadmapTrigger.jsx';
import { createMockRoadmap } from '../../roadmap/services/mock_roadmap.js';
import '../components/Projects.css';


function ProjectRow({ project, onEdit, onDelete, onPreview }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [menuOpensUp, setMenuOpensUp] = useState(false);
  const actionsRef = useRef(null);
  const actionButtonRef = useRef(null);
  const details = projectDetails(project);
  const completed = details.status === 'completed';
  const statusLabel = project.visualDemo && details.status === 'in-progress'
    ? 'In progress'
    : PROJECT_STATUSES.find(([value]) => value === details.status)?.[1] || 'Roadmap ready';
  const action = completed ? 'View' : project.visualDemo || project.assessment_completed ? 'Continue' : details.answeredCount ? 'Continue assessment' : 'Start assessment';
  const progressPercent = details.progressPercent;
  const stage = details.stage;
  const level = details.level;
  const toggleActions = (event) => {
    if (actionsOpen) {
      setActionsOpen(false);
      return;
    }
    const region = actionsRef.current?.closest('.projects-list');
    const regionBounds = region?.getBoundingClientRect();
    const buttonBounds = event.currentTarget.getBoundingClientRect();
    const spaceBelow = (regionBounds?.bottom ?? window.innerHeight) - buttonBounds.bottom;
    const spaceAbove = buttonBounds.top - (regionBounds?.top ?? 0);
    setMenuOpensUp(spaceBelow < 132 && spaceAbove > spaceBelow);
    setActionsOpen(true);
  };

  useEffect(() => {
    if (!actionsOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!actionsRef.current?.contains(event.target) && !(event.target instanceof Element && event.target.closest('dialog[open]'))) setActionsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !(event.target instanceof Element && event.target.closest('dialog[open]'))) {
        setActionsOpen(false);
        actionButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [actionsOpen]);

  return (
    <tr className={`project-row${completed ? ' project-row--ready' : ''}`} aria-labelledby={`project-title-${project.id}`}>
      <th scope="row">
        <div className="project-row__identity">
          <span className="project-row__icon" aria-hidden="true">{project.assessment_completed || project.visualDemo ? <Route size={18} /> : <Folder size={18} />}</span>
          <div>
            <h2 id={`project-title-${project.id}`} title={project.name}>{project.name}</h2>
            {project.description && <p className="project-row__description" title={project.description}>{project.description}</p>}
          </div>
        </div>
      </th>
      <td data-label="Status">
        <span className={`project-status project-status--${details.status}`}>
          {completed ? <CheckCircle2 size={13} aria-hidden="true" /> : <span className="project-status__dot" aria-hidden="true" />}
          {statusLabel}
        </span>
      </td>
      <td data-label="Domain">
        <span className="project-row__domain" title={details.domain || 'Domain not set yet'}>{details.domain || 'Domain not set yet'}</span>
      </td>
      <td data-label="Progress">
        <div className="project-progress">
          <div className="project-progress__summary">
            <strong>{progressPercent === null || progressPercent === undefined ? '—' : `${progressPercent}%`}</strong>
          </div>
          <div className="project-progress__track" role="progressbar" aria-label={`Roadmap progress for ${project.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent ?? 0}>
            <span style={{ width: `${progressPercent ?? 0}%` }} />
          </div>
          {stage && <span className="project-progress__placement">{stage}{level ? ` · Level ${level}` : ''}</span>}
        </div>
      </td>
      <td className="project-row__actions-cell">
        <div className="project-row__actions">
          {project.visualDemo ? (
            <button type="button" className="projects-button project-row__open" onClick={() => onPreview(project)} aria-label={`${action}: ${project.name}`}>
              <span>{action}</span>
            </button>
          ) : (
            <Link className="projects-button project-row__open" to={`/roadmap/${project.id}${project.assessment_completed ? '' : '/assessment'}`} aria-label={`${action}: ${project.name}`}>
              <span>{action}</span>
            </Link>
          )}
          <div className="project-row__menu" ref={actionsRef}>
            <button ref={actionButtonRef} type="button" className="project-row__menu-trigger" aria-label={`More actions for ${project.name}`} aria-haspopup="menu" aria-expanded={actionsOpen} onClick={toggleActions}>
              <Ellipsis size={18} aria-hidden="true" />
            </button>
            {actionsOpen && <div className={`project-row__menu-items${menuOpensUp ? ' is-above' : ''}`} role="menu" aria-label={`${project.name} actions`}>
              <button type="button" role="menuitem" aria-label={`Rename ${project.name}`} onClick={() => onEdit(project)}>Rename roadmap</button>
              <button type="button" role="menuitem" aria-label={`Delete ${project.name}`} onClick={() => onDelete(project)}>Delete roadmap</button>
            </div>}
          </div>
        </div>
      </td>
    </tr>
  );
}

function ProjectDialog({ project, mode, onClose, onSave, focusAfterClose }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const cancelRef = useRef(null);
  const submittingRef = useRef(false);
  const [name, setName] = useState(project.name);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isDelete = mode === 'delete';
  const isDemo = project.visualDemo;
  const details = projectDetails(project);
  const progress = details.progressPercent ?? 0;
  const placement = [details.stage, details.level ? `Level ${details.level}` : ''].filter(Boolean).join(' · ');

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const fallback = focusAfterClose.current;
    dialog.showModal();
    if (mode === 'edit') {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else cancelRef.current?.focus();
    return () => {
      dialog.close();
      queueMicrotask(() => {
        if (dialog.open) return;
        if (opener?.isConnected) opener.focus();
        else fallback?.focus();
      });
    };
  }, [mode, focusAfterClose]);

  const dismiss = () => { if (!submittingRef.current) onClose(); };
  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const trimmed = name.trim();
    if (!isDelete && (!trimmed || trimmed.length > 100)) {
      setError(!trimmed ? 'Enter a project name.' : 'Use 100 characters or fewer.');
      inputRef.current?.focus();
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(project.id, trimmed);
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save your change. Please try again.');
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="projects-dialog" aria-labelledby="project-dialog-title" aria-describedby="project-dialog-description" onCancel={(event) => { event.preventDefault(); dismiss(); }} onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <div className="projects-dialog__body">
        <button type="button" className="projects-dialog__close" aria-label="Close dialog" disabled={saving} onClick={dismiss}><X size={20} /></button>
        <span className={`projects-dialog__icon${isDelete ? ' projects-dialog__icon--danger' : ''}`} aria-hidden="true">{isDelete ? <Trash2 size={22} /> : <Pencil size={22} />}</span>
        <h2 id="project-dialog-title">{isDelete ? isDemo ? 'Remove demo roadmap?' : 'Delete roadmap?' : 'Rename roadmap'}</h2>
        <p id="project-dialog-description">{isDelete
          ? <>{isDemo ? <>This demo roadmap is <strong>{progress}% complete</strong>{placement && <> in {placement}</>}. Removing it only hides the sample for this browser session. Do you want to continue?</> : <>You have completed <strong>{progress}%</strong> of <strong>{project.name}</strong>{placement && <> at {placement}</>}. Deleting it permanently removes the project, assessment, and roadmap progress. This cannot be undone. Do you want to continue?</>}</>
          : isDemo ? 'Update this prototype entry for the current browser session. Real roadmap data is not changed.' : 'Change the name shown on this project and roadmap. Your assessment and progress stay the same.'}</p>
        {isDelete && <div className="projects-delete-progress">
          <div><span>Roadmap progress</span><strong>{progress}%</strong></div>
          <div className="projects-delete-progress__track" role="progressbar" aria-label={`Roadmap progress for ${project.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
          {placement && <small>{placement}</small>}
        </div>}
        <form onSubmit={submit} noValidate aria-busy={saving}>
          {!isDelete && <div className="projects-field"><label htmlFor="edit-project-name">Roadmap name<span className="required-mark" aria-hidden="true" /></label><input ref={inputRef} id="edit-project-name" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} maxLength={100} required disabled={saving} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? 'project-dialog-error' : undefined} /></div>}
          {error && <p id="project-dialog-error" className="projects-feedback projects-feedback--error" role="alert">{error}</p>}
          <div className="projects-dialog__actions">
            <button ref={cancelRef} type="button" className="projects-button" onClick={dismiss} disabled={saving}>Cancel</button>
            <button type="submit" className={`projects-button ${isDelete ? 'projects-button--danger' : 'projects-button--primary'}`} disabled={saving}>{saving ? isDelete ? 'Deleting…' : 'Saving…' : isDelete ? isDemo ? 'Remove demo roadmap' : 'Delete roadmap' : 'Rename roadmap'}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function ProjectPreviewDialog({ project, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const details = projectDetails(project);
  const status = PROJECT_STATUSES.find(([value]) => value === details.status)?.[1] || 'Roadmap ready';
  const demoRoadmap = project.visualDemo ? createMockRoadmap({ domain: details.domain, stage: project.stage, level: project.level }) : null;
  const previewStage = demoRoadmap?.stages[demoRoadmap.currentStageIndex];
  const previewLevel = previewStage?.levels[demoRoadmap.currentLevel - 1];

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
      queueMicrotask(() => {
        if (!dialog.open && opener?.isConnected) opener.focus();
      });
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="projects-dialog" aria-labelledby="project-preview-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="projects-dialog__body">
        <button ref={closeRef} type="button" className="projects-dialog__close" aria-label="Close roadmap preview" onClick={onClose}><X size={20} /></button>
        <span className="projects-dialog__icon" aria-hidden="true"><Route size={22} /></span>
        <span className="projects-eyebrow">Prototype roadmap preview</span>
        <h2 id="project-preview-title">{project.name}</h2>
        <p>{project.description}</p>
        <dl className="project-preview-details">
          <div><dt>Status</dt><dd>{status}</dd></div>
          <div><dt>Domain</dt><dd>{details.domain}</dd></div>
          <div><dt>Created by</dt><dd>{project.created_by}</dd></div>
          <div><dt>Progress</dt><dd>{details.progressPercent}%{details.stage ? ` · ${details.stage}${details.level ? ` · Level ${details.level}` : ''}` : ''}</dd></div>
        </dl>
        {previewLevel && <section className="project-preview-missions" aria-label="Sample roadmap missions">
          <h3>Stage {demoRoadmap.currentStageIndex + 1} · Level {previewLevel.number}: {previewLevel.name}</h3>
          <ul>{previewLevel.milestones.map((mission) => <li key={mission.id}><span>{mission.name}</span><small>{mission.state === 'active' ? 'Current mission' : mission.state === 'available' ? 'Available' : 'Up next'}</small></li>)}</ul>
        </section>}
        <p className="project-preview-note">This sample roadmap is visual demo data. Its mission flow is not connected to a project account.</p>
        <div className="projects-dialog__actions"><button type="button" className="projects-button projects-button--primary" onClick={onClose}>Close preview</button></div>
      </div>
    </dialog>
  );
}

export function ProjectsPage() {
  const { user } = useAuth();
  const { projects, renameProject, deleteProject } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = ['joined', 'invitations'].includes(searchParams.get('view')) ? searchParams.get('view') : 'my';
  const [dialog, setDialog] = useState(null);
  const [previewProject, setPreviewProject] = useState(null);
  const [demoProjects, setDemoProjects] = useState(() => import.meta.env.DEV ? ROADMAP_VISUAL_MY_DATA.map((project) => ({ ...project, owner_id: user.id, created_by: user.full_name })) : []);
  const [demoJoinedProjects, setDemoJoinedProjects] = useState(() => import.meta.env.DEV ? ROADMAP_VISUAL_JOINED_DATA.map((project) => ({ ...project })) : []);
  const [demoInvitations, setDemoInvitations] = useState(() => import.meta.env.DEV ? ROADMAP_VISUAL_INVITATION_DATA.map((invitation) => ({ ...invitation })) : []);
  const [notice, setNotice] = useState('');
  const [domainFilterOpen, setDomainFilterOpen] = useState(false);
  const [loadState, setLoadState] = useState({ key: '', page: 1 });
  const listingRef = useRef(null);
  const domainFilterRef = useRef(null);
  const query = searchParams.get('q') || '';
  const status = PROJECT_STATUSES.some(([value]) => value === searchParams.get('status')) ? searchParams.get('status') : '';
  const domain = searchParams.get('domain') || '';
  const sort = PROJECT_SORTS.some(([value]) => value === searchParams.get('sort')) ? searchParams.get('sort') : 'updated';
  const [searchDraftState, setSearchDraftState] = useState({ query, value: query });
  const searchDraft = searchDraftState.query === query ? searchDraftState.value : query;
  const setSearchDraft = (value) => setSearchDraftState({ query, value });
  useEffect(() => {
    if (!domainFilterOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (domainFilterOpen && !domainFilterRef.current?.contains(event.target)) setDomainFilterOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setDomainFilterOpen(false); };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [domainFilterOpen]);
  const filterKey = [query, status, domain, sort].join('\u0000');
  const loadedPage = loadState.key === filterKey ? loadState.page : 1;
  const setLoadedPage = (nextPage) => setLoadState((current) => {
    const currentPage = current.key === filterKey ? current.page : 1;
    return { key: filterKey, page: typeof nextPage === 'function' ? nextPage(currentPage) : nextPage };
  });
  const roadmapProjects = useMemo(() => [...projects, ...demoProjects], [projects, demoProjects]);
  const respondToDemoInvitation = (invitationId, response) => {
    const invitation = demoInvitations.find((item) => item.id === invitationId);
    if (!invitation) return;
    setDemoInvitations((items) => items.map((item) => item.id === invitationId
      ? { ...item, status: response, respondedAt: new Date().toISOString() }
      : item));
    if (response === 'accepted') {
      setDemoJoinedProjects((items) => items.some((project) => project.id === invitation.project.id)
        ? items
        : [...items, { ...invitation.project, memberRole: invitation.memberRole }]);
    }
  };
  const domains = useMemo(() => projectDomains([...roadmapProjects, ...ROADMAP_VISUAL_MOCK_DATA]), [roadmapProjects]);
  const activeFilterCount = Number(Boolean(status)) + Number(Boolean(domain));
  const selection = useMemo(() => ({ query, status, domain, sort }), [query, status, domain, sort]);
  const results = useMemo(() => selectAllProjects(roadmapProjects, selection), [roadmapProjects, selection]);
  const pages = Math.max(1, Math.ceil(results.total / PROJECTS_PER_PAGE));
  const visiblePages = Math.min(loadedPage, pages);
  const visibleProjects = results.items.slice(0, visiblePages * PROJECTS_PER_PAGE);
  const hasFilters = Boolean(query || status || domain);
  const updateControl = (key, value) => {
    setSearchParams(() => {
      // Browser history updates before a transition renders. Reading it here
      // preserves the last action when users change filters in quick succession.
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
  const sortBy = (value) => updateControl('sort', value);
  const openDialog = (project, mode) => { setNotice(''); setDialog({ project, mode }); };
  const saveChange = async (id, name) => {
    if (dialog.project.visualDemo && dialog.mode === 'edit') {
      setDemoProjects((items) => items.map((item) => item.id === id ? { ...item, name } : item));
      setNotice('Demo project name updated for this browser session.');
    } else if (dialog.project.visualDemo) {
      setDemoProjects((items) => items.filter((item) => item.id !== id));
      setNotice(`Demo project “${dialog.project.name}” was removed for this browser session.`);
    } else if (dialog.mode === 'edit') {
      await renameProject(id, name);
      setNotice('Project name updated.');
    } else {
      await deleteProject(id);
      setNotice(`“${dialog.project.name}” was deleted.`);
    }
  };
  const loadNextPage = (event) => {
    const list = event.currentTarget;
    if (list.scrollHeight - list.scrollTop - list.clientHeight < 120 && loadedPage < pages) {
      setLoadedPage((page) => Math.min(pages, page + 1));
    }
  };

  return (
    <div className={`projects-page projects-page--${view}`}>
      <div className="projects-collection-bar">
        <nav className="projects-view-tabs" aria-label="Roadmap collection">
          {[['my', 'My roadmaps'], ['joined', 'Joined roadmaps'], ['invitations', 'Invitations']].map(([value, label]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => { setSearchParams(value === 'my' ? {} : { view: value }); }}>{label}{value === 'my' && <span>{roadmapProjects.length}</span>}</button>)}
        </nav>
        <div className="roadmap-collection-actions"><JoinRoadmapTrigger className="projects-button">Join roadmap<ArrowRight size={16} aria-hidden="true" /></JoinRoadmapTrigger><Link to="/roadmap/new" className="projects-button projects-button--primary"><Plus size={18} aria-hidden="true" />New project</Link></div>
      </div>
      <div key={view} className="projects-collection-content">
      {view === 'joined' ? <JoinedRoadmaps demoProjects={demoJoinedProjects} onPreview={setPreviewProject} compact /> : view === 'invitations' ? <RoadmapInvitations demoInvitations={demoInvitations} onDemoRespond={respondToDemoInvitation} /> : <>
      {notice && <p className="projects-feedback" role="status">{notice}</p>}
      {roadmapProjects.length ? <section ref={listingRef} tabIndex={-1} className="projects-listing" aria-label="My roadmaps">
        <div className="projects-controls" aria-label="Search and filter projects">
          <form className="projects-compact-search" role="search" onSubmit={submitSearch}>
            <Search size={16} aria-hidden="true" />
            <input id="project-search" type="search" aria-label="Search projects" placeholder="Search projects..." value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={100} enterKeyHint="search" />
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
        <div className="projects-results-summary"><p role="status" aria-live="polite">{hasFilters ? `${results.total} of ${roadmapProjects.length} roadmaps match` : `${visibleProjects.length} of ${results.total} roadmaps shown`}</p>{hasFilters && <button type="button" onClick={clearFilters}><X size={14} aria-hidden="true" />Clear filters</button>}</div>
        {results.total ? <div className="projects-list" role="region" aria-label="Project list" tabIndex={0} onScroll={loadNextPage}>
          <table className="projects-table projects-table--owned">
            <caption className="projects-sr-only">Roadmaps by project, status, domain, and progress</caption>
            <colgroup><col className="projects-table__project" /><col className="projects-table__status" /><col className="projects-table__domain" /><col className="projects-table__progress" /><col className="projects-table__actions" /></colgroup>
            <thead><tr>
              <th scope="col" aria-sort={sort === 'name-asc' ? 'ascending' : sort === 'name-desc' ? 'descending' : 'none'}><SortHeading label="Project" ascending="name-asc" descending="name-desc" sort={sort} onSort={sortBy} /></th>
              <th scope="col" aria-sort={sort === 'status-asc' ? 'ascending' : sort === 'status-desc' ? 'descending' : 'none'}><SortHeading label="Status" ascending="status-asc" descending="status-desc" sort={sort} onSort={sortBy} /></th>
              <th scope="col" aria-sort={sort === 'domain-asc' ? 'ascending' : sort === 'domain-desc' ? 'descending' : 'none'}><SortHeading label="Domain" ascending="domain-asc" descending="domain-desc" sort={sort} onSort={sortBy} /></th>
              <th scope="col" aria-sort={sort === 'progress-asc' ? 'ascending' : sort === 'progress-desc' ? 'descending' : 'none'}><SortHeading label="Progress" ascending="progress-asc" descending="progress-desc" sort={sort} onSort={sortBy} /></th>
              <th scope="col" aria-hidden="true" />
            </tr></thead>
            <tbody>{visibleProjects.map((project) => <ProjectRow key={project.id} project={project} onEdit={(item) => openDialog(item, 'edit')} onDelete={(item) => openDialog(item, 'delete')} onPreview={setPreviewProject} />)}</tbody>
          </table>
          {visibleProjects.length < results.total && <p className="projects-list__more" role="status">Scroll to load more roadmaps</p>}
        </div> : <section className="projects-no-results" aria-labelledby="projects-no-results-title"><Search size={28} aria-hidden="true" /><h3 id="projects-no-results-title">No projects match your search</h3><p>Try another name, status, or domain.</p><button type="button" className="projects-button" onClick={clearFilters}>Clear search and filters</button></section>}
      </section> : <section className="projects-empty" aria-labelledby="projects-empty-title">
        <span className="projects-empty__icon" aria-hidden="true"><FolderPlus size={36} /></span>
        <span className="projects-eyebrow">Your first project starts here</span>
        <h2 id="projects-empty-title">An idea deserves a roadmap.</h2>
        <p>Give your project a name, then answer eight questions to create its roadmap. Add more projects whenever inspiration strikes.</p>
        <Link to="/roadmap/new" className="projects-button projects-button--primary"><Plus size={17} aria-hidden="true" />Create your first project</Link>
        <div className="projects-empty__steps" aria-hidden="true"><span>01 &nbsp; Name your project</span><ChevronRight size={13} /><span>02 &nbsp; Take the assessment</span><ChevronRight size={13} /><span>03 &nbsp; Explore your roadmap</span></div>
      </section>}
      </>}
      </div>
      {dialog && <ProjectDialog key={`${dialog.mode}-${dialog.project.id}`} project={dialog.project} mode={dialog.mode} onClose={() => setDialog(null)} onSave={saveChange} focusAfterClose={listingRef} />}
      {previewProject && <ProjectPreviewDialog key={previewProject.id} project={previewProject} onClose={() => setPreviewProject(null)} />}
    </div>
  );
}
