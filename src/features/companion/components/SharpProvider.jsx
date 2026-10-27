import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/use_auth.js'
import { useProjects } from '../../projects/hooks/use_projects.js'
import { localStore } from '../../../services/storage/local_storage.js'
import { getDashboardSnapshot } from '../../dashboard/services/dashboard_snapshot.js'
import { collaborationStore } from '../../roadmap/services/roadmap_collaboration.js'
import { roadmapStore } from '../../roadmap/services/roadmap_store.js'
import { SharpContext } from '../context/sharp_context.js'
import { getCompanionProjectContext } from '../services/companion_context.js'
import { getCompanionUrl } from '../services/companion_navigation.js'
import { appendConversationMessage, createDraftState, deleteConversation, persistConversationState, renameConversation } from '../services/companion_history.js'
import { newId, normalizeState, PREVIEW_LIMIT, sampleReply, sharpKey } from '../services/sharp_preview.js'
import '../components/Sharp.css'

export function SharpProvider({ children }) {
  const { user } = useAuth()
  const { projects } = useProjects()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState(() => normalizeState(user ? localStore.readJSON(sharpKey(user.id)) : null))
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [storageNotice, setStorageNotice] = useState('')
  const pending = useRef(false)
  const timer = useRef(null)
  const accountId = user?.id || null
  const [ownerId, setOwnerId] = useState(accountId)
  // Reset account data before rendering children without remounting auth forms:
  // their delayed post-login navigation must remain alive.
  if (ownerId !== accountId) {
    setOwnerId(accountId)
    setState(normalizeState(user ? localStore.readJSON(sharpKey(user.id)) : null))
    setOpen(false)
    setBusy(false)
    setNotice('')
    setStorageNotice('')
  }
  const sessionRef = useRef(state.activeId)
  sessionRef.current = state.activeId
  const accountRef = useRef(accountId)
  accountRef.current = accountId
  useEffect(() => {
    if (!accountId) return
    const saved = persistConversationState(localStore, sharpKey(accountId), state)
    // This result comes from the external browser store, after attempting persistence.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageNotice(saved ? '' : 'Your browser could not save these chats. Recent changes are available in this session only; free browser storage before refreshing.')
  }, [state, accountId])
  useEffect(() => {
    pending.current = false
    return () => { clearTimeout(timer.current); pending.current = false }
  }, [accountId])
  const inChats = /^\/chats\/?$/.test(pathname)
  const routeParams = new URLSearchParams(search)
  const requestedId = inChats ? routeParams.get('chat') : null
  const requestedSession = requestedId ? state.sessions.find(item => item.id === requestedId) : null
  const session = state.sessions.find(s => s.id === state.activeId) || state.sessions[0]
  const routeReady = !inChats || Boolean(requestedSession && requestedSession.id === session.id)
  const summaries = getDashboardSnapshot({ user, projects }).projects
  const { project, projects: contextProjects, projectLocked } = getCompanionProjectContext({
    pathname, search, summaries, selectedProjectId: state.projectId, selectedSession: requestedSession, user,
    getAccess: (...args) => collaborationStore.getAccess(...args),
    readRoadmap: (...args) => roadmapStore.read(...args),
  })
  const context = { project, role: user?.role || 'guest', screen: pathname, firstName: (user?.full_name || 'there').split(/\s+/)[0], memories: [] }
  const contextProjectId = project?.id || ''
  const contextOwnerId = project?.isJoined ? project.ownerId : ''
  useEffect(() => {
    if (!inChats || !accountId) return
    const params = new URLSearchParams(search)
    const requested = params.get('chat')
    const saved = requested ? state.sessions.find(item => item.id === requested) : null
    let next = state
    if (saved) {
      if (state.activeId !== saved.id || state.projectId !== saved.projectId) next = { ...state, activeId: saved.id, projectId: saved.projectId || '' }
    } else if (requested || params.has('project') || params.has('owner')) {
      next = createDraftState(state, requested ? '' : params.get('project') || '', requested ? '' : params.get('owner') || '')
      if (requested) {
        // URL navigation can select a missing or different account's conversation.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotice('That chat is not available in this account. A new chat is ready.')
        params.delete('prompt')
      }
    } else if (!session.messages.length && !session.projectId && contextProjectId) {
      next = createDraftState(state, contextProjectId, contextOwnerId)
    }
    if (next !== state) setState(next)
    params.set('chat', next.activeId)
    params.delete('project')
    params.delete('owner')
    params.delete('companion')
    params.delete('tab')
    if (params.toString() !== search.replace(/^\?/, '')) navigate({ pathname: '/chats', search: params.toString() }, { replace: true })
  }, [accountId, inChats, search, state, session.messages.length, session.projectId, contextProjectId, contextOwnerId, navigate])
  const today = new Date().toISOString().slice(0, 10)
  const usage = state.usage.day === today ? state.usage.count : 0

  function send(prompt) {
    const input = prompt.trim().slice(0, 2000)
    if (!input || pending.current || !routeReady) return
    if (usage >= PREVIEW_LIMIT) { setNotice('You have used today\'s 20 sample replies. You can still review your chats and roadmap.'); return }
    const projectId = inChats ? session.projectId || '' : project?.id || ''
    const projectOwnerId = inChats ? session.projectOwnerId || '' : contextOwnerId
    const base = session.projectId === projectId && (session.projectOwnerId || '') === projectOwnerId ? state : createDraftState(state, projectId, projectOwnerId)
    const sessionId = base.activeId
    pending.current = true; setBusy(true); setNotice('')
    const message = { id: newId(), role: 'user', content: input, time: new Date().toISOString() }
    const reply = sampleReply(input, context, state.settings, state.documents.at(-1))
    if (/^\/(companion|chats)(\?|$)/.test(reply.action?.href || '')) {
      reply.action = { ...reply.action, href: getCompanionUrl({ pathname, search, chatId: sessionId, tab: new URLSearchParams(reply.action.href.split('?')[1]).get('tab') }) }
    }
    setState(appendConversationMessage({ ...base, usage: { day: today, count: usage + 1 } }, sessionId, message))
    timer.current = setTimeout(() => {
      if (accountRef.current !== accountId) return
      setState(prev => appendConversationMessage(prev, sessionId, { id: newId(), role: 'assistant', ...reply, time: new Date().toISOString() }))
      pending.current = false; setBusy(false)
    }, 550)
  }
  function showSession(id, { replace = false, chatTab = false, preserveView = false } = {}) {
    const params = new URLSearchParams(inChats ? search : '')
    for (const key of ['project', 'owner', 'prompt', 'companion']) params.delete(key)
    if (!preserveView) params.delete('view')
    params.set('chat', id)
    if (chatTab) params.delete('tab')
    navigate({ pathname: '/chats', search: params.toString() }, { replace })
  }
  function newChat(projectId = project?.id || '', projectOwnerId = contextOwnerId) {
    if (pending.current) return
    const next = createDraftState(state, projectId, projectOwnerId)
    setState(next)
    setNotice('')
    if (inChats) showSession(next.activeId, { chatTab: true })
  }
  function selectProject(id) {
    if (projectLocked || pending.current || (project?.id || '') === id || (id && !summaries.some(p => p.id === id))) return
    const next = createDraftState(state, id)
    setState(next)
    setNotice('')
    if (inChats) showSession(next.activeId)
  }
  function openSession(id) {
    if (pending.current) return
    const selected = state.sessions.find(item => item.id === id)
    if (!selected) { setNotice('That chat is no longer available.'); return }
    setState(prev => ({ ...prev, activeId: id, projectId: selected.projectId || '' }))
    setNotice('')
    showSession(id, { chatTab: true })
  }
  function renameSession(id, title) {
    if (pending.current) return false
    const next = renameConversation(state, id, title)
    if (next === state) return false
    setState(next)
    return true
  }
  function deleteSession(id) {
    if (pending.current) return
    const next = deleteConversation(state, id)
    setState(next)
    setNotice('')
    if (inChats && next.activeId !== state.activeId) showSession(next.activeId, { replace: true, preserveView: true })
  }
  function saveMemory(memory) {
    if (!memory.title.trim() || !memory.content.trim()) return false
    setState(prev => ({ ...prev, memories: memory.id ? prev.memories.map(m => m.id === memory.id ? { ...memory } : m) : [...prev.memories, { ...memory, id: newId() }].slice(-100) }))
    return true
  }
  async function addDocument(file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setNotice('Choose a file up to 5 MB.'); return }
    if (!/\.(txt|md|pdf|docx|png|jpe?g|webp)$/i.test(file.name)) { setNotice('Use TXT, Markdown, PDF, DOCX, PNG, JPG or WebP.'); return }
    if (state.documents.length >= 10) { setNotice('Remove a document before adding another. This preview stores up to 10.'); return }
    let excerpt = ''
    try { excerpt = /\.(txt|md)$/i.test(file.name) ? (await file.text()).slice(0, 10000) : '' }
    catch { setNotice('This file could not be read. Please choose it again.'); return }
    // Ignore an upload that finishes after the user has switched conversations.
    if (accountRef.current !== accountId || sessionRef.current !== session.id) return
    setState(prev => ({ ...prev, documents: [...prev.documents, { id: newId(), name: file.name.slice(0, 150), size: file.size, excerpt, addedAt: new Date().toISOString() }] }))
    setNotice(`${file.name} added. ${excerpt ? 'A local text excerpt is available.' : 'File details only; analysis needs an AI connection.'}`)
  }
  const value = {
    state, context, projects: contextProjects, projectLocked, session, busy, notice, storageNotice, routeReady, usage, open, setOpen, send, newChat, selectProject, openSession, renameSession, deleteSession, saveMemory, addDocument,
    setNotice, updateSettings: updates => setState(prev => ({ ...prev, settings: { ...prev.settings, ...updates } })),
    removeMemory: id => setState(prev => ({ ...prev, memories: prev.memories.filter(m => m.id !== id) })),
    removeDocument: id => setState(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) })),
    clearMessages: () => { if (!pending.current) setState(prev => ({ ...prev, sessions: prev.sessions.map(s => s.id === prev.activeId ? { ...s, title: 'New conversation', messages: [], updatedAt: new Date().toISOString() } : s) })) },
  }
  return <SharpContext.Provider value={value}>{children}</SharpContext.Provider>
}
