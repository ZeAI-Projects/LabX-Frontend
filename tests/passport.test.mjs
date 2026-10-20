import test from 'node:test'
import assert from 'node:assert/strict'
import { createPassportStore, passportKey } from '../src/features/profile/services/passport_store.js'

const founder = { id: 'passport-founder', role: 'founder', full_name: 'Passport Founder', email: 'founder@example.org' }
const originalNow = Date.parse('2026-10-20T10:00:00Z')
function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) }
}
function fixture() {
  const storage = memoryStorage()
  let current = founder
  let clock = originalNow
  let owned = [{ id: 'owned-project', owner_id: founder.id }]
  const auth = { getUser: () => current }
  const projects = { listProjects: () => owned }
  const store = createPassportStore({ storage, auth, projects, now: () => clock })
  return { store, storage, auth, projects, now: () => clock, advance(ms = 1000) { clock += ms }, switchUser(user) { current = user }, deleteProject() { owned = [] } }
}
function form(overrides = {}) {
  const bytes = Buffer.from('%PDF-1.4\nFounder venture evidence\n%%EOF')
  return {
    legal_name: 'Founder Name', contact_email: 'founder@example.org', city: 'Chennai', country: 'India',
    project_id: 'owned-project', venture_name: 'Local Venture', founder_role: 'Co-founder',
    founder_story: 'I am building a focused product with customer research.',
    portfolio_url: 'https://example.org/portfolio',
    evidence: [{ name: 'venture.pdf', type: 'application/pdf', size: bytes.length, dataUrl: `data:application/pdf;base64,${bytes.toString('base64')}` }],
    consent: true, ...overrides,
  }
}
function eligible(app) {
  app.store.submit(founder.id, form())
  app.store.simulateReview(founder.id, 'start_review')
  return app.store.simulateReview(founder.id, 'mark_eligible')
}

test('partial drafts persist without submitting and valid applications require explicit evidence and consent', () => {
  const app = fixture()
  assert.equal(app.store.read(founder.id).status, 'not_applied')
  assert.equal(app.store.read(founder.id).form.contact_email, founder.email)
  const draft = app.store.saveDraft(founder.id, { legal_name: 'Draft Founder' })
  assert.equal(draft.status, 'draft')
  assert.equal(draft.form.consent, false)
  assert.deepEqual(draft.form.evidence, [])
  assert.deepEqual(createPassportStore({ storage: app.storage, auth: app.auth, projects: app.projects }).read(founder.id), draft)
  for (const key of ['legal_name', 'contact_email', 'country', 'venture_name', 'founder_role', 'founder_story']) {
    assert.throws(() => app.store.submit(founder.id, form({ [key]: '' })))
  }
  assert.throws(() => app.store.submit(founder.id, form({ consent: false })), /consent/)
  assert.throws(() => app.store.submit(founder.id, form({ evidence: [] })), /at least one/)
  assert.throws(() => app.store.saveDraft(founder.id, form({ contact_email: 'bad' })), /valid contact/)
  assert.throws(() => app.store.saveDraft(founder.id, form({ portfolio_url: 'javascript:alert(1)' })), /HTTPS/)
  assert.deepEqual(app.store.read(founder.id), draft)
  const submitted = app.store.submit(founder.id, form())
  assert.equal(submitted.status, 'submitted')
  assert.equal(submitted.history.at(-1).label, 'Application submitted')
  assert.equal(submitted.passport, null)
  assert.throws(() => app.store.saveDraft(founder.id, form()), /in review/)
  assert.throws(() => app.store.submit(founder.id, form()), /in review/)
})

test('review transitions, reasons, more-information edits and explicit resubmission are enforced', () => {
  const app = fixture()
  assert.throws(() => app.store.simulateReview(founder.id, 'approve'), /unavailable/)
  app.store.submit(founder.id, form())
  assert.throws(() => app.store.simulateReview(founder.id, 'mark_eligible'), /unavailable/)
  app.store.simulateReview(founder.id, 'start_review')
  assert.throws(() => app.store.simulateReview(founder.id, 'request_info', { reason: ' ' }), /required/)
  const requested = app.store.simulateReview(founder.id, 'request_info', { reason: '  Clarify the venture evidence.  ' })
  assert.equal(requested.status, 'more_info')
  assert.equal(requested.feedback, 'Clarify the venture evidence.')
  const saved = app.store.saveDraft(founder.id, form({ founder_story: 'Updated founder story.' }))
  assert.equal(saved.status, 'more_info')
  assert.equal(saved.feedback, requested.feedback)
  const resubmitted = app.store.submit(founder.id, saved.form)
  assert.equal(resubmitted.status, 'submitted')
  assert.equal(resubmitted.feedback, '')
  assert.equal(resubmitted.history.at(-1).label, 'Application resubmitted')
  app.store.simulateReview(founder.id, 'start_review')
  app.store.simulateReview(founder.id, 'reject', { reason: 'Evidence does not meet this simulated review.' })
  assert.equal(app.store.read(founder.id).status, 'rejected')
  assert.throws(() => app.store.simulateReview(founder.id, 'approve'), /unavailable/)
  assert.equal(app.store.submit(founder.id, form()).status, 'submitted')
  assert.ok(app.store.read(founder.id).history.some((entry) => entry.status === 'rejected' && entry.reason))
})

test('interview requires future schedule and an outcome, and approval remains an explicit simulation', () => {
  const app = fixture()
  eligible(app)
  for (const scheduledAt of ['invalid', new Date(originalNow).toISOString(), new Date(originalNow - 1).toISOString()]) {
    assert.throws(() => app.store.simulateReview(founder.id, 'schedule_interview', { scheduledAt, location: 'Video room' }), /future interview/)
  }
  const scheduledAt = new Date(originalNow + 86400000).toISOString()
  assert.throws(() => app.store.simulateReview(founder.id, 'schedule_interview', { scheduledAt, location: '' }), /required/)
  const scheduled = app.store.simulateReview(founder.id, 'schedule_interview', { scheduledAt, location: 'Demo video room' })
  assert.deepEqual(scheduled.interview, { scheduledAt, location: 'Demo video room', outcome: '' })
  assert.throws(() => app.store.simulateReview(founder.id, 'approve'), /unavailable/)
  assert.throws(() => app.store.simulateReview(founder.id, 'record_interview', { outcome: ' ' }), /required/)
  const interviewed = app.store.simulateReview(founder.id, 'record_interview', { outcome: 'Needs further work; this is a simulated interview.' })
  assert.equal(interviewed.status, 'interview_complete')
  assert.equal(interviewed.passport, null)
  assert.ok(interviewed.history.at(-1).reason.includes('Needs further work'))
  const approved = app.store.simulateReview(founder.id, 'approve')
  assert.equal(approved.status, 'approved')
  assert.match(approved.passport.number, /^LABX-DEMO-/)
  assert.equal(approved.passport.issuedAt, new Date(originalNow).toISOString())
  assert.equal(Object.hasOwn(approved, 'points'), false)
  assert.equal(Object.hasOwn(approved, 'privileges'), false)
  assert.equal(Object.hasOwn(approved, 'verified'), false)
  assert.equal(app.auth.getUser().role, 'founder')
})

test('renewal is explicitly marked due, preserves history and passport, and requires fresh consent', () => {
  const app = fixture()
  eligible(app)
  const approved = app.store.simulateReview(founder.id, 'approve')
  assert.throws(() => app.store.beginRenewal(founder.id), /marked due/)
  app.store.simulateReview(founder.id, 'mark_renewal_due')
  const renewal = app.store.beginRenewal(founder.id)
  assert.equal(renewal.status, 'draft')
  assert.equal(renewal.cycle, 2)
  assert.equal(renewal.form.consent, false)
  assert.deepEqual(renewal.passport, approved.passport)
  assert.deepEqual(renewal.form.evidence, approved.form.evidence)
  assert.ok(renewal.history.length > approved.history.length)
  assert.throws(() => app.store.submit(founder.id, renewal.form), /consent/)
  app.advance(86400000)
  app.store.submit(founder.id, { ...renewal.form, consent: true })
  app.store.simulateReview(founder.id, 'start_review')
  app.store.simulateReview(founder.id, 'mark_eligible')
  const renewed = app.store.simulateReview(founder.id, 'approve')
  assert.equal(renewed.passport.number, approved.passport.number)
  assert.notEqual(renewed.passport.issuedAt, approved.passport.issuedAt)
})

test('only owned existing project selections can be saved; historical applications survive project deletion', () => {
  const app = fixture()
  assert.throws(() => app.store.saveDraft(founder.id, form({ project_id: 'foreign-project' })), /current projects/)
  assert.throws(() => app.store.submit(founder.id, form({ project_id: 'foreign-project' })), /current projects/)
  app.store.submit(founder.id, form())
  app.deleteProject()
  assert.equal(app.store.read(founder.id).status, 'submitted')
  assert.equal(app.store.read(founder.id).form.project_id, 'owned-project')
  app.store.simulateReview(founder.id, 'start_review')
  app.store.simulateReview(founder.id, 'request_info', { reason: 'Update the selected venture.' })
  assert.throws(() => app.store.submit(founder.id, form()), /current projects/)
  assert.equal(app.store.submit(founder.id, form({ project_id: '' })).status, 'submitted')
})

test('passport data and evidence remain account-scoped, founder-only and protected from stale writes', () => {
  const app = fixture()
  app.store.saveDraft(founder.id, form())
  const before = app.store.read(founder.id)
  const other = { ...founder, id: 'second-founder', email: 'second@example.org' }
  app.switchUser(other)
  for (const method of ['read', 'saveDraft', 'submit', 'beginRenewal', 'simulateReview']) {
    assert.throws(() => app.store[method](founder.id, form()), /account changed/)
  }
  assert.equal(app.store.read(other.id).status, 'not_applied')
  assert.deepEqual(app.store.read(other.id).form.evidence, [])
  for (const role of ['mentor', 'investor']) {
    app.switchUser({ ...founder, role })
    assert.throws(() => app.store.read(founder.id), /for Founders/)
    assert.throws(() => app.store.submit(founder.id, form()), /for Founders/)
  }
  app.switchUser(null)
  assert.throws(() => app.store.read(founder.id), /account changed/)
  app.switchUser(founder)
  assert.deepEqual(app.store.read(founder.id), before)
  before.form.evidence[0].name = 'mutated.pdf'
  assert.equal(app.store.read(founder.id).form.evidence[0].name, 'venture.pdf')
})

test('corrupt or foreign records cannot create approved passports and invalid evidence cannot overwrite a draft', () => {
  const app = fixture()
  const saved = app.store.saveDraft(founder.id, form())
  assert.throws(() => app.store.saveDraft(founder.id, form({ evidence: [{ ...form().evidence[0], dataUrl: 'javascript:alert(1)' }] })))
  assert.deepEqual(app.store.read(founder.id), saved)
  const key = passportKey(founder.id)
  for (const record of [
    null, [],
    { version: 1, userId: 'other-founder', ...saved },
    { version: 1, userId: founder.id, ...saved, status: 'approved' },
    { version: 1, userId: founder.id, ...saved, form: { ...saved.form, consent: 'yes' } },
    { version: 1, userId: founder.id, ...saved, updatedAt: 'invalid' },
    { version: 1, userId: founder.id, ...saved, history: [] },
  ]) {
    app.storage.setItem(key, JSON.stringify(record))
    assert.equal(app.store.read(founder.id).status, 'not_applied')
    assert.equal(app.store.read(founder.id).passport, null)
  }
})

test('account changes during project validation are rechecked before passport persistence', () => {
  const storage = memoryStorage()
  let current = founder
  const store = createPassportStore({
    storage, auth: { getUser: () => current },
    projects: { listProjects() { current = { ...founder, id: 'changed' }; return [{ id: 'owned-project', owner_id: founder.id }] } },
  })
  assert.throws(() => store.submit(founder.id, form()), /account changed/)
  assert.equal(storage.getItem(passportKey(founder.id)), null)
})
