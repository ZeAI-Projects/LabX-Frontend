import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRoadmapSnapshot, createRoadmapStore, MAX_EVIDENCE_BYTES, roadmapWorkflowKey,
} from '../src/features/roadmap/services/roadmap_workflow.js'
import { getAchievementsSnapshot } from '../src/features/achievements/services/mock_achievements.js'
import { getLeaderboardSnapshot } from '../src/features/leaderboard/services/mock_leaderboard.js'

const owner = { id: 'owner', role: 'founder' }
const member = { id: 'member', role: 'founder' }
const foreign = { id: 'other-founder', role: 'founder' }
const project = {
  id: 'project', owner_id: owner.id, name: 'Research project', assessment_completed: true,
  assessment_result: { domain: 'Smart Education', stage: 'Launch', level: 5 },
}
const firstId = 'discover-l1-m1'
const goodNotes = 'We interviewed the intended users, documented their needs, and compared our findings with existing alternatives.'
const valid = (overrides = {}) => ({ notes: goodNotes, url: 'https://example.com/evidence', file: null, ...overrides })
const missions = (snapshot) => snapshot.stages.flatMap((stage) => stage.levels.flatMap((level) => level.milestones))

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

function fixture({ storage = memoryStorage() } = {}) {
  let user = owner
  let projects = [structuredClone(project)]
  let assignedMissionIds = []
  let accessHook = null
  const auth = { getUser: () => user }
  function getAccess(projectId, ownerId, expectedUserId) {
    accessHook?.()
    if (user?.id !== expectedUserId) throw new Error('Account changed.')
    const selected = projects.find((item) => item.id === projectId && item.owner_id === ownerId)
    if (!selected || ![owner.id, member.id].includes(user.id)) throw new Error('Project unavailable.')
    return { project: selected, user, role: user.id === ownerId ? 'owner' : 'member', assignedMissionIds }
  }
  const options = { storage, auth, getAccess, now: () => Date.parse('2026-10-20T10:00:00Z') }
  const store = createRoadmapStore(options)
  return {
    store, storage,
    read: (projectId = project.id, ownerId = owner.id, expectedUserId = user?.id) => store.read(projectId, ownerId, expectedUserId),
    submit: (missionId, payload = valid(), expectedUserId = user?.id) => store.submitMission(project.id, owner.id, missionId, payload, expectedUserId),
    reload: () => createRoadmapStore(options),
    signIn: (next) => { user = next },
    assign: (ids) => { assignedMissionIds = ids },
    setProjects: (next) => { projects = next },
    onAccess: (hook) => { accessHook = hook },
  }
}

function placement(stageIndex, level, overrides = {}) {
  const count = stageIndex * 5 + level - 1
  return {
    stageIndex,
    level,
    evidence: Array.from({ length: count }, (_, index) => ({
      stageIndex: Math.floor(index / 5), level: index % 5 + 1, notes: goodNotes, url: `https://example.com/level-${index + 1}`,
    })),
    ...overrides,
  }
}

test('fresh roadmap has 75 unique missions and starts at Discover 1 regardless of legacy placement', () => {
  const snapshot = createRoadmapSnapshot(project)
  assert.equal(snapshot.stages.length, 5)
  assert.ok(snapshot.stages.every((stage) => stage.levels.length === 5 && stage.levels.every((level) => level.milestones.length === 3)))
  assert.equal(new Set(missions(snapshot).map(({ id }) => id)).size, 75)
  assert.equal(snapshot.currentStageIndex, 0)
  assert.equal(snapshot.currentLevel, 1)
  assert.equal(snapshot.currentMilestoneId, firstId)
  assert.equal(snapshot.completedCount, 0)
  assert.equal(snapshot.creditedCount, 0)
  assert.equal(snapshot.progressPercent, 0)
  assert.equal(snapshot.isComplete, false)
  assert.equal(missions(snapshot).filter(({ state }) => state === 'active').length, 1)
  assert.equal(missions(snapshot).filter(({ state }) => state === 'locked').length, 74)
  assert.equal(missions(snapshot)[0].requirements.maxFileBytes, MAX_EVIDENCE_BYTES)
  assert.equal(missions(snapshot)[0].name, 'Problem statement')
})

test('sequential approvals advance all 75 missions across level and stage boundaries without awarding points', () => {
  const app = fixture()
  const ids = missions(app.read()).map(({ id }) => id)
  for (let index = 0; index < ids.length; index += 1) {
    const snapshot = app.submit(ids[index])
    assert.equal(snapshot.completedCount, index + 1)
    assert.equal(snapshot.creditedCount, 0)
    assert.equal(snapshot.currentMilestoneId, ids[index + 1] ?? null)
    assert.equal(missions(snapshot).filter(({ state }) => state === 'completed').length, index + 1)
    if (index < 74) {
      assert.equal(snapshot.currentStageIndex, Math.floor((index + 1) / 15))
      assert.equal(snapshot.currentLevel, Math.floor(((index + 1) % 15) / 3) + 1)
    }
  }
  const complete = app.read()
  assert.equal(complete.progressPercent, 100)
  assert.equal(complete.isComplete, true)
  assert.equal(complete.currentMilestoneId, null)
  assert.ok(complete.stages.every((stage) => stage.isUnlocked && !stage.isCurrent))
  assert.equal(Object.hasOwn(complete, 'points'), false)
  assert.equal(Object.hasOwn(complete, 'rewards'), false)
  assert.throws(() => app.submit(ids[74]), /already approved/)
  assert.equal(app.read().completedCount, 75)
})

test('locked, unknown and already approved mission submissions never advance progress', () => {
  const app = fixture()
  assert.throws(() => app.submit('discover-l1-m2'), /active mission/)
  assert.throws(() => app.submit('unknown'), /unavailable/)
  app.submit(firstId)
  assert.throws(() => app.submit(firstId), /already approved/)
  assert.throws(() => app.submit('grow-l5-m3'), /active mission/)
  assert.equal(app.read().completedCount, 1)
  assert.equal(app.read().currentMilestoneId, 'discover-l1-m2')
})

test('failed evidence remains active with deterministic feedback, survives refresh and supports resubmission', () => {
  const app = fixture()
  const rejected = app.submit(firstId, valid({ notes: 'Too short.' }))
  assert.equal(rejected.completedCount, 0)
  assert.equal(rejected.currentMilestoneId, firstId)
  assert.equal(rejected.submissionsByMilestone[firstId].status, 'rejected')
  assert.equal(rejected.submissionsByMilestone[firstId].attempt, 1)
  assert.ok(rejected.submissionsByMilestone[firstId].checks.some(({ id, passed }) => id === 'notes' && !passed))
  assert.match(rejected.submissionsByMilestone[firstId].feedback, /Revise and resubmit/)
  assert.deepEqual(app.reload().read(project.id, owner.id, owner.id), rejected)
  const repeat = app.submit(firstId, valid({ notes: 'Too short.' }))
  assert.deepEqual(repeat.submissionsByMilestone[firstId].checks, rejected.submissionsByMilestone[firstId].checks)
  assert.equal(repeat.submissionsByMilestone[firstId].feedback, rejected.submissionsByMilestone[firstId].feedback)
  const accepted = app.submit(firstId)
  assert.equal(accepted.submissionsByMilestone[firstId].attempt, 3)
  assert.equal(accepted.submissionsByMilestone[firstId].status, 'approved')
  assert.equal(accepted.submissionsByMilestone[firstId].isSimulated, true)
  assert.match(accepted.submissionsByMilestone[firstId].feedback, /No person or AI/)
  assert.equal(accepted.completedCount, 1)
  assert.equal(accepted.currentMilestoneId, 'discover-l1-m2')
})

test('artifact validation accepts the inclusive 5 MB limit and never ignores invalid supplied evidence', () => {
  const acceptedInputs = [
    valid(),
    valid({ notes: 'a'.repeat(80), url: 'http://example.com/plain-http' }),
    valid({ url: '', file: { name: 'evidence.pdf', size: MAX_EVIDENCE_BYTES, type: 'application/pdf' } }),
    valid({ url: '', file: { name: 'evidence.txt', size: 1, type: '' } }),
  ]
  for (const payload of acceptedInputs) assert.equal(fixture().submit(firstId, payload).completedCount, 1)
  const rejectedInputs = [
    valid({ notes: 'a'.repeat(79) }),
    valid({ notes: ' '.repeat(100) }),
    valid({ url: '' }),
    valid({ url: 'javascript:alert(1)', file: { name: 'valid.pdf', size: 10, type: 'application/pdf' } }),
    valid({ url: 'not-a-url', file: { name: 'valid.pdf', size: 10, type: 'application/pdf' } }),
    valid({ url: 'https://name:secret@example.com/' }),
    valid({ url: ' ' , file: { name: 'valid.pdf', size: 10, type: 'application/pdf' } }),
    valid({ file: { name: 'too-large.pdf', size: MAX_EVIDENCE_BYTES + 1, type: 'application/pdf' } }),
    valid({ file: { name: 'empty.pdf', size: 0, type: 'application/pdf' } }),
    valid({ file: { name: '', size: 1, type: 'text/plain' } }),
    valid({ file: { name: 'negative.pdf', size: -1, type: 'application/pdf' } }),
    valid({ file: { name: 'fraction.pdf', size: 1.5, type: 'application/pdf' } }),
    valid({ file: { name: 'invalid.pdf', size: Infinity, type: 'application/pdf' } }),
  ]
  for (const payload of rejectedInputs) {
    const app = fixture()
    const snapshot = app.submit(firstId, payload)
    assert.equal(snapshot.completedCount, 0)
    assert.equal(snapshot.submissionsByMilestone[firstId].status, 'rejected')
    assert.equal(app.reload().read(project.id, owner.id, owner.id).submissionsByMilestone[firstId].status, 'rejected')
  }
})

test('advanced initial placement credits only prior missions and requires every prior level of evidence', () => {
  const app = fixture()
  const request = placement(1, 2)
  const rejected = app.submit(firstId, valid({ placement: { ...request, evidence: request.evidence.slice(1) } }))
  assert.equal(rejected.submissionsByMilestone[firstId].status, 'rejected')
  assert.equal(rejected.completedCount, 0)
  assert.equal(rejected.creditedCount, 0)
  const accepted = app.submit(firstId, valid({ placement: request }))
  assert.equal(accepted.currentMilestoneId, 'validate-l2-m1')
  assert.equal(accepted.currentStageIndex, 1)
  assert.equal(accepted.currentLevel, 2)
  assert.equal(accepted.completedCount, 1)
  assert.equal(accepted.creditedCount, 17)
  assert.equal(accepted.progressPercent, 24)
  assert.equal(accepted.placement.stageName, 'Validate')
  assert.equal(accepted.placement.evidence.length, 6)
  assert.equal(missions(accepted)[0].state, 'completed')
  assert.equal(missions(accepted).filter(({ state }) => state === 'credited').length, 17)
  assert.equal(missions(accepted).filter(({ state }) => state === 'completed').length, 1)
  assert.equal(Object.keys(accepted.submissionsByMilestone).length, 1)
  assert.deepEqual(app.reload().read(project.id, owner.id, owner.id), accepted)
  assert.throws(() => app.submit('discover-l1-m2'), /active mission/)
  const next = app.submit('validate-l2-m1')
  assert.equal(next.completedCount, 2)
  assert.equal(next.creditedCount, 17)
  assert.equal(next.currentMilestoneId, 'validate-l2-m2')
})

test('placement rejects incomplete, duplicate, malformed or unsafe level evidence and is initial-only', () => {
  const requests = [
    placement(5, 1), placement(0, 0), placement(0, 6),
    placement(0, 2, { evidence: [] }),
    placement(0, 3, { evidence: [placement(0, 2).evidence[0], placement(0, 2).evidence[0]] }),
    placement(0, 2, { evidence: [{ stageIndex: 0, level: 1, notes: 'short', url: 'https://example.com' }] }),
    placement(0, 2, { evidence: [{ stageIndex: 0, level: 1, notes: goodNotes, url: 'data:text/plain,test' }] }),
    placement(0, 2, { evidence: [{ stageIndex: 0, level: 2, notes: goodNotes, url: 'https://example.com' }] }),
  ]
  for (const request of requests) {
    const snapshot = fixture().submit(firstId, valid({ placement: request }))
    assert.equal(snapshot.submissionsByMilestone[firstId].status, 'rejected')
    assert.equal(snapshot.completedCount, 0)
    assert.equal(snapshot.placement, null)
  }
  const app = fixture()
  app.submit(firstId)
  const rejected = app.submit('discover-l1-m2', valid({ placement: placement(1, 1) }))
  assert.equal(rejected.submissionsByMilestone['discover-l1-m2'].status, 'rejected')
  assert.equal(rejected.completedCount, 1)
})

test('placement at the final level still requires its three missions to finish the roadmap', () => {
  const app = fixture()
  const start = app.submit(firstId, valid({ placement: placement(4, 5) }))
  assert.equal(start.completedCount, 1)
  assert.equal(start.creditedCount, 71)
  assert.equal(start.progressPercent, 96)
  assert.equal(start.isComplete, false)
  for (const id of ['grow-l5-m1', 'grow-l5-m2', 'grow-l5-m3']) app.submit(id)
  const done = app.read()
  assert.equal(done.completedCount, 4)
  assert.equal(done.creditedCount, 71)
  assert.equal(done.progressPercent, 100)
  assert.equal(done.isComplete, true)
  const defaultPlacement = fixture().submit(firstId, valid({ placement: placement(0, 1) }))
  assert.equal(defaultPlacement.creditedCount, 0)
  assert.equal(defaultPlacement.currentMilestoneId, 'discover-l1-m2')
})

test('members can submit only assigned active missions and cannot submit the owner-only initial mission', () => {
  const app = fixture()
  app.signIn(member)
  app.assign([firstId, 'discover-l1-m2', 'discover-l1-m3'])
  assert.throws(() => app.submit(firstId), /Only the project owner/)
  assert.throws(() => app.submit('discover-l1-m2'), /active mission/)
  app.signIn(owner)
  app.submit(firstId)
  app.signIn(member)
  app.assign(['discover-l1-m3'])
  assert.throws(() => app.submit('discover-l1-m2'), /not assigned/)
  app.assign(['discover-l1-m2'])
  const result = app.submit('discover-l1-m2')
  assert.equal(result.missionWorkflowsById['discover-l1-m2'].versions[0].submittedBy, member.id)
  assert.equal(result.missionWorkflowsById['discover-l1-m2'].status, 'submitted')
  assert.equal(result.completedCount, 1)
  assert.throws(() => app.submit('discover-l1-m3'), /not assigned/)
  app.signIn(owner)
  assert.equal(app.read().completedCount, 1)
})

test('member reads and submission results redact other evidence while retaining shared progress', () => {
  const app = fixture()
  const initialPayload = valid({
    notes: `${goodNotes} OWNER INITIAL PRIVATE NOTES`,
    url: 'https://example.com/owner-private-initial',
    file: { name: 'owner-private.pdf', size: 100, type: 'application/pdf' },
    placement: placement(1, 2),
  })
  app.submit(firstId, initialPayload)
  app.submit('validate-l2-m1', valid({ notes: `${goodNotes} OWNER OTHER PRIVATE NOTES`, url: 'https://example.com/owner-private-other' }))
  app.signIn(member)
  app.assign([firstId, 'validate-l2-m2'])
  const before = app.read()
  assert.equal(before.completedCount, 2)
  assert.equal(before.creditedCount, 17)
  assert.equal(before.currentMilestoneId, 'validate-l2-m2')
  assert.deepEqual(before.submissionsByMilestone, {})
  assert.deepEqual(before.placement.evidence, [])
  assert.ok(missions(before).every((mission) => mission.submission === null))
  const serialized = JSON.stringify(before)
  assert.ok(!serialized.includes('OWNER INITIAL PRIVATE') && !serialized.includes('owner-private') && !serialized.includes('example.com/level'))
  const after = app.submit('validate-l2-m2')
  assert.equal(after.completedCount, 2)
  assert.equal(after.creditedCount, 17)
  assert.deepEqual(Object.keys(after.submissionsByMilestone), [])
  assert.equal(after.missionWorkflowsById['validate-l2-m2'].versions[0].submittedBy, member.id)
  assert.deepEqual(after.placement.evidence, [])
  assert.ok(missions(after).filter((mission) => mission.id !== 'validate-l2-m2').every((mission) => mission.submission === null))
  app.assign([])
  assert.deepEqual(app.read().submissionsByMilestone, {})
  app.signIn(owner)
  assert.equal(app.read().submissionsByMilestone[firstId].url, initialPayload.url)
  assert.equal(app.read().placement.evidence.length, 6)
})

test('read and submit results use the latest assignment permissions before exposing saved evidence', () => {
  const app = fixture()
  app.submit(firstId)
  app.submit('discover-l1-m2')
  app.signIn(member)
  app.assign(['discover-l1-m2'])
  let calls = 0
  app.onAccess(() => { if (++calls === 2) app.assign([]) })
  const result = app.read()
  assert.equal(result.completedCount, 2)
  assert.deepEqual(result.submissionsByMilestone, {})
  app.assign(['discover-l1-m3'])
  calls = 0
  app.onAccess(() => { if (++calls === 3) app.assign([]) })
  assert.throws(() => app.submit('discover-l1-m3'), /not assigned/)
  assert.equal(app.read().completedCount, 2)
  assert.deepEqual(app.read().missionWorkflowsById, {})
})

test('permission, account and assignment changes before a write prevent saving stale submissions', () => {
  for (const change of [
    (app) => app.signIn(foreign),
    (app) => app.signIn({ ...owner, role: 'investor' }),
    (app) => app.setProjects([]),
  ]) {
    const app = fixture()
    let calls = 0
    app.onAccess(() => { if (++calls === 2) change(app) })
    assert.throws(() => app.submit(firstId), /changed|unavailable|founder accounts/i)
    assert.equal(app.storage.getItem(roadmapWorkflowKey(owner.id, project.id)), null)
  }
  const app = fixture()
  app.submit(firstId)
  app.signIn(member)
  app.assign(['discover-l1-m2'])
  let calls = 0
  app.onAccess(() => { if (++calls === 2) app.assign([]) })
  assert.throws(() => app.submit('discover-l1-m2'), /not assigned/)
  app.onAccess(null)
  assert.equal(app.read().completedCount, 1)
})

test('foreign accounts, missing projects, incomplete assessments and nonfounder roles have no workflow access', () => {
  const app = fixture()
  app.signIn(foreign)
  assert.throws(() => app.read(), /unavailable/)
  app.signIn(owner)
  assert.throws(() => app.read('unknown'), /unavailable/)
  assert.throws(() => app.read(project.id, 'other-owner'), /unavailable/)
  assert.throws(() => app.read(project.id, owner.id, foreign.id), /account changed/)
  app.setProjects([{ ...project, assessment_completed: false }])
  assert.throws(() => app.submit(firstId), /unavailable/)
  for (const role of ['mentor', 'investor']) {
    app.signIn({ ...owner, role })
    assert.throws(() => app.read(), /founder accounts/)
  }
  app.signIn(null)
  assert.throws(() => app.read(), /Sign in/)
})

test('project and owner keys isolate workflow records and corrupted statuses fail closed', () => {
  const app = fixture()
  app.submit(firstId)
  const record = JSON.parse(app.storage.getItem(roadmapWorkflowKey(owner.id, project.id)))
  const second = { ...project, id: 'second' }
  app.setProjects([project, second])
  assert.equal(app.read(second.id).completedCount, 0)
  assert.equal(createRoadmapSnapshot(second, record).completedCount, 0)
  assert.equal(createRoadmapSnapshot({ ...project, owner_id: foreign.id }, record).completedCount, 0)
  for (const mutate of [
    (value) => { value.version = 2 },
    (value) => { value.submissionsByMilestone[firstId].status = 'completed' },
    (value) => { value.submissionsByMilestone[firstId].payload.notes = '' },
    (value) => { value.submissionsByMilestone[firstId].attempt = -1 },
    (value) => { value.submissionsByMilestone[firstId].submittedBy = member.id },
    (value) => { value.submissionsByMilestone[firstId].submittedAt = 'invalid' },
    (value) => { value.submissionsByMilestone[firstId].missionId = 'discover-l1-m2' },
  ]) {
    const corrupt = structuredClone(record)
    mutate(corrupt)
    const snapshot = createRoadmapSnapshot(project, corrupt)
    assert.equal(snapshot.completedCount, 0)
    assert.equal(snapshot.currentMilestoneId, firstId)
  }
  const futureOnly = structuredClone(record)
  futureOnly.submissionsByMilestone['discover-l1-m3'] = { ...futureOnly.submissionsByMilestone[firstId], missionId: 'discover-l1-m3' }
  assert.equal(createRoadmapSnapshot(project, futureOnly).completedCount, 1)
  app.storage.setItem(roadmapWorkflowKey(owner.id, project.id), '{bad-json')
  assert.equal(app.read().completedCount, 0)
  assert.equal(app.submit(firstId).completedCount, 1)
})

test('concurrent storage changes cannot be overwritten by a stale evaluation', () => {
  const app = fixture()
  const other = fixture()
  other.submit(firstId)
  const latest = other.storage.getItem(roadmapWorkflowKey(owner.id, project.id))
  let calls = 0
  app.onAccess(() => {
    if (++calls === 2) app.storage.setItem(roadmapWorkflowKey(owner.id, project.id), latest)
  })
  assert.throws(() => app.submit(firstId), /progress changed/)
  assert.equal(app.storage.getItem(roadmapWorkflowKey(owner.id, project.id)), latest)
})

test('persisted evidence contains only bounded metadata and snapshot mutation cannot change saved progress', () => {
  const app = fixture()
  const payload = valid({ file: { name: 'research.txt', size: 500, type: 'text/plain', bytes: 'SECRET FILE CONTENTS', dataUrl: 'data:secret' }, surprise: { unrelated: true } })
  const snapshot = app.submit(firstId, payload)
  const stored = app.storage.getItem(roadmapWorkflowKey(owner.id, project.id))
  assert.ok(!stored.includes('SECRET FILE CONTENTS') && !stored.includes('data:secret') && !stored.includes('surprise'))
  assert.throws(() => { snapshot.submissionsByMilestone[firstId].status = 'rejected' }, TypeError)
  assert.throws(() => { snapshot.stages[0].levels[0].milestones[0].state = 'locked' }, TypeError)
  assert.throws(() => { snapshot.submissionsByMilestone[firstId].checks.push({}) }, TypeError)
  payload.file.name = 'changed.txt'
  assert.equal(snapshot.submissionsByMilestone[firstId].file.name, 'research.txt')
  assert.equal(app.read().completedCount, 1)
})

test('saved progress can feed other views without changing achievements or leaderboard points', () => {
  const app = fixture()
  const before = getAchievementsSnapshot(owner)
  const demoBefore = getAchievementsSnapshot({ id: 'demo-founder', role: 'founder' })
  app.submit(firstId)
  app.submit('discover-l1-m2')
  app.submit('discover-l1-m3')
  const record = JSON.parse(app.storage.getItem(roadmapWorkflowKey(owner.id, project.id)))
  const snapshot = createRoadmapSnapshot(project, record)
  assert.equal(snapshot.completedCount, 3)
  assert.equal(snapshot.currentMilestoneId, 'discover-l2-m1')
  assert.equal(snapshot.progressPercent, 4)
  assert.deepEqual(snapshot, app.read())
  assert.deepEqual(getAchievementsSnapshot(owner), before)
  assert.equal(getLeaderboardSnapshot({ user: owner, projects: [project] }).userStanding.total_points, 0)
  assert.equal(getLeaderboardSnapshot({ user: owner, projects: [project] }).userStanding.badges_count, 0)
  assert.deepEqual(getAchievementsSnapshot({ id: 'demo-founder', role: 'founder' }), demoBefore)
  assert.equal(demoBefore.pointsBalance, 450)
})

test('blocked browser storage retains progress in memory for the current store instance', () => {
  const app = fixture({ storage: {
    getItem: () => { throw new Error('blocked') },
    setItem: () => { throw new Error('blocked') },
    removeItem: () => { throw new Error('blocked') },
  } })
  app.submit(firstId)
  assert.equal(app.read().completedCount, 1)
  app.submit('discover-l1-m2')
  assert.equal(app.read().completedCount, 2)
})

test('successful saves notify dashboard consumers, while reads and denied submissions do not', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const events = []
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      CustomEvent: class {
        constructor(type, { detail }) { this.type = type; this.detail = detail }
      },
      dispatchEvent: (event) => { events.push(event) },
    },
  })
  try {
    const app = fixture()
    app.read()
    assert.throws(() => app.submit('discover-l1-m2'), /active mission/)
    assert.equal(events.length, 0)
    app.submit(firstId, valid({ notes: 'Too short' }))
    app.submit(firstId)
    assert.equal(events.length, 2)
    assert.ok(events.every((event) => event.type === 'labx:roadmap-change'))
    assert.deepEqual(events[1].detail, { ownerId: owner.id, projectId: project.id })
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else delete globalThis.window
  }
})
