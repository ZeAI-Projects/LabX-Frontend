import assert from 'node:assert/strict'
import test from 'node:test'
import { createRoadmapStore, roadmapWorkflowKey, MAX_EVIDENCE_BYTES } from '../src/features/roadmap/services/roadmap_workflow.js'
import { createAchievementStore } from '../src/features/achievements/services/mock_achievements.js'

const owner = { id: 'review-owner', role: 'founder', full_name: 'Founder' }
const member = { id: 'review-member', role: 'founder', full_name: 'Member' }
const other = { id: 'other-member', role: 'founder', full_name: 'Other' }
const project = { id: 'review-project', owner_id: owner.id, name: 'Review startup', assessment_completed: true, assessment_result: { domain: 'Education' } }
const missionId = 'discover-l1-m2'
const payload = (extra = {}) => ({ notes: 'We interviewed founders, summarized recurring problems, and compared the research findings with available alternatives before deciding our next steps.', url: 'https://example.com/research', file: null, ...extra })

function fixture() {
  let user = owner
  let assigned = null
  let available = true
  let failWrite = false
  let hook = null
  let clock = Date.parse('2026-10-23T12:00:00Z')
  const records = new Map()
  const approvals = []
  const storage = {
    readJSON: (key) => records.has(key) ? structuredClone(records.get(key)) : null,
    writeJSON: (key, value) => records.set(key, structuredClone(value)),
    writeJSONStrict: (key, value) => { if (failWrite) throw new Error('Storage is full. Retry saving.'); records.set(key, structuredClone(value)) },
  }
  const auth = { getUser: () => user }
  const achievementStore = createAchievementStore({ storage })
  const getAccess = (projectId, ownerId, expectedId) => {
    hook?.()
    if (expectedId !== user.id) throw new Error('Account changed.')
    if (!available || projectId !== project.id || ownerId !== owner.id || ![owner.id, assigned?.memberId].includes(user.id)) throw new Error('Project unavailable.')
    return { role: user.id === owner.id ? 'owner' : 'member', user, project,
      assignedMissionIds: user.id === owner.id || !assigned ? [] : [missionId], missionAssignments: assigned ? [assigned] : [] }
  }
  const options = { storage, auth, getAccess, now: () => clock, onApproved: (...args) => { approvals.push(args); achievementStore.recordRoadmap(...args) } }
  const store = createRoadmapStore(options)
  store.submitMission(project.id, owner.id, 'discover-l1-m1', payload(), owner.id)
  approvals.length = 0
  assigned = { id: 'assignment-1', missionId, memberId: member.id, memberName: member.full_name, instructions: 'Include interview findings.' }
  const read = () => store.read(project.id, owner.id, user.id)
  const call = (method, ...args) => {
    if (['beginReview', 'reviewSubmission', 'beginApprovedUpload'].includes(method)) {
      const options = typeof args[0] === 'number' ? { version: args[0] } : args[0]
      args[0] = { submissionId: `${assigned?.id}:v${options.version}`, ...options }
    }
    return store[method](project.id, owner.id, missionId, ...args, user.id)
  }
  return { store, storage, approvals, read, call, achievementStore,
    setClock: (value) => { clock = Date.parse(value) },
    work: () => read().missionWorkflowsById[missionId],
    signIn: (next) => { user = next },
    assign: (next) => { assigned = next },
    fail: (value) => { failWrite = value },
    hook: (callback) => { hook = callback },
    unavailable: () => { available = false },
    reload: () => createRoadmapStore(options).read(project.id, owner.id, user.id),
  }
}
function submit(app, evidence = payload()) { app.signIn(member); app.call('startMission'); return app.call('submitToFounder', evidence) }
function approve(app, version = app.work().latestVersion) { app.signIn(owner); return app.call('reviewSubmission', { version, decision: 'approved' }) }
function upload(app) { app.call('beginApprovedUpload', { version: app.work().latestVersion }); return app.work().evaluationJobs.at(-1).id }
function advance(app, jobId, action) { return app.call('advanceEvaluation', { jobId, action }) }

test('assignment -> member work -> immutable submission does not complete or evaluate automatically', () => {
  const app = fixture()
  assert.equal(app.work().status, 'assigned')
  assert.equal(app.work().instructions, 'Include interview findings.')
  app.signIn(member)
  app.call('startMission')
  assert.equal(app.work().status, 'in_progress')
  app.call('saveMissionDraft', payload({ notes: 'A draft may be incomplete.' }))
  assert.equal(app.reload().missionWorkflowsById[missionId].draft.notes, 'A draft may be incomplete.')
  const evidence = payload({ file: { name: 'research.pdf', size: 200, type: 'application/pdf', secretBytes: 'PRIVATE_BYTES' } })
  app.call('submitMission', evidence)
  evidence.notes = 'Changed outside store'
  assert.equal(app.work().status, 'submitted')
  assert.equal(app.work().latestVersion, 1)
  assert.equal(app.work().versions[0].review.status, 'pending')
  assert.equal(app.work().evaluationJobs.length, 0)
  assert.equal(app.read().completedCount, 1)
  assert.equal(app.approvals.length, 0)
  assert.notEqual(app.work().versions[0].payload.notes, evidence.notes)
  assert.equal(JSON.stringify(app.work()).includes('PRIVATE_BYTES'), false)
  assert.throws(() => app.call('submitToFounder', payload()), /frozen/)
  assert.throws(() => app.call('saveMissionDraft', payload()), /frozen/)
  assert.throws(() => { app.work().versions[0].payload.notes = 'mutate' }, TypeError)
  app.signIn(owner)
  assert.throws(() => app.call('submitMission', payload()), /assigned to a member/)
})

test('member evidence validation reuses existing limits and retains draft on recoverable failures', () => {
  const app = fixture()
  app.signIn(member)
  app.call('startMission')
  app.call('saveMissionDraft', payload())
  for (const invalid of [payload({ notes: 'short' }), payload({ url: '' }), payload({ url: 'javascript:alert(1)' }), payload({ file: { name: 'large.pdf', size: MAX_EVIDENCE_BYTES + 1, type: 'application/pdf' } })]) {
    assert.throws(() => app.call('submitToFounder', invalid), /required mission evidence/)
    assert.equal(app.work().versions.length, 0)
    assert.deepEqual(app.work().draft, payload())
  }
  app.fail(true)
  assert.throws(() => app.call('submitToFounder', payload()), /Storage is full/)
  assert.equal(app.work().status, 'in_progress')
  assert.deepEqual(app.work().draft, payload())
  app.fail(false)
  app.call('submitToFounder', payload({ url: '', file: { name: 'exact.pdf', size: MAX_EVIDENCE_BYTES, type: 'application/pdf' } }))
  assert.equal(app.work().status, 'submitted')
})

test('founder review supports multiple changes-requested cycles with immutable version feedback history', () => {
  const app = fixture()
  submit(app)
  for (let version = 1; version <= 3; version++) {
    app.signIn(owner)
    app.call('beginReview', version)
    assert.equal(app.work().status, 'under_review')
    assert.throws(() => app.call('reviewSubmission', { version, decision: 'changes_requested', feedback: ' ' }), /Explain what/)
    app.call('reviewSubmission', { version, decision: 'changes_requested', feedback: `Please add findings for review ${version}.` })
    assert.equal(app.work().status, 'changes_requested')
    assert.throws(() => upload(app), /Founder Approved/)
    assert.throws(() => app.call('reviewSubmission', { version, decision: 'approved' }), /already has/)
    app.signIn(member)
    app.call('startRevision', version)
    assert.equal(app.work().status, 'revision_in_progress')
    app.call('submitToFounder', payload({ notes: `${payload().notes} Revision ${version + 1}.` }))
    assert.equal(app.work().status, 'resubmitted')
    assert.equal(app.work().versions.length, version + 1)
  }
  approve(app, 4)
  assert.equal(app.work().status, 'awaiting_upload')
  assert.equal(app.work().versions[3].review.status, 'approved')
  assert.deepEqual(app.work().versions.slice(0, 3).map((entry) => entry.review.feedback), [1, 2, 3].map((value) => `Please add findings for review ${value}.`))
  assert.equal(app.read().completedCount, 1)
  assert.equal(app.work().evaluationJobs.length, 0)
})

test('explicit approved upload, each evaluation state, technical retries, and completion retain exact approved snapshot', () => {
  const app = fixture()
  submit(app)
  app.signIn(owner)
  assert.throws(() => upload(app), /Founder Approved/)
  approve(app)
  assert.equal(app.read().completedCount, 1)
  const jobId = upload(app)
  assert.equal(app.work().status, 'uploading')
  assert.throws(() => upload(app), /already exists/)
  assert.deepEqual(app.work().evaluationJobs[0].snapshot, app.work().versions[0].payload)
  advance(app, jobId, 'fail_upload')
  assert.equal(app.work().status, 'failed')
  assert.equal(app.work().versions[0].review.status, 'approved')
  app.call('retryEvaluation', { jobId })
  assert.equal(app.work().status, 'uploading')
  advance(app, jobId, 'queue')
  assert.equal(app.work().status, 'queued')
  advance(app, jobId, 'evaluate')
  assert.equal(app.work().status, 'evaluating')
  advance(app, jobId, 'fail_evaluation')
  app.call('retryEvaluation', { jobId })
  assert.equal(app.work().status, 'queued')
  assert.equal(app.work().evaluationJobs[0].attempts, 3)
  advance(app, jobId, 'evaluate')
  advance(app, jobId, 'complete_meets')
  assert.equal(app.work().status, 'completed')
  assert.equal(app.work().evaluationJobs[0].result.outcome, 'meets_requirements')
  assert.equal(app.work().evaluationJobs[0].result.version, 1)
  assert.equal(app.read().completedCount, 2)
  assert.equal(app.read().currentMilestoneId, 'discover-l1-m3')
  assert.equal(app.approvals.length, 1)
  assert.equal(app.approvals[0][0].id, member.id)
  assert.throws(() => advance(app, jobId, 'complete_meets'), /no longer available/)
  assert.equal(app.approvals.length, 1)
})

test('needs improvement is content revision, requiring new founder approval and fresh upload', () => {
  const app = fixture()
  submit(app); approve(app)
  const oldJob = upload(app)
  advance(app, oldJob, 'queue'); advance(app, oldJob, 'evaluate'); advance(app, oldJob, 'complete_improve')
  assert.equal(app.work().status, 'completed')
  assert.equal(app.work().evaluationJobs[0].result.outcome, 'needs_improvement')
  assert.equal(app.read().completedCount, 1)
  assert.throws(() => app.call('retryEvaluation', { jobId: oldJob }), /Only a failed/)
  app.signIn(member)
  app.call('startRevision', 1)
  app.call('submitToFounder', payload({ notes: `${payload().notes} Clearer findings added.` }))
  app.signIn(owner)
  assert.throws(() => advance(app, oldJob, 'complete_meets'), /no longer current/)
  assert.throws(() => app.call('beginApprovedUpload', { version: 2 }), /Founder Approved/)
  assert.throws(() => app.call('reviewSubmission', { version: 1, decision: 'approved' }), /no longer current/)
  approve(app, 2)
  const nextJob = upload(app)
  assert.notEqual(nextJob, oldJob)
  advance(app, nextJob, 'queue'); advance(app, nextJob, 'evaluate'); advance(app, nextJob, 'complete_meets')
  assert.equal(app.work().evaluationJobs.length, 2)
  assert.equal(app.read().completedCount, 2)
  assert.equal(app.read().submissionsByMilestone[missionId].attempt, 2)
})

test('revising an approved version invalidates its upload permission and prevents stale jobs', () => {
  const app = fixture()
  submit(app); approve(app)
  const jobId = upload(app)
  advance(app, jobId, 'fail_upload')
  app.signIn(member)
  app.call('startRevision', 1)
  app.signIn(owner)
  assert.throws(() => app.call('beginApprovedUpload', { version: 1 }), /Founder Approved/)
  assert.throws(() => app.call('retryEvaluation', { jobId }), /Only a failed/)
  app.signIn(member)
  app.call('submitToFounder', payload())
  app.signIn(owner)
  assert.equal(app.work().versions[0].review.status, 'approved')
  assert.equal(app.work().versions[1].review.status, 'pending')
  assert.throws(() => advance(app, jobId, 'queue'), /no longer current/)
})

test('member cannot approve/upload/evaluate and project, account, and assignment changes fail closed', () => {
  const app = fixture()
  submit(app)
  for (const [method, arg] of [['reviewSubmission', { version: 1, decision: 'approved' }], ['beginApprovedUpload', { version: 1 }], ['advanceEvaluation', { jobId: 'fake', action: 'complete_meets' }]]) {
    assert.throws(() => app.call(method, arg), /Only the startup founder/)
  }
  app.signIn(other)
  assert.throws(() => app.read(), /unavailable/)
  app.signIn(member)
  assert.throws(() => app.store.read('different-project', owner.id, member.id), /unavailable/)
  assert.throws(() => app.store.read(project.id, owner.id, owner.id), /account changed/)
  app.assign(null)
  assert.throws(() => app.read(), /unavailable/)
  app.signIn(owner)
  assert.throws(() => app.call('reviewSubmission', { version: 1, decision: 'approved' }), /assignment changed/)
})

test('account and assignment are rechecked at writes and stale storage cannot overwrite newer work', () => {
  const app = fixture()
  submit(app)
  app.signIn(owner)
  const before = app.storage.readJSON(roadmapWorkflowKey(owner.id, project.id))
  let calls = 0
  app.hook(() => { if (++calls === 2) app.signIn(member) })
  assert.throws(() => app.call('reviewSubmission', { version: 1, decision: 'approved' }), /Account changed|account changed/)
  app.hook(null); app.signIn(owner)
  assert.deepEqual(app.storage.readJSON(roadmapWorkflowKey(owner.id, project.id)), before)
  calls = 0
  app.hook(() => { if (++calls === 2) app.storage.writeJSON(roadmapWorkflowKey(owner.id, project.id), { ...before, concurrentMarker: true }) })
  assert.throws(() => app.call('reviewSubmission', { version: 1, decision: 'approved' }), /Mission work changed/)
})

test('reassigning retains private evidence for the founder without sharing it with the new member or reviving stale jobs', () => {
  const app = fixture()
  submit(app, payload({ notes: `${payload().notes} PRIVATE_ORIGINAL_MEMBER_EVIDENCE` }))
  approve(app)
  const oldJob = upload(app)
  advance(app, oldJob, 'fail_upload')
  app.assign({ id: 'assignment-2', missionId, memberId: other.id, memberName: other.full_name, instructions: 'Prepare your own evidence.' })
  assert.equal(app.work().status, 'assigned')
  assert.equal(app.work().previousAssignments.length, 1)
  assert.equal(app.work().previousAssignments[0].memberId, member.id)
  assert.throws(() => advance(app, oldJob, 'queue'), /unavailable/)
  app.signIn(member)
  assert.throws(() => app.read(), /unavailable/)
  app.signIn(other)
  assert.equal(JSON.stringify(app.read()).includes('PRIVATE_ORIGINAL_MEMBER_EVIDENCE'), false)
  assert.deepEqual(app.work().previousAssignments, [])
  app.call('startMission')
  app.call('submitToFounder', payload({ notes: `${payload().notes} New member evidence.` }))
  app.signIn(owner)
  assert.equal(app.work().versions[0].submittedBy, other.id)
  assert.equal(app.work().previousAssignments.length, 1)
  assert.ok(app.work().previousAssignments[0].versions[0].payload.notes.includes('PRIVATE_ORIGINAL_MEMBER_EVIDENCE'))
  assert.throws(() => advance(app, oldJob, 'queue'), /unavailable/)
  assert.throws(() => app.call('reviewSubmission', { version: 1, submissionId: 'assignment-1:v1', decision: 'approved' }), /reviewed submission changed/)
  app.call('reviewSubmission', { version: 1, decision: 'approved' })
  const newJob = upload(app)
  assert.notEqual(newJob, oldJob)
  app.signIn(other)
  assert.equal(JSON.stringify(app.reload()).includes('PRIVATE_ORIGINAL_MEMBER_EVIDENCE'), false)
})

test('failed founder decision, upload, and evaluation writes preserve prior statuses and remain retryable', () => {
  const app = fixture()
  submit(app)
  app.signIn(owner)
  app.fail(true)
  assert.throws(() => approve(app), /Storage is full/)
  assert.equal(app.work().status, 'submitted')
  assert.equal(app.work().versions[0].review.status, 'pending')
  app.fail(false); approve(app)
  app.fail(true)
  assert.throws(() => upload(app), /Storage is full/)
  assert.equal(app.work().status, 'awaiting_upload')
  assert.equal(app.work().versions[0].review.status, 'approved')
  assert.equal(app.work().evaluationJobs.length, 0)
  app.fail(false)
  const jobId = upload(app)
  advance(app, jobId, 'queue'); advance(app, jobId, 'evaluate')
  app.fail(true)
  assert.throws(() => advance(app, jobId, 'complete_meets'), /Storage is full/)
  assert.equal(app.work().status, 'evaluating')
  assert.equal(app.work().evaluationJobs[0].result, null)
  assert.equal(app.read().completedCount, 1)
  assert.equal(app.approvals.length, 0)
  app.fail(false)
  advance(app, jobId, 'complete_meets')
  assert.equal(app.read().completedCount, 2)
  assert.equal(app.approvals.length, 1)
})

test('delayed evaluation counts on its completion day across midnight IST while preserving the original submission date', () => {
  const app = fixture()
  const submittedAt = '2026-10-23T18:29:00.000Z'
  const completedAt = '2026-10-23T18:31:00.000Z'
  app.setClock(submittedAt)
  submit(app)
  assert.equal(app.achievementStore.read(member).length, 0)
  approve(app)
  const jobId = upload(app)
  advance(app, jobId, 'queue'); advance(app, jobId, 'evaluate')
  app.setClock(completedAt)
  advance(app, jobId, 'complete_meets')
  app.signIn(member)
  const snapshot = app.reload()
  assert.equal(snapshot.submissionsByMilestone[missionId].submittedAt, submittedAt)
  assert.equal(snapshot.submissionsByMilestone[missionId].approvedAt, completedAt)
  assert.equal(snapshot.submissionsByMilestone[missionId].reviewVersion, 1)
  assert.equal(snapshot.submissionsByMilestone[missionId].evaluationJobId, jobId)
  const recognitionActivity = app.achievementStore.read(member)
  assert.equal(recognitionActivity.length, 1)
  assert.equal(recognitionActivity[0].date, completedAt)
  assert.notEqual(recognitionActivity[0].date, submittedAt, 'Recognition belongs to the evaluation completion date')
})
