import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Pencil } from 'lucide-react';
import { useProjects } from '../../projects/hooks/use_projects.js';
import { ASSESSMENT_QUESTIONS, ASSESSMENT_VERSION, validateAssessmentStep } from '../services/mock_assessment.js';
import '../components/AssessmentResult.css';

export const AssessmentResult = ({ result, project }) => {
  const navigate = useNavigate();
  const { updateAssessmentChoice } = useProjects();
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const selectRef = useRef(null);
  const openerRef = useRef(null);
  const pendingRef = useRef(false);
  const currentAssessment = result?.assessment_version === ASSESSMENT_VERSION;
  const answers = project.assessment_answers;
  const editingKey = editor?.key;
  const summary = currentAssessment
    ? ASSESSMENT_QUESTIONS.map((question, index) => ({
        key: question.key,
        question: question.title,
        options: question.options,
        answer: validateAssessmentStep(answers, index + 1) ? 'Not recorded' : question.options[answers[question.key] - 1],
      }))
    : [{ key: 'q1', question: ASSESSMENT_QUESTIONS[0].title, answer: result?.domain || 'Not recorded' }];

  useEffect(() => {
    if (saving) return;
    if (editingKey) selectRef.current?.focus();
    else openerRef.current?.focus();
  }, [editingKey, saving]);

  const startEditing = (item, event) => {
    if (pendingRef.current || editor?.key === item.key) return;
    openerRef.current = event.currentTarget;
    const original = answers?.[item.key];
    setEditor({ key: item.key, original, value: original ?? '' });
    setError('');
    setStatus('');
  };

  const cancelEditing = () => {
    if (pendingRef.current) return;
    setEditor(null);
    setError('');
  };

  const saveChoice = async (event) => {
    event.preventDefault();
    if (pendingRef.current || !editor) return;
    if (editor.value === editor.original) return cancelEditing();
    pendingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await updateAssessmentChoice(project.id, editor.key, editor.value, editor.original);
      setEditor(null);
      setStatus('Answer updated.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your answer. Please try again.');
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <section className="assessment-result" aria-labelledby="assessment-result-title">
      <div className="glass-card assessment-result__card">
        <header className="assessment-result__header">
          <span className="assessment-result__complete-icon" aria-hidden="true"><CheckCircle2 size={23} /></span>
          <div>
            <p className="assessment-result__project-name">{project.name}</p>
            <h1 id="assessment-result-title" className="assessment-result__title">Your assessment summary</h1>
          </div>
        </header>
        <p className="assessment-result__subtitle">Your responses are saved. {currentAssessment ? 'Use Edit to update a choice, then continue to your roadmap.' : 'Continue to your roadmap when you are ready.'}</p>
        {!currentAssessment && <p className="assessment-result__notice">Only the saved problem area is available for this assessment.</p>}
        {status && <p className="assessment-result__status" role="status">{status}</p>}

        <dl className="assessment-result__answers" aria-label="Assessment answers">
          {summary.map((item, index) => (
            <div className="assessment-result__answer" key={item.key}>
              <dt>
                <span className="assessment-result__question"><span className="assessment-result__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{item.question}</span></span>
                {currentAssessment && <button type="button" className="assessment-result__edit" aria-label={`Edit answer: ${item.question}`} aria-expanded={editingKey === item.key} disabled={saving} onClick={(event) => startEditing(item, event)}><Pencil size={12} aria-hidden="true" /><span>Edit</span></button>}
              </dt>
              <dd>
                {editingKey === item.key ? (
                  <form className="assessment-result__editor" onSubmit={saveChoice} aria-label={`Edit answer: ${item.question}`} aria-busy={saving}>
                    <select ref={selectRef} value={editor.value} required disabled={saving} aria-label={`Choose an answer: ${item.question}`} aria-invalid={Boolean(error)} aria-describedby={error ? `assessment-edit-error-${item.key}` : undefined}
                      onChange={(event) => { setEditor((previous) => ({ ...previous, value: Number(event.target.value) })); setError(''); }}>
                      <option value="" disabled>Choose one option</option>
                      {item.options.map((option, optionIndex) => <option key={option} value={optionIndex + 1}>{option}</option>)}
                    </select>
                    {error && <p id={`assessment-edit-error-${item.key}`} className="assessment-result__error" role="alert">{error}</p>}
                    <div className="assessment-result__editor-actions">
                      <button type="submit" className="assessment-result__save" disabled={saving || !Number.isInteger(editor.value) || editor.value === editor.original}>{saving ? 'Saving...' : 'Save'}</button>
                      <button type="button" className="assessment-result__cancel" onClick={cancelEditing} disabled={saving}>Cancel</button>
                    </div>
                  </form>
                ) : item.answer}
              </dd>
            </div>
          ))}
        </dl>

        <footer className="assessment-result__actions">
          <Link className="assessment-result__back" to="/roadmap">All projects</Link>
          <button type="button" className="btn btn-primary assessment-result__continue" disabled={saving || Boolean(editor)} onClick={() => navigate(`/roadmap/${project.id}`)}>
            Enter My Roadmap <ArrowRight size={17} aria-hidden="true" />
          </button>
        </footer>
      </div>
    </section>
  );
};
