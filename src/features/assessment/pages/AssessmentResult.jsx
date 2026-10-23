import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Pencil, LockKeyhole } from 'lucide-react';
import { useProjects } from '../../projects/hooks/use_projects.js';
import { ASSESSMENT_QUESTIONS, ASSESSMENT_VERSION, validateAssessmentStep } from '../services/mock_assessment.js';
import '../components/AssessmentResult.css';

export const AssessmentResult = ({ result, project }) => {
  const navigate = useNavigate();
  const { saveDraft, completeProject } = useProjects();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const submitted = project.assessment_completed;
  const current = !submitted || result?.assessment_version === ASSESSMENT_VERSION;
  const answers = submitted ? project.assessment_answers : project.draft.answers;
  const summary = current ? ASSESSMENT_QUESTIONS.map((question, index) => ({
    key: question.key, question: question.title,
    answer: validateAssessmentStep(answers, index + 1) ? 'Not recorded' : question.options[answers[question.key] - 1],
  })) : [{ key:'q1', question:ASSESSMENT_QUESTIONS[0].title, answer:result?.domain || 'Not recorded' }];
  const base = '/roadmap/' + project.id;
  const edit = () => {
    try { saveDraft(project.id, { ...project.draft, step:1 }); navigate(base + '/assessment?review=1'); }
    catch (err) { setError(err.message); }
  };
  const submit = async () => {
    if (pending.current) return;
    pending.current=true;setBusy(true);setError('');
    try { await completeProject(project.id, answers); }
    catch (err) { setError(err.message || 'Unable to submit. Please try again.'); }
    finally { pending.current=false;setBusy(false); }
  };
  return <section className="assessment-result" aria-labelledby="assessment-result-title">
    <div className="glass-card assessment-result__card">
      <header className="assessment-result__header">
        <span className="assessment-result__complete-icon" aria-hidden="true"><CheckCircle2 size={23}/></span>
        <div><p className="assessment-result__project-name">{project.name}</p><h1 id="assessment-result-title" className="assessment-result__title">Your assessment summary</h1></div>
      </header>
      <p className="assessment-result__subtitle">{submitted ? 'Your assessment is submitted. Your roadmap is ready.' : 'Review your choices. You can edit your answers before submitting.'}</p>
      {!current && <p className="assessment-result__notice">Only the saved problem area is available for this assessment.</p>}
      {error && <p className="assessment-result__error" role="alert">{error}</p>}
      <dl className="assessment-result__answers" aria-label="Assessment answers">{summary.map((item,index)=><div className="assessment-result__answer" key={item.key}>
        <dt><span className="assessment-result__question"><span className="assessment-result__number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span>{item.question}</span></span></dt><dd>{item.answer}</dd>
      </div>)}</dl>
      {!submitted && <p className="assessment-result__notice assessment-submit-note"><LockKeyhole size={13} aria-hidden="true"/>Answers are locked after final submission.</p>}
      <footer className="assessment-result__actions">
        <Link className="assessment-result__back" to="/roadmap">All projects</Link>
        <div className="assessment-summary-buttons">
          {!submitted && <button type="button" className="btn btn-secondary" onClick={edit} disabled={busy}><Pencil size={15}/>Edit Answers</button>}
          <button type="button" className="btn btn-primary assessment-result__continue" disabled={busy} onClick={submitted ? ()=>navigate(base) : submit}>
            {busy ? 'Submitting...' : submitted ? 'Enter My Roadmap' : 'Submit Assessment'}<ArrowRight size={17} aria-hidden="true"/>
          </button>
        </div>
      </footer>
    </div>
  </section>;
};
