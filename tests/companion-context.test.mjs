import assert from 'node:assert/strict'
import test from 'node:test'
import { getCompanionProjectContext } from '../src/features/companion/services/companion_context.js'
import { nextMove } from '../src/features/companion/services/sharp_preview.js'
import { createCollaborationStore } from '../src/features/roadmap/services/roadmap_collaboration.js'
import { createRoadmapStore } from '../src/features/roadmap/services/roadmap_workflow.js'
import { createProjectStore } from '../src/features/projects/services/project_store.js'
import { createSafeStorage } from '../src/services/storage/local_storage.js'

const summaries = [{ id: 'one', name: 'First owned project' }, { id: 'two', name: 'Second owned project' }]

test('individual roadmap context wins over remembered and query project selections', () => {
  for (const pathname of ['/roadmap/one', '/roadmap/one/assessment', '/roadmap/one/result']) {
    const context = getCompanionProjectContext({ pathname, search: '?project=two', selectedProjectId: 'two', summaries })
    assert.equal(context.project.id, 'one')
    assert.deepEqual(context.projects, [summaries[0]])
    assert.equal(context.projectLocked, true)
  }
  const missing = getCompanionProjectContext({ pathname: '/roadmap/missing', selectedProjectId: 'two', summaries })
  assert.equal(missing.project, null)
  assert.deepEqual(missing.projects, [])
  assert.equal(missing.projectLocked, true)
})

test('the collection honors a project deep link and can still choose projects', () => {
  const context = getCompanionProjectContext({ pathname: '/roadmap', search: '?companion=chat&project=two', selectedProjectId: 'one', summaries })
  assert.equal(context.project.id, 'two')
  assert.deepEqual(context.projects, summaries)
  assert.equal(context.projectLocked, false)
  assert.equal(getCompanionProjectContext({ pathname: '/roadmap', search: '?project=missing', summaries }).project, null)
  assert.equal(getCompanionProjectContext({ pathname: '/dashboard', selectedProjectId: 'two', summaries }).project.id, 'two')
})

test('reopened Chats use their saved project and never use stale URL or last selected project context', () => {
  const context = getCompanionProjectContext({ pathname: '/chats', search: '?chat=saved&project=two', selectedSession: { id: 'saved', projectId: 'one' }, selectedProjectId: 'two', summaries })
  assert.equal(context.project.id, 'one')
  assert.equal(context.projectLocked, false)
  assert.equal(getCompanionProjectContext({ pathname: '/chats', selectedSession: { id: 'unscoped', projectId: '' }, summaries }).project, null)
  assert.equal(getCompanionProjectContext({ pathname: '/chats', selectedSession: { id: 'removed', projectId: 'removed' }, summaries }).project, null)
  assert.equal(getCompanionProjectContext({ pathname: '/chats', search: '?project=two', summaries }).project.id, 'two')
})

function sharedFixture() {
  const values = new Map()
  const storage = createSafeStorage({ getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) })
  const owner = { id: 'owner', role: 'founder', full_name: 'Owner', email: 'owner@example.com' }
  const member = { id: 'member', role: 'founder', full_name: 'Member', email: 'member@example.com' }
  let current = owner, sequence = 0
  const auth = { getUser: () => current, findRegisteredFounderByEmail: email => [owner, member].find(user => user.email === email) }
  const projects = createProjectStore({ storage, auth, createId: () => `project-${++sequence}` })
  const collaboration = createCollaborationStore({ storage, auth, projects, createId: () => `invite-${++sequence}`, notify: () => {} })
  const roadmaps = createRoadmapStore({ storage, auth, getAccess: (...args) => collaboration.getAccess(...args) })
  const project = projects.createProject('Shared venture', owner.id)
  projects.completeProject(project.id, { q1: 1, q2: 2, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8: 1 }, owner.id)
  const invitation = collaboration.inviteFounder(project.id, member.email, 'member', owner.id)
  const context = (overrides = {}) => getCompanionProjectContext({
    pathname: `/roadmap/joined/${owner.id}/${project.id}`, summaries, selectedProjectId: 'two', user: current,
    getAccess: (...args) => collaboration.getAccess(...args), readRoadmap: (...args) => roadmaps.read(...args),
    ...overrides,
  })
  return {
    context, owner, member, project, roadmaps, collaboration,
    signIn: user => { current = user },
    accept: () => { current = member; collaboration.respondInvitation(invitation.id, 'accepted', member.id) },
  }
}

test('joined Companion uses authorized project progress and never falls back before acceptance', () => {
  const app = sharedFixture()
  app.signIn(app.member)
  assert.deepEqual(app.context(), { project: null, projects: [], projectLocked: true })
  app.accept()
  const context = app.context()
  assert.equal(context.project.name, 'Shared venture')
  assert.equal(context.project.href, `/roadmap/joined/owner/${app.project.id}`)
  assert.equal(context.project.roadmap.totalCount, 75)
  assert.equal(context.projectLocked, true)
  assert.deepEqual(context.projects, [context.project])
  assert.equal(context.project.currentMilestone, null, 'The owner-only first mission must not be offered to a member')
  assert.equal(nextMove(context).action.href, context.project.href)
  assert.equal(nextMove(context).action.label, 'View roadmap')
  assert.match(nextMove(context).detail, /Ask the main founder about your next assignment/)
})

test('joined Companion offers assigned active work without including submission evidence', () => {
  const app = sharedFixture()
  app.accept()
  app.signIn(app.owner)
  const notes = 'Private owner evidence: interviews were completed with the intended users and the strongest needs were compared with existing alternatives.'
  app.roadmaps.submitMission(app.project.id, app.owner.id, 'discover-l1-m1', { notes, url: 'https://example.com/private-evidence', file: null }, app.owner.id)
  app.collaboration.assignMission(app.project.id, app.member.id, 'discover-l1-m2', app.owner.id)
  app.signIn(app.member)
  const context = app.context()
  assert.equal(context.project.roadmap.completedCount, 1)
  assert.equal(context.project.currentMilestone.id, 'discover-l1-m2')
  assert.equal(nextMove(context).action.href, `/roadmap/joined/owner/${app.project.id}?stage=Discover&milestone=discover-l1-m2`)
  assert.doesNotMatch(JSON.stringify(context), /Private owner evidence|private-evidence|submissionsByMilestone|submission|assessment_answers|placement/)
  app.signIn(app.owner)
  app.collaboration.removeAssignment(app.project.id, app.member.id, 'discover-l1-m2', app.owner.id)
  app.signIn(app.member)
  assert.equal(app.context().project.currentMilestone, null)
  assert.equal(nextMove(app.context()).action.label, 'View roadmap')
})

test('revoked accounts and failed shared snapshot reads cannot expose an owned fallback', () => {
  const app = sharedFixture()
  app.accept()
  app.signIn({ id: 'stranger', role: 'founder' })
  assert.deepEqual(app.context(), { project: null, projects: [], projectLocked: true })
  let reads = 0
  const context = getCompanionProjectContext({
    pathname: '/roadmap/joined/owner/shared', user: app.member, summaries,
    getAccess: () => { throw new Error('Unavailable') }, readRoadmap: () => { reads += 1 },
  })
  assert.equal(context.project, null)
  assert.equal(reads, 0)
  assert.equal(getCompanionProjectContext({
    pathname: '/roadmap/joined/owner/shared', user: app.member, summaries,
    getAccess: () => ({ project: { id: 'shared', owner_id: 'owner' }, user: app.member }), readRoadmap: () => { throw new Error('Account changed') },
  }).project, null)
})

test('shared Chats restore member permissions from saved owner/project context after navigation', () => {
  const app = sharedFixture()
  app.accept()
  const route = { pathname: '/chats', search: '?chat=shared&project=two&owner=unrelated', selectedSession: { id: 'shared', projectId: app.project.id, projectOwnerId: app.owner.id } }
  const context = app.context(route)
  assert.equal(context.project.name, 'Shared venture')
  assert.equal(context.project.ownerId, app.owner.id)
  assert.equal(context.projectLocked, true)
  assert.equal(context.project.currentMilestone, null)
  app.signIn({ id: 'stranger', role: 'founder' })
  assert.deepEqual(app.context(route), { project: null, projects: [], projectLocked: true })
})
