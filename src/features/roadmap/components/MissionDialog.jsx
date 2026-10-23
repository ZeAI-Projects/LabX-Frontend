import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileCheck2, FlaskConical, LockKeyhole, Paperclip, RotateCcw, Sparkles, X } from 'lucide-react';
import { roadmapStore } from '../services/roadmap_store.js';
import { MAX_EVIDENCE_BYTES, MISSION_NOTES_MIN_LENGTH } from '../services/roadmap_workflow.js';
import { getCompanionUrl } from '../../companion/services/companion_navigation.js';
import { MemberMissionDialog } from './MemberMissionDialog.jsx';

const Required = () => <span className="required-mark" aria-hidden="true" />;
const formatBytes = (size) => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;

export function MissionDialog({ project, ownerId, userId, mission, roadmap, onClose, onChange, onNext, isOwner, canContinue }) {
  if (!isOwner || roadmap.missionWorkflowsById?.[mission.id]) return <MemberMissionDialog {...{ project, ownerId, userId, mission, roadmap, onClose, onChange, isOwner }} />;
  return <OwnerMissionDialog {...{ project, ownerId, userId, mission, roadmap, onClose, onChange, onNext, isOwner, canContinue }} />;
}

function OwnerMissionDialog({ project, ownerId, userId, mission, roadmap, onClose, onChange, onNext, isOwner, canContinue }) {
  const location = useLocation();
  const dialogRef = useRef(null);
  const previous = roadmap.submissionsByMilestone[mission.id];
  const [notes, setNotes] = useState(previous?.notes || '');
  const [url, setUrl] = useState(previous?.url || '');
  const [file, setFile] = useState(previous?.file || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const candidate = previous?.payload?.placement;
  const savedPlacement = Number.isInteger(candidate?.stageIndex) && candidate.stageIndex >= 0 && candidate.stageIndex < 5
    && Number.isInteger(candidate.level) && candidate.level >= 1 && candidate.level <= 5 ? candidate : null;
  const [target, setTarget] = useState(savedPlacement ? { stageIndex: savedPlacement.stageIndex, level: savedPlacement.level } : { stageIndex: 0, level: 1 });
  const [proofs, setProofs] = useState(() => Object.fromEntries((savedPlacement?.evidence || []).filter((entry) => roadmap.stages[entry.stageIndex]?.levels.some((level) => level.number === entry.level)).map((entry) => [
    `${roadmap.stages[entry.stageIndex].id}-level-${entry.level}`, { notes: entry.notes, url: entry.url },
  ])));
  const [placementOpen, setPlacementOpen] = useState(Boolean(savedPlacement));
  const feedbackRef = useRef(null);
  const first = mission.id === 'discover-l1-m1';
  const approved = mission.state === 'completed' || mission.state === 'credited';
  const evidenceLevels = roadmap.stages.flatMap((stage, stageIndex) => stage.levels
    .filter((level) => stageIndex < target.stageIndex || (stageIndex === target.stageIndex && level.number < target.level))
    .map((level) => ({ ...level, stageIndex, stageName: stage.name })));

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      queueMicrotask(() => { if (trigger?.isConnected) trigger.focus(); });
    };
  }, []);

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    setError('');
    if (!selected) { setFile(null); return; }
    if (selected.size > MAX_EVIDENCE_BYTES || selected.size <= 0) {
      setError(selected.size <= 0 ? 'Choose a file that is not empty.' : 'Evidence must be 5 MB or smaller.');
      setFile(null);
      event.target.value = '';
      return;
    }
    setFile({ name: selected.name, size: selected.size, type: selected.type });
  }

  function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      const next = roadmapStore.submitMission(project.id, ownerId, mission.id, {
        notes, url, file,
        ...(first && isOwner && placementOpen ? { placement: {
          ...target,
          evidence: evidenceLevels.map((level) => ({ stageIndex: level.stageIndex, level: level.number, ...proofs[level.id] })),
        } } : {}),
      }, userId);
      onChange(next);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    } catch (err) { setError(err.message || 'Unable to save this submission. Please try again.'); }
    finally { setSaving(false); }
  }

  const updateProof = (id, field, value) => setProofs((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  return <dialog ref={dialogRef} className="rm-dialog" aria-labelledby="mission-dialog-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="rm-dialog-head">
      <div><span className="rm-eyebrow">{mission.stageName} / Level {mission.level} / Mission {mission.order}</span><h2 id="mission-dialog-title">{mission.name}</h2></div>
      <button className="rm-icon-button" type="button" onClick={onClose} aria-label="Close mission"><X size={20} /></button>
    </div>
    <div className="rm-dialog-content">
      <div className="rm-mission-brief">
        <span className="rm-brief-icon"><FileCheck2 size={23} /></span>
        <div><h3>{first ? 'Your first checkpoint' : 'Your mission brief'}</h3><p>{first
          ? 'Describe the problem, who experiences it, and the evidence behind your idea. This checkpoint establishes your starting position.'
          : `Create your ${mission.name.toLowerCase()} for ${project.name}. Explain the work, what you learned, and the next decision it supports.`}</p></div>
      </div>
      {previous && <section ref={feedbackRef} tabIndex={-1} className={`rm-evaluation ${previous.status === 'approved' ? 'is-approved' : 'is-rejected'}`} aria-label="Evaluation result" role="status">
        <div>{previous.status === 'approved' ? <CheckCircle2 size={22} /> : <RotateCcw size={22} />}<h3>{previous.status === 'approved' ? 'Mission accepted' : 'Improve your evidence'}</h3><span>Attempt {previous.attempt}</span></div>
        <p>{previous.status === 'approved' ? (roadmap.isComplete ? 'All mission requirements are covered. Your roadmap is complete.' : first ? 'Your starting position is set. Your next eligible mission is unlocked.' : 'Progress saved. Your next eligible mission is unlocked.') : 'Some requirements are missing. Update your evidence and submit again.'}</p>
        {Array.isArray(previous.feedback) ? <ul>{previous.feedback.map((item, i) => <li key={i}>{typeof item === 'string' ? item : item.message}</li>)}</ul> : previous.feedback && <p>{previous.feedback}</p>}
        {roadmap.isComplete && <strong>Roadmap completed. Every checkpoint is covered!</strong>}
      </section>}
      {mission.state === 'credited' && <div className="rm-evaluation is-approved"><h3>Covered by your initial placement</h3><p>Prerequisite evidence covers this mission. It is recorded separately from completed missions.</p></div>}
      {isOwner && !approved && <Link className="rm-button" style={{marginBottom:16}} to={getCompanionUrl({ ...location, projectId: project.id, prompt: 'quest' })}><Sparkles size={15}/>Get quest help from Zenith<ArrowRight size={15}/></Link>}
      {!approved ? <form onSubmit={submit} noValidate aria-busy={saving}>
        <div className="rm-field">
          <label htmlFor="mission-notes">Your work<Required /></label>
          <p id="mission-notes-hint">What did you create, what did you learn, and what will you do next? At least {MISSION_NOTES_MIN_LENGTH} characters.</p>
          <textarea id="mission-notes" rows={5} required minLength={MISSION_NOTES_MIN_LENGTH} maxLength={10000} value={notes} onChange={(event) => setNotes(event.target.value)}
            placeholder="Explain your work and the evidence that supports it…" aria-describedby="mission-notes-hint" />
          <small className="rm-character-count">{notes.trim().length} characters</small>
        </div>
        <fieldset className="rm-artifact">
          <legend>Supporting evidence<Required /></legend>
          <p>Add a link or a file. You can include both.</p>
          <div className="rm-field"><label htmlFor="mission-url">Evidence link</label><input id="mission-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" maxLength={2000} /></div>
          <div className="rm-field"><label htmlFor="mission-file">Evidence file <span className="rm-optional">Up to 5 MB</span></label><input id="mission-file" type="file" onChange={chooseFile} aria-describedby="mission-file-hint" />
            {file && <div className="rm-attached-file"><Paperclip size={14} /><span>{file.name} · {formatBytes(file.size)}</span><button type="button" onClick={() => { setFile(null); const input = dialogRef.current.querySelector('#mission-file'); if (input) input.value = ''; }}>Remove</button></div>}
            <small id="mission-file-hint">The filename and size are saved. File contents are not uploaded or stored.</small>
          </div>
        </fieldset>
        {first && isOwner && <details className="rm-placement" open={placementOpen} onToggle={(event) => setPlacementOpen(event.currentTarget.open)}>
          <summary><Sparkles size={16} />Already made progress?</summary>
          <p>Request a later starting position. Add evidence for every earlier level. Covered missions receive placement credit, separate from completed work.</p>
          <div className="rm-placement-selectors">
            <div className="rm-field"><label htmlFor="placement-stage">Starting stage<Required /></label><select id="placement-stage" value={target.stageIndex} onChange={(event) => setTarget({ stageIndex: Number(event.target.value), level: 1 })}>{roadmap.stages.map((stage, i) => <option key={stage.id} value={i}>{stage.name}</option>)}</select></div>
            <div className="rm-field"><label htmlFor="placement-level">Starting level<Required /></label><select id="placement-level" value={target.level} onChange={(event) => setTarget({ ...target, level: Number(event.target.value) })}>{roadmap.stages[target.stageIndex].levels.map((level) => <option key={level.id} value={level.number}>Level {level.number} · {level.name}</option>)}</select></div>
          </div>
          {evidenceLevels.length > 0 && <p className="rm-proof-count">{evidenceLevels.length} earlier {evidenceLevels.length === 1 ? 'level needs' : 'levels need'} evidence.</p>}
          {evidenceLevels.map((level) => <fieldset key={level.id} className="rm-level-proof">
            <legend>{level.stageName} · Level {level.number}: {level.name}</legend>
            <p>Cover: {level.milestones.map((item) => item.name).join(', ')}.</p>
            <div className="rm-field"><label htmlFor={`proof-notes-${level.id}`}>Completed work<Required /></label><textarea id={`proof-notes-${level.id}`} rows={3} value={proofs[level.id]?.notes || ''} onChange={(event) => updateProof(level.id, 'notes', event.target.value)} required minLength={80} maxLength={10000} placeholder="Describe the work for this level (at least 80 characters)" /></div>
            <div className="rm-field"><label htmlFor={`proof-url-${level.id}`}>Proof link<Required /></label><input id={`proof-url-${level.id}`} type="url" value={proofs[level.id]?.url || ''} onChange={(event) => updateProof(level.id, 'url', event.target.value)} required maxLength={2000} placeholder="https://…" /></div>
          </fieldset>)}
        </details>}
        {error && <p className="rm-error" role="alert">{error}</p>}
        <div className="rm-demo-note"><FlaskConical size={17} /><p><strong>Submission check</strong> checks text length, evidence details, and prerequisites. It does not read files, visit links, or assess the quality of your work. A real AI review will need a backend.</p></div>
        <div className="rm-dialog-footer"><span><LockKeyhole size={14} />Progress stays in this browser</span><button className="rm-button rm-button-primary" type="submit" disabled={saving}>{saving ? 'Checking evidence…' : previous?.status === 'rejected' ? 'Resubmit for evaluation' : 'Submit for evaluation'}<ArrowRight size={16} /></button></div>
      </form> : <>
        {previous && <div className="rm-submitted-work"><h3>Submitted work</h3><p>{previous.notes}</p>{previous.url && <p><a href={previous.url} target="_blank" rel="noopener noreferrer">Open evidence link ↗</a></p>}{previous.file && <p><Paperclip size={14} />{previous.file.name} · {formatBytes(previous.file.size)} · metadata saved</p>}</div>}
        <div className="rm-demo-note"><FlaskConical size={17} /><p>This was a simulated evaluation. No AI review or LabX points were awarded.</p></div>
        <div className="rm-dialog-footer"><button type="button" className="rm-button" onClick={onClose}>Back to roadmap</button>{roadmap.currentMilestoneId && canContinue && <button className="rm-button rm-button-primary" type="button" onClick={onNext}>Next mission<ArrowRight size={16} /></button>}</div>
      </>}
    </div>
  </dialog>;
}
