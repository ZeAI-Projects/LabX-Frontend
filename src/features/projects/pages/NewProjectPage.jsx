import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ClipboardList, FolderPlus, Route } from 'lucide-react';
import { useProjects } from '../hooks/use_projects.js';
import '../components/Projects.css';

export function NewProjectPage() {
  const { createProject } = useProjects();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const submittingRef = useRef(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      setError(!trimmed ? 'Enter a project name to start your assessment.' : 'Use 100 characters or fewer.');
      inputRef.current?.focus();
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const project = await createProject(trimmed);
      navigate(`/roadmap/${project.id}/assessment`, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create your project. Please try again.');
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="projects-page projects-new">
      <Link to="/roadmap" className="projects-back"><ArrowLeft size={17} aria-hidden="true" />All projects</Link>
      <div className="projects-new__layout">
        <section className="projects-new__intro" aria-labelledby="new-project-title">
          <span className="projects-eyebrow">A new project. A new path.</span>
          <h1 id="new-project-title">Name your <br /><span>project.</span></h1>
          <p>Start with what you’re building. We’ll use a short assessment to create a roadmap just for this project.</p>
          <ol className="projects-setup-steps" aria-label="Project setup steps">
            <li aria-current="step"><span className="projects-setup-steps__icon"><FolderPlus size={19} aria-hidden="true" /></span><div><strong>01 &nbsp; Project name</strong><span>Give this idea a place of its own.</span></div></li>
            <li><span className="projects-setup-steps__icon"><ClipboardList size={19} aria-hidden="true" /></span><div><strong>02 &nbsp; Assessment</strong><span>Answer seven questions about your project.</span></div></li>
            <li><span className="projects-setup-steps__icon"><Route size={19} aria-hidden="true" /></span><div><strong>03 &nbsp; Your roadmap</strong><span>Explore your project’s next steps.</span></div></li>
          </ol>
        </section>
        <section className="projects-new__form-card" aria-labelledby="project-details-title">
          <span className="projects-new__form-icon" aria-hidden="true"><FolderPlus size={25} /></span>
          <h2 id="project-details-title">What are you working on?</h2>
          <p>A working title is perfect. You can rename it anytime.</p>
          <form onSubmit={submit} noValidate aria-busy={saving}>
            <div className="projects-field">
              <label htmlFor="new-project-name">Project name <span aria-hidden="true">*</span></label>
              <input ref={inputRef} id="new-project-name" placeholder="e.g. GreenLoop" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} maxLength={100} required disabled={saving} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={`project-name-hint${error ? ' project-name-error' : ''}`} />
              <div className="projects-field__hint"><span id="project-name-hint">Choose a name you’ll recognize.</span><span>{name.length}/100</span></div>
            </div>
            {error && <p id="project-name-error" className="projects-feedback projects-feedback--error" role="alert">{error}</p>}
            <button type="submit" className="projects-button projects-button--primary projects-new__submit" disabled={saving}>{saving ? 'Creating project…' : 'Start assessment'}<ArrowRight size={17} aria-hidden="true" /></button>
          </form>
          <p className="projects-new__note"><Check size={15} aria-hidden="true" />Your assessment progress is saved as you go.</p>
        </section>
      </div>
    </div>
  );
}
