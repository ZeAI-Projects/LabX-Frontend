import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects } from '../../projects/hooks/use_projects.js';
import {
  ASSESSMENT_QUESTIONS, ASSESSMENT_QUESTION_COUNT, validateAssessmentStep,
} from '../services/mock_assessment.js';
import {
  Bot, Box, Boxes, BrainCircuit, Building2, CheckCircle2, ChevronRight,
  CircleDollarSign, CircleHelp, CircleSlash, Clapperboard, Code2, Factory,
  FileCheck2, FileText, Flag, Globe2, GraduationCap, HandHelping, HeartPulse,
  Landmark, Leaf, Lightbulb, ListChecks, MessageCircle, Microscope, Monitor,
  Orbit, Rocket, Scale, Search, ShieldCheck, ShoppingBag, ShoppingCart,
  Smartphone, Target, TrendingUp, Truck, UserCheck, UsersRound, Wheat, Wifi, Wrench,
} from 'lucide-react';
import '../components/AssessmentWizard.css';

const QUESTION_ICONS = [Orbit, UsersRound, Boxes, Flag, UserCheck, Box, TrendingUp, Wrench];
const OPTION_ICONS = [
  [HeartPulse, GraduationCap, Landmark, ShieldCheck, Truck, Wheat, Leaf, Building2, HandHelping, Clapperboard, ShieldCheck, Scale, ShoppingBag, Factory, ShoppingCart, ListChecks, CircleHelp],
  [UsersRound, GraduationCap, Rocket, Building2, Landmark, HeartPulse, Wheat, Landmark, Code2, Factory, UsersRound, CircleHelp],
  [Monitor, Smartphone, BrainCircuit, Globe2, Box, Bot, Wifi, ShoppingCart, ShoppingBag, Microscope, Boxes, ListChecks],
  [Lightbulb, Target, Search, UserCheck, Wrench, Boxes, UsersRound, Rocket, UsersRound, CircleDollarSign, TrendingUp, CircleHelp],
  [CircleSlash, Lightbulb, FileText, MessageCircle, ListChecks, UserCheck, Wrench, TrendingUp, CircleHelp],
  [Lightbulb, FileText, Microscope, Box, Boxes, UserCheck, Globe2, TrendingUp, CircleHelp],
  [CircleSlash, Target, MessageCircle, UserCheck, UsersRound, ListChecks, Wrench, UsersRound, CircleDollarSign, Landmark, TrendingUp, Building2, CircleHelp],
  [Target, Microscope, Wrench, UserCheck, Landmark, UsersRound, CircleDollarSign, Globe2, Rocket, Scale, FileCheck2, CheckCircle2, CircleHelp],
];

export const AssessmentWizard = ({ project }) => {
  const { saveDraft, completeProject } = useProjects();
  const { step, answers, questionsUpdated } = project.draft;
  const question = ASSESSMENT_QUESTIONS[step - 1];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);
  const headingRef = useRef(null);
  const navigate = useNavigate();

  function setDraft(update) {
    try {
      saveDraft(project.id, update(project.draft));
    } catch (err) {
      setError(err.message || 'Unable to save your answers. Please try again.');
    }
  }

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [step]);

  const handleSingleSelect = (value) => {
    if (submittingRef.current) return;
    setError('');
    setDraft((previous) => ({ ...previous, answers: { ...previous.answers, [question.key]: value } }));
  };

  const handleSubmit = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      completeProject(project.id, answers);
      navigate(`/roadmap/${project.id}/result`, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to complete your assessment. Please try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (submittingRef.current) return;
    const validationError = validateAssessmentStep(answers, step);
    if (validationError) return setError(validationError);
    setError('');
    if (step < ASSESSMENT_QUESTION_COUNT) setDraft((previous) => ({ ...previous, step: previous.step + 1 }));
    else handleSubmit();
  };

  return (
    <div className="assessment-wizard">
      <Link className="assessment-project-back" to="/roadmap">&larr; All projects</Link>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <p className="assessment-project-name">{project.name}</p>
        <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>
          Founder Assessment
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Step {step} of {ASSESSMENT_QUESTION_COUNT} &mdash; Tell us about your startup
        </p>
        <div role="progressbar" aria-label="Assessment progress" aria-valuemin={0} aria-valuemax={ASSESSMENT_QUESTION_COUNT} aria-valuenow={step} className="progress-bar-bg" style={{ marginTop: '16px', height: '6px' }}>
          <div className="progress-bar-fill" style={{ width: `${(step / ASSESSMENT_QUESTION_COUNT) * 100}%` }} />
        </div>
      </div>

      {questionsUpdated && <p className="assessment-update-notice" role="status">The assessment questions have been updated. Please answer the eight questions for this project.</p>}

      <div className="glass-card assessment-card" key={step} aria-busy={submitting}>
        {error && (
          <div role="alert" style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        <QuestionStep icon={QUESTION_ICONS[step - 1]} step={step} title={question.title}>
          {question.options.map((option, index) => (
            <OptionCard
              key={option}
              selected={answers[question.key] === index + 1}
              onClick={() => handleSingleSelect(index + 1)}
              label={option}
              icon={OPTION_ICONS[step - 1][index] || CircleHelp}
              index={index}
              disabled={submitting}
            />
          ))}
        </QuestionStep>

        <div className="assessment-controls" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" disabled={submitting}
              onClick={() => { setError(''); setDraft((previous) => ({ ...previous, step: previous.step - 1 })); }}>
              Back
            </button>
          ) : <div />}
          <button type="button" className="btn btn-primary" onClick={handleNext}
            disabled={submitting || Boolean(validateAssessmentStep(answers, step))}>
            {submitting ? 'Saving assessment...' : step === ASSESSMENT_QUESTION_COUNT ? 'Complete Assessment' : 'Next Step'}
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="assessment-skip">
          <p>Your answers save to this project automatically. After finishing, you can review and edit your choices in the summary.</p>
        </div>
      </div>
    </div>
  );
};

const QuestionStep = ({ title, children, icon: QuestionIcon, step }) => (
  <div className="assessment-question">
    <div className="assessment-question__heading">
      <div className="assessment-question__icon" aria-hidden="true"><QuestionIcon size={30} /><span /></div>
      <div>
        <span className="assessment-question__kicker">QUESTION {String(step).padStart(2, '0')}</span>
        <h2 id={`assessment-question-${step}`}>{title}<span className="required-mark" aria-hidden="true" /></h2>
        <p id={`assessment-required-${step}`}>Choose one option. An answer is required.</p>
      </div>
    </div>
    <div className="assessment-options" role="group" aria-labelledby={`assessment-question-${step}`} aria-describedby={`assessment-required-${step}`}>
      {children}
    </div>
  </div>
);

const OptionCard = ({ selected, onClick, label, icon: Icon, index, disabled }) => (
  <button type="button" className={`assessment-option ${selected ? 'is-selected' : ''}`}
    onClick={onClick} aria-pressed={selected} disabled={disabled}
    style={{ '--option-index': index, '--option-hue': (index * 31 + 185) % 360 }}>
    <span className="assessment-option__icon" aria-hidden="true"><Icon size={21} /></span>
    <span className="assessment-option__label">{label}</span>
    <span className="assessment-option__check" aria-hidden="true">{selected && <CheckCircle2 size={21} />}</span>
  </button>
);
