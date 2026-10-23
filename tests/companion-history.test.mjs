import assert from 'node:assert/strict'
import test from 'node:test'
import { appendConversationMessage, createDraftState, deleteConversation, persistConversationState, renameConversation } from '../src/features/companion/services/companion_history.js'
import { freshState, normalizeState, sharpKey } from '../src/features/companion/services/sharp_preview.js'
import { createSafeStorage } from '../src/services/storage/local_storage.js'

const message = (content, time = '2026-10-23T10:00:00.000Z', role = 'user') => ({ id: `${content}-${role}`, role, content, time })

test('legacy history migration retains more than eight conversations and sixty messages with stable dates', () => {
  const raw = { sessions: Array.from({ length: 15 }, (_, index) => ({ id: `chat-${index}`, title: `Saved ${index}`, projectId: 'venture', messages: Array.from({ length: 100 }, (_, number) => message(`Message ${number}`)) })), activeId: 'chat-0' }
  const migrated = normalizeState(raw)
  assert.equal(migrated.sessions.length, 15)
  assert.equal(migrated.sessions[0].messages.length, 100)
  assert.equal(migrated.sessions[0].messages[0].content, 'Message 0')
  assert.equal(migrated.activeId, 'chat-0')
  assert.equal(migrated.sessions[0].createdAt, '2026-10-23T10:00:00.000Z')
  assert.deepEqual(normalizeState(migrated), migrated)
  const withoutDates = normalizeState({ sessions: [{ id: 'old', messages: [{ role: 'user', content: 'Old first prompt' }] }] })
  assert.equal(withoutDates.sessions[0].title, 'Old first prompt')
  assert.deepEqual(normalizeState(withoutDates), withoutDates)
})

test('new chat drafts preserve saved conversations and never duplicate empty history', () => {
  let state = createDraftState(freshState(), 'first')
  const first = state.activeId
  state = appendConversationMessage(state, first, message('First saved idea'))
  state = createDraftState(state, 'second', 'shared-owner')
  const second = state.activeId
  assert.equal(state.sessions.length, 2)
  assert.equal(state.sessions[0].projectId, 'first')
  assert.equal(state.sessions[1].projectOwnerId, 'shared-owner')
  assert.equal(createDraftState(state, 'second', 'shared-owner'), state, 'Repeated deep-link reconciliation must preserve state identity until router navigation commits')
  assert.equal(state.activeId, second)
  state = createDraftState(state, 'third')
  assert.equal(state.sessions.length, 2)
  assert.equal(state.sessions[0].id, first)
  assert.equal(state.sessions[0].messages[0].content, 'First saved idea')
})

test('legacy shared chats recover owner metadata from their matching roadmap action', () => {
  const state = normalizeState({ sessions: [{ id: 'shared', projectId: 'venture', messages: [{ ...message('View your current work', undefined, 'assistant'), action: { href: '/roadmap/joined/owner/venture?stage=Discover', label: 'View roadmap' } }] }] })
  assert.equal(state.sessions[0].projectOwnerId, 'owner')
  const unrelated = normalizeState({ sessions: [{ id: 'owned', projectId: 'another', messages: state.sessions[0].messages }] })
  assert.equal(unrelated.sessions[0].projectOwnerId, '')
})

test('finishing a reply appends to its captured conversation even after another chat opens', () => {
  let state = freshState()
  const first = state.activeId
  state = appendConversationMessage(state, first, message('First question'))
  state = createDraftState(state, 'second')
  const second = state.activeId
  state = appendConversationMessage(state, first, message('Finished reply', '2026-10-23T10:01:00.000Z', 'assistant'))
  assert.equal(state.activeId, second)
  assert.equal(state.sessions.find(item => item.id === first).messages.length, 2)
  assert.equal(state.sessions.find(item => item.id === second).messages.length, 0)
  assert.equal(state.sessions[0].updatedAt, '2026-10-23T10:01:00.000Z')
})

test('renaming retains content/context, and deleting active history picks another saved conversation', () => {
  let state = createDraftState(freshState(), 'first')
  const first = state.activeId
  state = appendConversationMessage(state, first, message('Original title'))
  state = createDraftState(state, 'second', 'owner')
  const second = state.activeId
  state = appendConversationMessage(state, second, message('Second chat', '2026-10-23T11:00:00.000Z'))
  state = renameConversation(state, second, '  Renamed   conversation  ')
  assert.equal(state.sessions[1].title, 'Renamed conversation')
  assert.equal(state.sessions[1].messages[0].content, 'Second chat')
  assert.equal(state.sessions[1].projectOwnerId, 'owner')
  assert.equal(renameConversation(state, second, '   '), state)
  state = deleteConversation(state, second)
  assert.equal(state.activeId, first)
  assert.equal(state.projectId, 'first')
  state = deleteConversation(state, first)
  assert.equal(state.sessions.length, 1)
  assert.equal(state.sessions[0].messages.length, 0)
  assert.notEqual(state.activeId, first)
})

test('browser quota failures are reported while keeping recoverable account-specific in-memory state', () => {
  const backingValues = new Map()
  const backing = { getItem: key => backingValues.get(key) ?? null, setItem: (key, value) => backingValues.set(key, value), removeItem: key => backingValues.delete(key) }
  const storage = createSafeStorage(backing)
  const first = freshState(), second = freshState()
  assert.equal(persistConversationState(storage, sharpKey('first'), first, () => backing), true)
  backing.setItem = () => { throw new Error('QuotaExceededError') }
  assert.equal(persistConversationState(storage, sharpKey('second'), second, () => backing), false)
  assert.deepEqual(storage.readJSON(sharpKey('second')), second)
  assert.deepEqual(JSON.parse(backing.getItem(sharpKey('first'))), first)
  assert.equal(backing.getItem(sharpKey('second')), null)
})
