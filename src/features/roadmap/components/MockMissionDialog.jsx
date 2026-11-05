import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock3, Coins, FlaskConical, LockKeyhole, Paperclip, X } from 'lucide-react';
import { MAX_MISSION_UPLOADS, MAX_MISSION_UPLOAD_BYTES, MISSION_UPLOAD_ACCEPT, roadmapUploadStore, validateMissionFiles } from '../services/roadmap_upload_store.js';
import { openRoadmapDialog } from '../services/roadmap_dialog.js';

const NOTES_MIN_LENGTH = 80;
const formatBytes = (size) => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
const uploadLabel = (mission) => {
  const requirements = `${mission.expectedDeliverable || ''} ${mission.deploymentInstructions || ''}`.toLowerCase();
  if (requirements.includes('document') && requirements.includes('image')) return 'Upload documents or images';
  if (requirements.includes('document')) return 'Upload documents';
  if (requirements.includes('image')) return 'Upload images';
  return 'Upload files';
};

function MissionAttachments({ attachments }) {
  return <ul className="rmj-mock-attachments">
    {attachments.map((attachment) => <li key={attachment.id}>
      {attachment.type.startsWith('image/')
        ? <a href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${attachment.name}`}><img src={attachment.url} alt={attachment.name} /></a>
        : <Paperclip size={17} aria-hidden="true" />}
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" download={attachment.name}>{attachment.name}</a>
      <small>{formatBytes(attachment.size)}</small>
    </li>)}
  </ul>;
}

export function MockMissionDialog({ project, userId, roadmap, mission, onClose, onComplete }) {
  const dialogRef = useRef(null);
  const notesRef = useRef(null);
  const previous = roadmap.submissionsByMissionId?.[mission.id];
  const [notes, setNotes] = useState(previous?.notes || '');
  const [files, setFiles] = useState([]);
  const [savedFiles, setSavedFiles] = useState([]);
  const [savedFilesError, setSavedFilesError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const completed = mission.state === 'completed';
  const submitted = !completed && (mission.state === 'submitted' || previous?.status === 'submitted');

  useEffect(() => {
    const dialog = dialogRef.current;
    return openRoadmapDialog(dialog);
  }, []);

  useEffect(() => {
    const textarea = notesRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [notes]);

  useEffect(() => {
    let cancelled = false;
    let objectUrls = [];
    async function loadAttachments() {
      const references = previous?.attachments || [];
      if (!references.length) {
        setSavedFiles([]);
        setSavedFilesError('');
        return;
      }
      try {
        const stored = await roadmapUploadStore.read(references);
        const storedById = new Map(stored.map((entry) => [entry.id, entry]));
        const resolved = references.map((reference) => {
          const blob = reference.mockContent !== undefined
            ? new Blob([reference.mockContent], { type: reference.type })
            : storedById.get(reference.id)?.blob;
          if (!blob) throw new Error(`${reference.name} is no longer available in this browser.`);
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          return { ...reference, url };
        });
        if (cancelled) objectUrls.forEach((url) => URL.revokeObjectURL(url));
        else {
          setSavedFiles(resolved);
          setSavedFilesError('');
        }
      } catch (loadError) {
        if (!cancelled) setSavedFilesError(loadError.message || 'Unable to load the uploaded mission files.');
      }
    }
    loadAttachments();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mission.id, previous?.attachments]);

  const chooseFiles = (event) => {
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    setFiles(selected);
    setError(validateMissionFiles(selected));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving || completed || submitted) return;
    if (notes.trim().length < NOTES_MIN_LENGTH) {
      setError(`Add at least ${NOTES_MIN_LENGTH} characters about your work.`);
      return;
    }
    const validationError = validateMissionFiles(files);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const attachments = await roadmapUploadStore.save(project.id, userId, mission.id, files);
      try {
        await onComplete(mission.id, { notes, attachments });
      } catch (saveError) {
        try {
          await roadmapUploadStore.remove(attachments);
        } catch (cleanupError) {
          throw new Error(`${saveError.message || 'Unable to save this prototype mission.'} ${cleanupError.message}`, { cause: cleanupError });
        }
        throw saveError;
      }
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'Unable to save this prototype mission.');
      setSaving(false);
    }
  };

  return createPortal(<dialog ref={dialogRef} className="rmj-level-dialog rmj-mock-mission-dialog" aria-labelledby="rmj-mock-mission-title"
    onCancel={(event) => event.preventDefault()}>
    <header className="rmj-dialog-head">
      <div>
        <div className="rmj-mock-mission-badges"><span>CORE MISSION</span><span><Coins size={13} />+{mission.labxPoints || 100} LABX POINTS</span>{completed && <span className="is-approved"><CheckCircle2 size={13} />APPROVED</span>}</div>
        <span className="rmj-eyebrow">{mission.stageName} · LEVEL {mission.level} · MISSION {mission.order}</span>
        <h2 id="rmj-mock-mission-title">{mission.name}</h2>
      </div>
      <button type="button" className="rmj-close" onClick={onClose} aria-label="Close mission" disabled={saving}><X size={19} /></button>
    </header>
    <div className="rmj-mock-mission-content">
      <div className="rmj-mission-deliverables">
        <section><h3>MISSION OBJECTIVE</h3><p>{mission.objective || mission.description}</p></section>
        <section><h3>DEPLOYMENT INSTRUCTIONS</h3><p>{mission.deploymentInstructions}</p></section>
        <section><h3>EXPECTED DELIVERABLE</h3><p>{mission.expectedDeliverable}</p></section>
      </div>
      {completed ? <>
        <div className="rmj-mock-awarded"><CheckCircle2 size={18} /><strong>Mission Conquered &amp; Verified! {previous?.labxPointsAwarded || mission.labxPoints || 100} LabX Points Awarded.</strong></div>
        {previous?.notes && <section className="rmj-mock-submission"><h3>Submitted work</h3><p>{previous.notes}</p></section>}
        {savedFilesError && <p className="rmj-mock-error" role="alert">{savedFilesError}</p>}
        {savedFiles.length > 0 && <section className="rmj-mock-submission"><h3>Uploaded deliverables</h3><MissionAttachments attachments={savedFiles} /></section>}
        <div className="rmj-mock-notice"><FlaskConical size={17} /><p><strong>Prototype mode.</strong> The sample completion and LabX point award are stored in this browser only.</p></div>
      </> : submitted ? <>
        <div className="rmj-mock-submitted"><Clock3 size={18} /><strong>Submitted to founder · Awaiting review</strong></div>
        {previous?.submittedBy && <p className="rmj-mock-submitted-by">Submitted by <strong>{previous.submittedBy}</strong></p>}
        {previous?.notes && <section className="rmj-mock-submission"><h3>Submitted work</h3><p>{previous.notes}</p></section>}
        {savedFilesError && <p className="rmj-mock-error" role="alert">{savedFilesError}</p>}
        {savedFiles.length > 0 && <section className="rmj-mock-submission"><h3>Uploaded deliverables</h3><MissionAttachments attachments={savedFiles} /></section>}
        <div className="rmj-mock-notice"><FlaskConical size={17} /><p><strong>Awaiting founder review.</strong> Submitted work is read-only until the founder responds.</p></div>
      </> : <form className="rmj-mock-mission-form" onSubmit={submit} noValidate aria-busy={saving}>
        <label htmlFor="rmj-mission-notes">What did you work on?<span>At least {NOTES_MIN_LENGTH} characters</span></label>
        <textarea ref={notesRef} id="rmj-mission-notes" rows={1} value={notes} onChange={(event) => { setNotes(event.target.value); setError(''); }} maxLength={10000} placeholder="Summarize your work, what you learned, and what you will do next." />
        <label htmlFor="rmj-mission-uploads">{uploadLabel(mission)}<span>Up to {MAX_MISSION_UPLOADS} files · {MAX_MISSION_UPLOAD_BYTES / 1024 / 1024} MB each</span></label>
        <input id="rmj-mission-uploads" type="file" accept={MISSION_UPLOAD_ACCEPT} multiple onChange={chooseFiles} aria-describedby={files.length ? 'rmj-mission-upload-list' : undefined} disabled={saving} />
        {files.length > 0 && <ul id="rmj-mission-upload-list" className="rmj-mock-upload-list">{files.map((file, index) => <li key={`${file.name}:${file.lastModified}:${index}`}><Paperclip size={14} />{file.name}<small>{formatBytes(file.size)}</small></li>)}</ul>}
        {error && <p className="rmj-mock-error" role="alert">{error}</p>}
        <div className="rmj-mock-notice"><FlaskConical size={17} /><p><strong>Prototype mode.</strong> Files and mock point awards are stored in this browser only. They are not real LabX currency.</p></div>
        <div className="rmj-mock-actions"><span><LockKeyhole size={13} />Stored in this browser</span><button type="submit" className="rmj-launch-button" disabled={saving}>{saving ? 'Submitting…' : project.memberView ? 'Submit to founder' : 'Complete mission'}</button></div>
      </form>}
    </div>
  </dialog>, document.body);
}
