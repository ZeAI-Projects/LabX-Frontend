import { createConversation } from './sharp_preview.js'

export function createDraftState(state, projectId = '', projectOwnerId = '') {
  const draft = state.sessions.find(session => !session.messages.length && session.projectId === projectId && (session.projectOwnerId || '') === projectOwnerId)
    || createConversation(projectId, projectOwnerId)
  const sessions = [...state.sessions.filter(session => session.messages.length || session.id === draft.id), ...(state.sessions.includes(draft) ? [] : [draft])]
  // A deep link can be observed again before the router commits its replacement
  // URL. Reusing that draft must not schedule another urgent state update.
  if (state.activeId === draft.id && state.projectId === projectId && sessions.length === state.sessions.length && sessions.every((session, index) => session === state.sessions[index])) return state
  return { ...state, activeId: draft.id, projectId, sessions }
}

export function appendConversationMessage(state, sessionId, message) {
  return {
    ...state,
    sessions: state.sessions.map(session => session.id === sessionId ? {
      ...session,
      title: !session.messages.length && message.role === 'user' ? message.content.slice(0, 55) : session.title,
      updatedAt: message.time,
      messages: [...session.messages, message],
    } : session),
  }
}

export function renameConversation(state, id, title) {
  const name = typeof title === 'string' ? title.trim().replace(/\s+/g, ' ').slice(0, 70) : ''
  if (!name) return state
  return { ...state, sessions: state.sessions.map(session => session.id === id ? { ...session, title: name } : session) }
}

export function deleteConversation(state, id) {
  if (!state.sessions.some(session => session.id === id)) return state
  const sessions = state.sessions.filter(session => session.id !== id)
  if (state.activeId !== id) return { ...state, sessions }
  const next = [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  if (next) return { ...state, sessions, activeId: next.id, projectId: next.projectId || '' }
  return createDraftState({ ...state, sessions: [] })
}

// The shared storage adapter can fall back to memory. Verify the durable copy so
// the chat screen can explain when a browser refresh would lose recent changes.
export function persistConversationState(storage, key, state, getBacking = () => globalThis.localStorage) {
  try {
    const serialized = JSON.stringify(state)
    storage.writeJSON(key, state)
    return getBacking()?.getItem(key) === serialized
  } catch { return false }
}
