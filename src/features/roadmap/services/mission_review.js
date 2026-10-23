// Browser-only collaboration workflow. Evidence is an immutable plain-data
// snapshot; files are metadata only and no external AI service is contacted.
export const MISSION_WORKFLOW_LABELS = {
  assigned: 'Assigned', in_progress: 'In Progress', submitted: 'Submitted to Founder',
  under_review: 'Under Founder Review', changes_requested: 'Changes Requested',
  revision_in_progress: 'Revision In Progress', resubmitted: 'Resubmitted to Founder',
  founder_approved: 'Founder Approved', awaiting_upload: 'Awaiting AI Upload',
  uploading: 'Uploading', queued: 'Queued for Evaluation', evaluating: 'Evaluating',
  completed: 'Evaluation Completed', failed: 'Evaluation Failed',
}
const text = (value) => typeof value === 'string' ? value.trim() : ''
const copy = (value) => JSON.parse(JSON.stringify(value))
const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const pendingReview = ['submitted', 'resubmitted', 'under_review']
const draftStates = ['assigned', 'in_progress', 'changes_requested', 'revision_in_progress']
const versionOf = (work) => work?.versions?.at(-1)

export function normalizeMissionWorkflows(source, missions, project) {
  if (!object(source)) return {}
  const normalized = {}
  for (const mission of missions) {
    const work = source[mission.id]
    if (!object(work) || work.missionId !== mission.id || mission.id === 'discover-l1-m1'
      || !text(work.memberId) || work.memberId === project.owner_id
      || !Object.hasOwn(MISSION_WORKFLOW_LABELS, work.status) || !Array.isArray(work.versions)
      || !Array.isArray(work.evaluationJobs)) continue
    const versions = work.versions.filter((entry, index) => object(entry) && entry.version === index + 1
      && entry.submittedBy === work.memberId && date(entry.submittedAt) && object(entry.payload)
      && object(entry.review) && ['pending', 'under_review', 'approved', 'changes_requested'].includes(entry.review.status))
    if (versions.length !== work.versions.length || work.latestVersion !== versions.length) continue
    const jobs = work.evaluationJobs.filter((job) => object(job) && text(job.id)
      && versions.some((entry) => entry.version === job.version && entry.review.status === 'approved')
      && ['uploading', 'queued', 'evaluating', 'completed', 'failed', 'superseded'].includes(job.status)
      && object(job.snapshot) && date(job.createdAt))
    normalized[mission.id] = copy({ ...work, versions, evaluationJobs: jobs,
      history: Array.isArray(work.history) ? work.history.filter((entry) => object(entry) && date(entry.at)) : [],
      previousAssignments: Array.isArray(work.previousAssignments) ? work.previousAssignments.filter((entry) => object(entry) && text(entry.memberId) && Array.isArray(entry.versions)) : [],
    })
  }
  return normalized
}

function assignedWork(assignment, granted) {
  return {
    missionId: assignment.missionId, assignmentId: assignment.id || `${assignment.missionId}:${assignment.memberId}`,
    memberId: assignment.memberId, memberName: assignment.memberName || granted.user?.full_name || assignment.memberId,
    instructions: assignment.instructions || '', status: 'assigned', latestVersion: 0,
    draft: { notes: '', url: '', file: null }, versions: [], evaluationJobs: [], history: [], previousAssignments: [],
  }
}

export function visibleMissionWorkflows(saved, granted) {
  const workflows = copy(saved || {})
  for (const assignment of granted.missionAssignments || []) {
    if (!workflows[assignment.missionId] || workflows[assignment.missionId].memberId !== assignment.memberId) {
      const previous = workflows[assignment.missionId]
      const next = assignedWork(assignment, granted)
      if (previous) {
        const { previousAssignments = [], ...archived } = previous
        next.previousAssignments = [...previousAssignments, archived]
      }
      workflows[assignment.missionId] = next
    } else {
      workflows[assignment.missionId].instructions = assignment.instructions || ''
    }
  }
  if (granted.role === 'owner') return workflows
  const assigned = new Set(granted.assignedMissionIds || [])
  return Object.fromEntries(Object.entries(workflows).filter(([id, work]) => assigned.has(id) && work.memberId === granted.user.id)
    .map(([id, work]) => [id, { ...work, previousAssignments: [] }]))
}

export function createMissionReviewActions(deps) {
  const { local, auth, access, canSubmit, now, onApproved, announce, roadmapWorkflowKey,
    catalogFor, normalizeRecord, createRoadmapSnapshot, visibleSnapshot, boundedPayload, evaluate } = deps
  const timestamp = () => new Date(now()).toISOString()
  function transact(projectId, ownerId, missionId, expectedUserId, role, mutate) {
    const granted = access(projectId, ownerId, expectedUserId)
    if (granted.role !== role) throw new Error(role === 'owner' ? 'Only the startup founder can review or upload member work.' : 'Only the assigned member can submit this work.')
    const key = roadmapWorkflowKey(ownerId, projectId)
    const before = local.readJSON(key)
    const catalog = catalogFor(granted.project)
    const record = normalizeRecord(granted.project, before, catalog)
    const snapshot = createRoadmapSnapshot(granted.project, record)
    const mission = snapshot.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones)).find((entry) => entry.id === missionId)
    if (missionId === 'discover-l1-m1') throw new Error('Only the project owner can submit the initial mission.')
    if (!mission) throw new Error('This member mission is unavailable.')
    if (role === 'member') canSubmit(granted, snapshot, missionId)
    // Retain owner-only archived assignments while mutating the active member's
    // work. The return snapshot redacts these before anything reaches a member.
    const visible = visibleMissionWorkflows(record.missionWorkflowsById, { ...granted, role: 'owner' })
    let work = visible[missionId]
    if (!work && role === 'member') work = assignedWork({ missionId, memberId: expectedUserId }, granted)
    if (!work) throw new Error('No member submission is available for this mission.')
    const assigned = granted.missionAssignments?.find((entry) => entry.missionId === missionId)
    if (granted.missionAssignments && (!assigned || assigned.memberId !== work.memberId)) throw new Error('This mission assignment changed. Reopen the mission.')
    const outcome = mutate({ work, record, mission, catalog, granted })
    record.missionWorkflowsById[missionId] = work
    const latest = access(projectId, ownerId, expectedUserId)
    if (latest.role !== role) throw new Error('Your roadmap permissions changed. Reopen the mission.')
    if (role === 'member') canSubmit(latest, snapshot, missionId)
    const latestAssignment = latest.missionAssignments?.find((entry) => entry.missionId === missionId)
    if (latest.missionAssignments && (!latestAssignment || latestAssignment.memberId !== work.memberId)) throw new Error('This mission assignment changed. Reopen the mission.')
    if (JSON.stringify(before) !== JSON.stringify(local.readJSON(key))) throw new Error('Mission work changed. Reopen the latest version before trying again.')
    if (local.writeJSONStrict) local.writeJSONStrict(key, record)
    else local.writeJSON(key, record)
    announce(ownerId, projectId)
    const finalAccess = access(projectId, ownerId, expectedUserId)
    if (outcome?.approved && typeof onApproved === 'function') {
      onApproved({ id: work.memberId, full_name: work.memberName, role: 'founder' }, finalAccess.project, createRoadmapSnapshot(finalAccess.project, record))
    }
    return visibleSnapshot(finalAccess.project, record, finalAccess)
  }
  const addHistory = (work, status, extra = {}) => {
    work.status = status
    work.history.push({ status, at: timestamp(), version: work.latestVersion, ...extra })
  }
  function currentVersion(work, version) {
    const latest = versionOf(work)
    if (!latest || latest.version !== version) throw new Error('This submission version is no longer current. Reopen the latest version.')
    return latest
  }
  function reviewedSnapshot(work, version, submissionId) {
    const latest = currentVersion(work, version)
    if (!text(submissionId) || latest.id !== submissionId) throw new Error('The reviewed submission changed. Reopen the exact latest submission before continuing.')
    return latest
  }
  function approvedVersion(work, version) {
    const latest = currentVersion(work, version)
    if (latest.review.status !== 'approved' || !['founder_approved', 'awaiting_upload', 'uploading', 'queued', 'evaluating', 'failed', 'completed'].includes(work.status)) {
      throw new Error('The latest submission must be Founder Approved before AI upload.')
    }
    return latest
  }
  function editable(work) {
    if (!draftStates.includes(work.status)) throw new Error('This submitted version is frozen. Wait for founder review, or start a new revision after approval.')
  }
  return {
    startMission(projectId, ownerId, missionId, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'member', ({ work }) => {
        editable(work)
        if (work.status === 'assigned') addHistory(work, 'in_progress')
        else if (work.status === 'changes_requested') addHistory(work, 'revision_in_progress')
      })
    },
    saveMissionDraft(projectId, ownerId, missionId, payload, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'member', ({ work }) => {
        editable(work)
        work.draft = boundedPayload(payload)
        if (work.status === 'assigned') addHistory(work, 'in_progress')
        if (work.status === 'changes_requested') addHistory(work, 'revision_in_progress')
      })
    },
    startRevision(projectId, ownerId, missionId, version, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'member', ({ work }) => {
        const latest = currentVersion(work, version)
        if (!['changes_requested', 'founder_approved', 'awaiting_upload', 'failed', 'completed'].includes(work.status)) throw new Error('Wait for the current review or evaluation before revising.')
        if (work.status === 'completed' && work.evaluationJobs.at(-1)?.result?.outcome !== 'needs_improvement') throw new Error('This mission is already complete.')
        work.draft = copy(latest.payload)
        work.evaluationJobs.filter((job) => job.version === version && job.status !== 'completed').forEach((job) => { job.status = 'superseded' })
        addHistory(work, 'revision_in_progress')
      })
    },
    submitToFounder(projectId, ownerId, missionId, payload, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'member', ({ work, catalog }) => {
        editable(work)
        const saved = boundedPayload(payload)
        const checked = evaluate(saved, false, catalog.stages.map((stage) => stage.name))
        if (!checked.approved) {
          const error = new Error('Check the required mission evidence before submitting to the founder.')
          error.fields = Object.fromEntries(checked.checks.filter((item) => !item.passed).map((item) => [item.id, item.message]))
          throw error
        }
        const version = work.latestVersion + 1
        if (work.status === 'changes_requested') addHistory(work, 'revision_in_progress')
        work.versions.push({
          id: `${work.assignmentId}:v${version}`, assignmentId: work.assignmentId,
          version, submittedBy: expectedUserId, submittedAt: timestamp(), payload: saved,
          review: { status: 'pending', founderId: ownerId, reviewedAt: null, feedback: '' },
        })
        work.latestVersion = version
        work.draft = null
        addHistory(work, version === 1 ? 'submitted' : 'resubmitted')
      })
    },
    beginReview(projectId, ownerId, missionId, { version, submissionId }, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'owner', ({ work }) => {
        const latest = reviewedSnapshot(work, version, submissionId)
        if (!pendingReview.includes(work.status)) throw new Error('This version is no longer awaiting founder review.')
        latest.review.status = 'under_review'
        if (work.status !== 'under_review') addHistory(work, 'under_review')
      })
    },
    reviewSubmission(projectId, ownerId, missionId, { version, submissionId, decision, feedback = '' }, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'owner', ({ work }) => {
        const latest = reviewedSnapshot(work, version, submissionId)
        if (!pendingReview.includes(work.status) || !['pending', 'under_review'].includes(latest.review.status)) throw new Error('This version already has a founder decision.')
        if (!['approved', 'changes_requested'].includes(decision)) throw new Error('Choose Approve Submission or Request Changes.')
        if (decision === 'changes_requested' && !text(feedback)) {
          const error = new Error('Explain what the member needs to change before requesting changes.')
          error.fields = { feedback: error.message }
          throw error
        }
        latest.review = { status: decision, founderId: expectedUserId, reviewedAt: timestamp(), feedback: text(feedback) }
        addHistory(work, decision === 'approved' ? 'founder_approved' : 'changes_requested')
        if (decision === 'approved') addHistory(work, 'awaiting_upload')
        else work.draft = copy(latest.payload)
      })
    },
    beginApprovedUpload(projectId, ownerId, missionId, { version, submissionId }, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'owner', ({ work }) => {
        const latest = approvedVersion(work, version)
        reviewedSnapshot(work, version, submissionId)
        if (!['awaiting_upload', 'founder_approved'].includes(work.status)) throw new Error('An upload already exists. Continue its evaluation or use Retry after a technical failure.')
        work.evaluationJobs.push({
          id: `${latest.id}:job${work.evaluationJobs.length + 1}`, version,
          founderId: expectedUserId, status: 'uploading', createdAt: timestamp(), updatedAt: timestamp(),
          snapshot: copy(latest.payload), attempts: 1, failurePhase: null, error: '', result: null, isSimulated: true,
        })
        addHistory(work, 'uploading')
      })
    },
    retryEvaluation(projectId, ownerId, missionId, { jobId }, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'owner', ({ work }) => {
        const job = work.evaluationJobs.find((item) => item.id === jobId)
        if (!job || job.status !== 'failed' || work.status !== 'failed') throw new Error('Only a failed upload or evaluation can be retried.')
        approvedVersion(work, job.version)
        if (JSON.stringify(job.snapshot) !== JSON.stringify(versionOf(work).payload)) throw new Error('Approved evidence changed. Request a new review.')
        job.status = job.failurePhase === 'upload' ? 'uploading' : 'queued'
        job.attempts += 1
        job.updatedAt = timestamp()
        job.error = ''
        addHistory(work, job.status)
      })
    },
    advanceEvaluation(projectId, ownerId, missionId, { jobId, action }, expectedUserId = auth?.getUser?.()?.id) {
      return transact(projectId, ownerId, missionId, expectedUserId, 'owner', ({ work, record, catalog, mission }) => {
        const job = work.evaluationJobs.find((item) => item.id === jobId)
        if (!job) throw new Error('This evaluation is unavailable.')
        const latest = approvedVersion(work, job.version)
        if (JSON.stringify(job.snapshot) !== JSON.stringify(latest.payload)) throw new Error('The uploaded snapshot differs from the approved evidence. Review it again.')
        if (job.status !== work.status) throw new Error('This evaluation job is stale. Reopen the mission.')
        const allowed = { uploading: ['queue', 'fail_upload'], queued: ['evaluate', 'fail_evaluation'], evaluating: ['complete_meets', 'complete_improve', 'fail_evaluation'] }
        if (!allowed[job.status]?.includes(action)) throw new Error('This evaluation action is no longer available.')
        job.updatedAt = timestamp()
        if (action.startsWith('fail_')) {
          job.failurePhase = action === 'fail_upload' ? 'upload' : 'evaluation'
          job.error = job.failurePhase === 'upload' ? 'Simulated upload failure. Approved evidence is preserved; retry the upload.' : 'Simulated technical evaluation failure. Approved evidence is preserved; retry evaluation.'
          job.status = 'failed'
        } else if (action === 'queue') job.status = 'queued'
        else if (action === 'evaluate') job.status = 'evaluating'
        else {
          const checked = evaluate(job.snapshot, false, catalog.stages.map((stage) => stage.name))
          const meets = action === 'complete_meets' && checked.approved
          job.status = 'completed'
          job.result = {
            outcome: meets ? 'meets_requirements' : 'needs_improvement',
            feedback: meets ? 'Simulated checks passed. Existing roadmap progression rules unlock the next mission.' : 'Preview outcome: explain how your evidence supports your conclusion, then revise and submit to the founder again.',
            criteria: checked.checks, strengths: checked.checks.filter((item) => item.passed).map((item) => item.label),
            gaps: meets ? [] : ['Add clearer findings and explain the next decision supported by the evidence.'],
            evaluatedAt: timestamp(), version: job.version, isSimulated: true,
          }
          if (meets) {
            if (mission.state !== 'active') throw new Error('Roadmap progress changed. This mission is no longer eligible for completion.')
            record.submissionsByMilestone[missionId] = {
              missionId, attempt: latest.version, status: 'approved', submittedAt: latest.submittedAt,
              approvedAt: job.result.evaluatedAt,
              submittedBy: work.memberId, payload: copy(job.snapshot), reviewVersion: latest.version, evaluationJobId: job.id,
            }
          }
          addHistory(work, 'completed', { outcome: job.result.outcome })
          return { approved: meets }
        }
        addHistory(work, job.status)
      })
    },
  }
}
