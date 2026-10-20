import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Award, Bell, Bookmark, Calendar, CheckCircle2, ChevronDown, Clock, Copy, Download, ExternalLink, FileCheck2, Flag, MapPin, Megaphone, Radio, Search, SlidersHorizontal, Sparkles, Ticket, Trophy, Upload, Users, X } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { EVENT_CATEGORIES, EVENT_CHANGE_EVENT, MAX_CERTIFICATE_BYTES, MOCK_EVENTS, REPORT_REASONS, eventPhase, eventStore, getRegistrationAvailability, getSafeEventLink, getTrackingStatus, selectEvents } from '../services/mock_events.js'
import '../components/EventsPage.css'

const INITIAL_FILTERS = {
  query: '', category: 'all', format: 'all', broadcast: 'all', sort: 'soonest', myPeriod: 'all',
  dateFrom: '', dateTo: '', location: '', eligibility: 'all', fee: 'all', prizes: 'all', sponsored: 'all',
}
const ADVANCED_FILTERS = ['dateFrom', 'dateTo', 'location', 'eligibility', 'fee', 'prizes', 'sponsored']
const CERTIFICATE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const VIEW_NAMES = { upcoming: 'Upcoming broadcasts', ongoing: 'Happening now', my: 'My Events & opportunity tracker', completed: 'Completed participation', past: 'Past broadcasts' }
const PAGE_SIZE = 9

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))
}

function datePart(value, options) {
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'Asia/Kolkata' }).format(new Date(value))
}

function certificateDownload(certificate) {
  return certificate && CERTIFICATE_TYPES.includes(certificate.type) && typeof certificate.dataUrl === 'string'
    && /^data:(application\/pdf|image\/jpeg|image\/png|image\/webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(certificate.dataUrl)
    ? certificate.dataUrl : null
}

function EventFacts({ event }) {
  return (
    <dl className="events-facts events-facts--details">
      <div><dt><Users size={14} aria-hidden="true" />Organizer</dt><dd>{event.organizer}</dd></div>
      <div><dt><Calendar size={14} aria-hidden="true" />{event.type === 'announcement' ? 'Published' : 'Starts'}</dt><dd><time dateTime={event.startsAt}>{formatDate(event.startsAt)}</time> IST</dd></div>
      <div><dt><Clock size={14} aria-hidden="true" />Ends</dt><dd><time dateTime={event.endsAt}>{formatDate(event.endsAt)}</time> IST</dd></div>
      <div><dt><MapPin size={14} aria-hidden="true" />{event.format}</dt><dd>{event.location}</dd></div>
      {event.deadline && <div><dt>Register by</dt><dd><time dateTime={event.deadline}>{formatDate(event.deadline)}</time> IST</dd></div>}
      <div><dt>Eligibility</dt><dd>{event.eligibility}</dd></div>
      {event.type !== 'announcement' && <div><dt>Registration</dt><dd>{event.registrationMethod === 'external' ? 'External organizer' : 'On LabX'}</dd></div>}
      {event.fee && <div><dt>Fee</dt><dd>{event.fee}</dd></div>}
      {event.prize && <div><dt>Prizes & benefits</dt><dd>{event.prize}</dd></div>}
      {event.capacity != null && <div><dt>Availability</dt><dd>{event.available} of {event.capacity} sample places available</dd></div>}
      <div><dt>Time zone</dt><dd>India Standard Time · Asia/Kolkata (UTC+05:30)</dd></div>
      <div><dt>Contact</dt><dd>{event.contact}</dd></div>
    </dl>
  )
}

function OutcomeSummary({ outcome, onEdit, onCopy, copying }) {
  const downloadUrl = certificateDownload(outcome.certificate)
  return <section className="events-outcome" aria-labelledby="event-outcome-title">
    <div className="events-section-heading"><span className="events-section-icon"><Trophy size={19} aria-hidden="true" /></span><div><span className="events-eyebrow">Your record</span><h3 id="event-outcome-title">Participation completed</h3></div><span className="events-tag events-tag--green">Self-reported</span></div>
    <dl className="events-outcome-facts">
      <div><dt>Participation</dt><dd>{outcome.participation === 'attended' ? 'Attended' : 'Completed'}</dd></div>
      {outcome.notes && <div><dt>Notes</dt><dd>{outcome.notes}</dd></div>}
      {outcome.award && <div><dt>Award / result</dt><dd>{outcome.award}</dd></div>}
      {outcome.rating && <div><dt>Your rating</dt><dd>{outcome.rating} / 5</dd></div>}
      {outcome.feedback && <div><dt>Feedback</dt><dd>{outcome.feedback}</dd></div>}
    </dl>
    {downloadUrl && <a className="events-certificate-link" href={downloadUrl} download={outcome.certificate.name} aria-label={`Download certificate: ${outcome.certificate.name}`}><FileCheck2 size={18} aria-hidden="true" /><span><strong>{outcome.certificate.name}</strong><small>Your uploaded certificate</small></span><Download size={17} aria-hidden="true" /></a>}
    <p className="events-note">This record and any certificate are supplied by you, not verified by the organizer. Participation does not add LabX Points.</p>
    <div className="events-inline-actions"><button type="button" className="events-button" onClick={onEdit}>Edit participation</button><button type="button" className="events-button" onClick={onCopy} disabled={copying}><Copy size={15} aria-hidden="true" />{copying ? 'Copying summary…' : 'Copy participation summary'}</button></div>
    <p className="events-note">The copied summary includes the event, participation, notes, and award / result. Feedback, rating, and certificate stay private.</p>
  </section>
}

function EventDialog({ event, user, registration, outcome, now, onClose, onChanged, onViewMyEvents }) {
  const dialogRef = useRef(null)
  const headingRef = useRef(null)
  const errorRef = useRef(null)
  const fileInputRef = useRef(null)
  const fileReaderRef = useRef(null)
  const copyingRef = useRef(false)
  const [panel, setPanel] = useState('details')
  const [reason, setReason] = useState('')
  const [reportNotes, setReportNotes] = useState('')
  const [reference, setReference] = useState(registration?.confirmationReference ?? '')
  const [participation, setParticipation] = useState(outcome?.participation ?? 'attended')
  const [notes, setNotes] = useState(outcome?.notes ?? '')
  const [award, setAward] = useState(outcome?.award ?? '')
  const [feedback, setFeedback] = useState(outcome?.feedback ?? '')
  const [rating, setRating] = useState(outcome?.rating ? String(outcome.rating) : '')
  const [certificate, setCertificate] = useState(outcome?.certificate ?? null)
  const [fileBusy, setFileBusy] = useState(false)
  const [copying, setCopying] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const availability = getRegistrationAvailability(event, user, registration, now)
  const past = eventPhase(event, now) === 'past'
  const external = event.registrationMethod === 'external'
  const confirmed = registration?.status === 'registered'
  const trackingStatus = getTrackingStatus(event, registration, outcome, now)
  const registrationUrl = getSafeEventLink(event.registrationUrl)
  const paymentUrl = getSafeEventLink(event.paymentUrl)
  const canRecord = confirmed && new Date(event.startsAt).getTime() <= now
  const title = panel === 'confirm' ? 'Confirm registration' : panel === 'external' ? 'External registration' : panel === 'report' ? 'Report listing' : panel === 'participation' ? outcome ? 'Edit participation' : 'Record participation' : event.title

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    if (!dialog.open) dialog.showModal()
    return () => {
      fileReaderRef.current?.abort()
      fileReaderRef.current = null
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  function focusHeading() {
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
  }

  function fail(err) {
    setError(err.message || 'This change could not be saved. Please try again.')
    setNotice('')
    requestAnimationFrame(() => errorRef.current?.focus({ preventScroll: true }))
  }

  function showPanel(nextPanel) {
    fileReaderRef.current?.abort()
    fileReaderRef.current = null
    setFileBusy(false)
    if (nextPanel === 'participation') {
      setParticipation(outcome?.participation ?? 'attended')
      setNotes(outcome?.notes ?? '')
      setAward(outcome?.award ?? '')
      setFeedback(outcome?.feedback ?? '')
      setRating(outcome?.rating ? String(outcome.rating) : '')
      setCertificate(outcome?.certificate ?? null)
    }
    setNotice('')
    setError('')
    setPanel(nextPanel)
    focusHeading()
  }

  function startRegistration() {
    if (!external) return showPanel('confirm')
    try {
      eventStore.beginExternal(user, event.id)
      onChanged()
      showPanel('external')
    } catch (err) { fail(err) }
  }

  function register(e) {
    e.preventDefault()
    try {
      eventStore.register(user, event.id)
      onChanged()
      setPanel('details')
      setError('')
      setNotice('Registration confirmed in this demo. Your event is saved in My Events.')
      focusHeading()
    } catch (err) { fail(err) }
  }

  function confirmExternal(e) {
    e.preventDefault()
    try {
      eventStore.confirmExternal(user, event.id, reference)
      onChanged()
      setPanel('details')
      setError('')
      setNotice('Self-reported confirmation saved in My Events. No organizer registration or payment has been verified.')
      focusHeading()
    } catch (err) { fail(err) }
  }

  function report(e) {
    e.preventDefault()
    try {
      eventStore.report(user, event.id, reason, reportNotes)
      onChanged()
      setPanel('details')
      setError('')
      setNotice('Report saved in this demo. It has not been sent to the organizer.')
      focusHeading()
    } catch (err) { fail(err) }
  }

  function toggleReminder(e) {
    try {
      eventStore.setReminder(user, event.id, e.target.checked)
      onChanged()
      setNotice(e.target.checked ? 'Reminder preference saved on this browser. No email or notification will be sent.' : 'Reminder turned off.')
      setError('')
    } catch (err) { fail(err) }
  }

  function readCertificate(e) {
    const file = e.target.files?.[0]
    fileReaderRef.current?.abort()
    fileReaderRef.current = null
    setFileBusy(false)
    if (!file) return
    if (!CERTIFICATE_TYPES.includes(file.type) || file.size < 1 || file.size > MAX_CERTIFICATE_BYTES) {
      e.target.value = ''
      fail(new Error('Choose a PDF, JPEG, PNG, or WEBP certificate up to 1 MiB. The file cannot be empty.'))
      return
    }
    setError('')
    setFileBusy(true)
    const reader = new FileReader()
    fileReaderRef.current = reader
    reader.onload = () => {
      if (fileReaderRef.current !== reader) return
      fileReaderRef.current = null
      setFileBusy(false)
      setCertificate({ name: file.name, size: file.size, type: file.type, dataUrl: String(reader.result) })
    }
    reader.onerror = () => {
      if (fileReaderRef.current !== reader) return
      fileReaderRef.current = null
      setFileBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fail(new Error('This certificate could not be read. Please choose the file again.'))
    }
    reader.readAsDataURL(file)
  }

  function removeCertificate() {
    fileReaderRef.current?.abort()
    fileReaderRef.current = null
    setFileBusy(false)
    setCertificate(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function saveParticipation(e) {
    e.preventDefault()
    if (fileBusy) return
    try {
      eventStore.saveOutcome(user, event.id, { participation, notes, award, feedback, rating: rating ? Number(rating) : null, certificate })
      onChanged()
      setPanel('details')
      setError('')
      setNotice('Participation saved to Completed. Your record, results, and certificate stay on this browser.')
      focusHeading()
    } catch (err) { fail(err) }
  }

  async function copyParticipation() {
    if (!outcome || copyingRef.current) return
    if (!navigator.clipboard?.writeText) {
      fail(new Error('Copy is unavailable in this browser. Select and copy the participation details instead.'))
      return
    }
    copyingRef.current = true
    setCopying(true)
    const summary = [
      event.title,
      `Participation: ${outcome.participation === 'attended' ? 'Attended' : 'Completed'}`,
      outcome.notes && `Notes: ${outcome.notes}`,
      outcome.award && `Award / result: ${outcome.award}`,
      'Self-reported participation · LabX demo',
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(summary)
      if (dialogRef.current?.open) {
        setError('')
        setNotice('Participation summary copied. Feedback, rating, and certificate were not included.')
      }
    } catch {
      if (dialogRef.current?.open) fail(new Error('The summary could not be copied. Select and copy the participation details instead.'))
    } finally {
      copyingRef.current = false
      if (dialogRef.current?.open) setCopying(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="events-dialog" aria-labelledby="event-dialog-title" onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="events-dialog__body">
        <button type="button" className="events-dialog__close" aria-label="Close event details" onClick={onClose}><X size={21} aria-hidden="true" /></button>
        <span className="events-eyebrow"><Radio size={14} aria-hidden="true" />{event.category} · {event.format}</span>
        <h2 id="event-dialog-title" tabIndex={-1} ref={headingRef}>{title}</h2>
        {error && <p ref={errorRef} tabIndex={-1} className="events-feedback events-feedback--error" role="alert">{error}</p>}
        {notice && <p className="events-feedback" role="status">{notice}</p>}
        {panel === 'details' && <>
          <p className="events-dialog__description">{event.description}</p>
          {event.sponsored && <p className="events-sponsored"><Sparkles size={16} aria-hidden="true" /><span>Sponsored by {event.sponsor}. This is a sample sponsored listing.</span></p>}
          <EventFacts event={event} />
          <section className="events-schedule" aria-labelledby="event-schedule"><h3 id="event-schedule">Schedule</h3><p>{event.schedule}</p></section>
          {event.requirements && <section className="events-schedule" aria-labelledby="event-requirements"><h3 id="event-requirements">What you need</h3>{Array.isArray(event.requirements) ? <ul>{event.requirements.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{event.requirements}</p>}</section>}
          {event.format !== 'In person' && event.type !== 'announcement' && <p className="events-note">This sample listing does not provide a live meeting room.</p>}
          {registration && <section className="events-registration" aria-label="Your registration">
            <div className="events-registration__heading"><span className="events-section-icon">{confirmed ? <CheckCircle2 size={21} aria-hidden="true" /> : <Clock size={21} aria-hidden="true" />}</span><div><h3>{confirmed ? 'Registered' : 'Registration pending'}</h3><p>{confirmed ? external ? 'External confirmation · Self-reported' : 'Demo registration confirmed' : 'Continue the external registration preview below.'}</p></div><span className="events-tag events-tag--green">{trackingStatus}</span></div>
            <p className="events-registration__date">Saved {formatDate(registration.registeredAt)} IST</p>
            {registration.confirmationReference && <p className="events-note">Your reference: <strong>{registration.confirmationReference}</strong></p>}
            {confirmed && <>
              <label className="events-reminder"><input type="checkbox" checked={Boolean(registration.reminder)} disabled={past} onChange={toggleReminder} /><Bell size={17} aria-hidden="true" />Save a reminder for this event</label>
              <p className="events-note">{past ? 'This event has ended. Reminder preferences are read-only.' : 'Reminders are saved as a preference in this demo; no messages are sent.'}</p>
            </>}
            <div className="events-inline-actions">
              <button type="button" className="events-button" onClick={onViewMyEvents}><Bookmark size={15} aria-hidden="true" />View My Events</button>
              {canRecord && !outcome && <button type="button" className="events-button events-button--primary" onClick={() => showPanel('participation')}><Award size={16} aria-hidden="true" />Record participation</button>}
            </div>
            {confirmed && !canRecord && <p className="events-note">Record participation, results, and feedback once this event starts.</p>}
          </section>}
          {outcome && confirmed && <OutcomeSummary outcome={outcome} onEdit={() => showPanel('participation')} onCopy={copyParticipation} copying={copying} />}
          {!confirmed && event.type !== 'announcement' && <div className="events-register-action">
            <button type="button" className="events-button events-button--primary" disabled={!availability.allowed} onClick={startRegistration}>{external && availability.allowed ? <ExternalLink size={16} aria-hidden="true" /> : <Ticket size={16} aria-hidden="true" />}{availability.label}</button>
            {!availability.allowed ? <p className="events-note">{availability.label === 'Not eligible' ? `This listing is for ${event.eligibility.toLowerCase()}.` : 'Registration is unavailable for this listing.'}</p> : <p className="events-note">{external ? 'External registration preview. Your saved confirmation is self-reported; no real payment is processed.' : 'Registration is saved locally for this demo. It does not reserve a real place.'}</p>}
          </div>}
          <footer className="events-dialog__footer"><button type="button" className="events-text-button" onClick={() => showPanel('report')}><Flag size={15} aria-hidden="true" />Report listing</button><button type="button" className="events-button" onClick={onClose}>Close</button></footer>
        </>}
        {panel === 'confirm' && <form onSubmit={register}>
          <div className="events-confirm-preview"><span className="events-section-icon"><Ticket size={24} aria-hidden="true" /></span><div><span className="events-eyebrow">Your next opportunity</span><h3>{event.title}</h3><p className="events-confirm-time"><Calendar size={16} aria-hidden="true" />{formatDate(event.startsAt)} IST</p></div></div>
          <p className="events-dialog__description">Save this event to your personal tracker?</p>
          <p className="events-note">This is a mock registration saved to your account on this browser. It does not reserve a real place or send anything to the organizer.</p>
          <div className="events-dialog__actions"><button type="button" className="events-button" onClick={() => showPanel('details')}>Cancel</button><button type="submit" className="events-button events-button--primary" disabled={!availability.allowed}>Confirm registration</button></div>
          {!availability.allowed && <p className="events-note">{availability.label}</p>}
        </form>}
        {panel === 'external' && <form onSubmit={confirmExternal}>
          <p className="events-dialog__description">{event.title}</p>
          <ol className="events-external-steps">
            <li><span className="events-step-number" aria-hidden="true">01</span><div><h3>Preview the external destination</h3><p>These sample links open a demo destination. They cannot register you or accept payment.</p><div className="events-inline-actions">
              {availability.allowed && registrationUrl ? <a className="events-button" href={registrationUrl} target="_blank" rel="noopener noreferrer">Open External Link<ExternalLink size={15} aria-hidden="true" /><span className="events-sr-only"> · demo preview, opens a new tab</span></a> : <span className="events-note">The external registration preview is unavailable.</span>}
              {availability.allowed && paymentUrl && <a className="events-button" href={paymentUrl} target="_blank" rel="noopener noreferrer">Open payment preview<ExternalLink size={15} aria-hidden="true" /><span className="events-sr-only"> · opens a new tab</span></a>}
            </div></div></li>
            <li><span className="events-step-number" aria-hidden="true">02</span><div><h3>Record your confirmation</h3><p>Enter a sample reference to try the tracker. This is your own record, not verification from the organizer or a payment provider.</p><label className="events-field"><span>Confirmation reference<span className="events-required" aria-hidden="true">*</span></span><input aria-label="Confirmation reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} required placeholder="e.g. DEMO-REGISTRATION-01" /></label></div></li>
          </ol>
          {!availability.allowed && <p className="events-note">{availability.label}. A new confirmation cannot be recorded.</p>}
          <div className="events-dialog__actions"><button type="button" className="events-button" onClick={() => showPanel('details')}><ArrowLeft size={15} aria-hidden="true" />Back</button><button type="submit" className="events-button events-button--primary" disabled={!availability.allowed || !reference.trim()}>Save external confirmation</button></div>
        </form>}
        {panel === 'participation' && <form onSubmit={saveParticipation}>
          <p className="events-dialog__description">{event.title}</p>
          <p className="events-note events-form-intro">Keep a personal record of what you learned and achieved. Results, feedback, and uploaded certificates are self-reported and stay on this browser.</p>
          <div className="events-form-grid">
            <label className="events-field"><span>Participation<span className="events-required" aria-hidden="true">*</span></span><select aria-label="Participation" value={participation} onChange={(e) => setParticipation(e.target.value)} required><option value="attended">Attended</option><option value="completed">Completed</option></select></label>
            <label className="events-field">Rating (optional)<select aria-label="Rating (optional)" value={rating} onChange={(e) => setRating(e.target.value)}><option value="">No rating</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
          </div>
          <label className="events-field">Notes<textarea aria-label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="What did you take part in or complete?" /></label>
          <label className="events-field">Award / result (optional)<input value={award} onChange={(e) => setAward(e.target.value)} maxLength={200} placeholder="e.g. Finalist, showcase participant, or course completed" /></label>
          <div className="events-certificate-upload">
            <label className="events-field"><span><Upload size={16} aria-hidden="true" />Certificate (optional)</span><input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={readCertificate} aria-describedby="event-certificate-help" /></label>
            <p id="event-certificate-help" className="events-note">PDF, JPEG, PNG, or WEBP · up to 1 MiB. The file itself is saved in this browser; use your own certificate.</p>
            {fileBusy && <p className="events-note" role="status">Reading certificate…</p>}
            {certificate && <div className="events-certificate-selected"><FileCheck2 size={18} aria-hidden="true" /><span>{certificate.name}</span><button type="button" className="events-text-button" onClick={removeCertificate}>Remove certificate</button></div>}
          </div>
          <label className="events-field">Feedback (optional)<textarea aria-label="Feedback (optional)" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} placeholder="Keep your feedback for this event" /></label>
          <p className="events-note">Feedback is not sent to the organizer. Recording participation does not add LabX Points or award a verified badge.</p>
          <div className="events-dialog__actions"><button type="button" className="events-button" onClick={() => showPanel('details')}>Cancel</button><button type="submit" className="events-button events-button--primary" disabled={fileBusy || !canRecord}>{fileBusy ? 'Reading certificate…' : 'Save participation'}</button></div>
        </form>}
        {panel === 'report' && <form onSubmit={report}>
          <p className="events-dialog__description">Flag <strong>{event.title}</strong> for review.</p>
          <label className="events-field"><span>Reason<span className="events-required" aria-hidden="true">*</span></span><select aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required><option value="">Select a reason</option>{REPORT_REASONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="events-field">Additional details (optional)<textarea aria-label="Additional details (optional)" rows={4} value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} maxLength={500} placeholder="Tell us what needs attention" /></label>
          <p className="events-note">The report is saved locally for this demo. It is not submitted to moderators or the organizer.</p>
          <div className="events-dialog__actions"><button type="button" className="events-button" onClick={() => showPanel('details')}><ArrowLeft size={15} aria-hidden="true" />Back</button><button type="submit" className="events-button events-button--primary" disabled={!reason}>Save report</button></div>
        </form>}
      </div>
    </dialog>
  )
}

function EventCard({ event, registration, outcome, user, now, onSelect }) {
  const availability = getRegistrationAvailability(event, user, registration, now)
  const phase = eventPhase(event, now)
  const trackingStatus = getTrackingStatus(event, registration, outcome, now)
  const announcement = event.type === 'announcement'
  const status = registration ? trackingStatus : phase === 'past' ? 'Expired · Event ended' : announcement ? 'Community transmission' : availability.allowed ? 'Registration open' : availability.label
  return <article className={`events-card${announcement ? ' events-card--transmission' : ''}${outcome ? ' events-card--completed' : ''}`} aria-labelledby={`event-title-${event.id}`}>
    <div className="events-card__visual">
      <span className={`events-tag${announcement ? ' events-tag--purple' : ''}`}>{announcement ? <Megaphone size={13} aria-hidden="true" /> : <Calendar size={13} aria-hidden="true" />}{event.category}</span>
      <div className="events-card__signal" aria-hidden="true">{announcement ? <Radio /> : outcome ? <Trophy /> : <Sparkles />}</div>
      <time className="events-date-chip" dateTime={event.startsAt} aria-label={formatDate(event.startsAt)}><span>{datePart(event.startsAt, { month: 'short' })}</span><strong>{datePart(event.startsAt, { day: '2-digit' })}</strong></time>
      {event.sponsored && <span className="events-sponsored-tag"><Sparkles size={11} aria-hidden="true" />Sponsored</span>}
    </div>
    <div className="events-card__body">
      <p className="events-card__organizer">{event.organizer}</p>
      <h3 id={`event-title-${event.id}`}>{event.title}</h3>
      <p className="events-card__description">{event.description}</p>
      <dl className="events-card-facts">
        <div><dt><Calendar size={14} aria-hidden="true" /><span className="events-sr-only">Starts</span></dt><dd>{formatDate(event.startsAt)} IST</dd></div>
        <div><dt><MapPin size={14} aria-hidden="true" /><span className="events-sr-only">Location</span></dt><dd>{event.format} · {event.location}</dd></div>
        {event.deadline && <div><dt><Clock size={14} aria-hidden="true" /><span className="events-sr-only">Registration deadline</span></dt><dd>Register by {datePart(event.deadline, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} IST</dd></div>}
        <div><dt><Users size={14} aria-hidden="true" /><span className="events-sr-only">Eligibility</span></dt><dd>{event.eligibility}</dd></div>
      </dl>
      {(event.fee || event.prize) && <div className="events-card__benefits">{event.fee && <span><Ticket size={13} aria-hidden="true" />{event.fee}</span>}{event.prize && <span className="events-card__prize"><Trophy size={13} aria-hidden="true" />{event.prize}</span>}</div>}
      <div className="events-card__footer"><span className={`events-status${registration?.status === 'registered' ? ' events-status--registered' : ''}${outcome ? ' events-status--completed' : ''}`}>{outcome ? <Trophy size={14} aria-hidden="true" /> : registration?.status === 'registered' ? <CheckCircle2 size={14} aria-hidden="true" /> : <span className={`events-status-dot${phase === 'ongoing' ? ' events-status-dot--live' : ''}`} />}{status}{registration?.reminder && phase !== 'past' && <Bell size={14} aria-label="Reminder saved" role="img" />}</span><button type="button" className="events-button" aria-label={`View details: ${event.title}`} onClick={() => onSelect(event)}>View Details<ArrowUpRight size={15} aria-hidden="true" /></button></div>
    </div>
  </article>
}

function EventsContent({ user }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [saved, setSaved] = useState(() => eventStore.read(user))
  const [filterValues, setFilters] = useState(INITIAL_FILTERS)
  const [expandedFilters, setExpandedFilters] = useState(false)
  const [pagination, setPagination] = useState({ key: '', count: PAGE_SIZE })
  const [now, setNow] = useState(Date.now)
  const requestedView = searchParams.get('view')
  const filters = { ...filterValues, view: Object.hasOwn(VIEW_NAMES, requestedView) ? requestedView : 'upcoming' }
  const filterKey = JSON.stringify(filters)
  const visibleLimit = pagination.key === filterKey ? pagination.count : PAGE_SIZE
  const selected = MOCK_EVENTS.find((event) => event.id === searchParams.get('event')) ?? null
  const outcomes = saved.outcomes ?? {}
  const filtered = selectEvents(MOCK_EVENTS, filters, saved.registrations, now, user, outcomes)
  const registrations = MOCK_EVENTS.filter((event) => saved.registrations[event.id])
  const totalRegistrations = registrations.length
  const completedCount = registrations.filter((event) => outcomes[event.id]).length
  const activeReminders = registrations.filter((event) => saved.registrations[event.id].reminder && eventPhase(event, now) !== 'past').length
  const activeListings = MOCK_EVENTS.filter((event) => event.type !== 'announcement' && eventPhase(event, now) !== 'past').length
  const advancedCount = ADVANCED_FILTERS.filter((key) => filters[key] !== INITIAL_FILTERS[key]).length

  function refresh() {
    setSaved(eventStore.read(user))
    setNow(Date.now())
  }

  function setFilter(key, value) {
    if (key === 'view') {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('view', value)
        return next
      })
    } else {
      setFilters((current) => ({ ...current, [key]: value }))
    }
    setPagination({ key: '', count: PAGE_SIZE })
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS)
    setPagination({ key: '', count: PAGE_SIZE })
  }

  function selectEvent(event) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (event) next.set('event', event.id)
      else next.delete('event')
      return next
    }, { replace: !event })
  }

  function viewMyEvents() {
    clearFilters()
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('event')
      next.set('view', 'my')
      return next
    })
  }

  useEffect(() => {
    const update = () => { setSaved(eventStore.read(user)); setNow(Date.now()) }
    const timer = setInterval(update, 60000)
    window.addEventListener('storage', update)
    window.addEventListener('focus', update)
    window.addEventListener(EVENT_CHANGE_EVENT, update)
    return () => {
      clearInterval(timer)
      window.removeEventListener('storage', update)
      window.removeEventListener('focus', update)
      window.removeEventListener(EVENT_CHANGE_EVENT, update)
    }
  }, [user])

  return (
    <div className="events-page">
      <section className="events-hero" aria-labelledby="events-showcase-title">
        <div className="events-hero__copy"><span className="events-eyebrow"><span className="events-live-dot" />Global Broadcast Network</span><h2 id="events-showcase-title">Showcase Events <span>&amp; Keynotes</span></h2><p>Your next connection. Your next breakthrough. Explore learning sessions, founder opportunities, and community broadcasts.</p><span className="events-demo-note">Sample listings · your registrations and activity stay on this browser.</span></div>
        <div className="events-broadcast-art" aria-hidden="true"><span /><span /><span /><div><Radio size={38} /></div><i className="events-broadcast-art__satellite"><Sparkles size={15} /></i></div>
        <div className="events-broadcasts" role="group" aria-label="Broadcast type">{[['all', 'All Broadcasts', Radio], ['event', 'Showcase Events', Calendar], ['announcement', 'Transmissions', Megaphone]].map(([value, label, Icon]) => <button type="button" className={`events-button${filters.broadcast === value ? ' events-button--primary' : ''}`} key={value} aria-pressed={filters.broadcast === value} onClick={() => setFilter('broadcast', value)}><Icon size={16} aria-hidden="true" />{label}</button>)}</div>
      </section>
      <section className="events-metrics" aria-label="Your event overview">
        {[[Radio, activeListings, 'Live & upcoming'], [Bookmark, totalRegistrations, 'Saved to My Events'], [Trophy, completedCount, 'Participation records'], [Bell, activeReminders, 'Reminder preferences']].map(([Icon, count, label]) => <div key={label}><span className="events-metric-icon"><Icon size={20} aria-hidden="true" /></span><dl><dt>{label}</dt><dd>{count}</dd></dl></div>)}
      </section>
      <div className="events-view-row"><nav className="events-views" aria-label="Event views">{[['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['my', `My Events (${totalRegistrations})`], ['completed', 'Completed'], ['past', 'Past']].map(([value, label]) => <button type="button" key={value} aria-pressed={filters.view === value} onClick={() => setFilter('view', value)}>{value === 'my' && <Bookmark size={14} aria-hidden="true" />}{value === 'completed' && <CheckCircle2 size={14} aria-hidden="true" />}{label}</button>)}</nav></div>
      <section className="events-filter-panel" aria-label="Find events">
        <div className="events-filters">
          <label className="events-field events-search">Search events<span><Search size={18} aria-hidden="true" /><input type="search" value={filters.query} placeholder="Search events, organizers, opportunities…" onChange={(e) => setFilter('query', e.target.value)} /></span></label>
          <label className="events-field">Category<select aria-label="Category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}><option value="all">All categories</option>{EVENT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="events-field">Format<select aria-label="Format" value={filters.format} onChange={(e) => setFilter('format', e.target.value)}><option value="all">All formats</option><option>Online</option><option>In person</option><option>Hybrid</option></select></label>
          <label className="events-field">Sort by date<select aria-label="Sort by date" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
        </div>
        <div className="events-filter-tools"><button type="button" className="events-text-button" aria-expanded={expandedFilters} aria-controls="events-advanced-filters" onClick={() => setExpandedFilters((value) => !value)}><SlidersHorizontal size={15} aria-hidden="true" />More filters{advancedCount > 0 && <span className="events-filter-count">{advancedCount}</span>}<ChevronDown size={15} aria-hidden="true" /></button><button type="button" className="events-text-button" onClick={clearFilters}>Clear filters</button></div>
        <div id="events-advanced-filters" className="events-advanced-filters" hidden={!expandedFilters}>
          <label className="events-field">Starts from<input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(e) => setFilter('dateFrom', e.target.value)} /></label>
          <label className="events-field">Starts by<input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(e) => setFilter('dateTo', e.target.value)} /></label>
          <label className="events-field">Location<input type="search" value={filters.location} placeholder="City, venue, or online" onChange={(e) => setFilter('location', e.target.value)} /></label>
          <label className="events-field">Eligibility<select aria-label="Eligibility" value={filters.eligibility} onChange={(e) => setFilter('eligibility', e.target.value)}><option value="all">All eligibility</option><option value="eligible">Eligible for my role</option></select></label>
          <label className="events-field">Fee<select aria-label="Fee" value={filters.fee} onChange={(e) => setFilter('fee', e.target.value)}><option value="all">Any fee</option><option value="free">Free</option><option value="paid">Paid</option></select></label>
          <label className="events-field">Prizes &amp; benefits<select aria-label="Prizes & benefits" value={filters.prizes} onChange={(e) => setFilter('prizes', e.target.value)}><option value="all">Any benefits</option><option value="with-prizes">With prizes or benefits</option></select></label>
          <label className="events-field">Sponsorship<select aria-label="Sponsorship" value={filters.sponsored} onChange={(e) => setFilter('sponsored', e.target.value)}><option value="all">All listings</option><option value="sponsored">Sponsored only</option><option value="organic">Not sponsored</option></select></label>
          <p className="events-note">Date filters use the listing start date in India Standard Time, including both selected dates.</p>
        </div>
      </section>
      {filters.view === 'my' && <div className="events-my-period"><div><span className="events-eyebrow"><Bookmark size={14} aria-hidden="true" />Your opportunity tracker</span><p>Follow registrations, reminder preferences, and participation in one place.</p></div><label className="events-field">My Events period<select aria-label="My Events period" value={filters.myPeriod} onChange={(e) => setFilter('myPeriod', e.target.value)}><option value="all">All saved events</option><option value="upcoming">Upcoming only</option><option value="ongoing">Ongoing only</option><option value="past">Past only</option><option value="completed">Completed only</option></select></label></div>}
      <div className="events-results-heading"><h3>{VIEW_NAMES[filters.view]}</h3><p className="events-count" role="status">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}{filters.view === 'my' ? ' in My Events' : ''}</p></div>
      {filtered.length === 0 ? <section className="events-empty"><span className="events-empty__icon">{filters.view === 'completed' ? <Trophy size={34} aria-hidden="true" /> : <Calendar size={34} aria-hidden="true" />}</span><h3>{filters.view === 'my' ? 'No saved events match this view' : filters.view === 'completed' ? 'Your next achievement starts here' : 'No broadcasts found'}</h3><p>{filters.view === 'my' ? 'Register for an event to find it here, or adjust your filters.' : filters.view === 'completed' ? 'After a registered event starts, record your participation from its details. Your results and certificates will appear here.' : 'Try another category, format, or search. Check Ongoing for events happening now and Past for older listings.'}</p></section> : <div className="events-grid">{filtered.slice(0, visibleLimit).map((event) => <EventCard key={event.id} event={event} registration={saved.registrations[event.id]} outcome={outcomes[event.id]} user={user} now={now} onSelect={selectEvent} />)}</div>}
      {filtered.length > visibleLimit && <div className="events-show-more"><p className="events-note">Showing {visibleLimit} of {filtered.length} listings</p><button type="button" className="events-button" onClick={() => setPagination({ key: filterKey, count: visibleLimit + PAGE_SIZE })}>Show more broadcasts<ChevronDown size={16} aria-hidden="true" /></button></div>}
      <p className="events-page-footnote"><Radio size={13} aria-hidden="true" />Sample broadcast network · All times in IST · No real registrations, payments, or messages</p>
      {selected && <EventDialog key={selected.id} event={selected} user={user} registration={saved.registrations[selected.id]} outcome={outcomes[selected.id]} now={now} onClose={() => selectEvent(null)} onChanged={refresh} onViewMyEvents={viewMyEvents} />}
    </div>
  )
}

export function EventsPage() {
  const { user } = useAuth()
  return user ? <EventsContent key={user.id} user={user} /> : null
}
