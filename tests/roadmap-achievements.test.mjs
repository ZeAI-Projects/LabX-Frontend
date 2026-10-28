import assert from 'node:assert/strict'
import test from 'node:test'
import { createRoadmapStore, roadmapWorkflowKey } from '../src/features/roadmap/services/roadmap_workflow.js'
import { createAchievementStore, getAchievementsSnapshot } from '../src/features/achievements/services/mock_achievements.js'

const owner = { id: 'recognition-owner', role: 'founder' }
const member = { id: 'recognition-member', role: 'founder' }
const project = {
  id: 'recognition-project', owner_id: owner.id, name: 'Research journey',
  assessment_completed: true, assessment_result: { domain: 'Smart Education', stage: 'Discover', level: 1 },
}
const firstId = 'discover-l1-m1'
const notes = 'We interviewed our intended users, documented the findings, and tested the proposed solution against their practical requirements.'
const valid = (overrides = {}) => ({ notes, url: 'https://example.com/research', ...overrides })
function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}
function fixture({ storage = memoryStorage(), onApproved, selectedProject = project } = {}) {
  let currentUser = { ...owner, id: selectedProject.owner_id }
  let available = true
  let assigned = []
  let hook
  let accessCount = 0
  const auth = { getUser: () => currentUser }
  const options = {
    storage, auth, onApproved, now: () => Date.parse('2026-10-20T10:00:00Z'),
    getAccess: (projectId, ownerId, expectedUserId) => {
      hook?.(++accessCount)
      if (!available || !currentUser || currentUser.id !== expectedUserId
        || ![selectedProject.owner_id, member.id].includes(currentUser.id)
        || projectId !== selectedProject.id || ownerId !== selectedProject.owner_id) throw new Error('Project access unavailable.')
      return {
        user: currentUser, project: selectedProject,
        role: currentUser.id === selectedProject.owner_id ? 'owner' : 'member', assignedMissionIds: assigned,
      }
    },
  }
  let store = createRoadmapStore(options)
  return {
    storage,
    read: () => store.read(selectedProject.id, selectedProject.owner_id, currentUser?.id),
    submit: (missionId, payload = valid()) => store.submitMission(selectedProject.id, selectedProject.owner_id, missionId, payload, currentUser?.id),
    approveMember: (missionId) => {
      currentUser = { ...owner, id: selectedProject.owner_id }
      const args = [selectedProject.id, selectedProject.owner_id, missionId]
      const latest = store.read(selectedProject.id, selectedProject.owner_id, currentUser.id).missionWorkflowsById[missionId].versions.at(-1)
      const target = { version: latest.version, submissionId: latest.id }
      store.reviewSubmission(...args, { ...target, decision: 'approved' }, currentUser.id)
      const uploaded = store.beginApprovedUpload(...args, target, currentUser.id)
      const jobId = uploaded.missionWorkflowsById[missionId].evaluationJobs.at(-1).id
      for (const action of ['queue', 'evaluate', 'complete_meets']) store.advanceEvaluation(...args, { jobId, action }, currentUser.id)
      currentUser = member
      return store.read(selectedProject.id, selectedProject.owner_id, member.id)
    },
    reload: () => { store = createRoadmapStore(options) },
    onAccess: (callback) => { accessCount = 0; hook = callback },
    revoke: () => { available = false },
    signIn: (user) => { currentUser = user },
    assign: (ids) => { assigned = ids },
  }
}
function finalPlacement() {
  return {
    stageIndex: 4, level: 5,
    evidence: Array.from({ length: 24 }, (_, index) => ({
      stageIndex: Math.floor(index / 5), level: index % 5 + 1, notes,
      url: `https://example.com/level-${index + 1}`,
    })),
  }
}
const recognition = (store, user) => getAchievementsSnapshot(user, store.read(user))

test('approval callback runs only for a saved approval, never reads, rejected evidence or denied submissions', () => {
  const calls = []
  const app = fixture({ onApproved: (...args) => {
    const saved = JSON.parse(app.storage.getItem(roadmapWorkflowKey(owner.id, project.id)))
    assert.equal(saved.submissionsByMilestone[firstId].status, 'approved')
    calls.push(args)
  } })
  app.read()
  app.reload()
  app.read()
  app.submit(firstId, valid({ notes: 'Incomplete evidence' }))
  assert.throws(() => app.submit('discover-l2-m1'), /active mission/)
  assert.equal(calls.length, 0)
  const approved = app.submit(firstId)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0].id, owner.id)
  assert.equal(calls[0][1].id, project.id)
  assert.deepEqual(calls[0][2], approved)
  assert.equal(Object.isFrozen(calls[0][2]), true)
  app.read()
  assert.throws(() => app.submit(firstId), /already approved/)
  assert.equal(calls.length, 1)
})

test('permission changes before saving or before returning a result cannot record recognition', () => {
  for (const changeAt of [2, 3]) {
    const calls = []
    const app = fixture({ onApproved: (...args) => calls.push(args) })
    app.onAccess((count) => { if (count === changeAt) app.revoke() })
    assert.throws(() => app.submit(firstId), /unavailable/)
    assert.equal(calls.length, 0)
    const saved = app.storage.getItem(roadmapWorkflowKey(owner.id, project.id))
    assert.equal(Boolean(saved), changeAt === 3)
  }
  const calls = []
  const app = fixture({ onApproved: (...args) => calls.push(args) })
  app.onAccess((count) => { if (count === 3) app.signIn({ ...owner, role: 'investor' }) })
  assert.throws(() => app.submit(firstId), /founder accounts/)
  assert.equal(calls.length, 0)
})

test('storage failures and concurrent progress conflicts never invoke approval recognition', () => {
  const calls = []
  const failed = fixture({
    storage: { readJSON: () => null, writeJSON: () => { throw new Error('Write failed') } },
    onApproved: (...args) => calls.push(args),
  })
  assert.throws(() => failed.submit(firstId), /Write failed/)
  const conflicting = fixture({ onApproved: (...args) => calls.push(args) })
  conflicting.onAccess((count) => {
    if (count === 2) conflicting.storage.setItem(roadmapWorkflowKey(owner.id, project.id), JSON.stringify({ version: 2 }))
  })
  assert.throws(() => conflicting.submit(firstId), /progress changed/)
  assert.equal(calls.length, 0)
})

test('real local approvals unlock badges persistently and deduplicate without granting points', () => {
  const storage = memoryStorage()
  const achievements = createAchievementStore({ storage })
  const app = fixture({ storage, onApproved: achievements.recordRoadmap })
  assert.equal(recognition(achievements, owner).earnedBadgeCount, 0)
  app.submit(firstId)
  const first = recognition(achievements, owner)
  assert.equal(first.completedQuests, 1)
  assert.equal(first.completedMilestones, 0)
  assert.equal(first.badges.find((badge) => badge.id === 'first-quest').isEarned, true)
  assert.equal(first.pointsBalance, 0)
  app.submit('discover-l1-m2')
  const third = app.submit('discover-l1-m3')
  const result = recognition(achievements, owner)
  assert.equal(result.completedQuests, 3)
  assert.equal(result.completedMilestones, 1)
  assert.equal(result.earnedBadgeCount, 1)
  assert.equal(result.pointsBalance, 0)
  const savedCount = achievements.read(owner).length
  achievements.recordRoadmap(owner, project, third)
  app.reload()
  app.read()
  assert.equal(achievements.read(owner).length, savedCount)
  assert.deepEqual(recognition(createAchievementStore({ storage }), owner), result)
})

test('placement credits cannot count as approved quests or completed milestones', () => {
  const achievements = createAchievementStore({ storage: memoryStorage() })
  const app = fixture({ onApproved: achievements.recordRoadmap })
  const placed = app.submit(firstId, valid({ placement: finalPlacement() }))
  assert.equal(placed.creditedCount, 71)
  let result = recognition(achievements, owner)
  assert.equal(result.completedQuests, 1)
  assert.equal(result.completedMilestones, 0)
  assert.equal(result.earnedBadgeCount, 1)
  app.submit('grow-l5-m1')
  app.submit('grow-l5-m2')
  app.submit('grow-l5-m3')
  result = recognition(achievements, owner)
  assert.equal(result.completedQuests, 4)
  assert.equal(result.completedMilestones, 1)
  assert.equal(result.pointsBalance, 0)
})

test('collaborator recognition belongs to the submitting founder and requires all three own approvals for a milestone', () => {
  const achievements = createAchievementStore({ storage: memoryStorage() })
  const app = fixture({ onApproved: achievements.recordRoadmap })
  app.submit(firstId)
  app.signIn(member)
  app.assign(['discover-l1-m2'])
  app.submit('discover-l1-m2')
  assert.equal(recognition(achievements, member).completedQuests, 0)
  app.approveMember('discover-l1-m2')
  app.assign(['discover-l1-m3'])
  app.submit('discover-l1-m3')
  const visible = app.approveMember('discover-l1-m3')
  assert.deepEqual(Object.keys(visible.submissionsByMilestone), ['discover-l1-m3'])
  assert.equal(recognition(achievements, member).completedQuests, 2)
  assert.equal(recognition(achievements, member).completedMilestones, 0)
  assert.equal(recognition(achievements, owner).completedQuests, 1)
  for (const id of ['discover-l2-m1', 'discover-l2-m2', 'discover-l2-m3']) {
    app.assign([id])
    app.submit(id)
    app.approveMember(id)
  }
  assert.equal(recognition(achievements, member).completedQuests, 5)
  assert.equal(recognition(achievements, member).completedMilestones, 1)
  assert.equal(recognition(achievements, member).pointsBalance, 0)
  assert.equal(recognition(achievements, owner).completedMilestones, 0)
})

test('existing demo points and approved ledger remain unchanged after new recognition', () => {
  const demoUser = { id: 'demo-founder', role: 'founder' }
  const demoProject = { ...project, owner_id: demoUser.id }
  const achievements = createAchievementStore({ storage: memoryStorage() })
  const before = recognition(achievements, demoUser)
  const app = fixture({ selectedProject: demoProject, onApproved: achievements.recordRoadmap })
  app.submit(firstId)
  const after = recognition(achievements, demoUser)
  assert.equal(after.pointsBalance, 450)
  assert.equal(after.pointsBalance, before.pointsBalance)
  assert.equal(after.completedQuests, before.completedQuests + 1)
  assert.deepEqual(after.transactions, before.transactions)
})
