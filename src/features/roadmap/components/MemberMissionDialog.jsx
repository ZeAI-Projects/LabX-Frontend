import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, FlaskConical, History, Paperclip, RotateCcw, Send, Upload, X } from 'lucide-react';
import { roadmapStore } from '../services/roadmap_store.js';
import { MAX_EVIDENCE_BYTES, MISSION_NOTES_MIN_LENGTH } from '../services/roadmap_workflow.js';
import { MISSION_WORKFLOW_LABELS } from '../services/mission_review.js';
import './MemberMissionDialog.css';

const formatDate = (value) => new Date(value).toLocaleString();
const formatBytes = (value) => value >= 1024 * 1024 ? `${(value / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
const reviewLabel = { pending: 'Awaiting founder review', under_review: 'Under Founder Review', approved: 'Founder Approved', changes_requested: 'Changes Requested' };

function Evidence({ payload }) {
  if (!payload) return null;
  return <div className="mr-evidence"><p>{payload.notes}</p>{payload.url && <a href={payload.url} target="_blank" rel="noopener noreferrer">Open evidence link ↗</a>}{payload.file && <p><Paperclip size={14} />{payload.file.name} · {formatBytes(payload.file.size)} · file metadata only</p>}</div>;
}

export function MemberMissionDialog({ project, ownerId, userId, mission, roadmap, onClose, onChange, isOwner }) {
  const work = roadmap.missionWorkflowsById?.[mission.id] || { status: 'assigned', latestVersion: 0, versions: [], evaluationJobs: [], history: [] };
  const latest = work.versions.at(-1);
  const job = work.evaluationJobs.at(-1);
  const draft = work.draft || latest?.payload || {};
  const [notes, setNotes] = useState(draft.notes || '');
  const [url, setUrl] = useState(draft.url || '');
  const [file, setFile] = useState(draft.file || null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState('');
  const [uploadConfirm, setUploadConfirm] = useState(false);
  const [failSubmission, setFailSubmission] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const dialogRef = useRef(null);
  const editable = !isOwner && ['in_progress', 'revision_in_progress'].includes(work.status);
  const reviewable = isOwner && ['submitted', 'resubmitted', 'under_review'].includes(work.status);
  const approved = latest?.review.status === 'approved';
  const canRevise = !isOwner && (['awaiting_upload', 'founder_approved', 'failed', 'changes_requested'].includes(work.status) || work.status === 'completed' && job?.result?.outcome === 'needs_improvement');

  useEffect(() => {
    const dialog = dialogRef.current;
    mounted.current = true;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => { mounted.current = false; dialog.close(); queueMicrotask(() => { if (trigger?.isConnected) trigger.focus(); }); };
  }, []);

  async function perform(label, action, success = '') {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(label); setError(''); setFields({}); setNotice('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (!mounted.current) return;
      const result = action();
      onChange(result);
      setNotice(success);
    } catch (err) { if (mounted.current) { setError(err.message || 'Unable to save. Your work is preserved; please retry.'); setFields(err.fields || {}); } }
    finally { inFlight.current = false; if (mounted.current) setSaving(''); }
  }
  const args = [project.id, ownerId, mission.id];
  const submittedPayload = () => ({ notes, url, file });
  function submit(event) {
    event.preventDefault();
    perform('Sending to founder…', () => {
      if (failSubmission) { setFailSubmission(false); throw new Error('Simulated submission upload failure. Your entered work is preserved. Retry Submit to Founder.'); }
      return roadmapStore.submitToFounder(...args, submittedPayload(), userId);
    }, 'Submission saved. The founder can now review this version.');
  }
  function chooseFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.size <= 0 || selected.size > MAX_EVIDENCE_BYTES) {
      setFields((current) => ({ ...current, file: selected.size <= 0 ? 'Choose a nonempty evidence file.' : 'Evidence must be 5 MB or smaller.' }));
      event.target.value = '';
      return;
    }
    setFile({ name: selected.name, size: selected.size, type: selected.type });
    setFields((current) => ({ ...current, file: '' }));
  }
  const advance = (action) => perform('Updating simulated evaluation…', () => roadmapStore.advanceEvaluation(...args, { jobId: job.id, action }, userId));
  const fieldError = (key) => fields[key] ? <small id={`mr-${key}-error`} className="rm-error" role="alert">{fields[key]}</small> : null;

  return <dialog ref={dialogRef} className="rm-dialog mr-dialog" aria-labelledby="member-mission-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <div className="rm-dialog-head"><div><span className="rm-eyebrow">{project.name} · {mission.stageName} / Level {mission.level}</span><h2 id="member-mission-title">{mission.name}</h2></div><button type="button" className="rm-icon-button" disabled={Boolean(saving)} onClick={onClose} aria-label="Close mission"><X size={20} /></button></div>
    <div className="rm-dialog-content" aria-busy={Boolean(saving)}>
      <div className="mr-status-row" role="status" aria-live="polite"><span className={`mr-status is-${work.status}`}><Clock3 size={15} />{MISSION_WORKFLOW_LABELS[work.status] || work.status}</span><span>{work.memberName || 'Assigned member'} · {work.latestVersion ? `Latest: version ${work.latestVersion}` : 'No submission yet'}</span></div>
      <div className="rm-mission-brief"><span className="rm-brief-icon"><FileCheck2 size={23} /></span><div><h3>Expected deliverable</h3><p>Create your {mission.name.toLowerCase()} for {project.name}. Explain your work, what you learned, and the next decision it supports. Provide at least {MISSION_NOTES_MIN_LENGTH} characters of notes and an evidence link or file.</p>{work.instructions && <p><strong>Founder instructions:</strong> {work.instructions}</p>}</div></div>
      <div className="mr-journey" aria-label="Mission review sequence"><span>Member work</span><ArrowRight size={14} /><span>Founder review</span><ArrowRight size={14} /><span>Approved version</span><ArrowRight size={14} /><span>Founder upload</span><ArrowRight size={14} /><span>Simulated AI evaluation</span></div>
      <p className="mr-small">Request Changes → Member Revises Mission → Resubmit to Founder → Founder Review. Technical failure → Retry upload or evaluation.</p>

      {!isOwner && work.status === 'assigned' && <div className="mr-action-card"><h3>Your assigned mission</h3><p>Start your work, then send evidence to your founder for review.</p><button className="rm-button rm-button-primary" disabled={Boolean(saving)} onClick={() => perform('Starting mission…', () => roadmapStore.startMission(...args, userId))}>Start mission<ArrowRight size={15} /></button></div>}
      {isOwner && ['assigned', 'in_progress', 'revision_in_progress'].includes(work.status) && <div className="mr-action-card"><h3>{work.status === 'revision_in_progress' ? 'Member Revises Mission' : 'Waiting for member submission'}</h3><p>{work.memberName || 'Your team member'} can submit evidence from their assigned missions. A version will appear here for review when submitted.</p></div>}
      {latest?.review.feedback && <section className="mr-feedback"><h3>Founder feedback · version {latest.version}</h3><p>{latest.review.feedback}</p></section>}
      {!isOwner && ['submitted', 'resubmitted', 'under_review'].includes(work.status) && <div className="mr-action-card"><h3>Awaiting founder review</h3><p>Version {latest.version} was submitted on {formatDate(latest.submittedAt)}. Its evidence is frozen while your founder reviews it.</p></div>}
      {canRevise && <div className="mr-action-card"><h3>Member Revises Mission</h3><p>A revision creates a new submission version and needs founder review before another AI upload.</p><button className="rm-button" disabled={Boolean(saving)} onClick={() => perform('Starting revision…', () => roadmapStore.startRevision(...args, latest.version, userId))}><RotateCcw size={15} />Revise mission</button></div>}

      {editable && <form className="mr-form" onSubmit={submit} noValidate>
        <fieldset className="mr-form-fields" disabled={Boolean(saving)}>
        <h3>{work.latestVersion ? `Prepare version ${work.latestVersion + 1}` : 'Complete your mission'}</h3>
        <div className="rm-field"><label htmlFor="mr-notes">Your work <span className="required-mark" aria-hidden="true" /></label><p id="mr-notes-hint">At least {MISSION_NOTES_MIN_LENGTH} characters. Describe your work and findings.</p><textarea id="mr-notes" rows={5} value={notes} required minLength={MISSION_NOTES_MIN_LENGTH} maxLength={10000} onChange={(event) => setNotes(event.target.value)} aria-invalid={Boolean(fields.notes)} aria-describedby={`mr-notes-hint${fields.notes ? ' mr-notes-error' : ''}`} />{fieldError('notes')}</div>
        <fieldset className="rm-artifact"><legend>Supporting evidence</legend><p id="mr-artifact-hint">Add an evidence link or a file. The existing file limit is 5 MB.</p>{fieldError('artifact')}<div className="rm-field"><label htmlFor="mr-url">Evidence link</label><input id="mr-url" type="url" value={url} maxLength={2000} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" aria-invalid={Boolean(fields.url || fields.artifact)} aria-describedby={`mr-artifact-hint${fields.url ? ' mr-url-error' : ''}${fields.artifact ? ' mr-artifact-error' : ''}`} />{fieldError('url')}</div><div className="rm-field"><label htmlFor="mr-file">Evidence file</label><input id="mr-file" type="file" onChange={chooseFile} aria-invalid={Boolean(fields.file || fields.artifact)} aria-describedby={`mr-file-hint${fields.file ? ' mr-file-error' : ''}${fields.artifact ? ' mr-artifact-error' : ''}`} /><small id="mr-file-hint">Only filename, size, and type are saved in this preview; file contents are not uploaded.</small>{fieldError('file')}{file && <div className="rm-attached-file"><Paperclip size={14} /><span>{file.name} · {formatBytes(file.size)}</span><button type="button" onClick={() => { setFile(null); const input = dialogRef.current?.querySelector('#mr-file'); if (input) input.value = ''; }}>Remove</button></div>}</div></fieldset>
        <label className="mr-check"><input type="checkbox" checked={failSubmission} onChange={(event) => setFailSubmission(event.target.checked)} />Preview: simulate a recoverable failure on the next submission</label>
        <div className="mr-actions"><button type="button" className="rm-button" disabled={Boolean(saving)} onClick={() => perform('Saving draft…', () => roadmapStore.saveMissionDraft(...args, submittedPayload(), userId), 'Draft saved in this browser.')}>Save draft</button><button type="submit" className="rm-button rm-button-primary" disabled={Boolean(saving)}><Send size={15} />{work.latestVersion ? 'Resubmit to Founder' : 'Submit to Founder'}</button></div>
        </fieldset>
      </form>}

      {latest && <section className="mr-submission"><div className="mr-section-title"><h3>{isOwner ? 'Mission Review and Approval' : 'Latest submitted evidence'}</h3><span>Version {latest.version} · {reviewLabel[latest.review.status]}</span></div><p className="mr-small">Submitted by {work.memberName || work.memberId} · {formatDate(latest.submittedAt)}</p><Evidence payload={latest.payload} />
        {reviewable && <><div className="rm-field"><label htmlFor="mr-feedback">Actionable feedback <span className="rm-optional">Required when requesting changes</span></label><textarea id="mr-feedback" rows={3} disabled={Boolean(saving)} value={feedback} onChange={(event) => setFeedback(event.target.value)} aria-invalid={Boolean(fields.feedback)} aria-describedby={fields.feedback ? 'mr-feedback-error' : undefined} placeholder="Explain what should change and what evidence would help." />{fieldError('feedback')}</div><div className="mr-actions">{work.status !== 'under_review' && <button className="rm-button" disabled={Boolean(saving)} onClick={() => perform('Opening founder review…', () => roadmapStore.beginReview(...args, { version: latest.version, submissionId: latest.id }, userId))}>Start founder review</button>}<button className="rm-button" disabled={Boolean(saving)} onClick={() => perform('Saving requested changes…', () => roadmapStore.reviewSubmission(...args, { version: latest.version, submissionId: latest.id, decision: 'changes_requested', feedback }, userId))}><RotateCcw size={15} />Request Changes</button><button className="rm-button rm-button-primary" disabled={Boolean(saving)} onClick={() => perform('Approving this version…', () => roadmapStore.reviewSubmission(...args, { version: latest.version, submissionId: latest.id, decision: 'approved', feedback }, userId))}><CheckCircle2 size={15} />Approve Submission</button></div></>}
      </section>}

      {approved && ['awaiting_upload', 'founder_approved'].includes(work.status) && <section className="mr-action-card"><h3>Founder Uploads Approved Mission Submission</h3><p><strong>Founder Approved · version {latest.version}</strong></p><p>Awaiting AI Upload. The approved evidence above is the exact snapshot prepared for evaluation.</p>{isOwner ? <>{!uploadConfirm ? <button className="rm-button rm-button-primary" disabled={Boolean(saving)} onClick={() => setUploadConfirm(true)}><Upload size={16} />Upload Approved Submission for AI Evaluation</button> : <div className="mr-confirm"><p>Confirm upload for <strong>{project.name} / {mission.name}</strong>, member <strong>{work.memberName || work.memberId}</strong>, version <strong>{latest.version}</strong>.</p><p>The notes, evidence link, and file metadata displayed above will be copied unchanged. This is a local simulation.</p><div className="mr-actions"><button className="rm-button" disabled={Boolean(saving)} onClick={() => setUploadConfirm(false)}>Cancel</button><button className="rm-button rm-button-primary" disabled={Boolean(saving)} onClick={() => perform('Preparing approved upload…', () => roadmapStore.beginApprovedUpload(...args, { version: latest.version, submissionId: latest.id }, userId))}>Confirm approved upload<Upload size={15} /></button></div></div>}</> : <p>Your founder will upload this approved version as a separate step.</p>}</section>}

      {job && job.status !== 'superseded' && <section className="mr-evaluation"><h3><FlaskConical size={20} />Simulated AI evaluation</h3><div className="mr-evaluation-states" aria-label="AI evaluation states">{['awaiting_upload', 'uploading', 'queued', 'evaluating', 'completed', 'failed'].map((status) => <span key={status} aria-current={work.status === status ? 'step' : undefined} className={work.status === status ? 'is-current' : ''}>{MISSION_WORKFLOW_LABELS[status]}</span>)}</div><p>Approved version {job.version} · {work.memberName || work.memberId} · {project.name}</p>
        {job.error && <p className="rm-error" role="alert">{job.error}</p>}
        {isOwner && ['uploading', 'queued', 'evaluating'].includes(job.status) && <div className="mr-simulation"><strong>Preview controls</strong><p>Advance each state to demonstrate the workflow. No files are transferred and no AI service runs.</p><div className="mr-actions">{job.status === 'uploading' && <><button className="rm-button rm-button-primary" disabled={Boolean(saving)} onClick={() => advance('queue')}>Finish simulated upload</button><button className="rm-button" disabled={Boolean(saving)} onClick={() => advance('fail_upload')}>Simulate upload failure</button></>}{job.status === 'queued' && <button className="rm-button rm-button-primary" disabled={Boolean(saving)} onClick={() => advance('evaluate')}>Start simulated evaluation</button>}{job.status === 'evaluating' && <><button className="rm-button rm-button-primary" disabled={Boolean(saving)} onClick={() => advance('complete_meets')}>Simulate meets requirements</button><button className="rm-button" disabled={Boolean(saving)} onClick={() => advance('complete_improve')}>Simulate needs improvement</button></>}{['queued', 'evaluating'].includes(job.status) && <button className="rm-button" disabled={Boolean(saving)} onClick={() => advance('fail_evaluation')}>Simulate technical failure</button>}</div></div>}
        {isOwner && job.status === 'failed' && <button className="rm-button rm-button-primary" disabled={Boolean(saving)} onClick={() => perform('Retrying approved submission…', () => roadmapStore.retryEvaluation(...args, { jobId: job.id }, userId))}><RotateCcw size={15} />{job.failurePhase === 'upload' ? 'Retry approved upload' : 'Retry evaluation'}</button>}
        {!isOwner && job.status === 'failed' && <p>Your approved evidence is preserved. Your founder can retry this technical step.</p>}
        {job.result && <div className="mr-result"><h4>{job.result.outcome === 'meets_requirements' ? 'Meets requirements' : 'Needs improvement'}</h4><p>{job.result.feedback}</p><p className="mr-small">Evaluated version {job.result.version} · {formatDate(job.result.evaluatedAt)}</p><ul>{job.result.criteria.map((item) => <li key={item.id}><strong>{item.label}:</strong> {item.passed ? 'Requirement present' : item.message}</li>)}</ul>{job.result.strengths.length > 0 && <p><strong>Strengths:</strong> {job.result.strengths.join(' · ')}</p>}{job.result.gaps.length > 0 && <p><strong>Improve:</strong> {job.result.gaps.join(' ')}</p>}</div>}
      </section>}

      {work.versions.length > 0 && <details className="mr-history"><summary><History size={17} />Submission and review history · {work.versions.length} {work.versions.length === 1 ? 'version' : 'versions'}</summary>{[...work.versions].reverse().map((entry) => <article key={entry.id}><h4>Version {entry.version}{entry.version === work.latestVersion ? ' · Latest' : ''} — {reviewLabel[entry.review.status]}</h4><p className="mr-small">Submitted {formatDate(entry.submittedAt)}{entry.review.reviewedAt ? ` · Reviewed ${formatDate(entry.review.reviewedAt)}` : ''}</p>{entry.review.feedback && <p><strong>Founder feedback:</strong> {entry.review.feedback}</p>}<Evidence payload={entry.payload} />{work.evaluationJobs.filter((item) => item.version === entry.version).map((item) => <p key={item.id}>Evaluation: {MISSION_WORKFLOW_LABELS[item.status] || 'Superseded by a revision'}{item.result ? ` · ${item.result.outcome === 'meets_requirements' ? 'Meets requirements' : 'Needs improvement'}` : ''}</p>)}</article>)}</details>}
      {isOwner && work.previousAssignments?.length > 0 && <details className="mr-history"><summary><History size={17} />Previous assignment history</summary>{work.previousAssignments.map((previous, index) => <article key={`${previous.memberId}:${index}`}><h4>{previous.memberName || previous.memberId} · Previous assignment</h4><p className="mr-small">Retained for the founder. This work is not shared with the newly assigned member.</p>{previous.versions.map((entry) => <div key={entry.id}><p>Version {entry.version} · {reviewLabel[entry.review.status]}</p>{entry.review.feedback && <p>{entry.review.feedback}</p>}<Evidence payload={entry.payload} /></div>)}</article>)}</details>}
      {error && <p className="rm-error" role="alert">{error}</p>}
      <p className="mr-announcement" aria-live="polite" role="status">{saving || notice}</p>
      <div className="rm-demo-note"><FlaskConical size={17} /><p>Local preview. Submissions, founder decisions, and evaluation states are stored in this browser. No real invitations, uploads, or AI evaluations occur. File contents are never read. Existing roadmap progression applies only after a simulated meets-requirements result; no LabX points are awarded.</p></div>
    </div>
  </dialog>;
}
