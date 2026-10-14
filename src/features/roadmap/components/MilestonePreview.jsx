import { useEffect, useRef } from 'react';
import { ArrowLeft, Flag, Sparkles, X } from 'lucide-react';
import { TierRankBadge } from '../../../components/common/TierRankBadge.jsx';

export function MilestonePreview({ milestone, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    if (!dialogRef.current.open) dialogRef.current.showModal();
    return () => previouslyFocused?.focus();
  }, []);

  return (
    <dialog ref={dialogRef} className="roadmap-milestone-dialog" aria-labelledby="milestone-preview-title" onClose={onClose}>
      <div className="roadmap-milestone-dialog__toolbar">
        <button type="button" className="roadmap-dialog-back" onClick={() => dialogRef.current.close()}><ArrowLeft size={16} />Roadmap Highway</button>
        <button type="button" className="roadmap-dialog-close" aria-label="Close milestone preview" onClick={() => dialogRef.current.close()}><X size={20} /></button>
      </div>
      <p className="roadmap-dialog-kicker">Mock milestone · View only</p>
      <h2 id="milestone-preview-title">{milestone.name}</h2>
      <div className="roadmap-milestone-summary">
        <TierRankBadge stageIndex={milestone.stageIndex} subRank={milestone.level} size={64} label={milestone.stageName} />
        <div>
          <span>{milestone.stageName} · Level {milestone.level} · Milestone {milestone.order}</span>
          <h3>{milestone.levelName}</h3>
          <p>{milestone.description}</p>
          <p className="roadmap-milestone-domain">{milestone.domain}</p>
        </div>
      </div>
      <section className="roadmap-mission-section">
        <h3><Flag size={18} />Mandatory Core Missions</h3>
        <p>Required for milestone progression.</p>
        <div className="roadmap-mission-empty">No core quests configured for this milestone yet.</div>
      </section>
      <section className="roadmap-mission-section">
        <h3><Sparkles size={18} />Optional Side Missions</h3>
        <p>Additional opportunities to earn bonus LabX Coins.</p>
        <div className="roadmap-mission-empty">No side quests currently assigned to this sector.</div>
      </section>
      <p className="roadmap-preview-note">This is a read-only mock preview. No milestones or rewards have been earned.</p>
    </dialog>
  );
}
