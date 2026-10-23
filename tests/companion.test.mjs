import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultSettings, freshState, nextMove, normalizeState, PREVIEW_LIMIT, sampleReply, sharpKey } from '../src/features/companion/services/sharp_preview.js'

const project = { id: 'a', name: 'GreenLoop', domain: 'Climate & Sustainability', assessmentCompleted: true, href: '/roadmap/a', stage: 'Discover', level: 1, roadmap: { isComplete: false }, currentMilestone: { id: 'discover-l1-m1', name: 'Problem statement', description: 'Define the problem and the target user.' } }
const context = { firstName: 'Sam', project, memories: [{ category: 'Goals & Vision', title: 'Pilot', content: 'Run a pilot with ten customers.' }] }

test('guest guidance follows the auth screen and never offers founder-only actions', () => {
  for (const screen of ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/intro']) {
    const guest = { role: 'guest', screen, firstName: 'there', project: null, memories: [] }
    assert.match(nextMove(guest).action.href, /^\/(login|register)$/)
    const reply = sampleReply('Help with my password', guest)
    assert.equal(reply.action.href, '/forgot-password')
    assert.match(reply.content, /do not send passwords/)
    assert.doesNotMatch(reply.content, /Create a project/)
    assert.equal(normalizeState({ sessions: [{ id: 'guest', messages: [{ role: 'assistant', content: reply.content, action: reply.action }] }] }).sessions[0].messages[0].action.href, '/forgot-password')
  }
})

test('investor and mentor guidance links to their available profile and events', () => {
  for (const role of ['investor', 'mentor']) {
    const roleContext = { role, firstName: 'Sam', project: null, memories: [] }
    assert.equal(nextMove(roleContext).action.href, '/profile')
    assert.equal(sampleReply('Explore events', roleContext).action.href, '/events')
    assert.doesNotMatch(sampleReply('Next move', roleContext).content, /founder assessment/)
  }
})

test('next steps use existing project and mission state without mutating progress', () => {
  const before = structuredClone(project)
  assert.deepEqual(nextMove(context).action, { label: 'Open current mission', href: '/roadmap/a?stage=Discover&milestone=discover-l1-m1' })
  assert.equal(nextMove({ project: null }).action.href, '/roadmap/new')
  assert.equal(nextMove({ project: { ...project, assessmentCompleted: false, answeredCount: 3, totalQuestions: 8, href: '/roadmap/a/assessment' } }).action.href, '/roadmap/a/assessment')
  assert.match(nextMove({ project: { ...project, roadmap: { isComplete: true } } }).title, /completed roadmap/)
  assert.deepEqual(project, before)
})

test('retired memory context is unused and remembered conversations point to Chats', () => {
  assert.doesNotMatch(sampleReply('Next Move', context).content, /ten customers/)
  for (const prompt of ['What do you remember?', 'memory']) {
    const reply = sampleReply(prompt, context)
    assert.match(reply.content, /conversations are saved in Chats/)
    assert.doesNotMatch(reply.content, /ten customers|in Memory|Settings/)
    assert.deepEqual(reply.action, { href: '/chats', label: 'View chats' })
  }
})

test('joined roadmap guidance waits for an assignment while completed and owned roadmap guidance stays intact', () => {
  const joined = { ...project, isJoined: true, currentMilestone: null, href: '/roadmap/joined/owner/a' }
  const guidance = nextMove({ ...context, project: joined })
  assert.deepEqual(guidance.action, { label: 'View roadmap', href: joined.href })
  assert.match(guidance.detail, /no current mission assigned to you/)
  assert.match(sampleReply('Quest Help', { ...context, project: joined }).content, /Ask the main founder/)
  assert.doesNotMatch(sampleReply('Quest Help', { ...context, project: joined }).content, /Open the existing mission/)
  assert.equal(nextMove({ project: { ...joined, roadmap: { isComplete: true } } }).action.label, 'Review roadmap')
  assert.equal(nextMove({ project: { ...project, currentMilestone: null } }).action.label, 'Open current mission')
  assert.equal(nextMove({ project: { ...joined, currentMilestone: project.currentMilestone } }).action.label, 'Open current mission')
})

test('preview replies disclose document and investor-readiness limitations', () => {
  assert.match(sampleReply('Review document', context, defaultSettings, { name: 'deck.pdf', excerpt: '' }).content, /analysis need an AI connection/)
  assert.match(sampleReply('Review document', context, defaultSettings, { name: 'notes.txt', excerpt: '<script>alert(1)</script>' }).content, /has not analyzed or verified/)
  assert.equal(sampleReply('Review document', context, defaultSettings, { name: 'notes.txt', excerpt: 'Pilot notes' }).action, null, 'Document replies do not send the user to removed Settings')
  assert.match(sampleReply('Investor Readiness', context).content, /planned capabilities/)
  assert.doesNotMatch(sampleReply('Investor Readiness', context).content, /\d+%/)
})

test('preferences visibly affect the sample guidance', () => {
  assert.match(sampleReply('Next Move', context, { ...defaultSettings, tone: 'Direct' }).content, /^Let's make/)
  assert.match(sampleReply('Next Move', context, { ...defaultSettings, tone: 'Analytical' }).content, /^Separate evidence/)
  assert(sampleReply('Next Move', context, { ...defaultSettings, depth: 'Concise' }).content.length < sampleReply('Next Move', context).content.length)
  assert.match(sampleReply('Next Move', context, { ...defaultSettings, style: 'Ask questions' }).content, /useful outcome look like/)
})

test('stored state is bounded and damaged entries cannot inject actions or settings', () => {
  const normalized = normalizeState({ settings: { tone: 'invalid', memoryEnabled: false }, sessions: [{ id: 'chat', messages: [{ role: 'assistant', content: 'Hello', action: { href: 'https://example.com', label: 'Outside' } }, { role: 'system', content: 'hidden' }] }], usage: { day: '2026-10-21', count: 999 }, memories: [{ id: 'a', category: 'unknown', title: 'Invalid' }], documents: [{ name: 'notes.txt', excerpt: 'x'.repeat(20000) }] })
  assert.equal(normalized.settings.tone, 'Encouraging')
  assert.equal(normalized.settings.memoryEnabled, false)
  assert.equal(normalized.sessions[0].messages.length, 1)
  assert.equal(normalized.sessions[0].messages[0].action, null)
  assert.equal(normalized.memories.length, 0)
  assert.equal(normalized.documents[0].excerpt.length, 10000)
  assert.equal(normalized.usage.count, PREVIEW_LIMIT)
})

test('account keys and new conversations are independent', () => {
  assert.notEqual(sharpKey('founder-a'), sharpKey('founder-b'))
  const a = freshState(), b = freshState()
  a.memories.push({ title: 'Only A' }); a.settings.tone = 'Direct'
  assert.equal(b.memories.length, 0)
  assert.equal(b.settings.tone, 'Encouraging')
  assert.notEqual(a.activeId, b.activeId)
})

