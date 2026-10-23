import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUp, FileText, Paperclip, Plus, Sparkles, X } from 'lucide-react'
import { useSharp } from '../context/sharp_context.js'
import { nextMove, QUICK_PROMPTS, PREVIEW_LIMIT } from '../services/sharp_preview.js'
import { SharpRobot } from './SharpRobot.jsx'
import { getCompanionUrl } from '../services/companion_navigation.js'

export function SharpChat({ compact = false, workspace = false, active = true }) {
  const { context, session, send, busy, notice, state, usage, addDocument, newChat, removeDocument } = useSharp()
  const location = useLocation()
  const founderWorkspace = !context.role || context.role === 'founder'
  const [draft, setDraft] = useState('')
  const messages = useRef(null)
  const input = useRef(null)
  const upload = useRef(null)
  const next = nextMove(context)
  function actionUrl(href) {
    if (!/^\/(companion|chats)(?:\?|$)/.test(href)) return href
    const legacy = new URLSearchParams(href.split('?')[1] || '')
    return getCompanionUrl({ ...location, chatId: session.id, projectId: context.project?.id, tab: legacy.get('tab') || 'chat', prompt: legacy.get('prompt') || '' })
  }
  useEffect(() => { if (active) messages.current?.scrollTo({ top: messages.current.scrollHeight, behavior: 'instant' }) }, [session.messages.length, busy, session.id, active])
  useEffect(() => {
    if (!workspace || !input.current) return
    const node = input.current
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }, [draft, workspace])
  function submit(event) { event.preventDefault(); if (!draft.trim() || busy || usage >= PREVIEW_LIMIT) return; send(draft); setDraft(''); input.current?.focus() }
  return <section className={`sharp-chat${compact ? ' sharp-chat--compact' : ''}${workspace ? ' sharp-chat--workspace' : ''}`} aria-label={compact ? 'Zenith quick chat' : 'Conversation with Zenith'}>
    {!compact && !workspace && <header className="sharp-chat__top"><span><span className="sharp-status-dot"/> Your private workspace</span><button className="sharp-icon-button" type="button" onClick={() => newChat()} disabled={busy} aria-label="New conversation"><Plus size={18}/></button></header>}
    <div className="sharp-messages" ref={messages} role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions text">
      {!session.messages.length && <div className="sharp-welcome">
        <span className="sharp-welcome__avatar"><SharpRobot happy expression={busy ? 'thinking' : 'happy'}/></span>
        <span className="sharp-eyebrow">A little clarity. A next step.</span>
        <h2>What are we working on, {context.firstName}?</h2>
        <p>{context.project ? `Let's keep ${context.project.name} moving. We can start with your next mission or work through a blocker.` : founderWorkspace ? 'Start with an idea, a question, or the next step in your founder journey.' : 'Need a hand finding your way? Ask about this screen or your next step in LabX.'}</p>
        <button className="sharp-recommendation" type="button" disabled={busy} onClick={() => send('Brief me on my next move')}><span><Sparkles size={17}/> Your next move</span><strong>{next.title}</strong><small>Build on your existing LabX journey <ArrowUp size={13}/></small></button>
        {compact && <div className="sharp-starters">{(founderWorkspace ? ['What should I work on today?', 'Explain this mission'] : context.role === 'guest' ? ['Help me get started', 'How do I reset my password?'] : ['Help me get started', 'Explore events']).map(prompt => <button key={prompt} disabled={busy || usage >= PREVIEW_LIMIT} onClick={() => send(prompt)} type="button">{prompt}</button>)}</div>}
      </div>}
      {session.messages.map(message => <article className={`sharp-message sharp-message--${message.role}`} key={message.id}>
        {message.role === 'assistant' && <span className="sharp-message__avatar"><SharpRobot/></span>}
        <div className="sharp-message__body"><span className="sharp-message__name">{message.role === 'assistant' ? 'Zenith' : 'You'}{message.role === 'assistant' && <small>Sample response</small>}</span><p>{message.content}</p>
          {message.action && !/^\/(?:companion|chats)\?[^#]*tab=(?:memory|insights|settings)(?:&|$)/.test(message.action.href) && <Link className="sharp-message__action" to={actionUrl(message.action.href)}>{message.action.label}<ArrowUp size={14}/></Link>}
        </div>
      </article>)}
      {busy && <div className="sharp-thinking" role="status"><span/><span/><span/> Preparing a sample reply</div>}
    </div>
    <div className="sharp-composer">
      {state.documents.length > 0 && <details className="sharp-document-tray"><summary><FileText size={14}/>{state.documents.length} attached {state.documents.length === 1 ? 'document' : 'documents'}</summary><div className="sharp-document-tray__list">{state.documents.map(document => <div className="sharp-attached" key={document.id}><div><strong>{document.name}</strong>{document.excerpt && <details><summary>View text excerpt</summary><p>{document.excerpt}</p></details>}</div><button className="sharp-icon-button" type="button" aria-label={`Remove document: ${document.name}`} onClick={() => removeDocument(document.id)}><X size={15}/></button></div>)}</div></details>}
      {notice && <p className="sharp-notice" role="status">{notice}</p>}
      <form onSubmit={submit}>
        <button className="sharp-icon-button" aria-label="Attach a document" type="button" onClick={() => upload.current?.click()}><Paperclip size={18}/></button>
        <input ref={upload} type="file" accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp" hidden onChange={async e => { try { await addDocument(e.target.files?.[0]) } finally { e.target.value = '' } }}/>
        <textarea ref={input} aria-label={compact ? 'Message Zenith in quick chat' : 'Message Zenith'} placeholder="Ask Zenith a question..." value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={1} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form.requestSubmit() } }}/>
        <button className="sharp-send" type="submit" disabled={!draft.trim() || busy || usage >= PREVIEW_LIMIT} aria-label="Send message"><ArrowUp size={19}/></button>
      </form>
      {!compact && <div className="sharp-starters">{QUICK_PROMPTS.map(prompt => <button key={prompt} type="button" disabled={busy || usage >= PREVIEW_LIMIT} onClick={() => send(prompt)}>{prompt}</button>)}</div>}
      <p className="sharp-preview-label">Frontend preview · Sample replies{!compact && ` · ${usage}/${PREVIEW_LIMIT} today`}</p>
    </div>
  </section>
}
