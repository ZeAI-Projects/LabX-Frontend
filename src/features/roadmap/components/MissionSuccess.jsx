import { useEffect, useRef } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import './MissionSuccess.css';

const RETURN_DELAY_MS = 2400;

export function MissionSuccess({ title, message, onReturn }) {
  const onReturnRef = useRef(onReturn);

  useEffect(() => {
    onReturnRef.current = onReturn;
  }, [onReturn]);

  useEffect(() => {
    const timer = window.setTimeout(() => onReturnRef.current(), RETURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="rm-success-overlay">
    <div className="rm-success-card" role="status" aria-live="polite">
      <span className="rm-success-spark rm-success-spark--one"><Sparkles size={18} aria-hidden="true" /></span>
      <span className="rm-success-spark rm-success-spark--two"><Sparkles size={14} aria-hidden="true" /></span>
      <span className="rm-success-icon"><CheckCircle2 size={38} aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{message}</p>
      <button type="button" className="rm-button rm-button-primary" autoFocus onClick={onReturn}>
        Back to roadmap
      </button>
      <span className="rm-success-return">Returning to your roadmap…</span>
    </div>
  </div>;
}
