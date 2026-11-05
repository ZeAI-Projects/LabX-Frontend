import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronRight, Filter, FolderPlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { useProjects } from '../hooks/use_projects.js';
import { formatRoadmapDate, projectDetails, projectDomains, PROJECT_SORTS, PROJECT_STATUSES, selectAllProjects, selectProjects, UNSET_DOMAIN } from '../services/project_list.js';
import { ROADMAP_VISUAL_JOINED_DATA, ROADMAP_VISUAL_MOCK_DATA, ROADMAP_VISUAL_MY_DATA } from '../services/roadmap_visual_mock_data.js';
import { readMockAssessment } from '../services/mock_assessment_store.js';
import { ProjectFilterSelect, ProjectsPagination, SortHeading } from '../components/ProjectsCollectionControls.jsx';
import { JoinedRoadmaps } from '../../roadmap/pages/JoinedRoadmaps.jsx';
import { JoinRoadmapTrigger } from '../../roadmap/components/JoinRoadmapTrigger.jsx';
import '../components/Projects.css';


function ProjectProgress({ project, details }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const tooltipId = useId();
  const progress = details.progressPercent;
  const snapshot = project.roadmap_snapshot;
  const isRoadmap = project.visualDemo || project.assessment_completed;
  const levelCount = snapshot
    ? snapshot.stages.flatMap((stage) => stage.levels).filter((level) =>
      level.milestones.every((mission) => ['completed', 'credited', 'skipped'].includes(mission.state))).length
    : project.visualDemo
      ? Math.max(0, ['Discover', 'Validate', 'Build', 'Launch', 'Grow'].indexOf(details.stage) * 5 + (details.level || 1) - 1)
      : 0;
  const missionCount = snapshot
    ? (snapshot.completedCount || 0) + (snapshot.creditedCount || 0) + (snapshot.skippedCount || 0)
    : project.visualDemo && progress !== null && progress !== undefined
      ? Math.round(progress * 75 / 100)
      : 0;
  const focus = snapshot?.isComplete
    ? 'Roadmap complete'
    : isRoadmap && details.stage
      ? `${details.stage} · Level ${details.level || 1}`
      : 'Assessment';

  useEffect(() => {
    if (!hovered && !focused) return undefined;
    const updatePosition = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const width = Math.min(300, window.innerWidth - 24);
      const right = Math.min(Math.max(12, window.innerWidth - bounds.right), window.innerWidth - width - 12);
      const below = bounds.bottom + 104 <= window.innerHeight;
      setPosition({ top: below ? bounds.bottom + 8 : Math.max(12, bounds.top - 96), right, width });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [hovered, focused]);

  return <div className="project-progress">
    <button ref={triggerRef} type="button" className="project-progress__trigger"
      aria-label={`${progress === null || progress === undefined ? 'Unknown' : `${progress}%`} progress details for ${project.name}`}
      aria-describedby={(hovered || focused) && position ? tooltipId : undefined} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      {progress === null || progress === undefined ? '—' : `${progress}%`}
    </button>
    {(hovered || focused) && position && createPortal(
      <div id={tooltipId} className="project-progress__tooltip" role="tooltip" style={position}>
        <span><strong>{focus}</strong><small>Current focus</small></span>
        <span><strong>{isRoadmap ? `${levelCount}/25` : `${details.answeredCount}/8`}</strong><small>{isRoadmap ? 'Levels' : 'Answers'}</small></span>
        <span><strong>{isRoadmap ? `${missionCount}/75` : 'Not started'}</strong><small>Missions</small></span>
      </div>,
      document.body,
    )}
  </div>;
}

function ProjectRow({ project, onEdit, onDelete }) {
  const details = projectDetails(project);
  const completed = details.status === 'completed';
  const statusLabel = project.visualDemo && details.status === 'in-progress'
    ? 'In progress'
    : PROJECT_STATUSES.find(([value]) => value === details.status)?.[1] || 'Roadmap ready';

  return (
    <tr className={`project-row${completed ? ' project-row--ready' : ''}`} aria-labelledby={`project-title-${project.id}`}>
      <th scope="row">
        <div className="project-row__identity">
          <div>
            <h2 id={`project-title-${project.id}`} title={project.name}>
              {project.visualDemo
                  ? <Link className="project-row__title-link" to={`/roadmap/demo/${encodeURIComponent(project.id)}${project.status === 'pending' && !project.assessment_completed ? '/assessment' : ''}`}>{project.name}</Link>
                  : <Link className="project-row__title-link" to={`/roadmap/${project.id}${project.assessment_completed ? '' : '/assessment'}`}>{project.name}</Link>}
            </h2>
          </div>
        </div>
      </th>
      <td data-label="Domain">
        <span className="project-row__domain" title={details.domain || 'Domain not set yet'}>{details.domain || 'Domain not set yet'}</span>
      </td>
      <td data-label="Progress">
        <ProjectProgress project={project} details={details} />
      </td>
      <td data-label="Created at" className="project-row__date">{formatRoadmapDate(project.created_at)}</td>
      <td data-label="Status">
        <span className={`project-status project-status--${details.status}`}>
          {completed ? <CheckCircle2 size={13} aria-hidden="true" /> : <span className="project-status__dot" aria-hidden="true" />}
          {statusLabel}
        </span>
      </td>
      <td className="project-row__actions-cell" data-label="Actions">
        <div className="project-row__actions">
          <button type="button" className="project-row__action" aria-label={`Rename ${project.name}`} title="Edit roadmap" onClick={() => onEdit(project)}><Pencil size={16} aria-hidden="true" /></button>
          <button type="button" className="project-row__action project-row__action--danger" aria-label={`Delete ${project.name}`} title="Delete roadmap" onClick={() => onDelete(project)}><Trash2 size={16} aria-hidden="true" /></button>
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

export function ProjectsPage() {
  const { user } = useAuth();
  const { projects, renameProject, deleteProject } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'joined' ? 'joined' : 'my';
  const [dialog, setDialog] = useState(null);
  const [demoProjects, setDemoProjects] = useState(() => import.meta.env.DEV ? ROADMAP_VISUAL_MY_DATA.map((project) => {
    const assessment = readMockAssessment(project.id);
    return {
      ...project,
      owner_id: user.id,
      created_by: user.full_name,
      assessment_completed: assessment.completed,
      ...(assessment.completed ? { status: 'ready', assessment_result: assessment.result } : {}),
    };
  }) : []);
  const [demoJoinedProjects] = useState(() => import.meta.env.DEV ? ROADMAP_VISUAL_JOINED_DATA.map((project) => ({ ...project })) : []);
  const [notice, setNotice] = useState('');
  const [domainFilterOpen, setDomainFilterOpen] = useState(false);
  const domainFilterRef = useRef(null);
  const listingRef = useRef(null);
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
  const roadmapProjects = useMemo(() => [...projects, ...demoProjects], [projects, demoProjects]);
  const domains = useMemo(() => projectDomains([...roadmapProjects, ...ROADMAP_VISUAL_MOCK_DATA]), [roadmapProjects]);
  const activeFilterCount = Number(Boolean(status)) + Number(Boolean(domain));
  const selection = useMemo(() => ({ query, status, domain, sort }), [query, status, domain, sort]);
  const results = useMemo(() => selectAllProjects(roadmapProjects, selection), [roadmapProjects, selection]);
  const requestedPage = searchParams.get('page') || '1';
  const page = useMemo(() => selectProjects(roadmapProjects, { ...selection, page: requestedPage }), [roadmapProjects, selection, requestedPage]);
  const visibleProjects = page.items;
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
  const updatePage = (value) => {
    setSearchParams(() => {
      const next = new URLSearchParams(window.location.search);
      if (value > 1) next.set('page', String(value));
      else next.delete('page');
      return next;
    }, { replace: true });
  };
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
  return (
    <div className={`projects-page projects-page--${view}`}>
      <div className="projects-collection-bar">
        <nav className="projects-view-tabs" aria-label="Roadmap collection">
          {[['my', 'My Roadmaps'], ['joined', 'Joined as Member']].map(([value, label]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => { setSearchParams(value === 'my' ? {} : { view: value }); }}>{label}</button>)}
        </nav>
        <div className="roadmap-collection-actions"><JoinRoadmapTrigger className="projects-button">Join roadmap<ArrowRight size={16} aria-hidden="true" /></JoinRoadmapTrigger><Link to="/roadmap/new" className="projects-button projects-button--primary"><Plus size={18} aria-hidden="true" />New project</Link></div>
      </div>
      <div key={view} className="projects-collection-content">
      {view === 'joined' ? <JoinedRoadmaps demoProjects={demoJoinedProjects} compact /> : <>
      {notice && <p className="projects-feedback" role="status">{notice}</p>}
      {roadmapProjects.length ? <section ref={listingRef} className="projects-listing" aria-label="My roadmaps">
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
              {hasFilters && <button type="button" className="projects-filter-clear" onClick={clearFilters}>Clear filters</button>}
            </div>}
          </div>
        </div>
        {results.total ? <div className="projects-list" role="region" aria-label="Project list" tabIndex={0}>
          <table className="projects-table projects-table--owned">
            <caption className="projects-sr-only">My roadmaps by project, domain, progress, creation date, and status</caption>
            <colgroup><col className="projects-table__project" /><col className="projects-table__domain" /><col className="projects-table__progress" /><col className="projects-table__date" /><col className="projects-table__status" /><col className="projects-table__actions" /></colgroup>
            <thead><tr>
              <th scope="col" aria-sort={sort === 'name-asc' ? 'ascending' : sort === 'name-desc' ? 'descending' : 'none'}><SortHeading label="Projects" ascending="name-asc" descending="name-desc" sort={sort} onSort={sortBy} /></th>
              <th scope="col" aria-sort={sort === 'domain-asc' ? 'ascending' : sort === 'domain-desc' ? 'descending' : 'none'}><SortHeading label="Domain" ascending="domain-asc" descending="domain-desc" sort={sort} onSort={sortBy} /></th>
              <th scope="col">Progress</th>
              <th scope="col" aria-sort={sort === 'oldest' ? 'ascending' : sort === 'newest' ? 'descending' : 'none'}><SortHeading label="Created at" ascending="oldest" descending="newest" sort={sort} onSort={sortBy} /></th>
              <th scope="col" aria-sort={sort === 'status-asc' ? 'ascending' : sort === 'status-desc' ? 'descending' : 'none'}><SortHeading label="Status" ascending="status-asc" descending="status-desc" sort={sort} onSort={sortBy} /></th>
              <th scope="col">Actions</th>
            </tr></thead>
            <tbody>{visibleProjects.map((project) =>             <ProjectRow key={project.id} project={project} onEdit={(item) => openDialog(item, 'edit')} onDelete={(item) => openDialog(item, 'delete')} />)}</tbody>
          </table>
        </div> : <section className="projects-no-results" aria-labelledby="projects-no-results-title"><Search size={28} aria-hidden="true" /><h3 id="projects-no-results-title">No projects match your search</h3><p>Try another name, status, or domain.</p><button type="button" className="projects-button" onClick={clearFilters}>Clear search and filters</button></section>}
        {results.total > 0 && <ProjectsPagination total={page.total} from={page.from} to={page.to} page={page.page} pages={page.pages} onPageChange={updatePage} />}
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
    </div>
  );
}
