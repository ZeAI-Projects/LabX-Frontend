import { useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock3, LogOut, Paperclip, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use_auth.js';
import { roadmapStore } from '../services/roadmap_store.js';
import { collaborationStore } from '../services/roadmap_collaboration.js';
import { roadmapProgressionMockStore } from '../services/roadmap_progression_mock.js';
import { getMockProjectMission } from '../services/mock_roadmap.js';
import { requestDemoMissionExit, readDemoMissionExit } from '../services/roadmap_member_actions.js';
import { openRoadmapDialog } from '../services/roadmap_dialog.js';
import { useCollaborationAction } from '../components/collaboration_ui.js';
import { CollaborationFeedback } from '../components/CollaborationPortal.jsx';
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

function MissionExitAction({ assignment, userId, onChange }) {
  const action = useCollaborationAction();
  const [dialogNode, setDialogNode] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const isDemo = assignment.visualDemo;
  const pendingRequest = isDemo
    ? readDemoMissionExit(userId, assignment.projectId, assignment.missionId)
    : assignment.leaveRequest?.status === 'pending';

  useEffect(() => {
    if (!confirming || !dialogNode) return undefined;
    return openRoadmapDialog(dialogNode);
  }, [confirming, dialogNode]);

  const requestExit = () => action.run(
    () => isDemo
      ? requestDemoMissionExit(userId, assignment.projectId, assignment.missionId)
      : collaborationStore.requestAssignmentExit(assignment.projectId, assignment.ownerId, assignment.missionId, userId),
    'Exit request sent to the founder. Your mission stays assigned until it is approved.',
    () => { setConfirming(false); onChange(); },
  );
  const dialogRefCallback = (node) => setDialogNode(node);

  return <>
    <button type="button" className="rmj-member-exit" aria-label={pendingRequest ? 'Mission exit request pending' : 'Request to leave this mission'}
      title={pendingRequest ? 'Exit request pending founder approval' : 'Request to leave this mission'}
      disabled={action.busy || Boolean(pendingRequest)} onClick={() => setConfirming(true)}>
      <LogOut size={15} aria-hidden="true" />
    </button>
    {createPortal(<dialog ref={dialogRefCallback} className="roadmap-team-dialog roadmap-exit-dialog" aria-labelledby="rmj-exit-title" onCancel={(event) => event.preventDefault()}>
      <div className="roadmap-team-heading">
        <div><span className="roadmap-team-kicker">Mission exit request</span><h2 id="rmj-exit-title">Request to leave this mission?</h2></div>
        <button type="button" className="roadmap-team-close" aria-label="Close exit request confirmation" onClick={() => setConfirming(false)}><X size={18} aria-hidden="true" /></button>
      </div>
      <p className="roadmap-team-note">This sends a request to the founder for <strong>{assignment.missionName}</strong> in <strong>{assignment.projectName}</strong>. You remain assigned until the founder approves it.</p>
      <CollaborationFeedback action={action} />
      <div className="roadmap-team-toolbar">
        <button type="button" className="roadmap-team-button" disabled={action.busy} onClick={() => setConfirming(false)}>Cancel</button>
        <button type="button" className="roadmap-team-button roadmap-team-button--primary" disabled={action.busy} onClick={requestExit}>{action.busy ? 'Sending…' : 'Send exit request'}</button>
      </div>
    </dialog>, document.body)}
  </>;
}

function ReviewQueueDialog({ title, description, items, actionLabel, onClose, onOpenMission }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  const openMission = (item) => {
    dialogRef.current?.close();
    onOpenMission(item.mission);
  };

  return createPortal(<dialog ref={dialogRef} className="roadmap-review-dialog" aria-labelledby="roadmap-review-title"
    onCancel={(event) => event.preventDefault()}>
    <header className="roadmap-review-heading">
      <div><span className="roadmap-team-kicker">Roadmap workspace</span><h2 id="roadmap-review-title">{title}</h2><p>{description}</p></div>
      <button type="button" className="roadmap-team-close" aria-label="Close review queue" onClick={onClose}><X size={19} aria-hidden="true" /></button>
    </header>
    {items.length ? <ul className="roadmap-review-list">{items.map((item) => <li key={item.id}>
      <div className="roadmap-review-item-heading">
        <div><strong>{item.mission.name}</strong><small>{item.mission.stageName} · Level {item.mission.level}</small></div>
        <span className={`roadmap-review-status${['submitted', 'resubmitted', 'under_review'].includes(item.status) ? ' is-pending' : ''}`}><Clock3 size={13} aria-hidden="true" />{item.statusLabel}</span>
      </div>
      {item.submittedBy && <p><span>Submitted by</span><strong>{item.submittedBy}</strong></p>}
      {item.submittedAt && <p><span>Submitted</span><strong>{new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.submittedAt))}</strong></p>}
      {item.notes && <p className="roadmap-review-notes"><span>Submission details</span>{item.notes}</p>}
      {item.attachments?.length > 0 && <p className="roadmap-review-files"><span>Uploaded deliverables</span>{item.attachments.map((file) => <small key={file.id}><Paperclip size={13} aria-hidden="true" />{file.name}</small>)}</p>}
      <button type="button" className="roadmap-team-button roadmap-team-button--primary" onClick={() => openMission(item)}>{actionLabel}</button>
    </li>)}</ul> : <p className="roadmap-review-empty">{title === 'Review and Approve' ? 'There are no member submissions waiting for review.' : 'There are no mission approvals waiting for you.'}</p>}
  </dialog>, document.body);
}

function RoadmapBreadcrumb({ project, isOwner, ownerId, roadmap, onChange, onOpenReview, reviewCount, exitAction }) {
  return <>
    <div className="rmj-breadcrumb-context">
      <Link to={isOwner ? '/roadmap' : '/roadmap?view=joined'}><ArrowLeft size={14} />All roadmaps</Link>
      <span aria-hidden="true">/</span><span className="rmj-breadcrumb-project">{project.name}</span>
    </div>
    <div className="rmj-breadcrumb-actions">
      {isOwner && <RoadmapTeam project={project} roadmap={roadmap} onChange={onChange} ownerId={ownerId} />}
      <button type="button" className="rmj-review-button" onClick={onOpenReview}>
        {isOwner ? 'Review and Approve' : 'Pending Approval'} <span>{reviewCount}</span>
      </button>
      {!isOwner && exitAction}
    </div>
  </>;
}

function restrictRoadmapToMission(roadmap, missionId, completed = false, submitted = false) {
  const stageIndex = roadmap.stages.findIndex((stage) => stage.levels.some((level) => level.milestones.some((mission) => mission.id === missionId)));
  if (stageIndex < 0) throw new Error('The assigned mission is not part of this roadmap.');
  const targetStage = roadmap.stages[stageIndex];
  const levelIndex = targetStage.levels.findIndex((level) => level.milestones.some((mission) => mission.id === missionId));
  const targetLevel = targetStage.levels[levelIndex];
  const stages = roadmap.stages.map((stage, index) => ({
    ...stage,
    isCurrent: index === stageIndex,
    isUnlocked: index === stageIndex,
    levels: stage.levels.map((level) => ({
      ...level,
      milestones: level.milestones.map((mission) => mission.id === missionId
        ? { ...mission, state: completed ? 'completed' : submitted ? 'submitted' : 'active', isOptional: false }
        : { ...mission, state: 'locked', isOptional: false }),
    })),
  }));
  const assignedMission = stages[stageIndex].levels[levelIndex].milestones.find((mission) => mission.id === missionId);
  const completedCount = completed ? 1 : 0;
  return {
    ...roadmap,
    stages,
    currentStageIndex: stageIndex,
    currentLevel: targetLevel.number,
    currentMilestoneId: missionId,
    completedCount,
    skippedCount: 0,
    resolvedCount: completedCount,
    progressPercent: completed ? Math.round(100 / roadmap.totalCount) : 0,
    isComplete: false,
    assignedMission,
  };
}

function RoadmapSession({ project, ownerId }) {
  const { user } = useAuth();
  const [, refresh] = useReducer((value) => value + 1, 0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [levelSelection, setLevelSelection] = useState({ activeLevelId: null, selectedLevelId: null });
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    for (const event of ['storage', 'focus', 'labx:roadmap-change']) window.addEventListener(event, refresh);
    return () => { for (const event of ['storage', 'focus', 'labx:roadmap-change']) window.removeEventListener(event, refresh); };
  }, []);

  let access;
  let storedRoadmap;
  let loadError;
  try {
    access = collaborationStore.getAccess(project.id, ownerId, user.id);
    storedRoadmap = roadmapStore.read(project.id, ownerId, user.id);
  } catch (error) {
    loadError = error.message;
  }

  const isOwner = access?.role === 'owner';
  const requestedMissionId = searchParams.get('milestone');
  const memberMissionId = !isOwner && access?.assignedMissionIds.includes(requestedMissionId)
    ? requestedMissionId
    : !isOwner ? access?.assignedMissionIds.find((id) => !['completed', 'approved'].includes(storedRoadmap?.missionWorkflowsById?.[id]?.status))
      || access?.assignedMissionIds[0] : null;
  let roadmap = storedRoadmap;
  const memberWorkflowStatus = !isOwner ? storedRoadmap?.missionWorkflowsById?.[memberMissionId]?.status : null;
  if (roadmap && !isOwner && memberMissionId) {
    roadmap = restrictRoadmapToMission(
      roadmap,
      memberMissionId,
      memberWorkflowStatus === 'completed' || memberWorkflowStatus === 'approved'
        || roadmap.stages.some((stage) => stage.levels.some((level) => level.milestones.some((mission) => mission.id === memberMissionId && ['completed', 'credited'].includes(mission.state)))),
      ['submitted', 'resubmitted', 'under_review'].includes(memberWorkflowStatus),
    );
  }
  const allMissions = roadmap?.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones)) || [];
  const currentMission = allMissions.find((mission) => mission.id === roadmap.currentMilestoneId);
  const canOpen = (mission) => mission.state !== 'locked' && (isOwner || mission.id === memberMissionId);
  const selectedMission = allMissions.find((mission) => mission.id === searchParams.get('milestone') && canOpen(mission));
  const activeLevelId = currentMission ? `${currentMission.stageName.toLowerCase()}-level-${currentMission.level}` : null;
  const assigned = allMissions.filter((mission) => access?.assignedMissionIds.includes(mission.id));
  const workItems = Object.entries(roadmap?.missionWorkflowsById || {}).map(([missionId, work]) => ({
    ...work, mission: allMissions.find((mission) => mission.id === missionId),
  })).filter((work) => work.mission);
  const pendingWorkItems = workItems.filter((work) => ['submitted', 'resubmitted', 'under_review'].includes(work.status));
  const reviewCount = pendingWorkItems.length;
  const reviewItems = isOwner
    ? pendingWorkItems.map((work) => {
      const version = work.versions?.at(-1);
      return {
        id: work.mission.id,
        mission: work.mission,
        submittedBy: work.memberName || work.memberId,
        submittedAt: version?.submittedAt,
        status: work.status,
        statusLabel: MISSION_WORKFLOW_LABELS[work.status] || 'Submitted',
        notes: version?.payload?.notes,
        attachments: version?.payload?.attachments || [],
      };
    })
    : assigned.map((mission) => {
      const work = workItems.find((item) => item.mission.id === mission.id);
      const version = work?.versions?.at(-1);
      return {
        id: mission.id,
        mission,
        submittedBy: version ? work.memberName || 'You' : null,
        submittedAt: version?.submittedAt,
        status: work?.status || 'assigned',
        statusLabel: MISSION_WORKFLOW_LABELS[work?.status] || (mission.state === 'locked' ? 'Locked' : 'Yet to Complete'),
        notes: version?.payload?.notes,
        attachments: version?.payload?.attachments || [],
      };
    });
  const exitAssignment = !isOwner ? access?.missionAssignments.find((assignment) => assignment.missionId === memberMissionId) : null;
  const exitAction = exitAssignment ? <MissionExitAction assignment={{
    ...exitAssignment, missionName: allMissions.find((mission) => mission.id === exitAssignment.missionId)?.name,
    projectName: project.name,
  }} userId={user.id} onChange={refresh} /> : null;

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
  const journeyProject = isOwner ? project : {
    ...project,
    memberView: true,
    founderName: project.created_by || project.founderName || 'Founder',
  };
  return <div className="rm-page rm-reference rm-page-journey">
    <RoadmapJourney project={journeyProject} roadmap={roadmap} currentMission={currentMission} selectedLevelId={selectedLevelId}
      onSelectLevel={selectLevel} canOpen={canOpen} onOpenMission={openMission}
      lockedMessage={isOwner ? undefined : 'Only the mission assigned to you is available.'}
    headerBar={<RoadmapBreadcrumb project={project} isOwner={isOwner} ownerId={ownerId} roadmap={roadmap} onChange={refresh} onOpenReview={() => setReviewOpen(true)} reviewCount={reviewCount} exitAction={exitAction} />} />
    {reviewOpen && <ReviewQueueDialog
      title={isOwner ? 'Review and Approve' : 'Pending Approval'}
      description={isOwner ? 'Review member submissions and open the mission to view its deliverables.' : 'Your assigned missions and their current founder-review status.'}
      items={reviewItems}
      actionLabel={isOwner ? 'Review mission' : 'Open mission'}
      onClose={() => setReviewOpen(false)}
      onOpenMission={(mission) => { setReviewOpen(false); openMission(mission); }}
    />}
    {selectedMission && <MissionDialog key={`${user.id}:${selectedMission.id}:${roadmap.missionWorkflowsById?.[selectedMission.id]?.memberId || 'owner'}`}
      project={project} ownerId={ownerId} userId={user.id} mission={selectedMission} roadmap={roadmap} isOwner={isOwner}
      onClose={closeMission} onChange={refresh} />}
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const assignedMission = project.memberView ? getMockProjectMission(project) : null;
  const assignedMissionId = project.assignedMissionId || assignedMission?.id;
  const storedSubmission = snapshot.roadmap?.submissionsByMissionId?.[assignedMissionId];
  const submission = storedSubmission || project.assignmentSubmission;
  const roadmapWithSampleSubmission = snapshot.roadmap && project.memberView && !storedSubmission && submission
    ? {
      ...snapshot.roadmap,
      submissionsByMissionId: {
        ...snapshot.roadmap.submissionsByMissionId,
        [assignedMissionId]: submission,
      },
    }
    : snapshot.roadmap;
  const roadmap = roadmapWithSampleSubmission && project.memberView
    ? restrictRoadmapToMission(
      roadmapWithSampleSubmission,
      assignedMissionId,
      project.assignmentWorkStatus === 'completed'
        || submission?.status === 'completed' || Boolean(submission?.labxPointsAwarded),
      submission?.status === 'submitted',
    )
    : snapshot.roadmap;
  const error = snapshot.error;
  const missions = roadmap?.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones)) || [];
  const currentMission = missions.find((mission) => mission.id === roadmap?.currentMilestoneId);
  const activeLevelId = currentMission ? `${currentMission.stageName.toLowerCase()}-level-${currentMission.level}` : null;
  const selectedMission = missions.find((mission) => mission.id === missionId && mission.state !== 'locked'
    && (!project.memberView || mission.id === assignedMissionId));
  const assignedSubmission = assignedMission ? roadmap?.submissionsByMissionId?.[assignedMission.id] : null;
  const reviewItems = project.memberView
    ? assignedMission ? [{
      id: assignedMission.id,
      mission: assignedMission,
      submittedBy: assignedSubmission?.status === 'submitted' ? 'You' : null,
      submittedAt: assignedSubmission?.submittedAt,
      status: assignedSubmission?.status || project.assignmentWorkStatus || 'assigned',
      statusLabel: assignedSubmission?.status === 'submitted' ? 'Pending Approval'
        : project.assignmentWorkStatus === 'completed' ? 'Completed'
          : project.assignmentWorkStatus === 'in_progress' ? 'In Progress' : 'Yet to Complete',
      notes: assignedSubmission?.notes,
      attachments: assignedSubmission?.attachments || [],
    }] : []
    : Object.entries(roadmap?.submissionsByMissionId || {}).flatMap(([id, submission]) => {
      if (submission.status !== 'submitted') return [];
      const mission = missions.find((entry) => entry.id === id);
      return mission ? [{
        id,
        mission,
        submittedBy: submission.submittedBy || 'Member',
        submittedAt: submission.submittedAt,
        status: submission.status,
        statusLabel: 'Pending Approval',
        notes: submission.notes,
        attachments: submission.attachments || [],
      }] : [];
    });
  const reviewCount = project.memberView
    ? reviewItems.filter((item) => item.status === 'submitted').length
    : reviewItems.length;

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
    const updated = project.memberView
      ? roadmapProgressionMockStore.submitMission(project, userId, id, submission)
      : roadmapProgressionMockStore.completeMission(project, userId, id, submission);
    setSnapshot({ roadmap: updated, error: '' });
  };
  const exitAction = project.memberView ? <MissionExitAction assignment={{
    projectId: project.id,
    projectName: project.name,
    missionId: assignedMissionId,
    missionName: getMockProjectMission(project)?.name || 'assigned mission',
    visualDemo: true,
  }} userId={userId} onChange={() => {}} /> : null;
  const openReviewItem = (mission) => {
    setReviewOpen(false);
    openMission(mission);
  };
  const headerBar = <>
    <div className="rmj-breadcrumb-context">
      <Link to={project.visualCollection === 'joined' ? '/roadmap?view=joined' : '/roadmap'}><ArrowLeft size={14} />All roadmaps</Link>
      <span aria-hidden="true">/</span><span className="rmj-breadcrumb-project">{project.name}</span>
    </div>
    <div className="rmj-breadcrumb-actions">
      {project.memberView
        ? <>
          <button type="button" className="rmj-review-button" onClick={() => setReviewOpen(true)}>
            Pending Approval <span>{reviewCount}</span>
          </button>
          {exitAction}
        </>
        : <>
          <RoadmapTeam project={project} roadmap={roadmap} showForPrototype />
          <button type="button" className="rmj-review-button" onClick={() => setReviewOpen(true)}>
            Review and Approve <span>{reviewCount}</span>
          </button>
        </>}
    </div>
  </>;

  if (error || !roadmap) return <PageError message={error || 'The sample roadmap is unavailable.'} />;

  return <div className="rm-page rm-reference rm-page-journey">
    <RoadmapJourney project={project} roadmap={roadmap} currentMission={currentMission} selectedLevelId={selectedLevelId}
      onSelectLevel={selectLevel} canOpen={(mission) => mission.state !== 'locked' && (!project.memberView || mission.id === assignedMissionId)}
      onOpenMission={openMission} headerBar={headerBar}
      lockedMessage={project.memberView ? 'Only the mission assigned to you is available.' : undefined}
      showOperations={false} />
    {reviewOpen && <ReviewQueueDialog
      title={project.memberView ? 'Pending Approval' : 'Review and Approve'}
      description={project.memberView ? 'Your assigned mission and its current founder-review status.' : 'Review member submissions and open the mission to view its deliverables.'}
      items={reviewItems}
      actionLabel={project.memberView ? 'Open mission' : 'Review mission'}
      onClose={() => setReviewOpen(false)}
      onOpenMission={openReviewItem}
    />}
    {selectedMission && <MockMissionDialog key={`${project.id}:${selectedMission.id}`} project={project} userId={userId} roadmap={roadmap}
      mission={selectedMission}
      onClose={closeMission} onComplete={completeMission} />}
  </div>;
}
