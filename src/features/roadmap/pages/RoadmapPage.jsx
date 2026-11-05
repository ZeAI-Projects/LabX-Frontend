import { useEffect, useReducer, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { roadmapStore } from '../services/roadmap_store.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { roadmapProgressionMockStore } from '../services/roadmap_progression_mock.js';
import { MissionDialog } from '../components/MissionDialog.jsx';
import { MockMissionDialog } from '../components/MockMissionDialog.jsx';
import { RoadmapTeam } from '../components/RoadmapTeam.jsx';
import { RoadmapJourney } from '../components/RoadmapJourney.jsx';
import { MISSION_WORKFLOW_LABELS } from '../services/mission_review.js';
import '../components/MissionWorkQueue.css';
import '../components/RoadmapWorkflow.css';
import '../components/RoadmapReference.css';

export function RoadmapPage({ project, ownerId = project.owner_id }) {
  const { user } = useAuth();
  return project.visualDemo
    ? <MockRoadmapSession key={`${user.id}:${project.id}`} project={project} userId={user.id} />
    : <RoadmapSession key={`${user.id}:${ownerId}:${project.id}`} project={project} ownerId={ownerId} />;
}

function PageError({ message }) {
  return <section className="rm-page rm-access-error"><h1>Roadmap unavailable</h1><p role="alert">{message}</p><Link to="/roadmap" className="rm-button">Back to roadmaps</Link></section>;
}

function RoadmapBreadcrumb({ project, isOwner, ownerId, roadmap, onChange, onToggleOperations, showOperations, reviewCount }) {
  return <>
    <div className="rmj-breadcrumb-context">
      <Link to={isOwner ? '/roadmap' : '/roadmap?view=joined'}><ArrowLeft size={14} />All roadmaps</Link>
      <span aria-hidden="true">/</span><span className="rmj-breadcrumb-project">{project.name}</span>
    </div>
    <div className="rmj-breadcrumb-actions">
      {!isOwner && <span className="rmj-member-label"><Users size={14} /> Joined roadmap</span>}
      <RoadmapTeam project={project} roadmap={roadmap} onChange={onChange} ownerId={ownerId} />
      {isOwner && <button type="button" className="rmj-review-button" aria-expanded={showOperations} onClick={onToggleOperations}>
        Mission review and approval <span>{reviewCount}</span>
      </button>}
    </div>
  </>;
}

function RoadmapSession({ project, ownerId }) {
  const { user } = useAuth();
  const [, refresh] = useReducer((value) => value + 1, 0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [levelSelection, setLevelSelection] = useState({ activeLevelId: null, selectedLevelId: null });
  const [showOperations, setShowOperations] = useState(false);

  useEffect(() => {
    for (const event of ['storage', 'focus', 'labx:roadmap-change']) window.addEventListener(event, refresh);
    return () => { for (const event of ['storage', 'focus', 'labx:roadmap-change']) window.removeEventListener(event, refresh); };
  }, []);

  let access;
  let roadmap;
  let loadError;
  try {
    access = collaborationStore.getAccess(project.id, ownerId, user.id);
    roadmap = roadmapStore.read(project.id, ownerId, user.id);
  } catch (error) {
    loadError = error.message;
  }

  const isOwner = access?.role === 'owner';
  const allMissions = roadmap?.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones)) || [];
  const currentMission = allMissions.find((mission) => mission.id === roadmap.currentMilestoneId);
  const canOpen = (mission) => mission.state !== 'locked' && (isOwner || access.assignedMissionIds.includes(mission.id));
  const selectedMission = allMissions.find((mission) => mission.id === searchParams.get('milestone') && canOpen(mission));
  const activeLevelId = currentMission ? `${currentMission.stageName.toLowerCase()}-level-${currentMission.level}` : null;
  const assigned = allMissions.filter((mission) => access?.assignedMissionIds.includes(mission.id));
  const workItems = Object.entries(roadmap?.missionWorkflowsById || {}).map(([missionId, work]) => ({
    ...work, mission: allMissions.find((mission) => mission.id === missionId),
  })).filter((work) => work.mission);
  const reviewCount = workItems.filter((work) => ['submitted', 'resubmitted', 'under_review'].includes(work.status)).length;

  const selectedLevelId = selectedMission
    ? `${selectedMission.stageName.toLowerCase()}-level-${selectedMission.level}`
    : levelSelection.activeLevelId === activeLevelId ? levelSelection.selectedLevelId : activeLevelId;
  const selectLevel = (id) => setLevelSelection({ activeLevelId, selectedLevelId: id });

  if (loadError) return <PageError message={loadError} />;

  const openMission = (mission) => {
    if (!mission || !canOpen(mission)) return;
    selectLevel(`${mission.stageName.toLowerCase()}-level-${mission.level}`);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('stage');
      next.set('milestone', mission.id);
      return next;
    });
  };
  const closeMission = () => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('milestone');
      return next;
    }, { replace: true });
  };
  const operations = isOwner ? <section className="rmj-operations" aria-label="Mission review and approval">
    <div className="rmj-operations-heading"><h2>Mission Review and Approval</h2><span>{reviewCount} awaiting review</span></div>
    <div><ul className="rmj-operation-list">
      {workItems.length ? workItems.map(({ mission, ...work }) => <li key={mission.id}>
        <span><strong>{mission.name}</strong><small>{work.memberName || work.memberId} · {mission.stageName} · Level {mission.level}</small></span>
        <span>{MISSION_WORKFLOW_LABELS[work.status] || 'Assigned'}</span>
        <button type="button" disabled={!canOpen(mission)} onClick={() => openMission(mission)}>Review</button>
      </li>) : <li className="rmj-operation-empty">No team missions yet. Invite a member and assign a mission from Manage team.</li>}
    </ul></div>
  </section> : <section className="rmj-operations" aria-label="Your assigned missions">
    <div className="rmj-operations-heading"><h2>Your assigned missions</h2><span>{assigned.length} assigned</span></div>
    <div><ul className="rmj-operation-list">
      {assigned.length ? assigned.map((mission) => <li key={mission.id}>
        <span><strong>{mission.name}</strong><small>{mission.stageName} · Level {mission.level} · {MISSION_WORKFLOW_LABELS[roadmap.missionWorkflowsById?.[mission.id]?.status] || 'Assigned'}</small></span>
        <span>{mission.state === 'locked' ? 'Locked' : 'Ready'}</span>
        <button type="button" disabled={!canOpen(mission)} onClick={() => openMission(mission)}>Open</button>
      </li>) : <li className="rmj-operation-empty">No missions are assigned to you yet.</li>}
    </ul></div>
  </section>;

  return <div className="rm-page rm-reference rm-page-journey">
    <RoadmapJourney project={project} roadmap={roadmap} currentMission={currentMission} selectedLevelId={selectedLevelId}
      onSelectLevel={selectLevel} canOpen={canOpen} onOpenMission={openMission}
      operations={operations} showOperations={showOperations}
      headerBar={<RoadmapBreadcrumb project={project} isOwner={isOwner} ownerId={ownerId} roadmap={roadmap} onChange={refresh} onToggleOperations={() => setShowOperations((value) => !value)} showOperations={showOperations} reviewCount={reviewCount} />} />
    {selectedMission && <MissionDialog key={`${user.id}:${selectedMission.id}:${roadmap.missionWorkflowsById?.[selectedMission.id]?.memberId || 'owner'}`}
      project={project} ownerId={ownerId} userId={user.id} mission={selectedMission} roadmap={roadmap} isOwner={isOwner}
      canContinue={Boolean(currentMission && canOpen(currentMission))} onClose={closeMission} onChange={refresh}
      onNext={() => { if (currentMission && canOpen(currentMission)) openMission(currentMission); else closeMission(); }} />}
  </div>;
}

function MockRoadmapSession({ project, userId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState(() => {
    try { return { roadmap: roadmapProgressionMockStore.read(project, userId), error: '' }; }
    catch (error) { return { roadmap: null, error: error.message }; }
  });
  const [levelSelection, setLevelSelection] = useState({ activeLevelId: null, selectedLevelId: null });
  const [missionId, setMissionId] = useState(() => searchParams.get('milestone'));
  const [showOperations, setShowOperations] = useState(false);
  const roadmap = snapshot.roadmap;
  const error = snapshot.error;
  const missions = roadmap?.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones)) || [];
  const currentMission = missions.find((mission) => mission.id === roadmap?.currentMilestoneId);
  const activeLevelId = currentMission ? `${currentMission.stageName.toLowerCase()}-level-${currentMission.level}` : null;
  const selectedMission = missions.find((mission) => mission.id === missionId && mission.state !== 'locked');

  const selectedLevelId = levelSelection.activeLevelId === activeLevelId ? levelSelection.selectedLevelId : activeLevelId;
  const selectLevel = (id) => setLevelSelection({ activeLevelId, selectedLevelId: id });
  const openMission = (mission) => {
    if (!mission || mission.state === 'locked') return;
    setMissionId(mission.id);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('milestone', mission.id);
      return next;
    }, { replace: true });
  };
  const closeMission = () => {
    setMissionId(null);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('milestone');
      return next;
    }, { replace: true });
  };

  const completeMission = (id, submission) => {
    const updated = roadmapProgressionMockStore.completeMission(project, userId, id, submission);
    setSnapshot({ roadmap: updated, error: '' });
  };
  const headerBar = <>
    <div className="rmj-breadcrumb-context">
      <Link to={project.visualCollection === 'joined' ? '/roadmap?view=joined' : '/roadmap'}><ArrowLeft size={14} />All roadmaps</Link>
      <span aria-hidden="true">/</span><span className="rmj-breadcrumb-project">{project.name}</span>
    </div>
    <div className="rmj-breadcrumb-actions">
      {project.visualCollection === 'joined' && <span className="rmj-member-label"><Users size={14} />Joined roadmap</span>}
      <RoadmapTeam project={project} roadmap={roadmap} showForPrototype />
      <button type="button" className="rmj-review-button" aria-expanded={showOperations} onClick={() => setShowOperations((value) => !value)}>
        Mission review and approval <span>0</span>
      </button>
    </div>
  </>;

  if (error || !roadmap) return <PageError message={error || 'The sample roadmap is unavailable.'} />;

  return <div className="rm-page rm-reference rm-page-journey">
    <RoadmapJourney project={project} roadmap={roadmap} currentMission={currentMission} selectedLevelId={selectedLevelId}
      onSelectLevel={selectLevel} canOpen={(mission) => mission.state !== 'locked'}
      onOpenMission={openMission} headerBar={headerBar}
      showOperations={showOperations} operations={<section className="rmj-operations" aria-label="Mission review and approval">
        <div className="rmj-operations-heading"><h2>Mission Review and Approval</h2><span>0 awaiting review</span></div>
        <div><p className="rmj-operation-empty">No team missions are awaiting review in this interactive prototype.</p></div>
      </section>} />
    {selectedMission && <MockMissionDialog key={`${project.id}:${selectedMission.id}`} project={project} roadmap={roadmap}
      mission={selectedMission}
      onClose={closeMission} onComplete={completeMission} />}
  </div>;
}
