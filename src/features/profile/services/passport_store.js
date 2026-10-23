import { createSafeStorage, localStore } from '../../../services/storage/local_storage.js'
import { mockAuth } from '../../authentication/services/mock_auth.js'
import { projectStore } from '../../projects/services/project_store.js'
import { profileEmail, profileText, profileUrl } from './profile_store.js'
import { validatePassportEvidence } from './profile_files.js'

export const PASSPORT_CHANGE_EVENT = 'labx:passport-change'
export const passportKey = (userId) => `labx:passport:v1:${encodeURIComponent(userId)}`
export const PASSPORT_STATUSES = Object.freeze(['not_applied', 'draft', 'submitted', 'under_review', 'more_info', 'eligible', 'interview_scheduled', 'interview_complete', 'approved', 'rejected', 'renewal_due'])
const editable = new Set(['not_applied', 'draft', 'more_info', 'rejected'])
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const clone = (value) => JSON.parse(JSON.stringify(value))
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const limits = { legal_name: 120, city: 100, country: 100, project_id: 512, venture_name: 120, founder_role: 120, founder_story: 3000 }
const required = new Set(['legal_name', 'country', 'venture_name', 'founder_role', 'founder_story'])
const actionLabels = {
  start_review: 'review started', request_info: 'More information requested', mark_eligible: 'eligibility confirmed',
  schedule_interview: 'interview scheduled', record_interview: 'interview recorded', approve: 'passport approved',
  reject: 'application rejected', mark_renewal_due: 'renewal requested',
}
const transitions = {
  start_review: { from: ['submitted'], to: 'under_review' },
  request_info: { from: ['under_review', 'eligible', 'interview_complete'], to: 'more_info' },
  mark_eligible: { from: ['under_review'], to: 'eligible' },
  schedule_interview: { from: ['eligible'], to: 'interview_scheduled' },
  record_interview: { from: ['interview_scheduled'], to: 'interview_complete' },
  approve: { from: ['eligible', 'interview_complete'], to: 'approved' },
  reject: { from: ['under_review', 'eligible', 'interview_complete'], to: 'rejected' },
  mark_renewal_due: { from: ['approved'], to: 'renewal_due' },
}

function formFor(value, complete = false) {
  if (!isRecord(value)) throw new Error('Enter your passport application details.')
  const form = Object.fromEntries(Object.entries(limits).map(([key, max]) => [key,
    profileText(value[key] ?? '', key.replaceAll('_', ' '), max, complete && required.has(key)),
  ]))
  form.contact_email = profileEmail(value.contact_email ?? '', 'Contact email', complete)
  form.portfolio_url = profileUrl(value.portfolio_url ?? '', 'Portfolio URL')
  form.evidence = validatePassportEvidence(value.evidence ?? [])
  if (typeof (value.consent ?? false) !== 'boolean') throw new Error('Choose whether to consent to this application.')
  form.consent = value.consent ?? false
  if (complete && !form.evidence.length) throw new Error('Attach at least one evidence file.')
  if (complete && !form.consent) throw new Error('Confirm your consent before submitting.')
  return form
}

function emptyApplication(user) {
  return {
    status: 'not_applied',
    form: formFor({ legal_name: user.full_name || '', contact_email: user.email || '' }),
    history: [], feedback: '', interview: null, passport: null, cycle: 1, updatedAt: null,
  }
}

function normalizeApplication(saved, user) {
  const fallback = () => emptyApplication(user)
  if (!isRecord(saved) || saved.version !== 1 || saved.userId !== user.id || !PASSPORT_STATUSES.includes(saved.status)
    || saved.status === 'not_applied' || !validDate(saved.updatedAt)
    || !Number.isSafeInteger(saved.cycle) || saved.cycle < 1 || saved.cycle > 1000
    || !Array.isArray(saved.history) || !saved.history.length || saved.history.length > 200) return fallback()
  try {
    const form = formFor(saved.form, !['draft', 'more_info', 'rejected'].includes(saved.status))
    const feedback = profileText(saved.feedback ?? '', 'Review feedback', 2000)
    if (['more_info', 'rejected'].includes(saved.status) && !feedback) return fallback()
    const history = saved.history.map((entry) => {
      if (!isRecord(entry) || !PASSPORT_STATUSES.includes(entry.status) || !validDate(entry.date)) throw new Error('Invalid history.')
      return { label: profileText(entry.label, 'History label', 120, true), status: entry.status, date: entry.date, reason: profileText(entry.reason ?? '', 'History reason', 2000) }
    })
    if (history.at(-1).status !== saved.status || history.at(-1).date !== saved.updatedAt
      || history.some((entry, index) => index > 0 && Date.parse(entry.date) < Date.parse(history[index - 1].date))) return fallback()
    let interview = null
    if (saved.interview !== null && saved.interview !== undefined) {
      if (!isRecord(saved.interview) || !validDate(saved.interview.scheduledAt)) return fallback()
      interview = {
        scheduledAt: saved.interview.scheduledAt,
        location: profileText(saved.interview.location, 'Interview location', 300, true),
        outcome: profileText(saved.interview.outcome ?? '', 'Interview outcome', 1000),
      }
    }
    if (['interview_scheduled', 'interview_complete'].includes(saved.status) && !interview) return fallback()
    if (saved.status === 'interview_complete' && !interview.outcome) return fallback()
    let passport = null
    if (saved.passport !== null && saved.passport !== undefined) {
      if (!isRecord(saved.passport) || !validDate(saved.passport.issuedAt)
        || typeof saved.passport.number !== 'string' || !/^LABX-DEMO-[A-Z0-9-]{1,80}$/.test(saved.passport.number)) return fallback()
      passport = { number: saved.passport.number, issuedAt: saved.passport.issuedAt }
    }
    if (['approved', 'renewal_due'].includes(saved.status) && !passport) return fallback()
    return { status: saved.status, form, history, feedback, interview, passport, cycle: saved.cycle, updatedAt: saved.updatedAt }
  } catch { return fallback() }
}

export function createPassportStore({ storage = localStore, auth = mockAuth, now = Date.now, projects = projectStore } = {}) {
  const local = storage?.readJSON ? storage : createSafeStorage(storage)
  function actor(userId) {
    const user = auth.getUser()
    if (!user || !userId || user.id !== userId) throw new Error('Your signed-in account changed. Reopen your passport before continuing.')
    if (user.role !== 'founder') throw new Error('Founder Passport applications are for Founders.')
    return user
  }
  function read(userId) {
    const user = actor(userId)
    const application = normalizeApplication(local.readJSON(passportKey(userId)), user)
    actor(userId)
    return clone(application)
  }
  function validateProject(userId, form) {
    if (form.project_id && !projects.listProjects(userId).some((project) => project.owner_id === userId && project.id === form.project_id)) {
      throw new Error('Select one of your current projects, or clear the project selection.')
    }
  }
  function write(userId, application, label, reason = '') {
    actor(userId)
    const date = new Date(now()).toISOString()
    const updated = {
      ...application, updatedAt: date,
      history: [...application.history, { label, status: application.status, date, reason }].slice(-200),
    }
    local.writeJSON(passportKey(userId), { version: 1, userId, ...updated })
    globalThis.window?.dispatchEvent(new Event(PASSPORT_CHANGE_EVENT))
    return clone(updated)
  }
  function prepare(userId, form, complete) {
    actor(userId)
    const application = read(userId)
    if (!editable.has(application.status)) throw new Error('This application is in review. Wait for a request for changes before editing.')
    const next = formFor(form, complete)
    validateProject(userId, next)
    actor(userId)
    return { ...application, form: next }
  }
  function saveDraft(userId, form) {
    const application = prepare(userId, form, false)
    application.status = ['more_info', 'rejected'].includes(application.status) ? application.status : 'draft'
    return write(userId, application, 'Application draft saved')
  }
  function submit(userId, form) {
    const application = prepare(userId, form, true)
    const resubmitted = ['more_info', 'rejected'].includes(application.status)
    return write(userId, { ...application, status: 'submitted', feedback: '', interview: null }, resubmitted ? 'Application resubmitted' : 'Application submitted')
  }
  function simulateReview(userId, action, payload = {}) {
    actor(userId)
    const application = read(userId)
    const transition = Object.hasOwn(transitions, action) ? transitions[action] : null
    if (!transition || !transition.from.includes(application.status)) throw new Error('That review action is unavailable for this application status.')
    if (!isRecord(payload)) throw new Error('Enter the review details.')
    let reason = profileText(payload.reason ?? '', 'Review reason', 2000, ['request_info', 'reject'].includes(action))
    const next = { ...application, status: transition.to }
    if (action === 'request_info' || action === 'reject') next.feedback = reason
    else next.feedback = ''
    if (action === 'schedule_interview') {
      if (!validDate(payload.scheduledAt) || Date.parse(payload.scheduledAt) <= now()) throw new Error('Choose a future interview date and time.')
      next.interview = {
        scheduledAt: new Date(payload.scheduledAt).toISOString(),
        location: profileText(payload.location, 'Interview location', 300, true), outcome: '',
      }
    }
    if (action === 'record_interview') {
      const outcome = profileText(payload.outcome, 'Interview outcome', 1000, true)
      next.interview = { ...application.interview, outcome }
      reason = outcome
    }
    if (action === 'approve') {
      const suffix = userId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-32) || 'FOUNDER'
      next.passport = { number: application.passport?.number || `LABX-DEMO-${suffix}`, issuedAt: new Date(now()).toISOString() }
    }
    return write(userId, next, actionLabels[action], reason)
  }
  function beginRenewal(userId) {
    actor(userId)
    const application = read(userId)
    if (application.status !== 'renewal_due') throw new Error('A renewal can begin after it is marked due during review.')
    if (application.cycle >= 1000) throw new Error('This application has reached its renewal limit.')
    return write(userId, {
      ...application, status: 'draft', cycle: application.cycle + 1,
      form: { ...application.form, consent: false }, feedback: '', interview: null,
    }, 'Passport renewal draft started')
  }
  return { read, saveDraft, submit, simulateReview, beginRenewal }
}

export const passportStore = createPassportStore()
