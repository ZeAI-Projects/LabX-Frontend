import { memo, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUp, Plus, Sparkles } from 'lucide-react'
import { useSharp } from '../context/sharp_context.js'
import { nextMove, QUICK_PROMPTS, PREVIEW_LIMIT } from '../services/sharp_preview.js'
import { SharpRobot } from './SharpRobot.jsx'
import { getCompanionUrl } from '../services/companion_navigation.js'

const NEW_CHAT_PROMPTS = QUICK_PROMPTS.filter(prompt => prompt !== 'Next Move')
const COMPACT_FOUNDER_PROMPTS = ['What should I work on today?', 'Explain this mission']
const COMPACT_GUEST_PROMPTS = ['Help me get started', 'How do I reset my password?']
const COMPACT_MEMBER_PROMPTS = ['Help me get started', 'Explore events']

function WelcomePanel({ context, busy, compact, workspace, usage, send }) {
  const founderWorkspace = !context.role || context.role === 'founder'
  const suggestionPrompts = context.role === 'guest' ? COMPACT_GUEST_PROMPTS : founderWorkspace ? COMPACT_FOUNDER_PROMPTS : COMPACT_MEMBER_PROMPTS
  const guidance = context.project
    ? `Let's keep ${context.project.name} moving. We can start with your next mission or work through a blocker.`
    : founderWorkspace
      ? 'Start with an idea, a question, or the next step in your founder journey.'
      : 'Need a hand finding your way? Ask about this screen or your next step in LabX.'

  return <div className="sharp-welcome">
    <span className="sharp-welcome__avatar"><SharpRobot happy expression={busy ? 'thinking' : 'happy'}/></span>
    <span className="sharp-eyebrow">A little clarity. A next step.</span>
    <h2>What are we working on, {context.firstName}?</h2>
    <p>{guidance}</p>
    {!workspace && <button className="sharp-recommendation" type="button" disabled={busy} onClick={() => send('Brief me on my next move')}>
      <span><Sparkles size={17}/> Your next move</span>
      <strong>{nextMove(context).title}</strong>
      <small>Build on your existing LabX journey <ArrowUp size={13}/></small>
    </button>}
    {!compact && <div className="sharp-prompt-cards" aria-label="Suggested prompts">
      {NEW_CHAT_PROMPTS.map(prompt => <button className="sharp-recommendation sharp-prompt-card" key={prompt} type="button" disabled={busy || usage >= PREVIEW_LIMIT} onClick={() => send(prompt)}>
        <span><Sparkles size={15}/> Suggested prompt</span>
        <strong>{prompt}</strong>
        <small>Start a conversation <ArrowUp size={12}/></small>
      </button>)}
    </div>}
    {compact && <div className="sharp-starters">
      {suggestionPrompts.map(prompt => <button key={prompt} disabled={busy || usage >= PREVIEW_LIMIT} onClick={() => send(prompt)} type="button">{prompt}</button>)}
    </div>}
  </div>
}

const ChatMessage = memo(function ChatMessage({ message, sessionId, projectId }) {
  const location = useLocation()
  const actionUrl = href => {
    if (!/^\/(companion|chats)(?:\?|$)/.test(href)) return href
    const legacy = new URLSearchParams(href.split('?')[1] || '')
    return getCompanionUrl({ ...location, chatId: sessionId, projectId, tab: legacy.get('tab') || 'chat', prompt: legacy.get('prompt') || '' })
  }
  const showAction = message.action && !/^\/(?:companion|chats)\?[^#]*tab=(?:memory|insights|settings)(?:&|$)/.test(message.action.href)
  const sender = message.role === 'assistant' ? 'Zenith' : 'You'

  return <article className={`sharp-message sharp-message--${message.role}`}>
    {message.role === 'assistant' && <span className="sharp-message__avatar"><SharpRobot/></span>}
    <div className="sharp-message__body">
      <span className="sharp-message__name">{sender}{message.role === 'assistant' && <small>Sample response</small>}{message.time && <time className="sharp-message__time" dateTime={message.time}>{new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>}</span>
      <div className="sharp-message__bubble">
        <p>{message.content}</p>
        {showAction && <Link className="sharp-message__action" to={actionUrl(message.action.href)}>{message.action.label}<ArrowUp size={14}/></Link>}
      </div>
    </div>
  </article>
})

function ChatMessageList({ messages, busy, context, session, compact, workspace, usage, send, messageContainer }) {
  return <div className={`sharp-messages${messages.length ? '' : ' sharp-messages--welcome'}`} ref={messageContainer} role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions text">
    {!messages.length && <WelcomePanel context={context} busy={busy} compact={compact} workspace={workspace} usage={usage} send={send}/>}
    {messages.map(message => <ChatMessage key={message.id} message={message} sessionId={session.id} projectId={context.project?.id}/>)}
    {busy && <div className="sharp-thinking" role="status"><span/><span/><span/> Preparing a sample reply</div>}
  </div>
}

function ChatComposer({ compact, workspace, founderWorkspace, busy, usage, notice, projects, projectLocked, context, selectProject, send }) {
  const [draft, setDraft] = useState('')
  const input = useRef(null)

  useEffect(() => {
    if (!workspace || !input.current) return
    input.current.style.height = 'auto'
    input.current.style.height = `${input.current.scrollHeight}px`
  }, [draft, workspace])

  function submit(event) {
    event.preventDefault()
    if (!draft.trim() || busy || usage >= PREVIEW_LIMIT) return
    send(draft)
    setDraft('')
    input.current?.focus()
  }

  return <div className="sharp-composer">
    {notice && <p className="sharp-notice" role="status">{notice}</p>}
    <form onSubmit={submit}>
      {workspace && founderWorkspace && !projectLocked && projects.length > 0 && <select className="chats-composer-project" aria-label="Project" value={context.project?.id || ''} disabled={busy} onChange={event => selectProject(event.target.value)}>
        <option value="">No project</option>
        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>}
      <div className="sharp-composer-input">
        <textarea ref={input} aria-label={compact ? 'Message Zenith in quick chat' : 'Message Zenith'} placeholder="Ask Zenith a question..." value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={1} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            event.currentTarget.form.requestSubmit()
          }
        }}/>
      </div>
      <button className="sharp-send" type="submit" disabled={!draft.trim() || busy || usage >= PREVIEW_LIMIT} aria-label="Send message"><ArrowUp size={19}/></button>
    </form>
    <p className="sharp-preview-label">Frontend preview · Sample replies{!compact && ` · ${usage}/${PREVIEW_LIMIT} today`}</p>
  </div>
}

export function SharpChat({ compact = false, workspace = false, active = true }) {
  const { context, session, send, busy, notice, usage, newChat, projects, projectLocked, selectProject } = useSharp()
  const messageContainer = useRef(null)
  const founderWorkspace = !context.role || context.role === 'founder'

  useEffect(() => {
    if (active) messageContainer.current?.scrollTo({ top: messageContainer.current.scrollHeight, behavior: 'instant' })
  }, [session.messages.length, busy, session.id, active])

  return <section className={`sharp-chat${compact ? ' sharp-chat--compact' : ''}${workspace ? ' sharp-chat--workspace' : ''}`} aria-label={compact ? 'Zenith quick chat' : 'Conversation with Zenith'}>
    {!compact && !workspace && <header className="sharp-chat__top">
      <span><span className="sharp-status-dot"/> Your private workspace</span>
      <button className="sharp-icon-button" type="button" onClick={() => newChat()} disabled={busy} aria-label="New conversation"><Plus size={18}/></button>
    </header>}
    <ChatMessageList messages={session.messages} busy={busy} context={context} session={session} compact={compact} workspace={workspace} usage={usage} send={send} messageContainer={messageContainer}/>
    <ChatComposer compact={compact} workspace={workspace} founderWorkspace={founderWorkspace} busy={busy} usage={usage} notice={notice} projects={projects} projectLocked={projectLocked} context={context} selectProject={selectProject} send={send}/>
  </section>
}
