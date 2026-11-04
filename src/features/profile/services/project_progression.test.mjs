import test from 'node:test'
import assert from 'node:assert/strict'
import { projectProgressPercent, sortProjectsByProgress } from './project_progression.js'

test('project progress uses roadmap coverage or assessment completion', () => {
  assert.equal(projectProgressPercent({ roadmap: { progressPercent: 72 } }), 72)
  assert.equal(projectProgressPercent({ answeredCount: 3, totalQuestions: 8 }), 37.5)
  assert.equal(projectProgressPercent({ answeredCount: 0, totalQuestions: 0 }), 0)
})

test('project progress is bounded to a valid percentage', () => {
  assert.equal(projectProgressPercent({ roadmap: { progressPercent: 140 } }), 100)
  assert.equal(projectProgressPercent({ roadmap: { progressPercent: -10 } }), 0)
  assert.equal(projectProgressPercent({ roadmap: { progressPercent: Number.NaN } }), 0)
})

test('projects sort by progress, then name, then id without mutating input', () => {
  const projects = [
    { id: 'z', name: 'Zeta', roadmap: { progressPercent: 40 } },
    { id: 'b', name: 'Beta', answeredCount: 4, totalQuestions: 8 },
    { id: 'a', name: 'Alpha', roadmap: { progressPercent: 50 } },
    { id: 'c', name: 'Alpha', roadmap: { progressPercent: 50 } },
  ]

  assert.deepEqual(sortProjectsByProgress(projects).map((project) => project.id), ['a', 'c', 'b', 'z'])
  assert.deepEqual(projects.map((project) => project.id), ['z', 'b', 'a', 'c'])
})
