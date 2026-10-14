import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects } from '../../projects/hooks/use_projects.js';
import {
  DOMAIN_OPTIONS, STAGE_OPTIONS, EVIDENCE_OPTIONS, EXECUTION_OPTIONS,
  VALIDATION_OPTIONS, MATURITY_OPTIONS, COMPLETED_OPTIONS,
  toggleEvidence, validateAssessmentStep,
} from '../services/mock_assessment.js';
import {
  Bot, Box, Boxes, BrainCircuit, Building2, CheckCircle2, ChevronRight,
  CircleDollarSign, CircleSlash, Clapperboard, Code2, FileCheck2, FileText,
  Flag, Gauge, Globe2, GraduationCap, HandHelping, HeartPulse, Landmark,
  Leaf, Lightbulb, MessageCircle, Orbit, Rocket, Search, ShieldCheck,
  Target, TrendingUp, Truck, UserCheck, UsersRound, Wheat, Wrench,
} from 'lucide-react';
import '../components/AssessmentWizard.css';

const DOMAIN_ICONS = [Bot, HeartPulse, GraduationCap, UsersRound, ShieldCheck, Landmark, Truck, Leaf, Wheat, Building2, Clapperboard, Rocket];
const STAGE_ICONS = [Target, Lightbulb, Search, UserCheck, Wrench, Rocket, UsersRound, CircleDollarSign, TrendingUp];
const EVIDENCE_ICONS = {
  problem_statement: FileText, user_interviews: MessageCircle, market_research: Search,
  customer_validation: UserCheck, prototype: Box, working_mvp: Wrench, live_product: Globe2,
  active_users: UsersRound, paying_customers: CircleDollarSign, revenue: TrendingUp, none_yet: CircleSlash,
};
const EXECUTION_ICONS = [HandHelping, Lightbulb, Wrench, Code2, BrainCircuit];
const VALIDATION_ICONS = [CircleSlash, MessageCircle, UserCheck, UsersRound, CircleDollarSign, TrendingUp];
const MATURITY_ICONS = [CircleSlash, Lightbulb, Box, Wrench, Boxes, ShieldCheck, Globe2];
const COMPLETED_ICONS = [Target, Search, UserCheck, Box, Wrench, Rocket, UsersRound, CircleDollarSign, TrendingUp];

export const AssessmentWizard = ({ project }) => {
  const { saveDraft, completeProject } = useProjects();
  const { step, answers } = project.draft;
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
  }, [step]);

  const handleSingleSelect = (questionKey, value) => {
    if (submittingRef.current) return;
    setError('');
    setDraft((prev) => ({ ...prev, answers: { ...prev.answers, [questionKey]: value } }));
  };

  const handleMultiSelect = (key) => {
    if (submittingRef.current) return;
    setError('');
    setDraft((prev) => ({ ...prev, answers: { ...prev.answers, q3: toggleEvidence(prev.answers.q3, key) } }));
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
    if (step < 7) setDraft((prev) => ({ ...prev, step: prev.step + 1 }));
    else handleSubmit();
  };

  return (
    <div className="assessment-wizard">
      <Link className="assessment-project-back" to="/roadmap">&larr; All projects</Link>
      {/* Step Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <p className="assessment-project-name">{project.name}</p>
        <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>
          Founder Diagnostic Assessment
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Step {step} of 7 &mdash; Record your domain and project details
        </p>

        {/* Progress Bar */}
        <div role="progressbar" aria-label="Assessment progress" aria-valuemin={0} aria-valuemax={7} aria-valuenow={step} className="progress-bar-bg" style={{ marginTop: '16px', height: '6px' }}>
          <div className="progress-bar-fill" style={{ width: `${(step / 7) * 100}%` }} />
        </div>
      </div>

      <div className="glass-card assessment-card" key={step} aria-busy={submitting}>
        {error && (
          <div role="alert" style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* QUESTION 1 - DOMAIN */}
        {step === 1 && (
          <QuestionStep
            icon={Orbit}
            step={step}
            title="What problem domain are you working on?"
            subtitle="This directly determines your Domain and automatic Guild assignment."
          >
            {DOMAIN_OPTIONS.map((opt, idx) => (
              <OptionCard
                key={opt}
                selected={answers.q1 === idx + 1}
                onClick={() => handleSingleSelect('q1', idx + 1)}
                label={opt}
                icon={DOMAIN_ICONS[idx]}
                index={idx}
                disabled={submitting}
              />
            ))}
          </QuestionStep>
        )}

        {/* QUESTION 2 - PROJECT STAGE */}
        {step === 2 && (
          <QuestionStep
            icon={Flag}
            step={step}
            title="What best describes the current state of your project?"
            subtitle="Select the primary state of development."
          >
            {STAGE_OPTIONS.map((opt, idx) => (
              <OptionCard
                key={opt}
                selected={answers.q2 === idx + 1}
                onClick={() => handleSingleSelect('q2', idx + 1)}
                label={opt}
                icon={STAGE_ICONS[idx]}
                index={idx}
                disabled={submitting}
              />
            ))}
          </QuestionStep>
        )}

        {/* QUESTION 3 - EVIDENCE */}
        {step === 3 && (
          <QuestionStep
            icon={FileCheck2}
            step={step}
            title="What evidence do you currently have?"
            subtitle="Select all evidence items that apply to your venture."
          >
            {EVIDENCE_OPTIONS.map((opt, idx) => (
              <OptionCard
                key={opt.key}
                selected={answers.q3.includes(opt.key)}
                onClick={() => handleMultiSelect(opt.key)}
                label={opt.label}
                icon={EVIDENCE_ICONS[opt.key]}
                index={idx}
                disabled={submitting}
              />
            ))}
          </QuestionStep>
        )}

        {/* QUESTION 4 - EXECUTION */}
        {step === 4 && (
          <QuestionStep
            icon={Gauge}
            step={step}
            title="How independently can you execute your project work?"
            subtitle="Assesses execution confidence and skill maturity."
          >
            {EXECUTION_OPTIONS.map((opt, idx) => (
              <OptionCard
                key={opt}
                selected={answers.q4 === idx + 1}
                onClick={() => handleSingleSelect('q4', idx + 1)}
                label={`${idx + 1}. ${opt}`}
                icon={EXECUTION_ICONS[idx]}
                index={idx}
                disabled={submitting}
              />
            ))}
          </QuestionStep>
        )}

        {/* QUESTION 5 - VALIDATION / TRACTION */}
        {step === 5 && (
          <QuestionStep
            icon={UsersRound}
            step={step}
            title="How much real-world validation or traction do you have?"
            subtitle="Assesses customer signal and market response."
          >
            {VALIDATION_OPTIONS.map((opt, idx) => (
              <OptionCard
                key={opt}
                selected={answers.q5 === idx + 1}
                onClick={() => handleSingleSelect('q5', idx + 1)}
                label={opt}
                icon={VALIDATION_ICONS[idx]}
                index={idx}
                disabled={submitting}
              />
            ))}
          </QuestionStep>
        )}

        {/* QUESTION 6 - PRODUCT MATURITY */}
        {step === 6 && (
          <QuestionStep
            icon={Boxes}
            step={step}
            title="How complete and reliable is your current product?"
            subtitle="Assesses technical and product readiness."
          >
            {MATURITY_OPTIONS.map((opt, idx) => (
              <OptionCard
                key={opt}
                selected={answers.q6 === idx + 1}
                onClick={() => handleSingleSelect('q6', idx + 1)}
                label={opt}
                icon={MATURITY_ICONS[idx]}
                index={idx}
                disabled={submitting}
              />
            ))}
          </QuestionStep>
        )}

        {/* QUESTION 7 - COMPLETED WORK */}
        {step === 7 && (
          <QuestionStep
            icon={Flag}
            step={step}
            title="What have you actually completed to date?"
            subtitle="Final verification of tangible outputs achieved."
          >
            {COMPLETED_OPTIONS.map((opt, idx) => (
              <OptionCard
                key={opt}
                selected={answers.q7 === idx + 1}
                onClick={() => handleSingleSelect('q7', idx + 1)}
                label={opt}
                icon={COMPLETED_ICONS[idx]}
                index={idx}
                disabled={submitting}
              />
            ))}
          </QuestionStep>
        )}

        {/* Controls */}
        <div className="assessment-controls" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          {step > 1 ? (
            <button
              className="btn btn-secondary"
              onClick={() => { setError(''); setDraft((prev) => ({ ...prev, step: prev.step - 1 })); }}
              disabled={submitting}
            >
              Back
            </button>
          ) : <div />}

          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={submitting || Boolean(validateAssessmentStep(answers, step))}
          >
            {submitting ? 'Saving assessment...' : step === 7 ? 'Complete Assessment' : 'Next Step'}
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="assessment-skip">
          <p>Your answers save to this project automatically. You can return anytime. Completed answers cannot be changed.</p>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/roadmap')} disabled={submitting}>
            Save and exit
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionStep = ({ title, subtitle, children, icon: QuestionIcon, step }) => (
  <div className="assessment-question">
    <div className="assessment-question__heading">
      <div className="assessment-question__icon"><QuestionIcon size={30} /><span /></div>
      <div>
        <span className="assessment-question__kicker">QUESTION 0{step}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
    <div className="assessment-options">
      {children}
    </div>
  </div>
);

const OptionCard = ({ selected, onClick, label, icon: Icon, index, disabled }) => (
  <button
    type="button"
    className={`assessment-option ${selected ? 'is-selected' : ''}`}
    onClick={onClick}
    aria-pressed={selected}
    disabled={disabled}
    style={{
      '--option-index': index,
      '--option-hue': (index * 31 + 185) % 360,
    }}
  >
    <span className="assessment-option__icon"><Icon size={21} /></span>
    <span className="assessment-option__label">{label}</span>
    <span className="assessment-option__check">{selected && <CheckCircle2 size={21} />}</span>
  </button>
);
