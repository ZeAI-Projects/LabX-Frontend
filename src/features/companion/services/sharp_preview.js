import { getCompanionRoadmapRoute } from './companion_navigation.js'

export const MEMORY_CATEGORIES = ['About You', 'Your Venture', 'Goals & Vision', 'Decisions', 'Preferences', 'Journey & Milestones', 'Important Conversations', 'Documents']
export const QUICK_PROMPTS = ['Next Move', 'Review My Startup', 'Quest Help', 'Brainstorm', 'Investor Readiness']
export const PREVIEW_LIMIT = 20
export const sharpKey = id => `labx:sharp:v1:${encodeURIComponent(id)}`
export const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
const text = (value, max = 2000) => typeof value === 'string' ? value.slice(0, max) : ''
export const defaultSettings = { tone: 'Encouraging', depth: 'Balanced', style: 'Practical steps', memoryEnabled: true, dockEnabled: true, setupComplete: false }
export function createConversation(projectId = '', projectOwnerId = '') {
  const now = new Date().toISOString()
  return { id: newId(), title: 'New conversation', messages: [], projectId, projectOwnerId, createdAt: now, updatedAt: now }
}
export function freshState() {
  const session = createConversation()
  return { settings: { ...defaultSettings }, memories: [], documents: [], sessions: [session], activeId: session.id, projectId: '', usage: { day: '', count: 0 } }
}
export function normalizeState(raw) {
  const empty = freshState()
  if (!raw || typeof raw !== 'object') return empty
  const settings = { ...defaultSettings }
  for (const [key, choices] of Object.entries({ tone: ['Encouraging', 'Direct', 'Analytical'], depth: ['Concise', 'Balanced', 'Detailed'], style: ['Practical steps', 'Ask questions', 'Strategic perspective'] })) {
    if (choices.includes(raw.settings?.[key])) settings[key] = raw.settings[key]
  }
  for (const key of ['memoryEnabled', 'dockEnabled', 'setupComplete']) if (typeof raw.settings?.[key] === 'boolean') settings[key] = raw.settings[key]
  const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : ''
  const ids = new Set()
  const sessions = (Array.isArray(raw.sessions) ? raw.sessions : []).flatMap(s => {
    const id = text(s?.id, 80)
    if (!id || ids.has(id)) return []
    ids.add(id)
    const messages = (Array.isArray(s.messages) ? s.messages : []).filter(m => m && ['user', 'assistant'].includes(m.role)).map((m, index) => ({
      id: text(m.id, 80) || `${id}-message-${index}`, role: m.role, content: text(m.content, 5000), time: validDate(m.time),
      action: /^\/(roadmap|events|chats|companion|profile|login|register|forgot-password|reset-password|dashboard)(\/|\?|$)/.test(m.action?.href || '') ? { href: text(m.action.href, 350), label: text(m.action.label, 70) } : null,
    }))
    const createdAt = validDate(s.createdAt) || messages.find(m => m.time)?.time || '1970-01-01T00:00:00.000Z'
    const updatedAt = validDate(s.updatedAt) || messages.findLast(m => m.time)?.time || createdAt
    const projectId = text(s.projectId, 100)
    const legacySharedRoute = messages.map(message => getCompanionRoadmapRoute(message.action?.href?.split('?')[0])).findLast(route => route?.kind === 'joined' && route.projectId === projectId)
    return [{ id, title: text(s.title, 70).trim() || messages.find(m => m.role === 'user')?.content.slice(0, 55) || 'New conversation', projectId, projectOwnerId: text(s.projectOwnerId, 100) || legacySharedRoute?.ownerId || '', createdAt, updatedAt, messages }]
  })
  const memories = (Array.isArray(raw.memories) ? raw.memories : []).slice(0, 100).filter(m => m && MEMORY_CATEGORIES.includes(m.category)).map(m => ({ id: text(m.id, 80), category: m.category, title: text(m.title, 80), content: text(m.content) }))
  const documents = (Array.isArray(raw.documents) ? raw.documents : []).slice(0, 10).filter(d => d && typeof d.name === 'string').map(d => ({ id: text(d.id, 80), name: text(d.name, 150), size: Math.max(0, Number(d.size) || 0), excerpt: text(d.excerpt, 10000), addedAt: text(d.addedAt, 40) }))
  return { ...empty, settings, sessions: sessions.length ? sessions : empty.sessions, activeId: sessions.some(s => s.id === raw.activeId) ? raw.activeId : sessions.at(-1)?.id || empty.activeId, projectId: text(raw.projectId, 100), memories, documents, usage: { day: text(raw.usage?.day, 10), count: Number.isInteger(raw.usage?.count) ? Math.max(0, Math.min(raw.usage.count, PREVIEW_LIMIT)) : 0 } }
}
export function nextMove(context) {
  if (context.role === 'guest') {
    if (context.screen === '/register') return { title: 'Create your LabX account', detail: 'Enter your name and email, choose Founder, Investor or Mentor, then set and confirm your password. Verify your email on the next screen.', action: { label: 'Back to sign in', href: '/login' } }
    if (['/forgot-password', '/reset-password'].includes(context.screen)) return { title: 'Reset your password', detail: 'Enter your registered email, then use the six-digit code on the reset screen and enter matching new passwords. Zenith cannot send or verify codes. Never share passwords or codes in chat.', action: { label: 'Back to sign in', href: '/login' } }
    if (context.screen === '/verify-email') return { title: 'Verify your email', detail: 'Enter the six-digit code in the verification form. Use the resend option if needed. Keep your verification code out of chat.', action: { label: 'Back to sign in', href: '/login' } }
    return { title: 'Welcome to LabX', detail: 'Sign in with your registered email and password, or create an account as a Founder, Investor or Mentor. Use Forgot Password if you need to reset your password.', action: { label: 'Create an account', href: '/register' } }
  }
  if (context.role === 'mentor' || context.role === 'investor') return { title: `Explore your ${context.role} profile`, detail: `Keep your ${context.role === 'mentor' ? 'expertise and availability' : 'investment focus and preferences'} up to date, then browse events and opportunities in LabX.`, action: { label: 'View your profile', href: '/profile' } }
  const p = context.project
  if (!p) return { title: 'Give your idea a starting point', detail: 'Create a project. Eight assessment questions will help establish your starting context.', action: { label: 'Create a project', href: '/roadmap/new' } }
  if (!p.assessmentCompleted) return { title: 'Finish your founder assessment', detail: `${p.answeredCount} of ${p.totalQuestions} questions answered for ${p.name}. Your answers will help shape the guidance here.`, action: { label: 'Continue assessment', href: p.href } }
  if (!p.roadmap) return { title: 'Review your saved assessment', detail: 'Your assessment is saved. Review its result to check the available roadmap context.', action: { label: 'View assessment', href: p.href } }
  if (p.roadmap.isComplete) return { title: 'Reflect on your completed roadmap', detail: 'Review the evidence behind your progress and choose what you want to build next.', action: { label: 'Review roadmap', href: p.href } }
  if (p.isJoined && !p.currentMilestone) return { title: 'Check your next assignment', detail: 'There is no current mission assigned to you. Ask the main founder about your next assignment, or review your team\'s progress.', action: { label: 'View roadmap', href: p.href } }
  const mission = p.currentMilestone
  return { title: mission?.name || 'Explore your current mission', detail: `${p.stage} · Level ${p.level}. ${mission?.description || 'Work on the next available mission in your existing roadmap.'}`, action: { label: 'Open current mission', href: mission ? `${p.href}?stage=${encodeURIComponent(p.stage)}&milestone=${encodeURIComponent(mission.id)}` : p.href } }
}
export function sampleReply(prompt, context, settings = defaultSettings, document = null) {
  const q = prompt.toLowerCase()
  const p = context.project
  const next = nextMove(context)
  const subject = p ? `For ${p.name}${p.domain ? ` in ${p.domain}` : ''}` : 'For your next idea'
  let content, action = next.action
  if (context.role === 'guest') {
    const recovery = /password|forgot|reset/.test(q)
    const guidance = recovery ? nextMove({ ...context, screen: '/forgot-password' }) : next
    content = `${guidance.title}\n\n${guidance.detail}\n\nThis frontend uses sample guidance. Enter account details only in the LabX forms; do not send passwords or verification codes here.`
    action = recovery ? { href: '/forgot-password', label: 'Reset password' } : guidance.action
  } else if (context.role === 'mentor' || context.role === 'investor') {
    content = `${context.firstName}, ${next.detail}\n\n${/event|opportunit/.test(q) ? 'Open Events & Opportunities to browse, search and filter the catalogue.' : 'Your profile and dashboard are the starting points for your LabX journey.'}\n\nThis is sample guidance in the frontend preview.`
    action = /event|opportunit/.test(q) ? { href: '/events', label: 'Explore events' } : next.action
  } else if (/remember|memory/.test(q)) {
    content = 'Your conversations are saved in Chats. Reopen a chat from history to continue it, or search for an earlier message.'
    action = { href: '/chats', label: 'View chats' }
  } else if (/document|pitch deck|upload|file/.test(q)) {
    action = null
    content = document?.excerpt
      ? `Your text preview starts with:\n\n“${document.excerpt.slice(0, 280)}”\n\nA useful review would check: who the customer is, which problem is evidenced, and what action you want the reader to take. This preview has not analyzed or verified the document.`
      : document ? `${document.name} is attached locally. This frontend can show its file details; PDF, image and document analysis need an AI connection. You can paste a short section into chat to try the sample review flow.` : 'Attach a text file, PDF, document or image using the paperclip. Text and Markdown files show a short local excerpt. Other formats show file details in this frontend preview.'
  } else if (/investor|fundrais|readiness/.test(q)) {
    content = `${subject}, start with evidence rather than a score.\n\n1. Customer problem and interview findings.\n2. Product demonstration and usage evidence.\n3. Business model, traction and financial assumptions.\n4. A clear pitch and a specific funding ask.\n\nInvestor-readiness scoring and matching are planned capabilities. This preview does not assess investment eligibility.`
    action = { href: '/profile?tab=passport', label: 'View founder profile' }
  } else if (/brainstorm|idea|creative/.test(q)) {
    content = `${subject}, try three small experiments:\n\n1. A manual version of the service for one target user.\n2. A simple prototype focused on the single hardest assumption.\n3. Five conversations about the last time someone faced the problem.\n\nWhich assumption would you test first? These are sample prompts to help frame your work.`
  } else if (/review|startup|insight/.test(q)) {
    content = `${subject}, here is the context available in LabX:\n\n${p ? `Project: ${p.name}\nDomain: ${p.domain || 'Not selected yet'}\nPosition: ${p.stage ? `${p.stage}, Level ${p.level}` : 'Assessment pending'}\n` : 'No project is selected yet.\n'}\nThe next useful focus is: ${next.title}.\n\nWhat evidence do you already have, and what is still an assumption? This is a sample review, not an evaluation of your startup.`
  } else if (/quest|mission|milestone|help/.test(q)) {
    content = p?.isJoined && !p.currentMilestone && !p.roadmap?.isComplete
      ? `${next.title}\n\n${next.detail}\n\nYou can review the roadmap while you wait for an assignment. Chatting here does not complete missions or award points.`
      : `${next.title}\n\n${next.detail}\n\nA simple working plan:\n1. State the outcome you want from this mission.\n2. Gather one concrete piece of evidence.\n3. Draft your deliverable, then review the mission requirements.\n\nOpen the existing mission when you are ready to work. Chatting here does not complete it or award points.`
  } else if (/next|today|brief|work on|where/.test(q)) {
    content = `${context.firstName}, your next move is ${next.title.toLowerCase()}.\n\n${next.detail}\n\nFocus on one useful outcome before moving on. What is getting in the way right now?`
  } else {
    content = `You said: “${prompt.slice(0, 220)}”\n\n${subject}, I would connect that question to ${next.title.toLowerCase()}. What do you already know, what evidence supports it, and what is the smallest test you could run next?\n\nThis frontend uses sample replies. A live AI connection will be needed for open-ended conversation.`
  }
  if (settings.tone === 'Direct') content = `Let's make the next step concrete.\n\n${content}`
  if (settings.tone === 'Analytical') content = `Separate evidence, assumptions and the next experiment.\n\n${content}`
  if (settings.depth === 'Concise') content = content.split('\n\n').slice(0, 2).join('\n\n')
  if (settings.depth === 'Detailed') content += '\n\nBefore acting, write down the outcome, the evidence you need, and the decision that evidence would change.'
  if (settings.style === 'Ask questions') content += '\n\nWhat would a useful outcome look like for you?'
  if (settings.style === 'Strategic perspective') content += '\n\nChoose the action that reduces your biggest uncertainty, rather than adding more tasks.'
  return { content, action }
}
