import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, History, MessageCircle, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { useSharp } from '../context/sharp_context.js'
import { SharpChat } from '../components/SharpChat.jsx'
import './ChatsPage.css'

function dateGroup(session) {
  const date = new Date(session.updatedAt || session.messages.at(-1)?.time || session.createdAt)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)
  if (date >= today) return 'Today'
  if (date >= yesterday) return 'Yesterday'
  if (date >= lastWeek) return 'Previous 7 days'
  return 'Earlier chats'
}

function HistoryPanel({ query, onQueryChange, onClose }) {
  const sharp = useSharp()
  const saved = sharp.state.sessions.filter(session => session.messages.length)
  const needle = query.trim().toLocaleLowerCase()
  const matches = [...saved].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))
    .filter(session => !needle || session.title.toLocaleLowerCase().includes(needle) || session.messages.some(message => message.content.toLocaleLowerCase().includes(needle)))
  const groups = ['Today', 'Yesterday', 'Previous 7 days', 'Earlier chats'].map(label => [label, matches.filter(session => dateGroup(session) === label)])
  function newChat() { sharp.newChat(); onClose?.() }
  function openChat(id) { sharp.openSession(id); onClose?.() }
  return <>
    <div className="chats-history-heading"><span><History size={17}/> Chat history</span>{onClose && <button type="button" className="sharp-icon-button" aria-label="Close chat history" onClick={onClose}><X size={19}/></button>}</div>
    <button className="chats-new-button" type="button" disabled={sharp.busy} onClick={newChat}><Plus size={18}/>New chat</button>
    <label className="chats-search"><Search size={16}/><input type="search" aria-label="Search chats" placeholder="Search chats" value={query} onChange={event => onQueryChange(event.target.value)}/></label>
    <div className="chats-history-list">
      {groups.filter(([, sessions]) => sessions.length).map(([label, sessions]) => <section className="chats-history-group" key={label}><h3>{label}</h3>{sessions.map(session => <button type="button" key={session.id} aria-label={`Open chat: ${session.title}`} aria-current={session.id === sharp.session.id ? 'page' : undefined} disabled={sharp.busy} onClick={() => openChat(session.id)}><MessageCircle size={16}/><span><strong>{session.title}</strong><small>{session.messages.filter(message => message.role === 'user').at(-1)?.content || 'Continue your conversation'}</small></span></button>)}</section>)}
      {!matches.length && <div className="chats-history-empty"><MessageCircle size={23}/><strong>{needle ? 'No chats found' : 'Your ideas, all together.'}</strong><p>{needle ? 'Try a different word or phrase.' : 'Start a conversation with Zenith. You can pick it up here anytime.'}</p>{needle && <button type="button" className="sharp-text-link" onClick={() => onQueryChange('')}>Clear search</button>}</div>}
    </div>
    <footer className="chats-history-footer"><ShieldCheck size={16}/><p>Saved in this browser for your account.<span>{saved.length} {saved.length === 1 ? 'conversation' : 'conversations'}</span></p></footer>
  </>
}

function HistoryDialog({ onClose, query, onQueryChange }) {
  const dialog = useRef(null)
  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    const node = dialog.current
    node.showModal()
    document.body.style.overflow = 'hidden'
    return () => { node.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus?.() }
  }, [])
  return <dialog ref={dialog} aria-label="Chat history" className="sharp-page chats-history-dialog" onCancel={event => { event.preventDefault(); onClose() }}><HistoryPanel query={query} onQueryChange={onQueryChange} onClose={onClose}/></dialog>
}

function ChatEditor({ action, session, onClose }) {
  const sharp = useSharp()
  const [title, setTitle] = useState(session.title)
  const dialog = useRef(null)
  const deleting = action === 'delete'
  useEffect(() => {
    const previousFocus = document.activeElement
    const node = dialog.current
    node.showModal()
    return () => {
      node.close()
      requestAnimationFrame(() => {
        if (previousFocus?.isConnected && !previousFocus.disabled) previousFocus.focus()
        else document.querySelector('.chats-main [aria-label="Message Zenith"]')?.focus()
      })
    }
  }, [])
  function submit(event) {
    event.preventDefault()
    if (sharp.busy || (!deleting && !title.trim())) return
    if (deleting) sharp.deleteSession(session.id)
    else sharp.renameSession(session.id, title.trim())
    onClose()
  }
  return <dialog ref={dialog} className="sharp-memory-dialog chats-edit-dialog" aria-labelledby="chats-edit-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <header><div><span className="sharp-eyebrow">Your conversations</span><h2 id="chats-edit-title">{deleting ? 'Delete chat?' : 'Rename chat'}</h2></div><button type="button" className="sharp-icon-button" aria-label="Close chat editor" onClick={onClose}><X size={19}/></button></header>
    <form onSubmit={submit}>{deleting ? <p className="chats-delete-copy">Delete <strong>“{session.title}”</strong>? This conversation will be removed from your chat history. This cannot be undone.</p> : <label>Chat name<input aria-label="Chat name" value={title} onChange={event => setTitle(event.target.value)} maxLength={70} required autoFocus/></label>}<footer><button className="sharp-button" type="button" autoFocus={deleting} onClick={onClose}>Cancel</button><button className={`sharp-button ${deleting ? 'chats-delete-button' : 'sharp-button--primary'}`} type="submit" disabled={sharp.busy || (!deleting && !title.trim())}>{deleting ? 'Delete chat' : 'Save name'}</button></footer></form>
  </dialog>
}

export function ChatsPage() {
  const sharp = useSharp()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const prompted = useRef(null)
  const project = sharp.context.project
  const hasConversation = sharp.session.messages.length > 0
  const title = hasConversation ? sharp.session.title : 'New chat'
  useEffect(() => {
    const prompt = params.get('prompt')
    if (!prompt) { prompted.current = null; return }
    if (!['brief', 'quest'].includes(prompt) || prompted.current === prompt || sharp.busy || !sharp.routeReady) return
    prompted.current = prompt
    sharp.send(prompt === 'quest' ? 'Quest Help' : 'Brief me on my next move')
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (next.get('prompt') === prompt) next.delete('prompt')
      return next
    }, { replace: true })
  }, [params, sharp, setParams])

  return <div className="sharp-page chats-page">
    <header className="chats-page-header"><div className="chats-page-title"><span className="chats-mark"><MessageCircle size={24}/></span><div><h1>Chats</h1><p>A place for every conversation with Zenith.</p></div></div><span className="chats-zenith-label"><span className="sharp-status-dot"/>Zenith<span>AI</span></span></header>
    {sharp.storageNotice && <p className="sharp-notice chats-storage-notice" role="status">{sharp.storageNotice}</p>}
    <div className="chats-workspace">
      <aside className="chats-history-sidebar" aria-label="Chat history"><HistoryPanel query={query} onQueryChange={setQuery}/></aside>
      <div className="chats-main">
        <header className="chats-conversation-header"><button className="sharp-icon-button chats-history-toggle" type="button" aria-label="Open chat history" aria-haspopup="dialog" aria-expanded={historyOpen} onClick={() => setHistoryOpen(true)}><History size={20}/></button><div className="chats-conversation-title"><span className="sharp-eyebrow"><Sparkles size={12}/> Zenith</span><h2 title={title}>{title}</h2></div><div className="chats-conversation-tools"><button type="button" className="sharp-icon-button chats-mobile-new" aria-label="New chat" onClick={() => sharp.newChat()} disabled={sharp.busy}><Plus size={18}/></button><button type="button" className="sharp-icon-button" aria-label="Rename chat" title="Rename chat" disabled={sharp.busy || !hasConversation} onClick={() => setEditing('rename')}><Pencil size={16}/></button><button type="button" className="sharp-icon-button" aria-label="Delete chat" title="Delete chat" disabled={sharp.busy || !hasConversation} onClick={() => setEditing('delete')}><Trash2 size={16}/></button></div></header>
        {sharp.context.role === 'founder' && (project || sharp.projects.length > 0) && <div className="chats-project-context"><span>Project</span>{sharp.projectLocked ? <strong>{project?.name || 'Unavailable'}</strong> : <label><select aria-label="Active project" value={project?.id || ''} disabled={sharp.busy} onChange={event => sharp.selectProject(event.target.value)}>{!project && <option value="">No project selected</option>}{sharp.projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={13}/></label>}{project?.stage && <small>{project.stage} · Level {project.level}</small>}</div>}
        <div className="chats-chat-pane"><SharpChat key={sharp.session.id} workspace/></div>
      </div>
    </div>
    {historyOpen && <HistoryDialog query={query} onQueryChange={setQuery} onClose={() => setHistoryOpen(false)}/>}
    {editing && <ChatEditor action={editing} session={sharp.session} onClose={() => setEditing(null)}/>}
  </div>
}
