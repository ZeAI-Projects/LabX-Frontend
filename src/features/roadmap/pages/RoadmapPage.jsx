import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUp, BookOpen, Lock, Play } from 'lucide-react';
import { TierRankBadge } from '../../../components/common/TierRankBadge.jsx';
import { createMockRoadmap } from '../services/mock_roadmap.js';
import { MilestonePreview } from '../components/MilestonePreview.jsx';
import '../components/RoadmapPage.css';

const ROAD_FIRST_NODE_Y = 350;
const ROAD_ROW_HEIGHT = 260;

export function RoadmapPage({ project }) {
  return <RoadmapSession key={project.id} project={project} result={project.assessment_result} />;
}

function RoadmapSession({ result, project }) {
  const roadmap = useMemo(() => createMockRoadmap(result), [result]);
  const [selectedStageIndex, setSelectedStageIndex] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const stageNavigation = useRef(null);
  const currentMission = useRef(null);
  const activeStageIndex = selectedStageIndex ?? roadmap.currentStageIndex;
  const activeStage = roadmap.stages[activeStageIndex];
  const visibleMilestones = useMemo(() => activeStage.levels.flatMap(({ milestones }) => milestones).toReversed(), [activeStage]);
  const totalSvgHeight = ROAD_FIRST_NODE_Y + (visibleMilestones.length - 1) * ROAD_ROW_HEIGHT + 170;
  const highwayPath = useMemo(() => {
    const points = visibleMilestones.map((_, index) => ({ x: index % 2 === 0 ? 140 : 1260, y: index * ROAD_ROW_HEIGHT + ROAD_FIRST_NODE_Y }));
    return points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      return `${path} C ${previous.x} ${previous.y + ROAD_ROW_HEIGHT / 2}, ${point.x} ${point.y - ROAD_ROW_HEIGHT / 2}, ${point.x} ${point.y}`;
    }, '');
  }, [visibleMilestones]);

  useEffect(() => {
    const navigation = stageNavigation.current;
    const selected = navigation?.querySelector('[aria-pressed="true"]');
    if (selected && navigation.scrollWidth > navigation.clientWidth) {
      navigation.scrollLeft += selected.getBoundingClientRect().left - navigation.getBoundingClientRect().left - 8;
    }
  }, [activeStageIndex]);

  return (
    <div className="pubg-roadmap-page">
      <div className="pubg-roadmap-bg" aria-hidden="true"><div className="pubg-radial-glow" /><div className="pubg-grid-lines" /></div>
      <Link className="roadmap-project-back" to="/roadmap"><ArrowLeft size={16} aria-hidden="true" />All projects</Link>
      <header className="pubg-roadmap-header">
        <div className="pubg-header-title-col">
          <span className="pubg-header-kicker">Project roadmap</span>
          <h1 className="pubg-header-title">{project.name}</h1>
          <p className="roadmap-domain-subtitle">{roadmap.domain}</p>
        </div>
        <div className="pubg-header-stats-pill">
          <span>Progress: <strong>{roadmap.progressPercent}%</strong></span><span aria-hidden="true">·</span>
          <span>Milestones: <strong>{roadmap.completedCount} / {roadmap.totalCount}</strong></span>
        </div>
      </header>
      <div className="roadmap-placement-note">
        <span>Mock starting point: <strong>{roadmap.stages[roadmap.currentStageIndex].name} · Level {roadmap.currentLevel}</strong></span>
        <span>Placement does not mark earlier milestones complete.</span>
      </div>
      <nav ref={stageNavigation} className="roadmap-stage-selector" aria-label="Roadmap stages">
        {roadmap.stages.map((stage, index) => (
          <button key={stage.id} type="button" className={`roadmap-stage-selector__item ${stage.isUnlocked ? 'is-unlocked' : 'is-locked'} ${index === activeStageIndex ? 'is-selected' : ''}`}
            onClick={() => setSelectedStageIndex(index)} aria-pressed={index === activeStageIndex}
            aria-label={`${stage.name}, Stage ${index + 1}${stage.isCurrent ? ', current' : stage.isUnlocked ? ', available' : ', locked'}`}>
            <TierRankBadge stageIndex={index} subRank={1} size={34} label={stage.tier.name} state={stage.isUnlocked ? 'active' : 'locked'} />
            <span><small>STAGE {index + 1}</small><strong>{stage.name}</strong></span>
            {stage.isCurrent ? <em>CURRENT</em> : stage.isUnlocked ? <em>AVAILABLE</em> : <Lock size={13} />}
          </button>
        ))}
      </nav>

      {activeStage.isUnlocked ? (
        <>
          <div className="roadmap-journey-summary">
            <span><ArrowUp size={16} />Your journey progresses from bottom to top</span>
            {activeStage.isCurrent && <button type="button" onClick={() => currentMission.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })}>Current milestone<ArrowRight size={15} /></button>}
          </div>
          <section className="game-board-container" aria-label={`${activeStage.name} roadmap`} style={{ minHeight: totalSvgHeight }}>
            <svg className="master-highway-svg" viewBox={`0 0 1400 ${totalSvgHeight}`} preserveAspectRatio="none" aria-hidden="true">
              <path d={highwayPath} fill="none" stroke="#0a1020" strokeWidth="48" strokeLinecap="round" />
              <path d={highwayPath} fill="none" stroke="#151e34" strokeWidth="38" strokeLinecap="round" />
              <path d={highwayPath} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="3" strokeDasharray="8 8" />
            </svg>
            <div key={activeStage.id} className="stage-board-section stage-enter" style={{ '--tier-color': activeStage.tier.color, '--tier-glow': activeStage.tier.glow }}>
              <div className="stage-section-divider">
                <div className="stage-section-pill is-active">
                  <TierRankBadge stageIndex={activeStageIndex} subRank={1} size={48} label={activeStage.tier.name} />
                  <div className="stage-pill-text-col"><span className="stage-pill-kicker">STAGE 0{activeStageIndex + 1}</span><h2 className="stage-pill-name">{activeStage.tier.name} — {activeStage.name}</h2></div>
                </div>
              </div>
              {visibleMilestones.map((milestone, index) => <MilestoneRow key={milestone.id} milestone={milestone} tier={activeStage.tier} index={index} currentRef={milestone.id === roadmap.currentMilestoneId ? currentMission : undefined} onOpen={setSelectedMilestone} />)}
            </div>
          </section>
        </>
      ) : (
        <section className="roadmap-stage-preview-lock" aria-labelledby="locked-stage-title">
          <div className="roadmap-stage-preview-lock__message">
            <div className="locked-badge-wrap"><TierRankBadge stageIndex={activeStageIndex} subRank={1} size={84} label={activeStage.tier.name} state="locked" /><div className="locked-shield-pulse" /></div>
            <div className="locked-kicker"><Lock size={14} /><span>Restricted Sector · Locked Stage</span></div>
            <h2 id="locked-stage-title">{activeStage.tier.name} — {activeStage.name}</h2>
            <p>Complete the required work in your current stage, <strong>{roadmap.stages[roadmap.currentStageIndex].name}</strong>, before advancing.</p>
            <button type="button" className="btn-return-active-stage" onClick={() => setSelectedStageIndex(null)}>Return to Active Stage</button>
          </div>
        </section>
      )}
      {selectedMilestone && <MilestonePreview milestone={selectedMilestone} onClose={() => setSelectedMilestone(null)} />}
    </div>
  );
}

function MilestoneRow({ milestone, tier, index, currentRef, onOpen }) {
  const isLeft = index % 2 === 0;
  const isAccessible = milestone.state !== 'locked';
  const node = (
    <div className="board-node-anchor" aria-hidden="true">
      <div className={`node-portal-${milestone.state}`}>
        {milestone.state === 'active' ? <Play size={34} fill="currentColor" /> : isAccessible ? <BookOpen size={30} /> : <Lock size={28} />}
      </div>
    </div>
  );
  const card = (
    <button type="button" disabled={!isAccessible} className={`board-holo-card state-${milestone.state}`} onClick={() => onOpen(milestone)} aria-label={`${milestone.stageName}, Level ${milestone.level}, Milestone ${milestone.order}: ${milestone.name}, ${milestone.state}${isAccessible ? ', open mock preview' : ''}`}>
      <div className="card-header-row">
        <div className="card-tier-label-group"><TierRankBadge stageIndex={milestone.stageIndex} subRank={milestone.level} size={28} label={tier.name} state={milestone.state} /><span className="card-kicker-tag">LEVEL {milestone.level} · M0{milestone.order}</span></div>
        <span className={`card-status-pill ${milestone.state}`}>{milestone.state === 'locked' && <Lock size={10} />}{milestone.state.toUpperCase()}</span>
      </div>
      <h3 className="card-mission-title">{milestone.name}</h3>
      <p className="card-mission-desc">{milestone.description}</p>
      <div className="card-footer-row" style={{ justifyContent: 'flex-end' }}><span className={`card-action-cta ${milestone.state}`}>{milestone.state === 'active' ? 'INITIALIZE' : isAccessible ? 'VIEW PREVIEW' : 'LOCKED'}{isAccessible && <ArrowRight size={13} />}</span></div>
    </button>
  );
  return (
    <div ref={currentRef} className={`board-milestone-row state-${milestone.state} ${isLeft ? 'align-left' : 'align-right'}`}>
      {isLeft ? node : card}<div className={`board-laser-link ${milestone.state}`} />{isLeft ? card : node}
    </div>
  );
}
