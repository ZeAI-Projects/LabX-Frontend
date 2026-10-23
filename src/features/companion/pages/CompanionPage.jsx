import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpen, BrainCircuit, Check, FileText, History, Lightbulb, MessageCircle, Pencil, Plus, Settings2, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { useSharp } from '../context/sharp_context.js'
import { MEMORY_CATEGORIES, nextMove, PREVIEW_LIMIT } from '../services/sharp_preview.js'
import { SharpRobot } from '../components/SharpRobot.jsx'
import { SharpChat } from '../components/SharpChat.jsx'

const tabs = [['chat', 'Chat', MessageCircle], ['memory', 'Memory', BrainCircuit], ['insights', 'Insights', Lightbulb], ['settings', 'Settings', Settings2]]

function MemoryEditor({ memory, onClose }) {
  const { saveMemory } = useSharp()
  const [form, setForm] = useState(memory || { category: 'Goals & Vision', title: '', content: '' })
  const dialog = useRef(null)
  useEffect(() => {
    const previousFocus = document.activeElement
    const node = dialog.current
    node.showModal()
    return () => { node.close(); previousFocus?.focus?.() }
  }, [])
  return <dialog ref={dialog} className="sharp-memory-dialog" aria-labelledby="sharp-memory-title" onCancel={e => { e.preventDefault(); e.stopPropagation(); onClose() }}>
    <header><div><span className="sharp-eyebrow">You control what matters</span><h2 id="sharp-memory-title">{memory ? 'Edit memory' : 'Add a memory'}</h2></div><button className="sharp-icon-button" type="button" onClick={onClose} aria-label="Close memory editor"><X size={20}/></button></header>
    <form onSubmit={e => { e.preventDefault(); if (saveMemory(form)) onClose() }}>
      <label>Category<select aria-label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{MEMORY_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
      <label>Memory title<input aria-label="Memory title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={80} autoFocus/></label>
      <label>What should Zenith remember?<textarea aria-label="What should Zenith remember?" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required maxLength={2000} rows={5}/></label>
      <p className="sharp-muted">Saved in this browser for your account. You can edit or delete it at any time.</p>
      <footer><button className="sharp-button" type="button" onClick={onClose}>Cancel</button><button className="sharp-button sharp-button--primary" type="submit">Save memory</button></footer>
    </form>
  </dialog>
}

export function MemoryView() {
  const sharp = useSharp()
  const [category, setCategory] = useState('All')
  const [editor, setEditor] = useState(null)
  const filtered = sharp.state.memories.filter(m => category === 'All' || m.category === category)
  return <section className="sharp-tab-body">
    <header className="sharp-section-header"><div><span className="sharp-eyebrow">Venture memory</span><h2>A little context goes a long way.</h2><p>Keep the details that should guide your next conversation.</p></div><button className="sharp-button sharp-button--primary" onClick={() => setEditor({})} type="button"><Plus size={16}/> Add memory</button></header>
    <div className="sharp-memory-summary"><ShieldCheck size={20}/><span>You decide what is remembered. {sharp.state.settings.memoryEnabled ? 'Saved context is enabled for sample replies.' : 'Memory context is paused in Settings.'}</span><strong>{sharp.state.memories.length} saved</strong></div>
    <div className="sharp-category-filters" aria-label="Memory categories">{['All', ...MEMORY_CATEGORIES].map(c => <button type="button" aria-pressed={c === category} onClick={() => setCategory(c)} key={c}>{c}<span>{c === 'All' ? sharp.state.memories.length : sharp.state.memories.filter(m => m.category === c).length}</span></button>)}</div>
    <div className="sharp-memory-grid">{filtered.length ? filtered.map(memory => <article className="sharp-memory-card" key={memory.id}><span className="sharp-eyebrow">{memory.category}</span><h3>{memory.title}</h3><p>{memory.content}</p><footer><button className="sharp-text-link" type="button" onClick={() => setEditor(memory)} aria-label={`Edit memory: ${memory.title}`}><Pencil size={14}/>Edit</button><button className="sharp-text-link sharp-text-link--danger" type="button" onClick={() => sharp.removeMemory(memory.id)} aria-label={`Delete memory: ${memory.title}`}><Trash2 size={14}/>Delete</button></footer></article>) : <div className="sharp-empty"><BrainCircuit size={32}/><h3>No memories here yet.</h3><p>Add a goal, decision or preference, or save a useful reply from chat.</p></div>}</div>
    <DocumentsView/>

    {editor && <MemoryEditor memory={editor.id ? editor : null} onClose={() => setEditor(null)}/>}
  </section>
}

export function InsightsView({ onTabChange }) {
  const { context, send, busy } = useSharp()
  const next = nextMove(context)
  const p = context.project
  return <section className="sharp-tab-body"><header className="sharp-section-header"><div><span className="sharp-eyebrow">Your journey, in focus</span><h2>Clarity before more activity.</h2><p>These prompts use the project information already available in LabX.</p></div></header><div className="sharp-insight-grid">
    <article className="sharp-insight sharp-insight--next"><span className="sharp-eyebrow"><Sparkles size={15}/> Your next move</span><h3>{next.title}</h3><p>{next.detail}</p><Link className="sharp-button sharp-button--primary" to={next.action.href}>{next.action.label}<ArrowRight size={15}/></Link></article>
    <article className="sharp-insight"><BookOpen size={24}/><h3>Your existing progress</h3><strong className="sharp-insight-number">{p?.roadmap ? `${p.roadmap.completedCount} / ${p.roadmap.totalCount}` : p ? `${p.answeredCount} / ${p.totalQuestions}` : 'A fresh start'}</strong><p>{p?.roadmap ? 'Missions completed in this project. Placement credits stay separate.' : 'Assessment answers saved. Chat does not award points or complete work.'}</p></article>
    <article className="sharp-insight"><Lightbulb size={24}/><h3>Make room for one experiment</h3><p>Identify a risky assumption, choose a small test, and decide what evidence would change your mind.</p><button className="sharp-text-link" disabled={busy} type="button" onClick={() => { onTabChange('chat'); send('Brainstorm') }}>Brainstorm with Zenith<ArrowRight size={15}/></button></article>
    <article className="sharp-insight sharp-insight--future"><ShieldCheck size={24}/><span className="sharp-chip">Future capability</span><h3>Investor readiness</h3><p>Explore a sample checklist for customer evidence, traction, business model and pitch materials. Readiness scores and matching are not available.</p><button className="sharp-text-link" type="button" disabled={busy} onClick={() => { onTabChange('chat'); send('Investor Readiness') }}>Explore the checklist<ArrowRight size={15}/></button></article>
  </div></section>
}

function DocumentsView() {
  const sharp = useSharp()
  const upload = useRef(null)
  return <section className="sharp-documents"><header className="sharp-section-header"><div><h2>Documents</h2><p>Up to 10 files, 5 MB each. Text excerpts and file details are local previews.</p></div><button className="sharp-button" type="button" onClick={() => upload.current.click()}><Plus size={16}/> Add document</button><input hidden ref={upload} type="file" accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={async e => { try { await sharp.addDocument(e.target.files?.[0]) } finally { e.target.value = '' } }}/></header>
      {sharp.notice && <p className="sharp-notice" role="status">{sharp.notice}</p>}
      {sharp.state.documents.length ? sharp.state.documents.map(doc => <article className="sharp-document" key={doc.id}><FileText size={22}/><div><strong>{doc.name}</strong><small>{Math.max(1, Math.round(doc.size / 1024))} KB · {doc.excerpt ? 'Text preview available' : 'File details only'}</small>{doc.excerpt && <details><summary>View text excerpt</summary><p>{doc.excerpt}</p></details>}</div><button className="sharp-icon-button" type="button" onClick={() => sharp.removeDocument(doc.id)} aria-label={`Remove document: ${doc.name}`}><Trash2 size={16}/></button></article>) : <p className="sharp-muted">No documents added. PDF, image and DOCX analysis will need an AI connection.</p>}
    </section>
}

export function SettingsView() {
  const sharp = useSharp()
  const [saved, setSaved] = useState(false)
  return <section className="sharp-tab-body"><header className="sharp-section-header"><div><span className="sharp-eyebrow">One companion. Your way.</span><h2>How should we work together?</h2><p>Your assessment already provides context. Choose the guidance style that suits you.</p></div></header>
    <form className="sharp-settings" onSubmit={e => { e.preventDefault(); sharp.updateSettings({ setupComplete: true }); setSaved(true) }}>
      <fieldset><legend>Communication style</legend>{[['tone', 'Personality', ['Encouraging', 'Direct', 'Analytical']], ['depth', 'Response depth', ['Concise', 'Balanced', 'Detailed']], ['style', 'Mentoring style', ['Practical steps', 'Ask questions', 'Strategic perspective']]].map(([key, label, options]) => <label key={key}>{label}<select aria-label={label} value={sharp.state.settings[key]} onChange={e => { sharp.updateSettings({ [key]: e.target.value }); setSaved(false) }}>{options.map(option => <option key={option}>{option}</option>)}</select></label>)}<p className="sharp-muted">These preferences change the sample responses in this preview.</p></fieldset>
      <fieldset><legend>Your controls</legend><label className="sharp-setting-toggle"><span><strong>Show the floating companion</strong><small>Quick access on other screens. Conversations are saved in Chats.</small></span><input type="checkbox" checked={sharp.state.settings.dockEnabled} onChange={e => sharp.updateSettings({ dockEnabled: e.target.checked })}/></label><div className="sharp-setting-static"><span><strong>Voice conversations</strong><small>Planned for a connected AI experience. This preview uses text.</small></span><span className="sharp-chip">Coming later</span></div></fieldset>
      <div className="sharp-settings-footer"><div><strong>{sharp.usage} / {PREVIEW_LIMIT} sample replies today</strong><p className="sharp-muted">Chats and file excerpts stay in this browser for this account.</p></div><button className="sharp-button sharp-button--primary" type="submit">{saved ? <><Check size={16}/>Preferences saved</> : 'Save preferences'}</button></div>
      <button className="sharp-text-link sharp-text-link--danger" type="button" disabled={sharp.busy} onClick={() => { sharp.clearMessages(); sharp.setNotice('The current conversation was cleared.') }}>Clear current conversation</button>{sharp.notice && <p className="sharp-notice" role="status">{sharp.notice}</p>}
    </form>
    <DocumentsView/>
  </section>
}

export function CompanionPage({ embedded = false }) {
  const sharp = useSharp()
  const [params, setParams] = useSearchParams()
  const prompted = useRef(false)
  const tabKey = embedded ? 'companion' : 'tab'
  const tab = tabs.some(([id]) => id === params.get(tabKey)) ? params.get(tabKey) : 'chat'
  const project = sharp.context.project
  function changeTab(id) {
    setParams(previous => {
      const nextParams = new URLSearchParams(previous)
      nextParams.set(tabKey, id)
      nextParams.delete('prompt')
      return nextParams
    }, { replace: true })
  }
  useEffect(() => {
    const prompt = params.get('prompt')
    if (!['brief', 'quest'].includes(prompt) || prompted.current || sharp.busy) return
    prompted.current = true
    sharp.send(prompt === 'quest' ? 'Quest Help' : 'Brief me on my next move')
    setParams(previous => {
      const nextParams = new URLSearchParams(previous)
      if (nextParams.get('prompt') === prompt) nextParams.delete('prompt')
      return nextParams
    }, { replace: true })
  }, [params, sharp, setParams])
  const next = nextMove(sharp.context)
  return <div className={`sharp-page${embedded ? ' sharp-page--embedded' : ''}`}>
    {!embedded && <header className="sharp-page-header"><span className="sharp-header-robot"><SharpRobot/></span><div><span className="sharp-eyebrow">Your personalized founder companion</span><h1>Zenith <span>AI</span></h1><p>Same ambition. A little more clarity.</p></div><span className="sharp-chip sharp-chip--preview"><span className="sharp-status-dot"/> Frontend preview</span></header>}
    <nav className="sharp-tabs" aria-label="Companion sections">{tabs.map(([id, label, Icon]) => <button type="button" key={id} aria-current={id === tab ? 'page' : undefined} onClick={() => changeTab(id)}><Icon size={17}/>{label}{id === 'memory' && sharp.state.memories.length > 0 && <span>{sharp.state.memories.length}</span>}</button>)}</nav>
    {tab === 'chat' ? <div className="sharp-workspace">
      <aside className="sharp-profile-panel"><div className="sharp-portrait"><span className="sharp-orbit"/><SharpRobot happy/><span className="sharp-portrait-label">Zenith</span></div><p>Your mentor, companion<br/>and guide.</p><div className="sharp-journey"><span className="sharp-eyebrow">Your journey</span>{sharp.projects.length ? <><label htmlFor={sharp.projectLocked ? undefined : "sharp-project"}>{sharp.projectLocked ? "Current roadmap" : "Active project"}</label>{sharp.projectLocked ? <strong className="sharp-current-project">{project?.name}</strong> : <select id="sharp-project" value={project?.id || ''} disabled={sharp.busy} onChange={e => sharp.selectProject(e.target.value)}>{sharp.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}<strong>{project?.stage ? `${project.stage} · Level ${project.level}` : 'Assessment pending'}</strong><small>{project?.domain || 'Your domain starts with the assessment'}</small><div className="sharp-progress"><span style={{ width: `${project?.roadmap?.progressPercent || 0}%` }}/></div></> : <><strong>Your next chapter starts here.</strong><Link to="/roadmap/new" className="sharp-text-link">Create a project<ArrowRight size={14}/></Link></>}</div><button className="sharp-button" type="button" onClick={() => sharp.newChat()} disabled={sharp.busy}><Plus size={16}/> New conversation</button><div className="sharp-history"><span className="sharp-eyebrow"><History size={13}/> Recent conversations</span>{sharp.state.sessions.filter(s => s.messages.length).slice(-4).reverse().map(s => <button key={s.id} type="button" className={s.id === sharp.state.activeId ? 'is-active' : ''} disabled={sharp.busy} onClick={() => sharp.openSession(s.id)}><MessageCircle size={13}/><span>{s.title}</span></button>)}{!sharp.state.sessions.some(s => s.messages.length) && <small>Your conversations will appear here.</small>}</div></aside>
      <SharpChat/>
      <aside className="sharp-context-panel"><section><span className="sharp-eyebrow"><BrainCircuit size={14}/> Context</span><h2>Built around your journey.</h2>{[['Project', project?.name || 'Not selected'], ['Domain', project?.domain || 'Not selected'], ['Position', project?.stage ? `${project.stage} · Level ${project.level}` : 'Assessment pending']].map(([label, value]) => <div className="sharp-context-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}<button type="button" onClick={() => changeTab('memory')} className="sharp-text-link">Manage memory <ArrowRight size={14}/></button></section><section className="sharp-context-next"><span className="sharp-eyebrow"><Sparkles size={14}/> Next useful step</span><h3>{next.title}</h3><p>{next.detail}</p><Link to={next.action.href} className="sharp-text-link">{next.action.label}<ArrowRight size={14}/></Link></section><div className="sharp-private-note"><ShieldCheck size={18}/><p>Private by design in this preview. Nothing is posted to your profile or community.</p></div></aside>
    </div> : tab === 'memory' ? <MemoryView/> : tab === 'insights' ? <InsightsView onTabChange={changeTab}/> : <SettingsView/>}
  </div>
}
