import { useEffect, useReducer } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FlaskConical, LockKeyhole, Play, Sparkles, Trophy, Users } from 'lucide-react';
import { TierRankBadge } from '../../../components/common/TierRankBadge.jsx';
import { useAuth } from '../../../hooks/use_auth.js';
import { roadmapStore } from '../services/roadmap_store.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { MissionDialog } from '../components/MissionDialog.jsx';
import { RoadmapTeam } from '../components/RoadmapTeam.jsx';
import { RoadmapHighway } from '../components/RoadmapHighway.jsx';
import '../components/RoadmapWorkflow.css';
import '../components/RoadmapReference.css';

const stateLabel = { active: 'Your next mission', locked: 'Locked', completed: 'Completed', credited: 'Placement credit' };
const covered = (mission) => ['completed', 'credited'].includes(mission.state);
const stageStatus = (stage) => {
  const missions = stage.levels.flatMap((level) => level.milestones);
  if (missions.every(covered)) return missions.some((mission) => mission.state === 'credited') ? 'credited' : 'completed';
  return stage.isCurrent ? 'current' : 'locked';
};

export function RoadmapPage({ project, ownerId = project.owner_id }) {
  return <RoadmapSession key={`${ownerId}:${project.id}`} project={project} ownerId={ownerId} />;
}

function RoadmapSession({ project, ownerId }) {
  const { user } = useAuth();
  const [, refresh] = useReducer((value) => value + 1, 0);
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    for (const event of ['storage', 'focus', 'labx:roadmap-change']) window.addEventListener(event, refresh);
    return () => { for (const event of ['storage', 'focus', 'labx:roadmap-change']) window.removeEventListener(event, refresh); };
  }, []);
  let access, roadmap, error;
  try {
    access = collaborationStore.getAccess(project.id, ownerId, user.id);
    roadmap = roadmapStore.read(project.id, ownerId, user.id);
  } catch (err) { error = err.message; }
  if (error) return <section className="rm-page rm-access-error"><h1>Roadmap unavailable</h1><p role="alert">{error}</p><Link to="/roadmap" className="rm-button">Back to roadmaps</Link></section>;

  const isOwner = access.role === 'owner';
  const allMissions = roadmap.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones));
  const current = allMissions.find((mission) => mission.id === roadmap.currentMilestoneId);
  const canOpen = (mission) => mission.state !== 'locked' && (isOwner || access.assignedMissionIds.includes(mission.id));
  const selectedMission = allMissions.find((mission) => mission.id === searchParams.get('milestone') && canOpen(mission));
  const requestedStage = roadmap.stages.findIndex((stage) => stage.name === searchParams.get('stage'));
  const activeStageIndex = selectedMission?.stageIndex ?? (requestedStage < 0 ? roadmap.currentStageIndex : requestedStage);
  const stage = roadmap.stages[activeStageIndex];
  const stageMissions = stage.levels.flatMap((level) => level.milestones);
  const stageCovered = stageMissions.filter(covered).length;
  const currentAssigned = current && canOpen(current) && (isOwner || current.id !== 'discover-l1-m1');
  const assigned = allMissions.filter((mission) => access.assignedMissionIds.includes(mission.id));
  const setStage = (index) => {
    setSearchParams((params) => { const next = new URLSearchParams(params); next.set('stage', roadmap.stages[index].name); next.delete('milestone'); return next; });
  };
  const openMission = (mission) => {
    if (!mission || !canOpen(mission)) return;
    setSearchParams((params) => { const next = new URLSearchParams(params); next.set('stage', mission.stageName); next.set('milestone', mission.id); return next; });
  };
  const closeMission = () => {
    setSearchParams((params) => { const next = new URLSearchParams(params); next.delete('milestone'); return next; }, { replace: true });
  };

  return <div className="rm-page rm-reference" style={{ '--stage-color': stage.tier.color }}>
    <div className="rm-project-bar">
      <div className="rm-project-context">
        <Link className="rm-back" to={isOwner ? '/roadmap' : '/roadmap?view=joined'}><ArrowLeft size={14} />All roadmaps</Link>
        <span aria-hidden="true">/</span><h1>{project.name}</h1>
      </div>
      {isOwner ? <RoadmapTeam project={project} roadmap={roadmap} onChange={refresh} /> : <span className="rm-member-badge"><Users size={15} />Joined roadmap</span>}
    </div>

    <header className="rm-domain-header">
      <div className="rm-domain-title"><span className="rm-eyebrow">Domain progression highway</span><h2>{roadmap.domain}</h2></div>
      <div className="rm-coverage">
        <div className="rm-coverage-pill" role="progressbar" aria-label="Roadmap coverage" aria-valuemin={0} aria-valuemax={roadmap.totalCount} aria-valuenow={roadmap.completedCount + roadmap.creditedCount}
          aria-valuetext={`${roadmap.completedCount} completed, ${roadmap.creditedCount} placement credits, ${roadmap.totalCount} total missions`}>
          <span>Tier Progress: <strong>{roadmap.progressPercent}%</strong></span><i aria-hidden="true" /><span>Milestones: <strong>{roadmap.completedCount + roadmap.creditedCount} / {roadmap.totalCount}</strong></span>
        </div>
        {roadmap.creditedCount > 0 && <small>+ {roadmap.creditedCount} covered by placement</small>}
      </div>
    </header>

    <div className="rm-map-navigation">
      <nav className="rm-stage-nav" aria-label="Roadmap stages">
        {roadmap.stages.map((item, index) => {
          const status = stageStatus(item);
          return <button key={item.id} type="button" data-stage-id={item.id} data-stage-status={status}
            className={`rm-stage-tab is-${status}${activeStageIndex === index ? ' is-selected' : ''}`}
            aria-pressed={activeStageIndex === index} aria-label={`${item.name}, Stage ${index + 1}${status === 'current' ? ', current' : item.isUnlocked ? ', available' : ', locked'}`}
            style={{ '--tab-color': item.tier.color }} onClick={() => setStage(index)}>
            <span className="rm-stage-crest" aria-hidden="true"><TierRankBadge stageIndex={index} size={39} state={status === 'locked' ? 'locked' : 'active'} /></span>
            <span className="rm-stage-card-title"><small>STAGE {index + 1}</small><strong>{item.name}</strong></span>
            <span className="rm-stage-card-status">
              {status === 'completed' ? <>Complete<Check size={13} /></> : status === 'credited' ? <>Covered<Sparkles size={12} /></> : status === 'current' ? 'Current' : <LockKeyhole size={15} />}
            </span>
          </button>;
        })}
      </nav>
      {currentAssigned && <button type="button" className="rm-mission-launch" onClick={() => openMission(current)}><Play size={13} />Open current mission<ArrowRight size={14} /></button>}
    </div>
    {current && !currentAssigned && <p className="rm-permission-note"><LockKeyhole size={15} />{current.id === 'discover-l1-m1' ? 'The main founder completes the initial mission.' : 'The main founder can assign the current mission to you.'}</p>}
    {roadmap.isComplete && <div className="rm-complete-banner"><Trophy size={26} /><div><h2>Roadmap completed!</h2><p>All five stages covered. Look how far you have come.</p></div></div>}

    {!isOwner && <section className="rm-member-summary" aria-label="Your assigned missions">
      <div><Users size={20} /><span><strong>Your assigned missions</strong><small>Only the main founder manages this roadmap and its team.</small></span></div>
      {assigned.length ? <ul>{assigned.map((mission) => <li key={mission.id}><button className="rm-button" type="button" disabled={!canOpen(mission)} onClick={() => openMission(mission)}>{mission.name}<span>{stateLabel[mission.state]}</span></button></li>)}</ul> : <p>No missions assigned yet. Your main founder can assign one from Team &amp; invitations.</p>}
    </section>}

    <section className="rm-board game-board-container" aria-labelledby="rm-stage-title">
      <h2 id="rm-stage-title" className="rm-visually-hidden">{stage.name} your next chapter.</h2>
      <div className="rm-stage-banner">
        <div className={`rm-stage-pill${stage.isUnlocked ? '' : ' is-locked'}`}>
          <span aria-hidden="true"><TierRankBadge stageIndex={activeStageIndex} size={59} state={stage.isUnlocked ? 'active' : 'locked'} /></span>
          <div><span>STAGE {String(activeStageIndex + 1).padStart(2, '0')}</span><h3>{stage.tier.name} &mdash; {stage.name}</h3></div>
        </div>
        <span className="rm-stage-tally">{stageCovered} / 15 missions covered</span>
      </div>
      {!stage.isUnlocked && <div className="rm-locked-note"><LockKeyhole size={17} /><p>This stage unlocks after the earlier requirements are covered. You can preview the mission names below.</p><button type="button" onClick={() => setStage(roadmap.currentStageIndex)}>Return to Active Stage<ArrowRight size={14} /></button></div>}
      <RoadmapHighway stage={stage} canOpen={canOpen} onOpen={openMission} isOwner={isOwner} assignedMissionIds={access.assignedMissionIds} />
      <footer className="rm-board-footer"><span><Play size={12} />Current mission</span><span><Check size={14} />Completed</span><span><Sparkles size={13} />Placement credit</span><span><LockKeyhole size={13} />Locked</span></footer>
    </section>
    <div className="rm-bottom-note"><FlaskConical size={16} /><p>Interactive demo · Submissions and invitations stay in this browser. Evaluation checks completeness; it does not verify evidence or award LabX points.</p></div>
    {selectedMission && <MissionDialog key={selectedMission.id} project={project} ownerId={ownerId} userId={user.id} mission={selectedMission} roadmap={roadmap} isOwner={isOwner} canContinue={currentAssigned} onClose={closeMission} onChange={refresh} onNext={() => { if (currentAssigned) openMission(current); else closeMission(); }} />}
  </div>;
}
