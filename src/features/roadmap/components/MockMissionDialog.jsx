import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, FlaskConical, LockKeyhole, X } from 'lucide-react';

const NOTES_MIN_LENGTH = 80;

export function MockMissionDialog({ project, roadmap, mission, onClose, onComplete }) {
  const dialogRef = useRef(null);
  const previous = roadmap.submissionsByMissionId?.[mission.id];
  const [notes, setNotes] = useState(previous?.notes || '');
  const [url, setUrl] = useState(previous?.url || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const completed = mission.state === 'completed';

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      queueMicrotask(() => { if (opener?.isConnected) opener.focus(); });
    };
  }, []);

  const submit = (event) => {
    event.preventDefault();
    if (saving || completed) return;
    const normalizedUrl = url.trim();
    const validUrl = (() => {
      try {
      const parsed = new URL(normalizedUrl);
        return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
      } catch {
        return false;
      }
    })();
    if (notes.trim().length < NOTES_MIN_LENGTH) {
      setError(`Add at least ${NOTES_MIN_LENGTH} characters about your work.`);
      return;
    }
    if (!validUrl) {
      setError('Add a valid http or https link as evidence.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      onComplete(mission.id, { notes, url });
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save this prototype mission.');
      setSaving(false);
    }
  };

  return <dialog ref={dialogRef} className="rmj-level-dialog rmj-mock-mission-dialog" aria-labelledby="rmj-mock-mission-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <header className="rmj-dialog-head">
      <div><span className="rmj-eyebrow">{mission.stageName} · LEVEL {mission.level} · MISSION {mission.order}</span><h2 id="rmj-mock-mission-title">{mission.name}</h2></div>
      <button type="button" className="rmj-close" onClick={onClose} aria-label="Close mission"><X size={19} /></button>
    </header>
    <div className="rmj-mock-mission-content">
      <p className="rmj-mock-mission-description">{mission.description} Use this checkpoint to move {project.name} forward in {roadmap.domain}.</p>
      {completed ? <div className="rmj-mock-completed"><CheckCircle2 size={22} /><div><strong>Mission complete</strong><p>Your prototype progress is saved in this browser.</p>{previous?.notes && <p className="rmj-mock-submitted-notes">{previous.notes}</p>}{previous?.url && <a href={previous.url} target="_blank" rel="noopener noreferrer">Open saved evidence ↗</a>}</div></div> : <>
        <form className="rmj-mock-mission-form" onSubmit={submit} noValidate aria-busy={saving}>
          <label htmlFor="rmj-mission-notes">What did you work on?<span>At least {NOTES_MIN_LENGTH} characters</span></label>
          <textarea id="rmj-mission-notes" rows={5} value={notes} onChange={(event) => { setNotes(event.target.value); setError(''); }} maxLength={10000} placeholder="Summarize your work, what you learned, and what you will do next." />
          <label htmlFor="rmj-mission-evidence">Evidence link</label>
          <input id="rmj-mission-evidence" type="url" value={url} onChange={(event) => { setUrl(event.target.value); setError(''); }} maxLength={2048} placeholder="https://…" />
          {error && <p className="rmj-mock-error" role="alert">{error}</p>}
          <div className="rmj-mock-notice"><FlaskConical size={17} /><p><strong>Prototype mode.</strong> This saves local sample progress only. No person or AI evaluates submissions, and no points are awarded.</p></div>
          <div className="rmj-mock-actions"><span><LockKeyhole size={13} />Stored in this browser</span><button type="submit" className="rmj-launch-button" disabled={saving}>{saving ? 'Saving…' : 'Complete mission'}<ArrowRight size={15} /></button></div>
        </form>
      </>}
    </div>
  </dialog>;
}
