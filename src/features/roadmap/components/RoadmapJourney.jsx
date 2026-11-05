import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BarChart3, Check, Coins, FlaskConical, Layers,
  Leaf, LockKeyhole, Play, Rocket,
} from 'lucide-react';
import './RoadmapJourney.css';
import './RoadmapMountain.css';

const STAGE_ICONS = [Leaf, FlaskConical, Layers, Rocket, BarChart3];
const LEVEL_POSITIONS = [
  { x: 7, y: 82 },
  { x: 33, y: 66 },
  { x: 48, y: 51 },
  { x: 65, y: 36 },
  { x: 86, y: 14 },
];
const COMPACT_LEVEL_POSITIONS = [
  { x: 8, y: 61 },
  { x: 31, y: 50 },
  { x: 49, y: 39 },
  { x: 67, y: 28 },
  { x: 86, y: 12 },
];
const STAGE_CURVES = [
  [120, -126, 112, -118],
  [-124, 114, -120, 128],
  [130, -112, 124, -118],
  [-116, 128, -126, 114],
  [122, -132, 118, -124],
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
  const startY = compact ? 340 : 465;
  const routePoints = [{ x: 25, y: startY }, ...points.map((point) => ({ x: point.x * 10, y: point.y * 5 }))];
  const curves = STAGE_CURVES[stage.index % STAGE_CURVES.length];
  const tangents = routePoints.map((point, index) => {
    const previous = routePoints[Math.max(0, index - 1)];
    const next = routePoints[Math.min(routePoints.length - 1, index + 1)];
    let tangent = { x: next.x - previous.x, y: next.y - previous.y };
    if (index > 0 && index < routePoints.length - 1) {
      const length = Math.hypot(tangent.x, tangent.y) || 1;
      const bend = curves[index - 1];
      tangent = {
        x: tangent.x - tangent.y / length * bend,
        y: tangent.y + tangent.x / length * bend,
      };
    }
    const length = Math.hypot(tangent.x, tangent.y) || 1;
    return { x: tangent.x / length, y: tangent.y / length };
  });
  const segments = routePoints.slice(1).map((point, index) => {
    const previous = routePoints[index];
    const length = Math.hypot(point.x - previous.x, point.y - previous.y);
    const handle = length * .32;
    const startControl = {
      x: previous.x + tangents[index].x * handle,
      y: previous.y + tangents[index].y * handle,
    };
    const endControl = {
      x: point.x - tangents[index + 1].x * handle,
      y: point.y - tangents[index + 1].y * handle,
    };
    const command = index === 0
      ? `L ${point.x} ${point.y}`
      : `C ${startControl.x} ${startControl.y}, ${endControl.x} ${endControl.y}, ${point.x} ${point.y}`;
    return { d: index === 0 ? `M ${previous.x} ${previous.y} ${command}` : command, command, start: previous, end: point, startControl, endControl, linear: index === 0 };
  });
  const segmentLengths = segments.map((segment) => {
    if (segment.linear) return Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
    let distance = 0;
    let previous = segment.start;
    for (let step = 1; step <= 24; step += 1) {
      const t = step / 24;
      const inverse = 1 - t;
      const next = {
        x: inverse ** 3 * segment.start.x + 3 * inverse ** 2 * t * segment.startControl.x
          + 3 * inverse * t ** 2 * segment.endControl.x + t ** 3 * segment.end.x,
        y: inverse ** 3 * segment.start.y + 3 * inverse ** 2 * t * segment.startControl.y
          + 3 * inverse * t ** 2 * segment.endControl.y + t ** 3 * segment.end.y,
      };
      distance += Math.hypot(next.x - previous.x, next.y - previous.y);
      previous = next;
    }
    return distance;
  });
  const path = `M ${routePoints[0].x} ${routePoints[0].y} ${segments.map(({ command }) => command).join(' ')}`;
  return { points, path, segmentLengths, totalLength: segmentLengths.reduce((sum, length) => sum + length, 0) };
}

function MountainArtwork() {
  return <svg className="rmj-mountain-art" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
      <path className="rmj-cloud rmj-cloud--left" d="M18 234q13-19 35-12 10-25 34-17 19-19 39-2 23-8 36 13 22-2 29 18Z" />
      <path className="rmj-cloud rmj-cloud--right" d="M735 194q12-23 36-17 13-27 39-15 20-19 40 0 24-7 32 17 20-4 31 16Z" />
      <path className="rmj-cloud rmj-cloud--distant" d="M390 218q10-15 25-10 11-19 29-8 15-13 30 1 20-5 24 13Z" />
      <path className="rmj-mountain-range rmj-mountain-range--far" d="M0 391 96 320l78 42 94-105 81 73 91-116 105 121 79-82 89 92 103-133 104 117 80-62v233H0Z" />
      <path className="rmj-mountain-range rmj-mountain-range--middle" d="M0 431 101 360l91 45 100-102 90 88 95-115 91 97 82-84 91 78 93-112 110 103 56-46v188H0Z" />
      <path className="rmj-mountain-range rmj-mountain-range--front" d="M0 470 119 407l122 48 94-65 115 64 126-83 110 61 113-78 119 70 82-43v119H0Z" />
      <path className="rmj-mountain-snowcap" d="m500 500 94-99 54-84 48-38 30-73 67-91 45-52 35 49 34 31 27 60 41 61 25 65v171Z" />
      <path className="rmj-mountain-ridge-light" d="m838 63-45 52-67 91-30 73-48 38-54 84-94 99h156l80-63 50-86 17-88 20-83Z" />
      <path className="rmj-mountain-ridge-shadow" d="m838 63 35 49 34 31 27 60 41 61 25 65v171H500l165-112 72-82 12-60 36-79Z" />
      <path className="rmj-mountain-snowline" d="m838 63-45 52 31-10 15 18 18-27 16 16Z" />
      <path className="rmj-mountain-foothills" d="m550 500 87-59 70-18 62 22 62-34 75 13 53-18 41 18v76Z" />
      <path className="rmj-mountain-vegetation" d="M0 468q92-45 177-12t165 0q83-39 174-2t169-8q92-44 172-5t143 3v56H0Z" />
      <g className="rmj-mountain-stars">
        <circle cx="102" cy="111" r="1.5" /><circle cx="264" cy="87" r="1.2" />
        <circle cx="414" cy="133" r="1.4" /><circle cx="712" cy="92" r="1.3" />
        <circle cx="952" cy="128" r="1.5" />
      </g>
    </svg>
}

function LevelMissionsPage({ level, stage, status, canOpen, onOpenMission, onBack, lockedFeedbackId, onLockedMission, lockedMessage }) {
  const hasScrollableMissions = level.milestones.length > 3;
  return <section className="rmj-mission-page" aria-labelledby="rmj-level-page-title">
    <div className="rmj-mission-page-heading">
      <button type="button" className="rmj-back-button" onClick={onBack}><ArrowLeft size={16} />Back to journey</button>
      <span className="rmj-eyebrow">STAGE {stage.index + 1} · {stage.name} · LEVEL {level.number}</span>
      <h2 id="rmj-level-page-title">{level.name}</h2>
      <p>{lockedMessage
        ? 'Only the mission assigned to you is available. Other missions and levels remain locked.'
        : status === 'locked'
          ? 'This level unlocks after you complete the missions before it. Preview the work ahead.'
          : 'Complete each mission in order to keep moving through this level.'}</p>
    </div>
    <ol className={`rmj-mission-page-list${hasScrollableMissions ? ' is-scrollable' : ''}`}>
      {level.milestones.map((mission, index) => {
        const accessible = mission.state !== 'locked' && (mission.state !== 'skipped' || mission.isOptional) && canOpen(mission);
        const previousMission = level.milestones[index - 1];
        const isLocked = mission.state === 'locked';
        const isActionLocked = !accessible && !isLocked && !isCovered(mission);
        const label = mission.state === 'completed' ? 'Completed'
          : mission.state === 'credited' ? 'Covered by placement'
            : mission.state === 'skipped' ? 'Optional · skipped'
              : mission.state === 'optional' ? 'Optional · available'
                : mission.state === 'submitted' ? 'Submitted for review'
                : mission.state === 'active' ? accessible ? 'Ready to begin' : 'Awaiting founder' : 'Locked';
        const canActivate = accessible || isLocked || isActionLocked;
        const activate = () => accessible ? onOpenMission(mission) : onLockedMission(mission.id);
        return <li key={mission.id} className={`rmj-mission-tile is-${mission.state}${isActionLocked ? ' is-action-locked' : ''}${accessible ? ' is-clickable' : ''}${lockedFeedbackId === mission.id ? ' is-rejected' : ''}`}
          data-locked-hint={isLocked || isActionLocked ? lockedMessage || `Complete Mission ${previousMission?.order || mission.order - 1} to unlock` : undefined}
          role={canActivate ? 'button' : undefined} tabIndex={canActivate ? 0 : undefined}
          aria-label={isLocked || isActionLocked ? `Mission ${mission.order} locked. ${lockedMessage || `Complete Mission ${previousMission?.order || mission.order - 1} to unlock.`}` : undefined}
          onClick={canActivate ? activate : undefined}
          onKeyDown={canActivate ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            }
          } : undefined}>
          <div className="rmj-mission-tile-top">
            <span className="rmj-mission-points"><Coins size={13} aria-hidden="true" />+{mission.labxPoints || 100} LabX points</span>
            {mission.isOptional && <span className="rmj-mission-optional">Optional</span>}
            <span className="rmj-mission-state">{isLocked || isActionLocked ? <><LockKeyhole size={13} />Locked</> : label}</span>
          </div>
          {isLocked || isActionLocked
            ? <div className="rmj-mission-locked-indicator" aria-hidden="true"><LockKeyhole size={24} /></div>
            : <div className="rmj-mission-copy"><strong>{mission.name}</strong><p>{mission.description}</p></div>}
        </li>;
      })}
    </ol>
  </section>;
}

export function RoadmapJourney({
  project, roadmap, currentMission, selectedLevelId, onSelectLevel, canOpen,
  onOpenMission, headerBar, operations, showOperations = false, lockedMessage,
}) {
  const currentStage = roadmap.stages.find((stage) => stage.isCurrent) || roadmap.stages[roadmap.currentStageIndex] || roadmap.stages[0];
  const [selectedStageId, setSelectedStageId] = useState(currentStage.id);
  const previousCurrentStageId = useRef(currentStage.id);
  const lockedFeedbackTimer = useRef(null);
  const [levelPageId, setLevelPageId] = useState(null);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 520px)').matches);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [lockedFeedbackId, setLockedFeedbackId] = useState(null);
  const selectedStage = roadmap.stages.find((stage) => stage.id === selectedStageId) || currentStage;
  const geometry = useMemo(() => buildStageGeometry(selectedStage, compact), [selectedStage, compact]);
  const activeLevelId = currentMission ? `${currentMission.stageName.toLowerCase()}-level-${currentMission.level}` : null;
  const pageEntry = selectedStage.levels.find((level) => level.id === levelPageId);
  const coveredMissionCount = roadmap.completedCount + (roadmap.creditedCount || 0);
  const resolvedMissionCount = project.visualDemo ? roadmap.resolvedCount ?? coveredMissionCount : coveredMissionCount;
  const isFreshRoadmap = resolvedMissionCount === 0 && roadmap.completedCount === 0
    && (roadmap.creditedCount || 0) === 0 && (roadmap.skippedCount || 0) === 0;
  const selectedLevel = selectedStage.levels.find((level) => level.id === selectedLevelId)
    || selectedStage.levels.find((level) => level.id === activeLevelId)
    || selectedStage.levels[0];
  const stageResolvedMissions = selectedStage.levels.flatMap((level) => level.milestones).filter(isCovered).length;
  const stageMissionCount = selectedStage.levels.reduce((count, level) => count + level.milestones.length, 0);
  const stageComplete = selectedStage.levels.every((level) => level.milestones.every(isCovered));
  const stageProgressUnits = stageComplete ? 1000 : stageMissionCount ? Math.round(stageResolvedMissions / stageMissionCount * 1000) : 0;
  const roadFlowDuration = `${Math.round(100 - stageProgressUnits / 1000 * 40)}s`;
  const roadProgressDistance = selectedStage.levels.reduce((distance, level, index) => {
    const total = level.milestones.length;
    const covered = level.milestones.filter(isCovered).length;
    return distance + (geometry.segmentLengths[index] || 0) * (total ? covered / total : 0);
  }, 0);
  const roadProgressUnits = geometry.totalLength ? Math.round(roadProgressDistance / geometry.totalLength * 1000) : 0;
  useEffect(() => {
    const media = window.matchMedia('(max-width: 520px)');
    const updateCompact = () => setCompact(media.matches);
    media.addEventListener('change', updateCompact);
    return () => media.removeEventListener('change', updateCompact);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => setReducedMotion(media.matches);
    media.addEventListener('change', updateReducedMotion);
    return () => {
      media.removeEventListener('change', updateReducedMotion);
      window.clearTimeout(lockedFeedbackTimer.current);
    };
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
  const showLockedFeedback = (id) => {
    window.clearTimeout(lockedFeedbackTimer.current);
    setLockedFeedbackId(id);
    lockedFeedbackTimer.current = window.setTimeout(() => setLockedFeedbackId(null), 2400);
  };
  const openMission = (mission) => onOpenMission(mission);
  const selectStage = (stage) => {
    if (!stage.isUnlocked && stageStatus(stage) !== 'complete') {
      showLockedFeedback(stage.id);
      return;
    }
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
  const activateLevel = (level, status) => {
    selectLevel(level);
    if (status !== 'locked') setLevelPageId(level.id);
  };

  return <section className={`rmj-shell${project.memberView ? ' is-member-view' : ''}`} aria-label={`${project.name} roadmap journey`} style={{ '--stage-color': selectedStage.tier.color }}>
    <header className="rmj-header">
      {headerBar && !pageEntry && <div className="rmj-breadcrumb">{headerBar}</div>}
      <div className="rmj-title-row">
        <div className="rmj-project-title">
          <span className="rmj-eyebrow">{project.memberView
            ? `${project.founderName || project.created_by || 'Founder'} Roadmap`
            : roadmap.domain}</span>
          <h2>{project.name}</h2>
        </div>
      </div>
      <nav className="rmj-stage-track" aria-label="Stage progression">
        {roadmap.stages.map((stage, index) => {
          const status = stageStatus(stage);
          const count = stage.levels.filter((level) => level.milestones.every(isCovered)).length;
          const unlocked = stage.isUnlocked || status === 'complete';
          const previousStage = roadmap.stages[index - 1];
          const StageIcon = STAGE_ICONS[index];
          return <button key={stage.id} type="button" className={`rmj-stage-step is-${status}${selectedStage.id === stage.id ? ' is-selected' : ''}${lockedFeedbackId === stage.id ? ' is-rejected' : ''}`} style={{ '--stage-color': stage.tier.color }}
            aria-label={`Stage ${index + 1}: ${stage.name}, ${count} of 5 levels complete${unlocked ? '' : ', locked'}`}
            aria-current={stage.isCurrent ? 'step' : undefined} onClick={() => selectStage(stage)}>
            <span className="rmj-stage-icon">{status === 'complete' ? <Check size={17} /> : <StageIcon size={18} />}</span>
            <span className="rmj-stage-copy"><span className="rmj-stage-name">{stage.name}</span><small>Stage {index + 1} · {count}/5</small></span>
            {status === 'locked' && <LockKeyhole className="rmj-stage-lock" size={14} aria-hidden="true" />}
            {!unlocked && <span className="rmj-stage-lock-hint">{lockedMessage || `Complete ${previousStage?.name || 'the previous stage'} to unlock`}</span>}
          </button>;
        })}
      </nav>
      {showOperations && operations}
    </header>

    {pageEntry
      ? <div className="rmj-viewport rmj-viewport--missions" role="region" aria-label={`${selectedStage.name} level ${pageEntry.number} missions`}>
        <LevelMissionsPage level={pageEntry} stage={selectedStage} status={levelStatus(pageEntry, activeLevelId)}
          canOpen={canOpen} onOpenMission={openMission} onBack={() => setLevelPageId(null)}
          lockedFeedbackId={lockedFeedbackId} onLockedMission={showLockedFeedback} lockedMessage={lockedMessage} />
      </div>
      : <div className="rmj-mountain-viewport" role="region" aria-label={`${selectedStage.name} stage mountain roadmap`}>
        <div className={`rmj-mountain-canvas${selectedStage.id === 'grow' ? ' is-premium' : ''}`}>
          <MountainArtwork />
          <svg className="rmj-mountain-road" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="rmj-road-surface" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#344a68" />
                <stop offset=".48" stopColor="#405879" />
                <stop offset="1" stopColor="#293c59" />
              </linearGradient>
              <linearGradient id="rmj-road-glow" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
                <stop offset="0" stopColor="#31cce7" />
                <stop offset=".34" stopColor="#55e8f5" />
                <stop offset=".5" stopColor="#c5fbff" />
                <stop offset=".66" stopColor="#55e8f5" />
                <stop offset="1" stopColor="#31cce7" />
                {!reducedMotion && <animateTransform attributeName="gradientTransform" type="translate" from="-1000 0" to="0 0" dur={roadFlowDuration} repeatCount="indefinite" />}
              </linearGradient>
            </defs>
            <path className="rmj-mountain-road-shadow" d={geometry.path} />
            <path className="rmj-mountain-road-edge" d={geometry.path} />
            <path className="rmj-mountain-road-bed" d={geometry.path} />
            <path className="rmj-mountain-road-sheen" d={geometry.path} />
            <path className="rmj-mountain-road-lane" d={geometry.path} />
            <path className="rmj-mountain-road-progress" d={geometry.path} pathLength="1000"
              style={{ strokeDasharray: `${roadProgressUnits} 1000` }} />
            <path className="rmj-mountain-road-flow" d={geometry.path} pathLength="1000"
              style={{ strokeDasharray: `${roadProgressUnits} 1000` }} />
          </svg>
          {geometry.points.map((point) => {
            const level = point.level;
            const status = levelStatus(level, activeLevelId);
            const isSelected = selectedLevel.id === level.id;
            const cardPosition = point.y < 42 ? 'below' : 'above';
            const previousStage = roadmap.stages.find((stage) => stage.index === selectedStage.index - 1);
            const lockedReason = lockedMessage || (level.number > 1
              ? `Complete Level ${level.number - 1} to unlock this level.`
              : `Complete all levels in ${previousStage?.name || 'the previous stage'} to unlock this stage.`);
            const isJourneyLevel = level.id === activeLevelId
              || (!currentMission && isFreshRoadmap && selectedStage.isCurrent && level.number === 1);
            const completedMissions = level.milestones.filter(isCovered).length;
            const description = level.description || level.milestones[0]?.description;
            return <div key={level.id} className={`rmj-level-stop is-${status} is-card-${cardPosition}${isSelected ? ' is-selected' : ''}${lockedFeedbackId === level.id ? ' is-rejected' : ''}`}
              style={{ top: `${point.y}%`, '--node-x': `${point.x}%`, '--level-color': selectedStage.tier.color }}>
              <article className="rmj-level-card" aria-label={`${selectedStage.name}, Level ${level.number}: ${level.name}`}>
                <span className="rmj-level-overline">{selectedStage.name} · Level {level.number}</span>
                {status === 'locked'
                  ? <><strong className="rmj-level-lock-title">Level {level.number} locked</strong><p className="rmj-level-lock-reason">{lockedReason}</p></>
                  : <><strong>{level.name}</strong><p>{description}</p><div className="rmj-level-card-footer">
                    <span>{completedMissions}/{level.milestones.length} Missions</span>
                    {isJourneyLevel && <button type="button" className="rmj-level-guidance"
                      onClick={() => activateLevel(level, status)}>{isFreshRoadmap ? 'Start' : 'Continue'}</button>}
                  </div></>}
              </article>
              <button type="button" className={`rmj-level-node${status === 'locked' && lockedFeedbackId === level.id ? ' is-rejected' : ''}`} aria-label={`Stage ${selectedStage.index + 1}, Level ${level.number}: ${level.name}, ${status}`}
                aria-pressed={isSelected} onClick={() => status === 'locked' ? showLockedFeedback(level.id) : activateLevel(level, status)}>
                {status === 'completed' || status === 'credited' ? <Check size={20} /> : status === 'current' || status === 'available' ? <Play size={16} /> : <LockKeyhole size={16} />}
              </button>
              <span className="rmj-level-label">L{level.number}</span>
            </div>;
          })}
        </div>
      </div>}
  </section>;
}
