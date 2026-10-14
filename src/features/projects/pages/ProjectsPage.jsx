import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Folder, FolderPlus, Pencil, Plus, Route, Trash2, UserRound, X } from 'lucide-react';
import { useProjects } from '../hooks/use_projects.js';
import { DOMAIN_OPTIONS, validateAssessmentStep } from '../../assessment/services/mock_assessment.js';
import '../components/Projects.css';

const PAGE_SIZE = 6;
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateFormatter.format(date);
}

function ProjectCard({ project, onEdit, onDelete }) {
  const completed = project.assessment_completed;
  const result = project.assessment_result;
  const answers = project.draft?.answers;
  const answeredCount = Array.from({ length: 7 }, (_, index) => index + 1)
    .filter((step) => !validateAssessmentStep(answers, step)).length;
  const domain = completed ? result?.domain : DOMAIN_OPTIONS[(answers?.q1 || 0) - 1];
  const action = completed ? 'Open roadmap' : answeredCount > 0 ? 'Continue assessment' : 'Start assessment';

  return (
    <article className={`project-card${completed ? ' project-card--ready' : ''}`} aria-labelledby={`project-title-${project.id}`}>
      <div className="project-card__top">
        <span className="project-card__icon" aria-hidden="true">{completed ? <Route size={22} /> : <Folder size={22} />}</span>
        <span className={`project-status${completed ? ' project-status--ready' : ''}`}>
          {completed ? <CheckCircle2 size={13} aria-hidden="true" /> : <span className="project-status__dot" aria-hidden="true" />}
          {completed ? 'Roadmap ready' : answeredCount > 0 ? 'Assessment in progress' : 'Assessment pending'}
        </span>
      </div>
      <h2 id={`project-title-${project.id}`}>{project.name}</h2>
      <p className={`project-card__domain${domain ? '' : ' project-card__domain--pending'}`}>{domain || 'Your assessment will define your roadmap.'}</p>

      {completed ? (
        <dl className="project-placement">
          <div><dt>Current stage</dt><dd>{result?.stage || 'Not assigned'}</dd></div>
          <div><dt>Level</dt><dd>{result?.level ?? 'Not assigned'}</dd></div>
        </dl>
      ) : (
        <div className="project-draft">
          <div><span>Assessment progress</span><strong>{answeredCount} of 7</strong></div>
          <div className="project-draft__track" role="progressbar" aria-label={`Questions answered for ${project.name}`} aria-valuemin={0} aria-valuemax={7} aria-valuenow={answeredCount}>
            <span style={{ width: `${answeredCount / 7 * 100}%` }} />
          </div>
          <p>{answeredCount > 0 ? 'Pick up where you left off.' : 'Seven questions to map your next steps.'}</p>
        </div>
      )}

      <dl className="project-card__meta">
        <div><dt><UserRound size={14} aria-hidden="true" />Created by</dt><dd>{project.created_by || 'You'}</dd></div>
        <div><dt><CalendarDays size={14} aria-hidden="true" />Created</dt><dd>{formatDate(project.created_at)}</dd></div>
      </dl>
      <footer className="project-card__footer">
        <Link className="projects-button project-card__open" to={`/roadmap/${project.id}${completed ? '' : '/assessment'}`} aria-label={`${action}: ${project.name}`}>
          {action}<ArrowRight size={16} aria-hidden="true" />
        </Link>
        <div className="project-card__actions">
          <button type="button" className="projects-text-button" onClick={() => onEdit(project)} aria-label={`Edit ${project.name}`}><Pencil size={14} aria-hidden="true" />Edit name</button>
          <button type="button" className="projects-text-button projects-text-button--danger" onClick={() => onDelete(project)} aria-label={`Delete ${project.name}`}><Trash2 size={14} aria-hidden="true" />Delete</button>
        </div>
      </footer>
    </article>
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
        <h2 id="project-dialog-title">{isDelete ? 'Delete project?' : 'Edit project name'}</h2>
        <p id="project-dialog-description">{isDelete ? <>This will permanently delete <strong>{project.name}</strong>, its assessment, and its roadmap. This cannot be undone.</> : 'Update the name shown on this project and its roadmap. Your assessment stays the same.'}</p>
        <form onSubmit={submit} noValidate aria-busy={saving}>
          {!isDelete && <div className="projects-field"><label htmlFor="edit-project-name">Project name</label><input ref={inputRef} id="edit-project-name" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} maxLength={100} required disabled={saving} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? 'project-dialog-error' : undefined} /></div>}
          {error && <p id="project-dialog-error" className="projects-feedback projects-feedback--error" role="alert">{error}</p>}
          <div className="projects-dialog__actions">
            <button ref={cancelRef} type="button" className="projects-button" onClick={dismiss} disabled={saving}>Cancel</button>
            <button type="submit" className={`projects-button ${isDelete ? 'projects-button--danger' : 'projects-button--primary'}`} disabled={saving}>{saving ? isDelete ? 'Deleting…' : 'Saving…' : isDelete ? 'Delete project' : 'Save name'}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export function ProjectsPage() {
  const { projects, renameProject, deleteProject } = useProjects();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');
  const headingRef = useRef(null);
  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleProjects = projects.slice(start, start + PAGE_SIZE);

  const changePage = (next) => {
    setPage(next);
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  const openDialog = (project, mode) => { setNotice(''); setDialog({ project, mode }); };
  const saveChange = async (id, name) => {
    if (dialog.mode === 'edit') {
      await renameProject(id, name);
      setNotice('Project name updated.');
    } else {
      await deleteProject(id);
      setPage(Math.min(currentPage, Math.max(1, Math.ceil((projects.length - 1) / PAGE_SIZE))));
      setNotice(`“${dialog.project.name}” was deleted.`);
    }
  };

  return (
    <div className="projects-page">
      <header className="projects-header">
        <div><span className="projects-eyebrow"><Route size={15} aria-hidden="true" />Build your next chapter</span><h1>Project roadmaps</h1><p>Every project has its own path. Create a project, take its assessment, and find your next steps.</p></div>
        <Link to="/roadmap/new" className="projects-button projects-button--primary"><Plus size={18} aria-hidden="true" />New project</Link>
      </header>

      <div className="projects-section-heading"><h2 ref={headingRef} tabIndex={-1}>My projects <span>{projects.length}</span></h2><p>One assessment. One roadmap. Each project.</p></div>
      {notice && <p className="projects-feedback" role="status">{notice}</p>}
      {projects.length ? <>
        <div className="projects-grid">{visibleProjects.map((project) => <ProjectCard key={project.id} project={project} onEdit={(item) => openDialog(item, 'edit')} onDelete={(item) => openDialog(item, 'delete')} />)}</div>
        <nav className="projects-pagination" aria-label="Projects pagination">
          <p role="status">Showing <strong>{start + 1}–{Math.min(start + PAGE_SIZE, projects.length)}</strong> of <strong>{projects.length}</strong> projects</p>
          <div><button type="button" className="projects-button projects-pagination__arrow" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft size={18} aria-hidden="true" /></button><span aria-current="page">Page {currentPage} of {totalPages}</span><button type="button" className="projects-button projects-pagination__arrow" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => changePage(currentPage + 1)}><ChevronRight size={18} aria-hidden="true" /></button></div>
        </nav>
      </> : <section className="projects-empty" aria-labelledby="projects-empty-title">
        <span className="projects-empty__icon" aria-hidden="true"><FolderPlus size={36} /></span>
        <span className="projects-eyebrow">Your first project starts here</span>
        <h2 id="projects-empty-title">An idea deserves a roadmap.</h2>
        <p>Give your project a name, then answer seven questions to create its roadmap. Add more projects whenever inspiration strikes.</p>
        <Link to="/roadmap/new" className="projects-button projects-button--primary"><Plus size={17} aria-hidden="true" />Create your first project</Link>
        <div className="projects-empty__steps" aria-hidden="true"><span>01 &nbsp; Name your project</span><ChevronRight size={13} /><span>02 &nbsp; Take the assessment</span><ChevronRight size={13} /><span>03 &nbsp; Explore your roadmap</span></div>
      </section>}
      {dialog && <ProjectDialog key={`${dialog.mode}-${dialog.project.id}`} project={dialog.project} mode={dialog.mode} onClose={() => setDialog(null)} onSave={saveChange} focusAfterClose={headingRef} />}
    </div>
  );
}
