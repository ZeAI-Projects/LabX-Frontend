import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Check, Flag, FlaskConical, Layers,
  Leaf, LockKeyhole, Play, Rocket, Trophy,
} from 'lucide-react';
import './RoadmapJourney.css';
import './RoadmapMountain.css';

const STAGE_ICONS = [Leaf, FlaskConical, Layers, Rocket, BarChart3];
const LEVEL_POSITIONS = [
  { x: 7, y: 82 },
  { x: 33, y: 66 },
  { x: 48, y: 51 },
  { x: 65, y: 36 },
  { x: 80, y: 21 },
];
const COMPACT_LEVEL_POSITIONS = [
  { x: 8, y: 61 },
  { x: 31, y: 50 },
  { x: 49, y: 39 },
  { x: 67, y: 28 },
  { x: 84, y: 17 },
];
const isCovered = (mission) => ['completed', 'credited', 'skipped'].includes(mission.state);

function levelStatus(level, activeLevelId) {
  const missions = level.milestones;
  if (missions.every(isCovered)) return missions.some((mission) => mission.state === 'credited') ? 'credited' : 'completed';
  if (level.id === activeLevelId || missions.some((mission) => mission.state === 'active')) return 'current';
  if (missions.some((mission) => ['available', 'optional'].includes(mission.state))) return 'available';
  return 'locked';
}

function buildStageGeometry(stage, compact) {
  const positions = compact ? COMPACT_LEVEL_POSITIONS : LEVEL_POSITIONS;
  const points = stage.levels.map((level, index) => ({ level, ...positions[index] }));
  const first = points[0];
  const startY = compact ? 340 : 465;
  const path = [`M 25 ${startY} C 25 ${startY - 21} 42 ${startY - 35} ${first.x * 10} ${first.y * 5}`];
  points.slice(1).forEach((point, index) => {
    const previous = points[index];
    const dx = point.x - previous.x;
    const dy = (point.y - previous.y) * 5;
    path.push(`C ${(previous.x + dx * .42) * 10} ${previous.y * 5 + dy * .2}, ${(point.x - dx * .42) * 10} ${point.y * 5 - dy * .2}, ${point.x * 10} ${point.y * 5}`);
  });
  const last = points.at(-1);
  path.push(`C ${last.x * 10 + 48} ${last.y * 5 - 24}, 860 49, 925 40`);
  return { points, path: path.join(' ') };
}

function MountainArtwork({ stage, complete }) {
  return <>
    <svg className="rmj-mountain-art" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
      <path className="rmj-cloud rmj-cloud--left" d="M18 232q8-18 25-12 8-24 34-13 12-15 28 1 19-4 22 17Z" />
      <path className="rmj-cloud rmj-cloud--right" d="M778 190q9-22 31-15 11-27 37-14 17-17 33 1 22-4 26 19Z" />
      <path className="rmj-mountain-range rmj-mountain-range--far" d="M0 390 120 291l90 68 111-138 130 153 126-123 122 93 98-122 203 147v131H0Z" />
      <path className="rmj-mountain-range rmj-mountain-range--middle" d="M0 433 102 350l93 37 135-130 120 118 92-105 124 90 104-143 120 106 110-81v258H0Z" />
      <path className="rmj-mountain-range rmj-mountain-range--front" d="M0 471 124 407l125 48 100-73 115 69 151-88 118 66 103-78 164 93v56H0Z" />
      <path className="rmj-mountain-snowcap" d="m772 237 104-198 105 199-69-41-34 25-32-37Z" />
      <path className="rmj-mountain-ridge-light" d="m772 237 104-198-35 157 33-4-31 34-21-26-18 21Z" />
      <path className="rmj-mountain-vegetation" d="M0 468q92-45 177-12t165 0q83-39 174-2t169-8q92-44 172-5t143 3v56H0Z" />
      <g className="rmj-mountain-stars">
        <circle cx="102" cy="111" r="1.5" /><circle cx="264" cy="87" r="1.2" />
        <circle cx="414" cy="133" r="1.4" /><circle cx="712" cy="92" r="1.3" />
        <circle cx="952" cy="128" r="1.5" />
      </g>
    </svg>
    <div className={`rmj-summit-flag${complete ? ' is-complete' : ''}${stage.id === 'grow' ? ' is-premium' : ''}`} aria-label={complete ? `${stage.name} complete` : `${stage.name} summit`}>
      <span className="rmj-summit-beacon" />
      <Flag size={23} fill="currentColor" />
      <small>{complete ? 'SUMMIT REACHED' : stage.tier.name}</small>
    </div>
  </>;
}

function LevelMissionsPage({ level, stage, status, canOpen, onOpenMission, onBack }) {
  return <section className="rmj-mission-page" aria-labelledby="rmj-level-page-title">
    <div className="rmj-mission-page-heading">
      <button type="button" className="rmj-back-button" onClick={onBack}><ArrowLeft size={16} />Back to journey</button>
      <span className="rmj-eyebrow">STAGE {stage.index + 1} · {stage.name} · LEVEL {level.number}</span>
      <h2 id="rmj-level-page-title">{level.name}</h2>
      <p>{status === 'locked'
        ? 'This level unlocks after you complete the missions before it. Preview the work ahead.'
        : 'Complete each mission in order to keep moving through this level.'}</p>
    </div>
    <ol className="rmj-mission-page-list">
      {level.milestones.map((mission) => {
        const accessible = mission.state !== 'locked' && (mission.state !== 'skipped' || mission.isOptional) && canOpen(mission);
        const label = mission.state === 'completed' ? 'Completed'
          : mission.state === 'credited' ? 'Covered by placement'
            : mission.state === 'skipped' ? 'Optional · skipped'
              : mission.state === 'optional' ? 'Optional · available'
                : mission.state === 'active' ? accessible ? 'Ready to begin' : 'Awaiting founder' : 'Locked';
        return <li key={mission.id} className={`rmj-mission-tile is-${mission.state}`}>
          <div className="rmj-mission-tile-top">
            <span className="rmj-mission-number" aria-hidden="true">{isCovered(mission) ? <Check size={17} /> : mission.order}</span>
            {mission.isOptional && <span className="rmj-mission-optional">Optional</span>}
            <span className="rmj-mission-state">{label}</span>
          </div>
          <div className="rmj-mission-copy"><strong>{mission.name}</strong><p>{mission.description}</p></div>
          {accessible
            ? <button type="button" className="rmj-mission-open" onClick={() => onOpenMission(mission)}>{mission.state === 'skipped' ? 'Complete optional mission' : isCovered(mission) ? 'Review mission' : 'Open mission'}<ArrowRight size={15} /></button>
            : <span className="rmj-mission-unavailable">{label === 'Locked' ? <LockKeyhole size={14} /> : null}{label}</span>}
        </li>;
      })}
    </ol>
  </section>;
}

export function RoadmapJourney({
  project, roadmap, currentMission, selectedLevelId, onSelectLevel, canOpen,
  onOpenMission, headerBar, operations, showOperations = false,
}) {
  const currentStage = roadmap.stages.find((stage) => stage.isCurrent) || roadmap.stages[roadmap.currentStageIndex] || roadmap.stages[0];
  const [selectedStageId, setSelectedStageId] = useState(currentStage.id);
  const previousCurrentStageId = useRef(currentStage.id);
  const [levelPageId, setLevelPageId] = useState(null);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 520px)').matches);
  const selectedStage = roadmap.stages.find((stage) => stage.id === selectedStageId) || currentStage;
  const geometry = useMemo(() => buildStageGeometry(selectedStage, compact), [selectedStage, compact]);
  const activeLevelId = currentMission ? `${currentMission.stageName.toLowerCase()}-level-${currentMission.level}` : null;
  const pageEntry = selectedStage.levels.find((level) => level.id === levelPageId);
  const completedLevels = roadmap.stages.flatMap((stage) => stage.levels).filter((level) => level.milestones.every(isCovered)).length;
  const coveredMissionCount = roadmap.completedCount + (roadmap.creditedCount || 0);
  const resolvedMissionCount = project.visualDemo ? roadmap.resolvedCount ?? coveredMissionCount : coveredMissionCount;
  const selectedLevel = selectedStage.levels.find((level) => level.id === selectedLevelId)
    || selectedStage.levels.find((level) => level.id === activeLevelId)
    || selectedStage.levels[0];
  const selectedStatus = levelStatus(selectedLevel, activeLevelId);
  const stageComplete = selectedStage.levels.every((level) => level.milestones.every(isCovered));
  const stageCompletedLevels = selectedStage.levels.filter((level) => level.milestones.every(isCovered)).length;
  const currentLevelLabel = currentMission ? `${currentStage.name} · Level ${currentMission.level}` : 'Roadmap complete';

  useEffect(() => {
    const media = window.matchMedia('(max-width: 520px)');
    const updateCompact = () => setCompact(media.matches);
    media.addEventListener('change', updateCompact);
    return () => media.removeEventListener('change', updateCompact);
  }, []);
  useEffect(() => {
    if (previousCurrentStageId.current === currentStage.id) return;
    if (selectedStageId === previousCurrentStageId.current) setSelectedStageId(currentStage.id);
    previousCurrentStageId.current = currentStage.id;
  }, [currentStage.id, selectedStageId]);

  const stageStatus = (stage) => {
    if (stage.levels.every((level) => level.milestones.every(isCovered))) return 'complete';
    return stage.isCurrent ? 'current' : 'locked';
  };
  const openMission = (mission) => onOpenMission(mission);
  const selectStage = (stage) => {
    if (!stage.isUnlocked && stageStatus(stage) !== 'complete') return;
    setSelectedStageId(stage.id);
    setLevelPageId(null);
    const target = stage.levels.find((level) => level.id === activeLevelId)
      || stage.levels.find((level) => levelStatus(level, activeLevelId) !== 'locked')
      || stage.levels[0];
    onSelectLevel(target.id);
  };
  const selectLevel = (level) => {
    onSelectLevel(level.id);
  };
  const enterSelectedLevel = () => {
    if (selectedStatus === 'locked') return;
    setLevelPageId(selectedLevel.id);
  };

  return <section className="rmj-shell" aria-label={`${project.name} roadmap journey`} style={{ '--stage-color': selectedStage.tier.color }}>
    <header className="rmj-header">
      {headerBar && <div className="rmj-breadcrumb">{headerBar}</div>}
      <div className="rmj-title-row">
        <div className="rmj-project-title">
          <span className="rmj-eyebrow">{roadmap.domain} · FOUNDER ROADMAP</span>
          <h2>{project.name} Roadmap</h2>
        </div>
        <div className="rmj-progress-summary">
          <div className="rmj-progress-label"><span>Roadmap progress</span><strong>{roadmap.progressPercent}%</strong></div>
          <div className="rmj-progress-track" role="progressbar" aria-label="Roadmap progress" aria-valuemin={0} aria-valuemax={75} aria-valuenow={resolvedMissionCount} aria-valuetext={`${roadmap.completedCount} completed, ${roadmap.skippedCount || 0} optional missions skipped, ${roadmap.creditedCount || 0} placement credits, 75 total missions`}><span style={{ width: `${roadmap.progressPercent}%` }} /></div>
          <div className="rmj-progress-stats" aria-label="Roadmap summary">
            <span><strong>{currentLevelLabel}</strong><small>Current focus</small></span>
            <span><strong>{completedLevels}/25</strong><small>Levels</small></span>
            <span><strong>{resolvedMissionCount}/75</strong><small>Missions</small></span>
          </div>
        </div>
      </div>
      <nav className="rmj-stage-track" aria-label="Stage progression">
        {roadmap.stages.map((stage, index) => {
          const status = stageStatus(stage);
          const count = stage.levels.filter((level) => level.milestones.every(isCovered)).length;
          const unlocked = stage.isUnlocked || status === 'complete';
          const StageIcon = STAGE_ICONS[index];
          return <button key={stage.id} type="button" className={`rmj-stage-step is-${status}${selectedStage.id === stage.id ? ' is-selected' : ''}`} style={{ '--stage-color': stage.tier.color }}
            disabled={!unlocked} aria-label={`Stage ${index + 1}: ${stage.name}, ${count} of 5 levels complete${unlocked ? '' : ', locked'}`}
            aria-current={stage.isCurrent ? 'step' : undefined} onClick={() => selectStage(stage)}>
            <span className="rmj-stage-icon">{status === 'complete' ? <Check size={17} /> : <StageIcon size={18} />}</span>
            <span className="rmj-stage-copy"><span className="rmj-stage-name">{stage.name}</span><small>Stage {index + 1} · {count}/5</small></span>
            {status === 'locked' && <LockKeyhole className="rmj-stage-lock" size={14} aria-hidden="true" />}
          </button>;
        })}
      </nav>
      {showOperations && operations}
    </header>

    {pageEntry
      ? <div className="rmj-viewport rmj-viewport--missions" role="region" aria-label={`${selectedStage.name} level ${pageEntry.number} missions`}>
        <LevelMissionsPage level={pageEntry} stage={selectedStage} status={levelStatus(pageEntry, activeLevelId)}
          canOpen={canOpen} onOpenMission={openMission} onBack={() => setLevelPageId(null)} />
      </div>
      : <div className="rmj-mountain-viewport" role="region" aria-label={`${selectedStage.name} stage mountain roadmap`}>
        <div className={`rmj-mountain-canvas${selectedStage.id === 'grow' ? ' is-premium' : ''}`}>
          <MountainArtwork stage={selectedStage} complete={stageComplete} />
          <svg className="rmj-mountain-road" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
            <path className="rmj-mountain-road-shadow" d={geometry.path} />
            <path className="rmj-mountain-road-bed" d={geometry.path} />
            <path className="rmj-mountain-road-lane" d={geometry.path} />
            <path className="rmj-mountain-road-progress" d={geometry.path} pathLength="1000"
              style={{ strokeDasharray: `${Math.min(1000, (stageCompletedLevels + (selectedStage.levels.some((level) => level.id === activeLevelId) ? .22 : 0)) * 200)} 1000` }} />
          </svg>
          <div className="rmj-start-marker" aria-hidden="true"><span className="rmj-start-pulse" /><small>START HERE</small></div>
          {geometry.points.map((point) => {
            const level = point.level;
            const status = levelStatus(level, activeLevelId);
            const isSelected = selectedLevel.id === level.id;
            const cardSide = point.x < 15 ? 'right' : 'left';
            const completedMissions = level.milestones.filter(isCovered).length;
            const description = level.description || level.milestones[0]?.description;
            return <div key={level.id} className={`rmj-level-stop is-${status} is-card-${cardSide}${isSelected ? ' is-selected' : ''}`}
              style={{ top: `${point.y}%`, '--node-x': `${point.x}%`, '--level-color': selectedStage.tier.color }}>
              {isSelected && <article className="rmj-level-card rmj-level-card--desktop" aria-label={`${selectedStage.name}, Level ${level.number}: ${level.name}`}>
                <span className="rmj-level-overline">{selectedStage.name} · Level {level.number}</span>
                <strong>{level.name}</strong>
                <p>{description}</p>
                <div className="rmj-level-card-footer">
                  <span>{completedMissions}/{level.milestones.length} Missions</span>
                  <button type="button" className="rmj-launch-button" disabled={status === 'locked'} onClick={enterSelectedLevel}>
                    {status === 'locked' ? <><LockKeyhole size={14} />Locked</> : <>{status === 'completed' || status === 'credited' ? 'Review Level' : 'Enter Level'}<ArrowRight size={14} /></>}
                  </button>
                </div>
              </article>}
              <button type="button" className="rmj-level-node" aria-label={`Stage ${selectedStage.index + 1}, Level ${level.number}: ${level.name}, ${status}`}
                aria-pressed={isSelected} onClick={() => selectLevel(level)}>
                {status === 'completed' || status === 'credited' ? <Check size={20} /> : status === 'current' || status === 'available' ? <Play size={16} /> : <LockKeyhole size={16} />}
              </button>
              <span className="rmj-level-label">L{level.number}</span>
            </div>;
          })}
          <article className="rmj-level-card rmj-level-card--mobile" aria-label={`${selectedStage.name}, Level ${selectedLevel.number}: ${selectedLevel.name}`}>
            <span className="rmj-level-overline">{selectedStage.name} · Level {selectedLevel.number}</span>
            <strong>{selectedLevel.name}</strong>
            <p>{selectedLevel.description || selectedLevel.milestones[0]?.description}</p>
            <div className="rmj-level-card-footer">
              <span>{selectedLevel.milestones.filter(isCovered).length}/{selectedLevel.milestones.length} Missions</span>
              <button type="button" className="rmj-launch-button" disabled={selectedStatus === 'locked'} onClick={enterSelectedLevel}>
                {selectedStatus === 'locked' ? <><LockKeyhole size={14} />Locked</> : <>{selectedStatus === 'completed' || selectedStatus === 'credited' ? 'Review Level' : 'Enter Level'}<ArrowRight size={14} /></>}
              </button>
            </div>
          </article>
          <div className={`rmj-mountain-finish${stageComplete ? ' is-complete' : ''}`}>
            <Trophy size={15} /><span>{roadmap.isComplete ? 'Roadmap complete' : stageComplete ? `${selectedStage.name} complete` : 'Summit'}</span>
          </div>
        </div>
      </div>}
  </section>;
}
