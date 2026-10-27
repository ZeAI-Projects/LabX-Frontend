import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { History, MessageCircle, Plus, Search, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useSharp } from '../context/sharp_context.js'
import { SharpChat } from '../components/SharpChat.jsx'
import { ChatHistoryGrid } from '../components/ChatHistoryGrid.jsx'
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

function HistoryPanel({ query, onQueryChange, onClose, onViewAll }) {
  const sharp = useSharp()
  const saved = sharp.state.sessions.filter(session => session.messages.length)
  const needle = query.trim().toLocaleLowerCase()
  const sorted = [...saved].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))
  const matches = sorted
    .filter(session => !needle || session.title.toLocaleLowerCase().includes(needle) || session.messages.some(message => message.content.toLocaleLowerCase().includes(needle)))
    .slice(0, 10)
  const groups = ['Today', 'Yesterday', 'Previous 7 days', 'Earlier chats'].map(label => [label, matches.filter(session => dateGroup(session) === label)])
  function newChat() { sharp.newChat(); onClose?.() }
  function openChat(id) { sharp.openSession(id); onClose?.() }
  return <>
    <button className="chats-new-button" type="button" disabled={sharp.busy} onClick={newChat}><Plus size={18}/>New chat</button>
    <div className="chats-history-heading"><span><History size={17}/> Recent chats</span>{onClose && <button type="button" className="sharp-icon-button" aria-label="Close chat history" onClick={onClose}><X size={19}/></button>}</div>
    <label className="chats-search"><Search size={16}/><input type="search" aria-label="Search chats" placeholder="Search chats" value={query} onChange={event => onQueryChange(event.target.value)}/></label>
    <div className="chats-history-list">
      {groups.filter(([, sessions]) => sessions.length).map(([label, sessions]) => <section className="chats-history-group" key={label}><h3>{label}</h3>{sessions.map(session => <button type="button" key={session.id} aria-label={`Open chat: ${session.title}`} aria-current={session.id === sharp.session.id ? 'page' : undefined} disabled={sharp.busy} onClick={() => openChat(session.id)}><MessageCircle size={16}/><span><strong>{session.title}</strong><small>{session.messages.filter(message => message.role === 'user').at(-1)?.content || 'Continue your conversation'}</small></span></button>)}</section>)}
      {!matches.length && <div className="chats-history-empty"><MessageCircle size={23}/><strong>{needle ? 'No recent chats found' : 'Your ideas, all together.'}</strong><p>{needle ? 'Try a different word or phrase.' : 'Start a conversation with Zenith. You can pick it up here anytime.'}</p>{needle && <button type="button" className="sharp-text-link" onClick={() => onQueryChange('')}>Clear search</button>}</div>}
    </div>
    <button className="chats-view-all" type="button" aria-label="View all chats" onClick={onViewAll}><span>View all chats</span><span aria-hidden="true">{saved.length}</span></button>
    <footer className="chats-history-footer"><ShieldCheck size={16}/><p>Saved in this browser for your account.<span>{saved.length} {saved.length === 1 ? 'conversation' : 'conversations'}</span></p></footer>
  </>
}

function HistoryDialog({ onClose, onViewAll, query, onQueryChange }) {
  const dialog = useRef(null)
  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    const node = dialog.current
    node.showModal()
    document.body.style.overflow = 'hidden'
    return () => { node.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus?.() }
  }, [])
  return <dialog ref={dialog} aria-label="Chat history" className="sharp-page chats-history-dialog" onCancel={event => { event.preventDefault(); onClose() }}><HistoryPanel query={query} onQueryChange={onQueryChange} onClose={onClose} onViewAll={onViewAll}/></dialog>
}

export function ChatsPage() {
  const sharp = useSharp()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const prompted = useRef(null)
  const showingAllChats = params.get('view') === 'all'
  const hasConversation = sharp.session.messages.length > 0
  const title = hasConversation ? sharp.session.title : 'New chat'
  const allChats = sharp.state.sessions.filter(session => session.messages.length).sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))
  function showAllChats() {
    setParams(previous => { const next = new URLSearchParams(previous); next.set('view', 'all'); return next })
    setHistoryOpen(false)
  }
  function returnToConversation() {
    setParams(previous => { const next = new URLSearchParams(previous); next.delete('view'); return next })
  }
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
    {sharp.storageNotice && <p className="sharp-notice chats-storage-notice" role="status">{sharp.storageNotice}</p>}
    <div className={`chats-workspace${showingAllChats ? ' chats-workspace--all' : ''}`}>
      {!showingAllChats && <aside className="chats-history-sidebar" aria-label="Chat history"><HistoryPanel query={query} onQueryChange={setQuery} onViewAll={showAllChats}/></aside>}
      <div className="chats-main">
        {showingAllChats
          ? <div className="chats-grid-pane"><ChatHistoryGrid sessions={allChats} activeId={sharp.session.id} busy={sharp.busy} onBack={returnToConversation} onOpen={id => sharp.openSession(id)} onRename={(id, chatTitle) => sharp.renameSession(id, chatTitle)} onDelete={id => sharp.deleteSession(id)}/></div>
          : <>
            <header className="chats-conversation-header"><button className="sharp-icon-button chats-history-toggle" type="button" aria-label="Open chat history" aria-haspopup="dialog" aria-expanded={historyOpen} onClick={() => setHistoryOpen(true)}><History size={20}/></button><div className="chats-conversation-title"><span className="sharp-eyebrow"><Sparkles size={12}/> Zenith</span><h2 title={title}>{title}</h2></div><div className="chats-conversation-tools"><button type="button" className="sharp-icon-button chats-mobile-new" aria-label="New chat" onClick={() => sharp.newChat()} disabled={sharp.busy}><Plus size={18}/></button></div></header>
            <div className="chats-chat-pane"><SharpChat key={sharp.session.id} workspace/></div>
          </>}
      </div>
    </div>
    {historyOpen && <HistoryDialog query={query} onQueryChange={setQuery} onClose={() => setHistoryOpen(false)} onViewAll={showAllChats}/>}
  </div>
}
