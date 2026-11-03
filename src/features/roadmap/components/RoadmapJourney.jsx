import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Flag, LockKeyhole, Mountain, Play, Trophy } from 'lucide-react';
import { RoadsideScenery } from './RoadsideScenery.jsx';
import './RoadmapHighway.css';
import './RoadmapJourney.css';

const isCovered = (mission) => ['completed', 'credited', 'skipped'].includes(mission.state);

function levelScrollTarget(viewport, node) {
  const nodeTop = node.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
  return Math.max(0, Math.min(nodeTop - viewport.clientHeight * 0.62, viewport.scrollHeight - viewport.clientHeight));
}

function levelStatus(level, activeLevelId) {
  const missions = level.milestones;
  if (missions.every(isCovered)) return missions.some((mission) => mission.state === 'credited') ? 'credited' : 'completed';
  return level.id === activeLevelId ? 'current' : 'locked';
}

function buildJourneyGeometry(stages) {
  const row = 226;
  const mountainGap = 118;
  const top = 120;
  const bottom = 150;
  const levels = stages.flatMap((stage, stageIndex) => stage.levels.map((level) => ({ stage, stageIndex, level })));
  const total = levels.length;
  const height = top + total * row + Math.max(0, stages.length - 1) * mountainGap + bottom;
  const xs = [49, 62, 42, 59, 49, 43, 61, 48, 39, 57];
  const points = [];
  levels.forEach((entry, index) => {
    const transitionsAfter = stages.length - entry.stageIndex - 1;
    const y = top + (total - index - 1) * row + transitionsAfter * mountainGap + row / 2;
    points.push({ ...entry, x: xs[index % xs.length], y, type: 'level', index });
    if (entry.level.number === 5 && entry.stageIndex < stages.length - 1) {
      points.push({ x: 50, y: y - row / 2 - mountainGap / 2, type: 'mountain', stage: stages[entry.stageIndex + 1], stageIndex: entry.stageIndex + 1 });
    }
  });
  const summit = { x: 50, y: 40, type: 'summit' };
  points.push(summit);
  const path = points.reduce((pathData, point, index) => {
    const x = point.x * 10;
    if (index === 0) return `M ${x} ${point.y}`;
    const previous = points[index - 1];
    const midY = (previous.y + point.y) / 2;
    return `${pathData} C ${previous.x * 10} ${midY}, ${x} ${midY}, ${x} ${point.y}`;
  }, '');
  return { height, levels, points, path };
}

function StageTransition({ stage, stageIndex, y, crossed }) {
  return <div className={`rmj-transition${crossed ? ' is-crossed' : ''}`} style={{ top: y, '--stage-color': stage.tier.color }} aria-label={`${stage.name} stage begins${crossed ? ', mountain crossed' : ''}`}>
    <svg viewBox="0 0 220 124" aria-hidden="true">
      <path className="rmj-mountain-back" d="M4 112 56 41l24 30 39-55 94 96Z" />
      <path className="rmj-mountain-front" d="m43 112 39-57 18 25 24-37 79 69Z" />
      <path className="rmj-mountain-snow" d="m106 55 18-27 17 26-15-8-7 11-7-8Z" />
      <path className="rmj-mountain-trail" d="m118 67 19 14-14 8 19 16" />
    </svg>
    <span>STAGE {String(stageIndex + 1).padStart(2, '0')} · {stage.name.toUpperCase()}</span>
  </div>;
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
  const viewportRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const positionedRef = useRef(false);
  const [levelPageId, setLevelPageId] = useState(null);
  const geometry = useMemo(() => buildJourneyGeometry(roadmap.stages), [roadmap.stages]);
  const sceneryPoints = geometry.levels.map(({ level }) => ({
    id: level.id,
    y: geometry.points.find((point) => point.type === 'level' && point.level.id === level.id).y,
  }));
  const activeLevelId = currentMission ? `${currentMission.stageName.toLowerCase()}-level-${currentMission.level}` : null;
  const pageEntry = geometry.levels.find(({ level }) => level.id === levelPageId);
  const completedLevels = geometry.levels.filter(({ level }) => level.milestones.every(isCovered)).length;
  const coveredMissionCount = roadmap.completedCount + (roadmap.creditedCount || 0);
  const resolvedMissionCount = project.visualDemo ? roadmap.resolvedCount ?? coveredMissionCount : coveredMissionCount;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !activeLevelId) return undefined;
    let frame = 0;
    const positionActiveLevel = () => {
      const node = nodeRefs.current.get(activeLevelId);
      if (!node) return;
      viewport.scrollTo({ top: levelScrollTarget(viewport, node), behavior: positionedRef.current ? 'smooth' : 'auto' });
      positionedRef.current = true;
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(positionActiveLevel);
    });
    observer.observe(viewport);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(positionActiveLevel);
    });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [activeLevelId, geometry.height]);

  const stageStatus = (stage) => {
    const stageLevels = stage.levels;
    if (stageLevels.every((level) => level.milestones.every(isCovered))) return 'complete';
    return stage.isCurrent ? 'current' : 'locked';
  };
  const openMission = (mission) => {
    onOpenMission(mission);
  };
  const crossedStage = (stageIndex) => roadmap.stages[stageIndex - 1]?.levels.every((level) => level.milestones.every(isCovered)) ?? false;
  const scrollToLevel = (levelId) => {
    const viewport = viewportRef.current;
    const node = nodeRefs.current.get(levelId);
    if (!viewport || !node) return;
    viewport.scrollTo({ top: levelScrollTarget(viewport, node), behavior: 'smooth' });
  };
  const selectStage = (stage) => {
    if (!stage.isUnlocked && stageStatus(stage) !== 'complete') return;
    const firstLevel = stage.levels[0];
    setLevelPageId(null);
    onSelectLevel(firstLevel.id);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToLevel(firstLevel.id)));
  };

  return <section className="rmj-shell" aria-label={`${project.name} roadmap journey`}>
    <header className="rmj-header">
    {headerBar && <div className="rmj-breadcrumb">{headerBar}</div>}
    <div className="rmj-title-row">
        <div className="rmj-project-title"><span className="rmj-eyebrow">{roadmap.domain} · FOUNDER ROADMAP</span><h2>{project.name} Roadmap</h2></div>
        <div className="rmj-progress-summary">
          <div className="rmj-progress-label"><span>Roadmap progress</span><strong>{roadmap.progressPercent}%</strong></div>
          <div className="rmj-progress-track" role="progressbar" aria-label="Roadmap progress" aria-valuemin={0} aria-valuemax={75} aria-valuenow={resolvedMissionCount} aria-valuetext={`${roadmap.completedCount} completed, ${roadmap.skippedCount || 0} optional missions skipped, ${roadmap.creditedCount || 0} placement credits, 75 total missions`}><span style={{ width: `${roadmap.progressPercent}%` }} /></div>
          <div className="rmj-progress-stats" aria-label="Roadmap summary">
            <span><strong>{resolvedMissionCount}/75</strong><small>Missions</small></span>
            <span><strong>{completedLevels}/25</strong><small>Levels done</small></span>
            <span><strong>{25 - completedLevels}</strong><small>Levels left</small></span>
          </div>
        </div>
      </div>
      <nav className="rmj-stage-track" aria-label="Stage progression">
        {roadmap.stages.map((stage, index) => {
          const status = stageStatus(stage);
          const count = stage.levels.filter((level) => level.milestones.every(isCovered)).length;
          const unlocked = stage.isUnlocked || status === 'complete';
          return <button key={stage.id} type="button" className={`rmj-stage-step is-${status}`} style={{ '--stage-color': stage.tier.color }}
            disabled={!unlocked} aria-label={`Stage ${index + 1}: ${stage.name}, ${count} of 5 levels complete${unlocked ? '' : ', locked'}`}
            aria-current={stage.isCurrent ? 'step' : undefined} onClick={() => selectStage(stage)}>
            <span className="rmj-stage-number">{status === 'complete' ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span>
            <span className="rmj-stage-name">{stage.name}</span><small>{count}/5 levels</small>
          </button>;
        })}
      </nav>
      {showOperations && operations}
    </header>

    {pageEntry
      ? <div className="rmj-viewport rmj-viewport--missions" role="region" aria-label={`${pageEntry.stage.name} level ${pageEntry.level.number} missions`}>
        <LevelMissionsPage level={pageEntry.level} stage={pageEntry.stage}
          status={levelStatus(pageEntry.level, activeLevelId)} canOpen={canOpen}
          onOpenMission={openMission} onBack={() => setLevelPageId(null)} />
      </div>
      : <div ref={viewportRef} className="rmj-viewport" role="region" aria-label="Roadmap journey from Discover to Grow" tabIndex={0}>
      <div className="rmj-canvas" style={{ height: geometry.height }}>
        <div className="rmj-atmosphere" aria-hidden="true" />
        <RoadsideScenery points={sceneryPoints} reached={Math.floor(coveredMissionCount / 3) - 1} stageIndex={roadmap.currentStageIndex} />
        <svg className="rmj-road" viewBox={`0 0 1000 ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="rmj-road-shadow" d={geometry.path} />
          <path className="rmj-road-bed" d={geometry.path} />
          <path className="rmj-road-center" d={geometry.path} />
          <path className="rmj-road-lanes" d={geometry.path} />
          <path className="rmj-road-progress" d={geometry.path} pathLength="1000" style={{ strokeDasharray: `${roadmap.progressPercent * 10} 1000` }} />
        </svg>
        {geometry.points.filter((point) => point.type === 'mountain').map((point) => <StageTransition key={`mountain-${point.stageIndex}`} stage={point.stage} stageIndex={point.stageIndex} y={point.y} crossed={crossedStage(point.stageIndex)} />)}
        <div className={`rmj-summit${roadmap.isComplete ? ' is-complete' : ''}`} style={{ top: 40 }}>
          <span className="rmj-summit-icon">{roadmap.isComplete ? <Trophy size={20} /> : <Mountain size={20} />}</span>
          <span><small>{roadmap.isComplete ? 'SUMMIT REACHED' : 'THE SUMMIT AHEAD'}</small><strong>{roadmap.isComplete ? 'Roadmap complete' : 'Build toward what’s next'}</strong></span>
        </div>
        {geometry.levels.map(({ stage, stageIndex, level }) => {
          const point = geometry.points.find((entry) => entry.type === 'level' && entry.level.id === level.id);
          const status = levelStatus(level, activeLevelId);
          const side = point.x > 50 ? 'left' : 'right';
          const selectedLevel = selectedLevelId === level.id;
          return <div key={level.id} className={`rmj-level-stop is-${status} is-card-${side}${selectedLevel ? ' is-selected' : ''}`}
            style={{ top: point.y, '--node-x': `${point.x}%`, '--stage-color': stage.tier.color }}>
            <article className="rmj-level-card" aria-label={`Stage ${stageIndex + 1}, Level ${level.number}: ${level.name}, ${status}`}>
              <span className="rmj-level-overline">STAGE {String(stageIndex + 1).padStart(2, '0')} · LEVEL {String(level.number).padStart(2, '0')}</span>
              <strong>{level.name}</strong>
              <span className="rmj-card-state">{status === 'current' ? 'Current level' : status === 'completed' ? 'Level complete' : status === 'credited' ? 'Covered by placement' : 'Locked ahead'}</span>
            </article>
            <span className="rmj-connector" aria-hidden="true" />
            <button type="button" className="rmj-level-node" ref={(node) => {
              if (node) nodeRefs.current.set(level.id, node);
              else nodeRefs.current.delete(level.id);
            }} aria-label={`Stage ${stageIndex + 1}, Level ${level.number}: ${level.name}, ${status}`} aria-pressed={selectedLevel}
              onClick={() => { onSelectLevel(level.id); setLevelPageId(level.id); }}>
              {status === 'completed' || status === 'credited' ? <Check size={23} /> : status === 'current' ? <Play size={19} /> : <LockKeyhole size={18} />}
              <span>{level.number}</span>
            </button>
          </div>;
        })}
        <div className="rmj-start-marker" style={{ top: geometry.height - 70 }}><Flag size={17} /><span>YOUR JOURNEY STARTS HERE</span></div>
      </div>
    </div>}
  </section>;
}
