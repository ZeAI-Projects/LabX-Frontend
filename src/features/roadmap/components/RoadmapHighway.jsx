import { useEffect, useRef } from 'react';
import { ArrowRight, ArrowUp, Check, Flag, LocateFixed, LockKeyhole, Play, Sparkles, Trophy } from 'lucide-react';
import { TierRankBadge } from '../../../components/common/TierRankBadge.jsx';
import { RoadsideScenery } from './RoadsideScenery.jsx';
import './RoadmapHighway.css';

const ROW_HEIGHT = 240;
const TOP_SPACE = 120;
const BOTTOM_SPACE = 200;
const covered = (mission) => mission.state === 'completed' || mission.state === 'credited';
const labels = { active: 'Active focus', completed: 'Conquered', credited: 'Placement credit', locked: 'Locked' };

function roadGeometry(missions, mobile) {
  const points = missions.map((mission, index) => ({
    id: mission.id,
    x: mobile ? index % 2 === 0 ? 90 : 190 : index % 2 === 0 ? 80 : 940,
    y: TOP_SPACE + (missions.length - 1 - index) * ROW_HEIGHT + ROW_HEIGHT / 2,
  }));
  const first = points[0];
  const last = points.at(-1);
  const startX = mobile ? 190 : 940;
  const start = `M ${startX} ${first.y + 220} C ${startX} ${first.y + 100}, ${first.x} ${first.y + 140}, ${first.x} ${first.y}`;
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    return ` C ${previous.x} ${previous.y - ROW_HEIGHT * .6}, ${point.x} ${point.y + ROW_HEIGHT * .6}, ${point.x} ${point.y}`;
  });
  const full = start + segments.join('') + ` L ${last.x} ${last.y - ROW_HEIGHT * .55}`;
  // Only a contiguous covered prefix plus the ongoing mission can light the road.
  // A later locked section never inherits the overall roadmap percentage.
  let reached = -1;
  for (let index = 0; index < missions.length; index += 1) {
    if (covered(missions[index])) reached = index;
    else {
      if (missions[index].state === 'active') reached = index;
      break;
    }
  }
  const complete = missions.every(covered);
  return {
    points,
    full,
    lit: reached < 0 ? '' : complete ? full : start + segments.slice(0, reached).join(''),
    reached,
    complete,
  };
}

function RoadPath({ geometry, height, mobile }) {
  return <svg className={`rm-highway-svg rm-highway-svg--${mobile ? 'mobile' : 'desktop'}`} viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path className="rm-highway-edge" d={geometry.full} vectorEffect="non-scaling-stroke" />
    <path className="rm-highway-base" data-road-path="base" d={geometry.full} vectorEffect="non-scaling-stroke" />
    <path className="rm-highway-lanes rm-highway-lanes--dim" d={geometry.full} vectorEffect="non-scaling-stroke" />
    {geometry.lit && <>
      <path className="rm-highway-glow" d={geometry.lit} vectorEffect="non-scaling-stroke" />
      <path className="rm-highway-lit" data-road-path="lit" d={geometry.lit} vectorEffect="non-scaling-stroke" />
      <path className="rm-highway-lanes rm-highway-lanes--lit" d={geometry.lit} vectorEffect="non-scaling-stroke" />
    </>}
  </svg>;
}

function scrollToCheckpoint(canvas, checkpointY, behavior = 'instant') {
  if (!canvas) return;
  window.scrollTo({
    top: Math.max(0, window.scrollY + canvas.getBoundingClientRect().top + checkpointY - window.innerHeight / 2),
    behavior,
  });
}

export function RoadmapHighway({ stage, canOpen, onOpen, isOwner, assignedMissionIds }) {
  const canvas = useRef(null);
  const highway = useRef(null);
  const previous = useRef(null);
  const missions = stage.levels.flatMap((level) => level.milestones);
  const desktop = roadGeometry(missions, false);
  const mobile = roadGeometry(missions, true);
  const height = TOP_SPACE + missions.length * ROW_HEIGHT + BOTTOM_SPACE;
  const active = missions.find((mission) => mission.state === 'active');
  const targetIndex = active ? missions.indexOf(active) : desktop.complete ? missions.length - 1 : 0;
  const targetY = desktop.points[targetIndex].y;
  const activeId = active?.id ?? '';

  // Orient a newly opened roadmap once. Switching stages keeps the reader's place
  // on the same full-length highway; only mission progress moves its checkpoint.
  useEffect(() => {
    const prior = previous.current;
    const changedStage = prior && prior.stageId !== stage.id;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transition = changedStage && !reducedMotion
      ? highway.current?.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' })
      : null;
    if (changedStage) {
      previous.current = { stageId: stage.id, activeId, targetY };
      return () => transition?.cancel();
    }
    if (prior && prior.activeId === activeId && prior.targetY === targetY) return;
    const frame = requestAnimationFrame(() => {
      previous.current = { stageId: stage.id, activeId, targetY };
      if (document.querySelector('dialog[open]')) return;
      if (stage.isUnlocked) scrollToCheckpoint(canvas.current, targetY);
    });
    return () => cancelAnimationFrame(frame);
  }, [stage.id, stage.isUnlocked, activeId, targetY]);

  function findMission() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToCheckpoint(canvas.current, targetY, reducedMotion ? 'instant' : 'smooth');
  }

  const completedInStage = missions.filter(mission => covered(mission)).length;
  return <div className="rm-highway" ref={highway}>
    <div className="rm-sticky-checkpoint" role="region" aria-label="Current stage navigation"><span className="rm-checkpoint-mark"><Flag size={16}/></span><div><strong>{stage.name}<span>Stage {stage.index + 1}</span></strong><small>{active ? 'Level ' + active.level + ' · ' + active.name : desktop.complete ? 'Stage covered' : 'Complete earlier stages to unlock'}</small></div><span className="rm-checkpoint-progress">{completedInStage}<small> / 15</small></span><button type="button" onClick={findMission} aria-label="Locate current checkpoint"><LocateFixed size={18}/></button></div>
    <nav className="rm-level-nav" aria-label="Stage levels">{stage.levels.map((level,index)=>{
      const done=level.milestones.every(covered);const ongoing=level.milestones.some(m=>m.state==='active');
      const first=level.milestones.find(m=>m.state==='active') || level.milestones[0];
      return <button key={index} type="button" style={{'--level-accent':['#a78bfa','#60a5fa','#2dd4bf','#fbbf24','#f472b6'][index]}} aria-label={'Level '+(index+1)+', '+(done?'completed':ongoing?'current':'locked')} aria-current={ongoing?'step':undefined}
        onClick={()=>{const point=desktop.points.find(p=>p.id===first.id);scrollToCheckpoint(canvas.current,point.y,window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth');}}>
        {done?<Check size={13}/>:ongoing?<Play size={12}/>:<LockKeyhole size={12}/>}<span>Level {index+1}</span>
      </button>;
    })}</nav>
    <div className="rm-highway-toolbar">
      <span><ArrowUp size={16} />Start below. Build your way up.</span>
      <button type="button" onClick={findMission}><LocateFixed size={15} />{active ? 'Find current mission' : desktop.complete ? 'View stage finish' : 'View stage start'}</button>
    </div>
    <div className="rm-highway-viewport" role="region" aria-label={`${stage.name} road map, starts at the bottom`} aria-describedby="roadmap-scroll-hint">
      <div ref={canvas} className="rm-highway-canvas" style={{ height }}>
        <RoadsideScenery points={desktop.points} reached={desktop.reached} stageIndex={stage.index} />
        <RoadPath geometry={desktop} height={height} />
        <RoadPath geometry={mobile} height={height} mobile />
        <div className={`rm-highway-finish${desktop.complete ? ' is-complete' : ''}`}>
          {desktop.complete ? <Trophy size={20} /> : <Flag size={20} />}
          <span><small>STAGE {String(stage.index + 1).padStart(2, '0')}</small><strong>{stage.tier.name} · {desktop.complete ? 'STAGE COVERED' : 'THE NEXT HORIZON'}</strong></span>
        </div>
        <ol className="rm-highway-missions" aria-label={`${stage.name} missions in progression order`}>
          {missions.map((mission, index) => {
            const allowed = canOpen(mission);
            const assigned = isOwner || assignedMissionIds.includes(mission.id);
            const StateIcon = mission.state === 'active' ? Play : covered(mission) ? Check : LockKeyhole;
            return <li key={mission.id} data-mission-id={mission.id} style={{ top: desktop.points[index].y }} className={`rm-highway-stop ${index % 2 === 0 ? 'is-left' : 'is-right'} is-${mission.state}`}>
              <button className="rm-highway-mission" type="button" disabled={!allowed} onClick={() => onOpen(mission)}
                aria-label={`${mission.name}, Level ${mission.level}, Mission ${mission.order}, ${mission.state}`}>
                <span className={`rm-highway-node${mission.order === 3 ? ' is-level-checkpoint' : ''}`} data-road-node aria-hidden="true"><StateIcon size={26} fill={mission.state === 'active' ? 'currentColor' : 'none'} /></span>
                <span className="rm-highway-connector" aria-hidden="true" />
                <span className="rm-highway-card">
                  <span className="rm-highway-card-head">
                    <span className="rm-highway-rank" aria-hidden="true"><TierRankBadge stageIndex={stage.index} subRank={6 - mission.level} size={36} state={covered(mission) ? 'completed' : mission.state === 'active' ? 'active' : 'locked'} /></span>
                    <span className="rm-highway-tier"><strong>{stage.tier.name} {6 - mission.level} <span>· M{String(index + 1).padStart(2, '0')}</span></strong></span>
                    <span className="rm-highway-status">{labels[mission.state]}<StateIcon size={12} /></span>
                  </span>
                  <span className="rm-highway-title">{stage.name} L{mission.level} - {mission.name}</span>
                  <span className="rm-highway-description">{mission.description}</span>
                  <span className="rm-highway-card-footer">
                    <strong>{!assigned ? 'Not assigned' : mission.state === 'active' ? 'Launch mission' : covered(mission) ? 'Review' : 'Vault locked'}{!allowed ? <LockKeyhole size={12} /> : mission.state === 'completed' ? <Check size={15} /> : mission.state === 'credited' ? <Sparkles size={14} /> : <ArrowRight size={15} />}</strong>
                  </span>
                </span>
              </button>
            </li>;
          })}
        </ol>
        <div className="rm-highway-start"><ArrowUp size={19} /><span><strong>START HERE</strong><small>{stage.name} · Level 1 · Mission 1</small></span></div>
      </div>
    </div>
    <p className="rm-highway-hint" id="roadmap-scroll-hint"><ArrowUp size={13} />Scroll up to explore the road ahead. The glow reaches your current mission.</p>
  </div>;
}
