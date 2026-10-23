import { useEffect, useRef, useState } from 'react'
import { Award, ArrowRight, Calendar, Check, CheckCircle2, Clock, Download, FileCheck2, FileText, Globe, LockKeyhole, MessageSquare, RefreshCw, Send, Shield, Sparkles } from 'lucide-react'
import { ProfileDialog, ProfileField } from './ProfileDialog.jsx'
import { passportStore } from '../services/passport_store.js'
import { readProfileFile, validatePassportEvidence } from '../services/profile_files.js'

const STATUS_LABELS = {
  not_applied: 'Not applied', draft: 'Draft', submitted: 'Submitted', under_review: 'Under review',
  more_info: 'More information needed', eligible: 'Eligible', interview_scheduled: 'Interview scheduled',
  interview_complete: 'Interview completed', approved: 'Approved', rejected: 'Not approved', renewal_due: 'Renewal due',
}
const EDITABLE = ['not_applied', 'draft', 'more_info', 'rejected']
const formatDate = (date) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(date))
const safeDocument = (file) => typeof file?.dataUrl === 'string' && /^data:(application\/pdf|image\/png|image\/jpeg|image\/webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(file.dataUrl) ? file.dataUrl : null

function ApplicationDialog({ user, profile, application, projects, onClose, onChanged }) {
  const [form, setForm] = useState(() => ({
    legal_name: profile.full_name ?? '', contact_email: user.email ?? '', city: profile.city ?? '', country: profile.country ?? '',
    venture_name: profile.startup?.name ?? '', founder_role: '', founder_story: '', portfolio_url: profile.portfolio ?? '',
    evidence: [], consent: false, ...(application.status === 'not_applied' ? {} : application.form),
    project_id: projects.some((project) => project.id === application.form?.project_id) ? application.form.project_id : '',
  }))
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const errorRef = useRef(null)
  const mountedRef = useRef(true)
  const uploadVersion = useRef(0)
  const resubmit = ['more_info', 'rejected'].includes(application.status)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; uploadVersion.current += 1 } }, [])
  function change(key, value) { setForm((previous) => ({ ...previous, [key]: value })) }
  function fail(err) {
    setError(err.message || 'Your application could not be saved.')
    requestAnimationFrame(() => errorRef.current?.focus())
  }
  async function addEvidence(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (!files.length) return
    const version = ++uploadVersion.current
    setReading(true)
    setError('')
    try {
      if (form.evidence.length + files.length > 3) throw new Error('Add up to 3 supporting files.')
      if (form.evidence.reduce((total, file) => total + file.size, 0) + files.reduce((total, file) => total + file.size, 0) > 2 * 1024 * 1024) throw new Error('Supporting files must total 2 MiB or less.')
      const assets = await Promise.all(files.map((file) => readProfileFile(file, 'evidence')))
      const next = [...form.evidence, ...assets]
      validatePassportEvidence(next)
      if (mountedRef.current && uploadVersion.current === version) change('evidence', next)
    } catch (err) {
      if (mountedRef.current && uploadVersion.current === version) fail(err)
    } finally {
      if (mountedRef.current && uploadVersion.current === version) setReading(false)
    }
  }
  function persist(submit) {
    if (reading) return
    try {
      if (submit) passportStore.submit(user.id, form)
      else passportStore.saveDraft(user.id, form)
      onChanged(submit ? 'Your application was submitted for simulated review. No real verification has taken place.' : 'Application draft saved on this browser.')
      onClose()
    } catch (err) { fail(err) }
  }
  return <ProfileDialog title="Founder Passport application" eyebrow="Private application" onClose={onClose} wide>
    <form onSubmit={(event) => { event.preventDefault(); persist(true) }}>
      <div className="pf-dialog-content">
        <p className="pf-note pf-form-intro">Your application and evidence are private. Save a draft at any time, or complete the required fields to submit for review.</p>
        {error && <p className="pf-message pf-message--error" role="alert" ref={errorRef} tabIndex={-1}>{error}</p>}
        {application.feedback && <p className="pf-message"><strong>Review feedback</strong><br />{application.feedback}</p>}
        <h3 className="pf-form-section"><span>01</span>Your details</h3>
        <div className="pf-form-grid">
          {[
            ['legal_name', 'Legal name', 120, true], ['contact_email', 'Contact email', 254, true],
            ['city', 'City', 100, false], ['country', 'Country', 100, true],
          ].map(([key, label, maxLength, required]) => <ProfileField key={key} label={label} required={required}><input aria-label={label} value={form[key]} type={key === 'contact_email' ? 'email' : 'text'} onChange={(event) => change(key, event.target.value)} maxLength={maxLength} required={required} /></ProfileField>)}
        </div>
        <h3 className="pf-form-section"><span>02</span>Your venture</h3>
        <div className="pf-form-grid">
          <ProfileField label="Linked project (optional)"><select aria-label="Linked project (optional)" value={form.project_id} onChange={(event) => { const project = projects.find((item) => item.id === event.target.value); setForm((previous) => ({ ...previous, project_id: event.target.value, venture_name: previous.venture_name || project?.name || '' })) }}><option value="">No linked project</option>{form.project_id && !projects.some((project) => project.id === form.project_id) && <option value={form.project_id}>Linked project unavailable — choose no linked project</option>}{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></ProfileField>
          <ProfileField label="Venture name" required><input aria-label="Venture name" value={form.venture_name} maxLength={120} required onChange={(event) => change('venture_name', event.target.value)} /></ProfileField>
          <ProfileField label="Founder role" required><input aria-label="Founder role" value={form.founder_role} maxLength={120} required placeholder="e.g. Founder or co-founder" onChange={(event) => change('founder_role', event.target.value)} /></ProfileField>
          <ProfileField label="Portfolio / evidence link (optional)"><input aria-label="Portfolio / evidence link (optional)" type="url" value={form.portfolio_url} maxLength={2048} placeholder="https://" onChange={(event) => change('portfolio_url', event.target.value)} /></ProfileField>
        </div>
        <ProfileField label="Founder story" required hint="Describe your venture, your contribution, and the progress represented by your evidence."><textarea aria-label="Founder story" rows={4} value={form.founder_story} required maxLength={3000} onChange={(event) => change('founder_story', event.target.value)} /></ProfileField>
        <h3 className="pf-form-section"><span>03</span>Supporting evidence</h3>
        <div className="pf-upload-zone">
          <ProfileField label="Supporting evidence" required hint="PDF, PNG, JPEG, or WEBP · up to 3 files, 1 MiB each and 2 MiB combined."><input type="file" aria-label="Supporting evidence" aria-required="true" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" multiple onChange={addEvidence} disabled={reading} /></ProfileField>
          {form.evidence.length > 0 && <ul className="pf-file-list">{form.evidence.map((file, index) => <li key={`${file.name}-${index}`}><FileCheck2 size={17} aria-hidden="true" /><span>{file.name}<small>{Math.ceil(file.size / 1024)} KiB · saved with this application</small></span><button className="pf-text-button" type="button" disabled={reading} aria-label={`Remove evidence: ${file.name}`} onClick={() => change('evidence', form.evidence.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></li>)}</ul>}
          {reading && <p className="pf-note" role="status">Reading supporting evidence…</p>}
        </div>
        <label className="pf-consent"><input type="checkbox" aria-label="I confirm these details and supporting files are mine to submit." checked={form.consent} required onChange={(event) => change('consent', event.target.checked)} /><span>I confirm these details and supporting files are mine to submit.<span className="pf-required" aria-hidden="true">*</span></span></label>
        <p className="pf-note">This bounded form demonstrates the application flow. It is not an official eligibility policy. You can save a draft and continue using LabX without applying.</p>
      </div>
      <footer className="pf-dialog-actions"><button type="button" className="pf-button" onClick={onClose}>Cancel</button><button type="button" className="pf-button" disabled={reading} onClick={() => persist(false)}>Save draft</button><button type="submit" className="pf-button pf-button--gold" disabled={reading}><Send size={15} aria-hidden="true" />{resubmit ? 'Resubmit application' : 'Submit application'}</button></footer>
    </form>
  </ProfileDialog>
}

function ReviewSimulator({ user, application, onChanged }) {
  const [reason, setReason] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [outcome, setOutcome] = useState('')
  const [error, setError] = useState('')
  const status = application.status
  const canFeedback = ['under_review', 'eligible', 'interview_complete'].includes(status)
  function review(action, payload = {}) {
    try {
      passportStore.simulateReview(user.id, action, payload)
      setError('')
      onChanged('Review state updated. No real reviewer, interview booking, or entitlement was created.')
    } catch (err) { setError(err.message || 'This simulated review could not be saved.') }
  }
  return <details className="pf-simulator">
    <summary><Sparkles size={16} aria-hidden="true" />Review simulator<span>Preview controls</span></summary>
    <div className="pf-simulator-body">
      <p className="pf-note">These controls play the reviewer role so you can explore the workflow. They are separate from your application actions. Decisions, interviews, passport numbers, and renewal notices are simulations.</p>
      {error && <p className="pf-message pf-message--error" role="alert">{error}</p>}
      {status === 'submitted' && <button type="button" className="pf-button" onClick={() => review('start_review')}>Start review</button>}
      {canFeedback && <ProfileField label="Review feedback" required hint="Required when requesting more information or rejecting an application."><textarea aria-label="Review feedback" rows={3} value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} /></ProfileField>}
      {status === 'eligible' && <div className="pf-form-grid">
        <ProfileField label="Interview date and time" required hint="Uses your device's local time."><input aria-label="Interview date and time" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></ProfileField>
        <ProfileField label="Interview location" required><input aria-label="Interview location" value={location} maxLength={300} placeholder="Meeting room or venue" onChange={(event) => setLocation(event.target.value)} /></ProfileField>
      </div>}
      {status === 'interview_scheduled' && <ProfileField label="Interview outcome" required><textarea aria-label="Interview outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={3} maxLength={1000} /></ProfileField>}
      <div className="pf-inline-actions">
        {canFeedback && <button type="button" className="pf-button" onClick={() => review('request_info', { reason })}>Request more information</button>}
        {status === 'under_review' && <button type="button" className="pf-button" onClick={() => review('mark_eligible')}>Mark eligible</button>}
        {status === 'eligible' && <button type="button" className="pf-button" onClick={() => { if (!scheduledAt || !Number.isFinite(Date.parse(scheduledAt))) { setError('Choose a future interview date and time.'); return }; review('schedule_interview', { scheduledAt: new Date(scheduledAt).toISOString(), location }) }}>Schedule interview</button>}
        {status === 'interview_scheduled' && <button type="button" className="pf-button" onClick={() => review('record_interview', { outcome })}>Record interview outcome</button>}
        {['eligible', 'interview_complete'].includes(status) && <button type="button" className="pf-button pf-button--gold" onClick={() => review('approve')}>Approve application</button>}
        {canFeedback && <button type="button" className="pf-button pf-button--danger" onClick={() => review('reject', { reason })}>Reject application</button>}
        {status === 'approved' && <button type="button" className="pf-button" onClick={() => review('mark_renewal_due')}>Mark renewal due</button>}
      </div>
      {['not_applied', 'draft', 'more_info', 'rejected', 'renewal_due'].includes(status) && <p className="pf-note">Submit an application or renewal to make review controls available.</p>}
    </div>
  </details>
}

export function PassportPanel({ user, profile, application, projects, onChanged }) {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const approved = application.status === 'approved'
  const renewal = application.status === 'renewal_due'
  const editable = EDITABLE.includes(application.status)
  const history = application.history ?? []
  const actionLabel = application.status === 'not_applied' ? 'Apply for Founder Passport' : application.status === 'draft' ? 'Continue draft' : application.status === 'more_info' ? 'Update application' : 'Revise and resubmit'
  function beginRenewal() {
    try {
      passportStore.beginRenewal(user.id)
      onChanged('Renewal draft opened. Earlier review history is retained.')
      setApplying(true)
      setError('')
    } catch (err) { setError(err.message || 'Your renewal could not be started.') }
  }
  function checkEvidenceDownload(event, file) {
    try {
      const current = passportStore.read(user.id)
      if (!current.form.evidence.some((saved) => saved.name === file.name && saved.type === file.type && saved.size === file.size && saved.dataUrl === file.dataUrl)) {
        throw new Error('This evidence is no longer in the current application. Reopen your application before downloading.')
      }
    } catch (err) {
      event.preventDefault()
      setError(err.message || 'This evidence is unavailable for the signed-in account.')
    }
  }
  return <div className="pf-passport-panel">
    <section className="pf-passport-hero" aria-labelledby="pf-passport-heading">
      <div><span className="pf-eyebrow"><Shield size={14} aria-hidden="true" />Optional founder recognition</span><h2 id="pf-passport-heading">Your Founder Passport</h2><p>A place for your founder story, supporting evidence, and application journey. Keep building with or without it.</p><span className={`pf-status${approved ? ' pf-status--gold' : ''}`} data-passport-status={application.status}><span />{STATUS_LABELS[application.status]}</span><div className="pf-inline-actions">{editable && <button className="pf-button pf-button--gold" type="button" onClick={() => setApplying(true)}>{actionLabel}<ArrowRight size={15} aria-hidden="true" /></button>}{renewal && <button className="pf-button pf-button--gold" type="button" onClick={beginRenewal}><RefreshCw size={15} aria-hidden="true" />Start renewal</button>}</div><p className="pf-note">Local application · no real verification, physical card, or partner access.</p></div>
      <div className={`pf-passport-card${approved ? ' pf-passport-card--active' : ''}`} aria-label={approved ? 'Founder Passport' : 'Founder Passport preview'}><div><span>Lab<span className="pf-logo-x">X</span></span><Shield size={24} aria-hidden="true" /></div><span className="pf-passport-card__seal"><Shield size={45} aria-hidden="true" /><Sparkles size={18} aria-hidden="true" /></span><span className="pf-passport-card__caption">Founder Passport</span><strong>{profile.full_name}</strong><span className="pf-passport-card__number">{approved && application.passport?.number ? application.passport.number.replace(/^LABX-DEMO-/, 'LABX-') : 'NOT ISSUED'}</span><small>{approved ? 'Approved · not identity verification' : 'Optional recognition · no active entitlement'}</small></div>
    </section>
    {error && <p className="pf-message pf-message--error" role="alert">{error}</p>}
    <div className="pf-passport-layout">
      <section className="pf-panel" aria-labelledby="pf-application-title">
        <div className="pf-panel-heading"><h3 id="pf-application-title"><FileText size={17} aria-hidden="true" />Application status</h3><span className="pf-muted">Cycle {application.cycle || 1}</span></div>
        <div className="pf-application-status"><span className="pf-round-icon">{approved ? <CheckCircle2 size={25} aria-hidden="true" /> : application.status === 'more_info' ? <MessageSquare size={25} aria-hidden="true" /> : <Clock size={25} aria-hidden="true" />}</span><div><strong>{STATUS_LABELS[application.status]}</strong><p>{application.status === 'not_applied' ? 'Your everyday LabX experience is available without a passport application.' : application.status === 'draft' ? 'Your draft is private. Add your details and evidence when you are ready.' : application.status === 'more_info' ? 'Review the feedback, update your application, and submit it again.' : approved ? 'The review is complete. This status is distinct from earned achievement badges.' : renewal ? 'A simulated renewal notice is available. No production expiry period has been assigned.' : application.status === 'rejected' ? 'Review the reason below. You can revise and resubmit your application.' : 'Your application is saved. Review decisions can be explored in the review simulator below.'}</p></div></div>
        {application.feedback && <div className="pf-review-feedback"><span className="pf-eyebrow">Review feedback</span><p>{application.feedback}</p></div>}
        {application.interview && <div className="pf-interview"><h4><Calendar size={16} aria-hidden="true" />Interview</h4><dl><div><dt>Scheduled</dt><dd>{formatDate(application.interview.scheduledAt)} IST</dd></div><div><dt>Location</dt><dd>{application.interview.location}</dd></div>{application.interview.outcome && <div><dt>Outcome</dt><dd>{application.interview.outcome}</dd></div>}</dl><p className="pf-note">No calendar invitation or meeting has been booked.</p></div>}
        {approved && application.passport?.issuedAt && <p className="pf-note">Passport issued {formatDate(application.passport.issuedAt)} IST. No automatic expiry policy applies.</p>}
        {application.status !== 'not_applied' && application.form?.legal_name && <details className="pf-submitted-details"><summary>{application.status === 'draft' ? 'View application details' : 'View submitted details'}</summary><p className="pf-note"><LockKeyhole size={13} aria-hidden="true" />Only you can see this application.</p><dl><div><dt>Legal name</dt><dd>{application.form.legal_name}</dd></div><div><dt>Application contact</dt><dd>{application.form.contact_email}</dd></div><div><dt>Venture</dt><dd>{application.form.venture_name || 'Not provided'}</dd></div><div><dt>Founder role</dt><dd>{application.form.founder_role || 'Not provided'}</dd></div><div><dt>Founder story</dt><dd>{application.form.founder_story || 'Not provided'}</dd></div></dl>{application.form.evidence?.map((file, index) => safeDocument(file) && <a key={`${file.name}-${index}`} className="pf-file-download" href={safeDocument(file)} download={file.name} aria-label={`Download evidence: ${file.name}`} onClick={(event) => checkEvidenceDownload(event, file)}><FileCheck2 size={16} aria-hidden="true" /><span>{file.name}</span><Download size={15} aria-hidden="true" /></a>)}</details>}
      </section>
      <section className="pf-panel pf-passport-benefits" aria-labelledby="pf-benefits-title"><div className="pf-panel-heading"><h3 id="pf-benefits-title"><Sparkles size={17} aria-hidden="true" />Passport possibilities</h3><span className="pf-pill">Preview only</span></div><p className="pf-note">These describe the proposed experience. This workflow does not activate partner benefits.</p>{[[Shield, 'Founder recognition', 'A separate passport status, distinct from skills and achievement badges.'], [Award, 'Physical founder card', 'A proposed card experience. No card is produced or shipped here.'], [Globe, 'Collaborator access', 'A proposed connection to collaborator platforms. No access is granted here.']].map(([Icon, title, description]) => <div className="pf-benefit" key={title}><Icon size={20} aria-hidden="true" /><div><h4>{title}</h4><p>{description}</p></div><LockKeyhole size={13} aria-hidden="true" /></div>)}</section>
      <section className="pf-panel pf-passport-history" aria-labelledby="pf-history-title"><div className="pf-panel-heading"><h3 id="pf-history-title"><Clock size={17} aria-hidden="true" />Application timeline</h3><span className="pf-muted">Saved history</span></div>{history.length ? <ol className="pf-timeline">{history.slice().reverse().map((item, index) => <li key={`${item.date}-${index}`}><span className="pf-timeline-dot"><Check size={11} aria-hidden="true" /></span><div><strong>{item.label.replace(/^Demo /, '')}</strong><time dateTime={item.date}>{formatDate(item.date)} IST</time>{item.reason && <p>{item.reason}</p>}</div></li>)}</ol> : <div className="pf-empty"><FileText size={27} aria-hidden="true" /><h4>Your story starts here</h4><p>Drafts, submissions, feedback, and review decisions will appear in this timeline.</p></div>}</section>
    </div>
    <ReviewSimulator user={user} application={application} onChanged={onChanged} />
    {applying && <ApplicationDialog user={user} profile={profile} application={application} projects={projects} onClose={() => setApplying(false)} onChanged={onChanged} />}
  </div>
}
