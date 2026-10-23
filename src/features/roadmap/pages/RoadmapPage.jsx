import { useEffect, useReducer, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FlaskConical, LockKeyhole, Play, Sparkles, Trophy, Users } from 'lucide-react';
import { TierRankBadge } from '../../../components/common/TierRankBadge.jsx';
import { useAuth } from '../../../hooks/use_auth.js';
import { roadmapStore } from '../services/roadmap_store.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { MissionDialog } from '../components/MissionDialog.jsx';
import { RoadmapTeam } from '../components/RoadmapTeam.jsx';
import { RoadmapHighway } from '../components/RoadmapHighway.jsx';
import { JoinRoadmapTrigger } from '../components/JoinRoadmapTrigger.jsx';
import { MISSION_WORKFLOW_LABELS } from '../services/mission_review.js';
import '../components/MissionWorkQueue.css';
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
  const { user } = useAuth();
  return <RoadmapSession key={`${user.id}:${ownerId}:${project.id}`} project={project} ownerId={ownerId} />;
}

function RoadmapSession({ project, ownerId }) {
  const { user } = useAuth();
  const [, refresh] = useReducer((value) => value + 1, 0);
  const [searchParams, setSearchParams] = useSearchParams();
  const stageNavigation = useRef(null);
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
  const earlierRemaining = allMissions.filter((mission) => mission.stageIndex < activeStageIndex && !covered(mission)).length;
  const currentAssigned = current && canOpen(current) && (isOwner || current.id !== 'discover-l1-m1');
  const assigned = allMissions.filter((mission) => access.assignedMissionIds.includes(mission.id));
  const workItems = Object.entries(roadmap.missionWorkflowsById || {}).map(([missionId, work]) => ({
    ...work, mission: allMissions.find((mission) => mission.id === missionId),
  })).filter((work) => work.mission);
  const reviewCount = workItems.filter((work) => ['submitted', 'resubmitted', 'under_review'].includes(work.status)).length;
  const setStage = (index) => {
    setSearchParams((params) => { const next = new URLSearchParams(params); next.set('stage', roadmap.stages[index].name); next.delete('milestone'); return next; });
    requestAnimationFrame(() => {
      const navigation = stageNavigation.current;
      const tab = navigation?.querySelector(`[data-stage-id="${roadmap.stages[index].id}"]`);
      if (!tab) return;
      tab.focus({ preventScroll: true });
      const bounds = tab.getBoundingClientRect();
      const navBounds = navigation.getBoundingClientRect();
      if (bounds.left < navBounds.left || bounds.right > navBounds.right) {
        navigation.scrollTo({ left: navigation.scrollLeft + bounds.left - navBounds.left - (navBounds.width - bounds.width) / 2,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }
    });
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
      <div className="roadmap-team-toolbar">{!isOwner && <span className="rm-member-badge"><Users size={15} />Joined roadmap</span>}{isOwner && <JoinRoadmapTrigger projectId={project.id} view="founder" className="roadmap-team-button">Find collaborators<ArrowRight size={15} /></JoinRoadmapTrigger>}<RoadmapTeam project={project} roadmap={roadmap} onChange={refresh} /></div>
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
      <nav className="rm-stage-nav" aria-label="Roadmap stages" ref={stageNavigation}>
        {roadmap.stages.map((item, index) => {
          const status = stageStatus(item);
          return <button key={item.id} type="button" data-stage-id={item.id} data-stage-status={status}
            className={`rm-stage-tab is-${status}${activeStageIndex === index ? ' is-selected' : ''}`}
            aria-pressed={activeStageIndex === index} aria-label={`${item.name}, Stage ${index + 1}${status === 'current' ? ', current' : item.isUnlocked ? ', available' : ', locked'}`}
            style={{ '--tab-color': item.tier.color }} onClick={() => setStage(index)}>
            <span className="rm-stage-crest" aria-hidden="true"><TierRankBadge stageIndex={index} size={36} state={status === 'locked' ? 'locked' : 'active'} /></span>
            <span className="rm-stage-card-title"><small>STAGE {index + 1}</small><strong>{item.name}</strong></span>
            <span className="rm-stage-card-status">
              {status === 'completed' ? <>Complete<Check size={13} /></> : status === 'credited' ? <>Covered<Sparkles size={12} /></> : status === 'current' ? 'Current' : <LockKeyhole size={15} />}
            </span>
          </button>;
        })}
      </nav>
    </div>
    {current && !currentAssigned && <p className="rm-permission-note"><LockKeyhole size={15} />{current.id === 'discover-l1-m1' ? 'The main founder completes the initial mission.' : 'The main founder can assign the current mission to you.'}</p>}
    {roadmap.isComplete && <div className="rm-complete-banner"><Trophy size={26} /><div><h2>Roadmap completed!</h2><p>All five stages covered. Look how far you have come.</p></div></div>}

    {!isOwner && <section className="rm-member-summary" aria-label="Your assigned missions">
      <div><Users size={20} /><span><strong>Your assigned missions</strong><small>Only the main founder manages this roadmap and its team.</small></span></div>
      {assigned.length ? <ul>{assigned.map((mission) => <li key={mission.id}><button className="rm-button" type="button" disabled={!canOpen(mission)} onClick={() => openMission(mission)}>{mission.name}<span>{MISSION_WORKFLOW_LABELS[roadmap.missionWorkflowsById?.[mission.id]?.status] || 'Assigned'} · {stateLabel[mission.state]}</span></button></li>)}</ul> : <p>No missions assigned yet. Your main founder can assign one from Manage team.</p>}
    </section>}

    {isOwner && <section className="rm-work-queue" aria-labelledby="mission-review-queue-title">
      <header><div><span className="rm-eyebrow">{project.name} · Team missions</span><h2 id="mission-review-queue-title">Mission Review and Approval</h2></div><span className="rm-work-count">{reviewCount} awaiting review</span></header>
      {workItems.length > 0 ? <ul>{workItems.map(({ mission, ...work }) => <li key={mission.id}>
        <div><strong>{mission.name}</strong><small>{work.memberName || work.memberId} · {mission.stageName} · Level {mission.level}{work.latestVersion ? ` · Version ${work.latestVersion}` : ''}</small></div>
        <span className="rm-work-status">{MISSION_WORKFLOW_LABELS[work.status] || 'Assigned'}{mission.state === 'locked' && ' · Locked'}</span>
        <button type="button" className="rm-button" disabled={!canOpen(mission)} onClick={() => openMission(mission)} aria-label={`Open team mission: ${mission.name}`}>Open<ArrowRight size={14} /></button>
      </li>)}</ul> : <p>No team missions yet. Add a member through Join Roadmap, then assign a mission from Manage team.</p>}
    </section>}

    <section className={`rm-board game-board-container${stage.isUnlocked ? "" : " is-stage-locked"}`} aria-labelledby="rm-stage-title">
      <h2 id="rm-stage-title" className="rm-visually-hidden">{stage.name} your next chapter.</h2>
      <div className="rm-stage-banner">
        <div className={`rm-stage-pill${stage.isUnlocked ? '' : ' is-locked'}`}>
          <span aria-hidden="true"><TierRankBadge stageIndex={activeStageIndex} size={48} state={stage.isUnlocked ? 'active' : 'locked'} /></span>
          <div><span>STAGE {String(activeStageIndex + 1).padStart(2, '0')}</span><h3>{stage.tier.name} &mdash; {stage.name}</h3></div>
        </div>
        <span className="rm-stage-tally">{stageCovered} / 15 missions covered</span>
      </div>
      <div className={`rm-stage-context${stage.isUnlocked ? '' : ' is-locked'}`}>
        <span className="rm-stage-context-icon" aria-hidden="true">{!stage.isUnlocked ? <LockKeyhole size={21} /> : stageCovered === 15 ? <Check size={21} /> : <Play size={19} />}</span>
        <div role="status" aria-live="polite" aria-atomic="true"><strong>{!stage.isUnlocked ? `${stage.name} is locked` : stageCovered === 15 ? 'Stage covered' : 'Your current stage'}</strong>
          <p>{!stage.isUnlocked ? `Explore the missions ahead. Complete ${earlierRemaining} earlier missions to unlock this stage.` : stageCovered === 15 ? 'All 15 missions in this stage are covered.' : `${15 - stageCovered} missions left in ${stage.name}. Every approved mission moves you forward.`}</p>
        </div>
        {activeStageIndex !== roadmap.currentStageIndex && !roadmap.isComplete
          ? <button type="button" className="rm-button" onClick={() => setStage(roadmap.currentStageIndex)}>Return to Active Stage<ArrowRight size={15} /></button>
          : currentAssigned && <button type="button" className="rm-button" onClick={() => openMission(current)}>Open current mission<ArrowRight size={15} /></button>}
      </div>
      <div className="rm-road-content"><RoadmapHighway stage={stage} canOpen={canOpen} onOpen={openMission} isOwner={isOwner} assignedMissionIds={access.assignedMissionIds} /></div>
      <footer className="rm-board-footer"><span><Play size={12} />Current mission</span><span><Check size={14} />Completed</span><span><Sparkles size={13} />Placement credit</span><span><LockKeyhole size={13} />Locked</span></footer>
    </section>
    <div className="rm-bottom-note"><FlaskConical size={16} /><p>Submissions and invitations stay in this browser. Evaluation checks completeness; it does not verify evidence or award LabX points.</p></div>
    {selectedMission && <MissionDialog key={`${user.id}:${selectedMission.id}:${roadmap.missionWorkflowsById?.[selectedMission.id]?.memberId || 'owner'}`} project={project} ownerId={ownerId} userId={user.id} mission={selectedMission} roadmap={roadmap} isOwner={isOwner} canContinue={currentAssigned} onClose={closeMission} onChange={refresh} onNext={() => { if (currentAssigned) openMission(current); else closeMission(); }} />}
  </div>;
}
