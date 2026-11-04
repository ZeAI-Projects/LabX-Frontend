import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Calendar, Check, CheckCircle2, Clock, Download, FileCheck2, FileText, Globe, LockKeyhole, MessageSquare, RefreshCw, Send, Shield, Sparkles, Users } from 'lucide-react'
import { ProfileDialog, ProfileField, ProfileInfoButton } from './ProfileDialog.jsx'
import { passportStore } from '../services/passport_store.js'
import { PASSPORT_PREVIEW_BENEFITS } from '../services/passport_benefits.js'
import { readProfileFile, validatePassportEvidence } from '../services/profile_files.js'

const STATUS_LABELS = {
  not_applied: 'Not applied', draft: 'Draft', submitted: 'Submitted', under_review: 'Under review',
  more_info: 'More information needed', eligible: 'Eligible', interview_scheduled: 'Interview scheduled',
  interview_complete: 'Interview completed', approved: 'Approved', rejected: 'Not approved', renewal_due: 'Renewal due',
}
const EDITABLE = ['not_applied', 'draft', 'more_info', 'rejected']
const formatDate = (date) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(date))
const safeDocument = (file) => typeof file?.dataUrl === 'string' && /^data:(application\/pdf|image\/png|image\/jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(file.dataUrl) ? file.dataUrl : null
const previewBenefitIcons = { Shield, Sparkles, Users, Globe, CheckCircle2, FileText }

function PassportCardFaces({ user, profile, application, approved }) {
  return <span className="pf-passport-card__flipper" aria-hidden="true">
    <span className="pf-passport-card__face pf-passport-card__face--front">
      <span className="pf-passport-card__brand"><span>Lab<span className="pf-logo-x">X</span></span><Shield size={24} /></span>
      <span className="pf-passport-card__seal"><Shield size={45} /><Sparkles size={18} /></span>
      <span className="pf-passport-card__caption">Founder Passport</span>
      <strong>{profile.full_name}</strong>
      <span className="pf-passport-card__identifier">@{profile.username || user.id}</span>
      <span className="pf-passport-card__number">{approved && application.passport?.number ? application.passport.number.replace(/^LABX-DEMO-/, 'LABX-') : 'NOT ISSUED'}</span>
      <small>Application · {STATUS_LABELS[application.status]}{approved ? ' · not identity verification' : ''}</small>
    </span>
    <span className="pf-passport-card__face pf-passport-card__face--back">
      <span className="pf-passport-card__brand"><span>Lab<span className="pf-logo-x">X</span></span><Sparkles size={21} /></span>
      <span className="pf-passport-card__back-seal"><Shield size={36} aria-hidden="true" /></span>
      <span className="pf-passport-card__caption">Founder identity · preview</span>
      <strong>{profile.full_name}</strong>
      <span className="pf-passport-card__number">@{profile.username || user.id}</span>
      <small className="pf-passport-card__application-status">Application: {STATUS_LABELS[application.status]}</small>
      <small className="pf-passport-card__disclaimer">Preview only · not identity verification</small>
    </span>
  </span>
}

function PassportPreviewBenefits() {
  return <section className="pf-passport-preview-benefits" aria-label="Proposed Founder Passport benefits">
    <span className="pf-pill">Proposed preview features</span>
    <p className="pf-passport-preview-benefits__intro">Explore the opportunities envisioned for the LabX Founder Passport. These are proposals, not active services or privileges.</p>
    <div className="pf-passport-preview-benefits__list">
      {PASSPORT_PREVIEW_BENEFITS.map((benefit) => {
        const Icon = previewBenefitIcons[benefit.icon]
        return <article className="pf-passport-preview-benefit" key={benefit.id}><Icon size={17} aria-hidden="true" /><div><h4>{benefit.title}</h4><p>{benefit.description}</p></div></article>
      })}
    </div>
  </section>
}

function ApplicationDialog({ user, profile, application, projects, onClose, onChanged }) {
  const [form, setForm] = useState(() => ({
    legal_name: profile.full_name ?? '', contact_email: user.email ?? '', city: profile.city ?? '', country: profile.country ?? '',
    founder_story: '', portfolio_url: profile.portfolio ?? '',
    evidence: [], consent: false,
    ...Object.fromEntries(Object.entries(application.status === 'not_applied' ? {} : application.form ?? {}).filter(([key]) => !['founder_role', 'venture_name'].includes(key))),
    project_id: projects.some((project) => project.id === application.form?.project_id) ? application.form.project_id : '',
  }))
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const errorRef = useRef(null)
  const mountedRef = useRef(true)
  const uploadVersion = useRef(0)
  const [draggingEvidence, setDraggingEvidence] = useState(false)
  const resubmit = ['more_info', 'rejected'].includes(application.status)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; uploadVersion.current += 1 } }, [])
  function change(key, value) { setForm((previous) => ({ ...previous, [key]: value })) }
  function fail(err) {
    setError(err.message || 'Your application could not be saved.')
    requestAnimationFrame(() => errorRef.current?.focus())
  }
  async function addEvidence(files) {
    files = [...files]
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
  function chooseEvidence(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    void addEvidence(files)
  }
  function handleEvidenceDragEnter(event) {
    event.preventDefault()
    setDraggingEvidence(true)
  }
  function handleEvidenceDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDraggingEvidence(true)
  }
  function handleEvidenceDragLeave(event) {
    event.preventDefault()
    if (!event.currentTarget.contains(event.relatedTarget)) setDraggingEvidence(false)
  }
  function handleEvidenceDrop(event) {
    event.preventDefault()
    setDraggingEvidence(false)
    void addEvidence(event.dataTransfer.files ?? [])
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
        <h3 className="pf-form-section"><span>02</span>Project and portfolio</h3>
        <div className="pf-form-grid">
          <ProfileField label="Linked project (optional)" info="Optionally link an existing LabX project."><select aria-label="Linked project (optional)" value={form.project_id} onChange={(event) => change('project_id', event.target.value)}><option value="">No linked project</option>{form.project_id && !projects.some((project) => project.id === form.project_id) && <option value={form.project_id}>Linked project unavailable — choose no linked project</option>}{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></ProfileField>
          <div className="pf-form-grid__full"><ProfileField label="Portfolio / evidence link (optional)" info="Add a portfolio or supporting link relevant to your venture."><input aria-label="Portfolio / evidence link (optional)" type="url" value={form.portfolio_url} maxLength={2048} placeholder="https://" onChange={(event) => change('portfolio_url', event.target.value)} /></ProfileField></div>
        </div>
        <ProfileField label="Founder story" required info="Describe your venture, your contribution, and the progress represented by your evidence."><textarea aria-label="Founder story" rows={4} value={form.founder_story} required maxLength={3000} onChange={(event) => change('founder_story', event.target.value)} /></ProfileField>
        <h3 className="pf-form-section"><span>03</span>Supporting evidence</h3>
        <div className={`pf-upload-zone${draggingEvidence ? ' is-dragging' : ''}`} onDragEnter={handleEvidenceDragEnter} onDragOver={handleEvidenceDragOver} onDragLeave={handleEvidenceDragLeave} onDrop={handleEvidenceDrop}>
          <ProfileField label="Supporting evidence" required info="Upload files that demonstrate your venture, contribution, and progress." hint="PDF, PNG, JPG, JPEG — Up to 3 files, 1 MiB each and 2 MiB combined."><input type="file" aria-label="Supporting evidence" aria-required="true" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple onChange={chooseEvidence} disabled={reading} /></ProfileField>
          {form.evidence.length > 0 && <ul className="pf-file-list">{form.evidence.map((file, index) => <li key={`${file.name}-${index}`}><FileCheck2 size={17} aria-hidden="true" /><span>{file.name}<small>{Math.ceil(file.size / 1024)} KiB · saved with this application</small></span><button className="pf-text-button" type="button" disabled={reading} aria-label={`Remove evidence: ${file.name}`} onClick={() => change('evidence', form.evidence.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></li>)}</ul>}
          {reading && <p className="pf-note" role="status">Reading supporting evidence…</p>}
        </div>
        <div className="pf-consent"><input id="pf-application-confirmation" type="checkbox" aria-label="I confirm these details and supporting files are mine to submit." checked={form.consent} required onChange={(event) => change('consent', event.target.checked)} /><label htmlFor="pf-application-confirmation">I confirm these details and supporting files are mine to submit.<span className="pf-required" aria-hidden="true">*</span></label><ProfileInfoButton label="Application Confirmation">This bounded form demonstrates the application flow. It is not an official eligibility policy. You can save a draft and continue using LabX without applying.</ProfileInfoButton></div>
      </div>
      <footer className="pf-dialog-actions"><button type="button" className="pf-button" onClick={onClose}>Cancel</button><button type="button" className="pf-button" disabled={reading} onClick={() => persist(false)}>Save draft</button><button type="submit" className="pf-button pf-button--gold" disabled={reading}><Send size={15} aria-hidden="true" />{resubmit ? 'Resubmit application' : 'Submit application'}</button></footer>
    </form>
  </ProfileDialog>
}

export function PassportPanel({ user, profile, application, projects, onChanged }) {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewEntered, setPreviewEntered] = useState(false)
  const [isPassportHovered, setIsPassportHovered] = useState(false)
  const triggerRef = useRef(null)
  const popupRef = useRef(null)
  const popupCardRef = useRef(null)
  const wasPreviewOpenRef = useRef(false)
  const approved = application.status === 'approved'
  const renewal = application.status === 'renewal_due'
  const editable = EDITABLE.includes(application.status)
  const history = application.history ?? []
  const actionLabel = application.status === 'not_applied' ? 'Apply for Founder Passport' : application.status === 'draft' ? 'Continue draft' : application.status === 'more_info' ? 'Update application' : 'Revise and resubmit'
  const statusDescription = application.status === 'not_applied'
    ? 'Your everyday LabX experience is available without a passport application.'
    : application.status === 'draft'
      ? 'Your draft is private. Add your details and evidence when you are ready.'
      : application.status === 'more_info'
        ? 'Review the feedback, update your application, and submit it again.'
        : approved
          ? 'The review is complete. This status is distinct from earned achievement badges.'
          : renewal
            ? 'A renewal notice is available in your application timeline.'
            : application.status === 'rejected'
              ? 'Review the reason below. You can revise and resubmit your application.'
              : ''
  function openPreview() {
    setIsPassportHovered(false)
    setPreviewEntered(false)
    setPreviewOpen(true)
  }
  function closePreview() {
    setIsPassportHovered(false)
    setPreviewOpen(false)
  }
  function handlePreviewPointerEnter(event) {
    if (event.pointerType !== 'touch') openPreview()
  }
  function handleExpandedCardPointerEnter(event) {
    if (event.pointerType !== 'touch') setIsPassportHovered(true)
  }
  function handleExpandedCardPointerLeave(event) {
    if (event.pointerType !== 'touch') setIsPassportHovered(false)
  }
  function handleExpandedCardPointerDown(event) {
    if (event.pointerType === 'touch') setIsPassportHovered((hovered) => !hovered)
  }
  useLayoutEffect(() => {
    if (!previewOpen) return undefined

    wasPreviewOpenRef.current = true
    const trigger = triggerRef.current?.getBoundingClientRect()
    const card = popupCardRef.current
    const cardBox = card?.getBoundingClientRect()
    if (trigger && card && cardBox) {
      card.style.setProperty('--passport-origin-x', `${trigger.left + trigger.width / 2 - cardBox.left - cardBox.width / 2}px`)
      card.style.setProperty('--passport-origin-y', `${trigger.top + trigger.height / 2 - cardBox.top - cardBox.height / 2}px`)
      card.style.setProperty('--passport-origin-scale', String(Math.min(trigger.width / cardBox.width, trigger.height / cardBox.height)))
    }
    const frame = requestAnimationFrame(() => setPreviewEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [previewOpen])
  useEffect(() => {
    if (!previewOpen) return undefined
    const root = document.getElementById('root')
    const hadInert = root?.inert ?? false
    const previousOverflow = document.body.style.overflow
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    popupRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePreview()
      } else if (event.key === 'Tab') {
        const focusable = popupRef.current?.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []
        if (focusable.length === 0) {
          event.preventDefault()
          popupRef.current?.focus()
        } else if (event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault()
          focusable[focusable.length - 1].focus()
        } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
          event.preventDefault()
          focusable[0].focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (root) root.inert = hadInert
      document.body.style.overflow = previousOverflow
    }
  }, [previewOpen])
  useEffect(() => {
    if (!previewOpen && wasPreviewOpenRef.current) {
      triggerRef.current?.focus()
      wasPreviewOpenRef.current = false
    }
  }, [previewOpen])
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
      <div className="pf-passport-intro"><span className="pf-eyebrow"><Shield size={14} aria-hidden="true" />Optional founder recognition</span><h2 id="pf-passport-heading">Your Founder Passport</h2><p>A place for your founder story, supporting evidence, and application journey. Keep building with or without it.</p><span className={`pf-status${approved ? ' pf-status--gold' : ''}`} data-passport-status={application.status}><span />{STATUS_LABELS[application.status]}</span><div className="pf-inline-actions">{editable && <button className="pf-button pf-button--gold" type="button" onClick={() => setApplying(true)}>{actionLabel}<ArrowRight size={15} aria-hidden="true" /></button>}{renewal && <button className="pf-button pf-button--gold" type="button" onClick={beginRenewal}><RefreshCw size={15} aria-hidden="true" />Start renewal</button>}</div><p className="pf-note">Local application · no real verification, physical card, or partner access.</p></div>
      <div className="pf-passport-preview-area">
      <button
        ref={triggerRef}
        className={`pf-passport-card${approved ? ' pf-passport-card--active' : ''}`}
          type="button"
          aria-label={`Founder Passport preview for ${profile.full_name}, application status ${STATUS_LABELS[application.status]}. Open preview.`}
          aria-haspopup="dialog"
          aria-expanded={previewOpen}
          aria-controls="pf-passport-preview-dialog"
          onPointerEnter={handlePreviewPointerEnter}
          onClick={openPreview}
        >
          <span className="pf-passport-card__spin">
            <PassportCardFaces user={user} profile={profile} application={application} approved={approved} />
          </span>
        </button>
      </div>
    </section>
    {createPortal(<div className={`pf-passport-overlay${previewOpen ? ' pf-passport-overlay--open' : ''}`} aria-hidden={!previewOpen} inert={!previewOpen} onClick={(event) => { if (event.target === event.currentTarget) closePreview() }}>
      <section ref={popupRef} className="pf-passport-popup" id="pf-passport-preview-dialog" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="pf-passport-popup-title" aria-describedby="pf-passport-popup-description" onClick={(event) => { if (event.target === event.currentTarget) closePreview() }}>
        <div
          className={`pf-passport-popup__card${previewEntered ? ' pf-passport-popup__card--entered' : ''}`}
          ref={popupCardRef}
        >
          <div
            className={`pf-passport-card pf-passport-card--modal${approved ? ' pf-passport-card--active' : ''}`}
            role="img"
            aria-label={`Founder Passport preview, status ${STATUS_LABELS[application.status]}`}
            onPointerEnter={handleExpandedCardPointerEnter}
            onPointerLeave={handleExpandedCardPointerLeave}
            onPointerDown={handleExpandedCardPointerDown}
            onClick={(event) => event.stopPropagation()}
          >
            <span key={previewOpen ? 'open' : 'closed'} className={`pf-passport-card__spin${previewOpen && !isPassportHovered ? ' pf-passport-card__spin--running' : ''}`}>
              <PassportCardFaces user={user} profile={profile} application={application} approved={approved} />
            </span>
          </div>
        </div>
        <div className="pf-passport-popup__benefits" id="pf-passport-popup-description" onClick={(event) => event.stopPropagation()}>
          <h2 id="pf-passport-popup-title">Your Founder Identity</h2>
          <p className="pf-passport-popup__subtitle">Explore the opportunities envisioned for the LabX Founder Passport.</p>
          <PassportPreviewBenefits />
        </div>
      </section>
    </div>, document.body)}
    {error && <p className="pf-message pf-message--error" role="alert">{error}</p>}
    <div className="pf-passport-layout">
      <section className="pf-panel pf-passport-tile" aria-labelledby="pf-application-title">
        <div className="pf-panel-heading"><h3 id="pf-application-title"><FileText size={17} aria-hidden="true" />Application status</h3><span className="pf-muted">Cycle {application.cycle || 1}</span></div>
        <div className="pf-passport-tile__content" tabIndex={0} aria-label="Application status details">
        <div className="pf-application-status"><span className="pf-round-icon">{approved ? <CheckCircle2 size={25} aria-hidden="true" /> : application.status === 'more_info' ? <MessageSquare size={25} aria-hidden="true" /> : <Clock size={25} aria-hidden="true" />}</span><div><strong>{STATUS_LABELS[application.status]}</strong>{statusDescription && <p>{statusDescription}</p>}</div></div>
        {application.feedback && <div className="pf-review-feedback"><span className="pf-eyebrow">Review feedback</span><p>{application.feedback}</p></div>}
        {application.interview && <div className="pf-interview"><h4><Calendar size={16} aria-hidden="true" />Interview</h4><dl><div><dt>Scheduled</dt><dd>{formatDate(application.interview.scheduledAt)} IST</dd></div><div><dt>Location</dt><dd>{application.interview.location}</dd></div>{application.interview.outcome && <div><dt>Outcome</dt><dd>{application.interview.outcome}</dd></div>}</dl><p className="pf-note">No calendar invitation or meeting has been booked.</p></div>}
        {approved && application.passport?.issuedAt && <p className="pf-note">Passport issued {formatDate(application.passport.issuedAt)} IST. No automatic expiry policy applies.</p>}
        {application.status !== 'not_applied' && application.form?.legal_name && <details className="pf-submitted-details"><summary>{application.status === 'draft' ? 'View application details' : 'View submitted details'}</summary><p className="pf-note"><LockKeyhole size={13} aria-hidden="true" />Only you can see this application.</p><dl><div><dt>Legal name</dt><dd>{application.form.legal_name}</dd></div><div><dt>Application contact</dt><dd>{application.form.contact_email}</dd></div><div><dt>Founder story</dt><dd>{application.form.founder_story || 'Not provided'}</dd></div></dl>{application.form.evidence?.map((file, index) => safeDocument(file) && <a key={`${file.name}-${index}`} className="pf-file-download" href={safeDocument(file)} download={file.name} aria-label={`Download evidence: ${file.name}`} onClick={(event) => checkEvidenceDownload(event, file)}><FileCheck2 size={16} aria-hidden="true" /><span>{file.name}</span><Download size={15} aria-hidden="true" /></a>)}</details>}
        </div>
      </section>
      <section className="pf-panel pf-passport-history pf-passport-tile" aria-labelledby="pf-history-title"><div className="pf-panel-heading"><h3 id="pf-history-title"><Clock size={17} aria-hidden="true" />Application timeline</h3><span className="pf-muted">Saved history</span></div><div className="pf-passport-tile__content" tabIndex={0} aria-label="Application timeline details">{history.length ? <ol className="pf-timeline">{history.slice().reverse().map((item, index) => <li key={`${item.date}-${index}`}><span className="pf-timeline-dot"><Check size={11} aria-hidden="true" /></span><div><strong>{item.label.replace(/^Demo /, '')}</strong><time dateTime={item.date}>{formatDate(item.date)} IST</time>{item.reason && <p>{item.reason}</p>}</div></li>)}</ol> : <div className="pf-empty"><FileText size={27} aria-hidden="true" /><h4>Your story starts here</h4><p>Drafts, submissions, feedback, and review decisions will appear in this timeline.</p></div>}</div></section>
    </div>
    {applying && <ApplicationDialog user={user} profile={profile} application={application} projects={projects} onClose={() => setApplying(false)} onChanged={onChanged} />}
  </div>
}
