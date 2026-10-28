import collaborationPhoto from '../assets/collaboration.jpg'
import conferencePhoto from '../assets/conference.jpg'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Award, Bell, Bookmark, BookmarkCheck, Calendar, CalendarCheck2, CheckCircle2, ChevronDown, Clock, Copy, Download, ExternalLink, FileCheck2, Flag, History, MapPin, Radio, Sparkles, Ticket, Trophy, Upload, Users, X } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { EVENT_CHANGE_EVENT, MAX_CERTIFICATE_BYTES, MOCK_EVENTS, REPORT_REASONS, eventPhase, eventStore, getRegistrationAvailability, getSafeEventLink, getTrackingStatus, selectEvents } from '../services/mock_events.js'
import '../components/EventsPage.css'
import { EventArtwork } from '../components/EventArtwork.jsx'
import { EventList } from '../components/EventList.jsx'
import { Pagination } from '../../../components/common/Pagination.jsx'
import { EventsSearchField, EventFiltersDropdown } from '../components/EventsDiscoveryControls.jsx'

const INITIAL_FILTERS = {
  query: '', category: 'all', format: 'all', sort: '', myPeriod: 'all', savedPeriod: 'all',
  dateFrom: '', dateTo: '', location: '', eligibility: 'all', fee: 'all', prizes: 'all', sponsored: 'all',
}
const CERTIFICATE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const VIEW_NAMES = { upcoming: 'Upcoming broadcasts', ongoing: 'Happening now', saved: 'Saved Events', my: 'My Events', completed: 'Completed participation', past: 'Past-event history' }
const PAGE_SIZE = 10
const COLLECTION_VIEWS = ['saved', 'completed', 'past']
function EventsPopup({ dialogRef, titleId, returnFocusRef, onClose, className = '', notification, children }) {
  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const returnFocusTarget = returnFocusRef.current
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) opener.focus({ preventScroll: true })
      else returnFocusTarget?.focus({ preventScroll: true })
    }
  }, [dialogRef, returnFocusRef])
  return <dialog ref={dialogRef} className={`events-dialog ${className}`} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="events-dialog__body">
      <button autoFocus type="button" className="events-dialog__close" aria-label="Close events popup" onClick={onClose}><X size={19} aria-hidden="true" /></button>
      {children}
    </div>
    {notification}
  </dialog>
}

function EventSaveToast({ notification }) {
  if (!notification) return null
  return <div className={`events-save-toast${notification.exiting ? ' events-save-toast--exiting' : ''}`} role="status" aria-atomic="true">
    <BookmarkCheck size={18} aria-hidden="true" />
    <span>{notification.text}</span>
  </div>
}

function EventEmptyState({ view, savedCount }) {
  const Icon = view === 'saved' ? Bookmark : view === 'past' ? History : view === 'completed' ? Trophy : Calendar
  const title = view === 'saved' ? savedCount ? 'No saved events match your search' : 'Save an event for later' : view === 'my' ? 'No registrations match this view' : view === 'completed' ? 'Your next achievement starts here' : view === 'past' ? 'No past events match your search' : 'No events found'
  const description = view === 'saved' ? savedCount ? 'Clear or adjust your search to revisit your saved events.' : 'Use Save on an event to add it to your list.' : view === 'my' ? 'Register for an event to find it here, or adjust your filters.' : view === 'completed' ? 'After a registered event starts, record your participation from its details. Your results and certificates will appear here.' : view === 'past' ? 'Clear or adjust your search to find past events.' : 'Try another category, format, or search. Check Ongoing for events happening now and Past Events for older listings.'
  return <section className="events-empty"><span className="events-empty__icon"><Icon size={32} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></section>
}

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

function EventDetails({ event, user, registration, outcome, saved, now, dialogRef, onClose, onChanged, onSaved, onViewMyEvents, onBack, backLabel }) {
  const detailsRef = useRef(null)
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
    headingRef.current?.focus({ preventScroll: true })
    if (dialogRef.current) dialogRef.current.scrollTop = 0
    return () => {
      fileReaderRef.current?.abort()
      fileReaderRef.current = null
    }
  }, [dialogRef])

  function focusHeading() {
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
      if (dialogRef.current) dialogRef.current.scrollTop = 0
    })
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

  function toggleSaved() {
    try {
      eventStore.setSaved(user, event.id, !saved)
      onChanged()
      setError('')
      setNotice('')
      onSaved(!saved)
    } catch (err) { fail(err) }
  }

  function register(e) {
    e.preventDefault()
    try {
      eventStore.register(user, event.id)
      onChanged()
      setPanel('details')
      setError('')
      setNotice('Your event is saved in My Events.')
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
      setNotice('Report saved locally. It has not been sent to the organizer.')
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
      'Self-reported participation · LabX',
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(summary)
      if (detailsRef.current?.isConnected) {
        setError('')
        setNotice('Participation summary copied. Feedback, rating, and certificate were not included.')
      }
    } catch {
      if (detailsRef.current?.isConnected) fail(new Error('The summary could not be copied. Select and copy the participation details instead.'))
    } finally {
      copyingRef.current = false
      if (detailsRef.current?.isConnected) setCopying(false)
    }
  }

  return (
      <div ref={detailsRef} className={`events-detail-panel${panel !== 'details' || onBack ? ' has-back' : ''}`}>
        {(panel !== 'details' || onBack) && <button type="button" className="events-dialog__back" aria-label={panel !== 'details' ? 'Back to event details' : backLabel} onClick={() => panel !== 'details' ? showPanel('details') : onBack()}><ArrowLeft size={20} aria-hidden="true" /></button>}
        <span className="events-eyebrow"><Radio size={14} aria-hidden="true" />{event.category} · {event.format}</span>
        <h2 id="event-dialog-title" tabIndex={-1} ref={headingRef}>{title}</h2>
        {error && <p ref={errorRef} tabIndex={-1} className="events-feedback events-feedback--error" role="alert">{error}</p>}
        {notice && <p className="events-feedback" role="status">{notice}</p>}
        {panel === 'details' && <>
          <p className="events-dialog__description">{event.description}</p>
          <div className="events-save-action"><button type="button" className="events-button events-save-button" aria-pressed={saved} aria-label={`${saved ? 'Remove saved event' : 'Save event'}: ${event.title}`} onClick={toggleSaved}>{saved ? <BookmarkCheck size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}{saved ? 'Saved' : 'Save event'}</button><p className="events-note">{saved ? 'In your Saved Events.' : 'Save for later, without registering.'}</p></div>
          {event.sponsored && <p className="events-sponsored"><Sparkles size={16} aria-hidden="true" /><span>Sponsored by {event.sponsor}. This is a sample sponsored listing.</span></p>}
          <EventFacts event={event} />
          <section className="events-schedule" aria-labelledby="event-schedule"><h3 id="event-schedule">Schedule</h3><p>{event.schedule}</p></section>
          {event.requirements && <section className="events-schedule" aria-labelledby="event-requirements"><h3 id="event-requirements">What you need</h3>{Array.isArray(event.requirements) ? <ul>{event.requirements.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{event.requirements}</p>}</section>}
          {event.format !== 'In person' && event.type !== 'announcement' && <p className="events-note">This sample listing does not provide a live meeting room.</p>}
          {registration && <section className="events-registration" aria-label="Your registration">
            <div className="events-registration__heading"><span className="events-section-icon">{confirmed ? <CheckCircle2 size={21} aria-hidden="true" /> : <Clock size={21} aria-hidden="true" />}</span><div><h3>{confirmed ? 'Registered' : 'Registration pending'}</h3><p>{confirmed ? external ? 'External confirmation · Self-reported' : 'Registration saved' : 'Continue the external registration preview below.'}</p></div><span className="events-tag events-tag--green">{trackingStatus}</span></div>
            <p className="events-registration__date">Saved {formatDate(registration.registeredAt)} IST</p>
            {registration.confirmationReference && <p className="events-note">Your reference: <strong>{registration.confirmationReference}</strong></p>}
            {confirmed && <>
              <label className="events-reminder"><input type="checkbox" checked={Boolean(registration.reminder)} disabled={past} onChange={toggleReminder} /><Bell size={17} aria-hidden="true" />Save a reminder for this event</label>
              <p className="events-note">{past ? 'This event has ended. Reminder preferences are read-only.' : 'Reminder preferences are saved locally; notifications are not connected yet.'}</p>
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
            {!availability.allowed ? <p className="events-note">{availability.label === 'Not eligible' ? `This listing is for ${event.eligibility.toLowerCase()}.` : 'Registration is unavailable for this listing.'}</p> : <p className="events-note">{external ? 'External registration preview. Your saved confirmation is self-reported; no real payment is processed.' : 'Registration is saved locally. It does not reserve a place with the organizer.'}</p>}
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
            <li><span className="events-step-number" aria-hidden="true">01</span><div><h3>Preview the external destination</h3><p>These links open a sample destination. They cannot register you or accept payment.</p><div className="events-inline-actions">
              {availability.allowed && registrationUrl ? <a className="events-button" href={registrationUrl} target="_blank" rel="noopener noreferrer">Open External Link<ExternalLink size={15} aria-hidden="true" /><span className="events-sr-only"> · opens a new tab</span></a> : <span className="events-note">The external registration preview is unavailable.</span>}
              {availability.allowed && paymentUrl && <a className="events-button" href={paymentUrl} target="_blank" rel="noopener noreferrer">Open payment preview<ExternalLink size={15} aria-hidden="true" /><span className="events-sr-only"> · opens a new tab</span></a>}
            </div></div></li>
            <li><span className="events-step-number" aria-hidden="true">02</span><div><h3>Record your confirmation</h3><p>Enter a sample reference to try the tracker. This is your own record, not verification from the organizer or a payment provider.</p><label className="events-field"><span>Confirmation reference<span className="events-required" aria-hidden="true">*</span></span><input aria-label="Confirmation reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} required placeholder="e.g. REGISTRATION-01" /></label></div></li>
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
          <p className="events-note">The report is saved locally. It is not submitted to moderators or the organizer.</p>
          <div className="events-dialog__actions"><button type="button" className="events-button" onClick={() => showPanel('details')}><ArrowLeft size={15} aria-hidden="true" />Back</button><button type="submit" className="events-button events-button--primary" disabled={!reason}>Save report</button></div>
        </form>}
      </div>
  )
}

function EventCard({ event, registration, outcome, saved, user, now, onSelect, onSave }) {
  const availability = getRegistrationAvailability(event, user, registration, now)
  const phase = eventPhase(event, now)
  const trackingStatus = getTrackingStatus(event, registration, outcome, now)
  const status = registration ? trackingStatus : phase === 'past' ? 'Expired · Event ended' : availability.allowed ? 'Registration open' : availability.label
  return <article className={`events-card${outcome ? ' events-card--completed' : ''}`} aria-labelledby={`event-title-${event.id}`}>
    <div className="events-card__visual">
      <EventArtwork category={event.category}/>
      <img className="events-card__photo" src={["Workshop","Hackathon","Training","Mentoring"].includes(event.category) ? collaborationPhoto : conferencePhoto} alt="" loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true}} />
      <span className="events-tag"><Calendar size={13} aria-hidden="true" />{event.category}</span>

      <time className="events-date-chip" dateTime={event.startsAt} aria-label={formatDate(event.startsAt)}><span>{datePart(event.startsAt, { month: 'short' })}</span><strong>{datePart(event.startsAt, { day: '2-digit' })}</strong></time>
      {event.sponsored && <span className="events-sponsored-tag"><Sparkles size={11} aria-hidden="true" />Sponsored</span>}
      <div className="events-card__story"><h3 id={`event-title-${event.id}`}>{event.title}</h3><p className="events-card__description">{event.description}</p></div>
    </div>
    <div className="events-card__body">
      <p className="events-card__organizer">{event.organizer}</p>

      <dl className="events-card-facts">
        <div><dt><Calendar size={14} aria-hidden="true" /><span className="events-sr-only">Starts</span></dt><dd>{formatDate(event.startsAt)} IST</dd></div>
        <div><dt><MapPin size={14} aria-hidden="true" /><span className="events-sr-only">Location</span></dt><dd>{event.format} · {event.location}</dd></div>
        {event.deadline && <div><dt><Clock size={14} aria-hidden="true" /><span className="events-sr-only">Registration deadline</span></dt><dd>Register by {datePart(event.deadline, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} IST</dd></div>}
        <div><dt><Users size={14} aria-hidden="true" /><span className="events-sr-only">Eligibility</span></dt><dd>{event.eligibility}</dd></div>
      </dl>
      {(event.fee || event.prize) && <div className="events-card__benefits">{event.fee && <span><Ticket size={13} aria-hidden="true" />{event.fee}</span>}{event.prize && <span className="events-card__prize"><Trophy size={13} aria-hidden="true" />{event.prize}</span>}</div>}
      <div className="events-card__footer"><span className={`events-status${registration?.status === 'registered' ? ' events-status--registered' : ''}${outcome ? ' events-status--completed' : ''}`}>{outcome ? <Trophy size={14} aria-hidden="true" /> : registration?.status === 'registered' ? <CheckCircle2 size={14} aria-hidden="true" /> : <span className={`events-status-dot${phase === 'ongoing' ? ' events-status-dot--live' : ''}`} />}{status}{registration?.reminder && phase !== 'past' && <Bell size={14} aria-label="Reminder saved" role="img" />}</span><div className="events-card__actions"><button type="button" className="events-button events-save-button" aria-pressed={saved} aria-label={`${saved ? 'Remove saved event' : 'Save event'}: ${event.title}`} onClick={() => onSave(event, !saved)}>{saved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}{saved ? 'Saved' : 'Save'}</button><button type="button" className="events-button" aria-label={`View details: ${event.title}`} onClick={() => onSelect(event)}>View Details<ArrowUpRight size={15} aria-hidden="true" /></button></div></div>
    </div>
  </article>
}

function EventsContent({ user }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const resultsHeadingRef = useRef(null)
  const collectionHeadingRef = useRef(null)
  const popupRef = useRef(null)
  const collectionReturnRef = useRef(null)
  const collectionScrollRef = useRef(0)
  const restoreCollectionRef = useRef(false)
  const focusResultsAfterDialog = useRef(false)
  const [saved, setSaved] = useState(() => eventStore.read(user))
  const [saveFeedback, setSaveFeedback] = useState(null)
  const [saveToast, setSaveToast] = useState(null)
  const toastSequence = useRef(0)
  const toastId = saveToast?.id
  const [filterValues, setFilters] = useState(INITIAL_FILTERS)
  const [collectionQuery, setCollectionQuery] = useState('')
  const [pagination, setPagination] = useState({ key: '', page: 1 })
  const [collectionLimit, setCollectionLimit] = useState({ key: '', count: PAGE_SIZE })
  const [now, setNow] = useState(Date.now)
  const requestedView = searchParams.get('view')
  const view = ['upcoming', 'ongoing', 'my'].includes(requestedView) ? requestedView : 'upcoming'
  const collectionView = COLLECTION_VIEWS.includes(searchParams.get('collection')) ? searchParams.get('collection') : COLLECTION_VIEWS.includes(requestedView) ? requestedView : null
  const historyView = view === 'my' && filterValues.myPeriod === 'past'
  const filters = { ...filterValues, view, sort: filterValues.sort || (historyView ? 'latest' : 'soonest') }
  // Popups have their own search; discovery filters do not hide their records.
  const collectionFilters = { ...INITIAL_FILTERS, query: collectionQuery, view: collectionView, sort: collectionView === 'past' ? 'latest' : 'soonest' }
  const filterKey = JSON.stringify(filters)
  const collectionFilterKey = JSON.stringify(collectionFilters)
  const selected = MOCK_EVENTS.find((event) => event.id === searchParams.get('event')) ?? null
  const outcomes = saved.outcomes ?? {}
  const savedEvents = saved.savedEvents ?? {}
  const savedCount = Object.keys(savedEvents).length
  const filtered = selectEvents(MOCK_EVENTS, filters, saved.registrations, now, user, outcomes, savedEvents)
  const collectionEvents = collectionView ? selectEvents(MOCK_EVENTS, collectionFilters, saved.registrations, now, user, outcomes, savedEvents) : []
  const currentPage = Math.min(pagination.key === filterKey ? pagination.page : 1, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))
  const visibleLimit = collectionLimit.key === collectionFilterKey ? collectionLimit.count : PAGE_SIZE
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const visibleCollection = collectionEvents.slice(0, visibleLimit)
  const registrations = MOCK_EVENTS.filter((event) => saved.registrations[event.id])
  const totalRegistrations = registrations.length
  const completedCount = registrations.filter((event) => outcomes[event.id]).length
  const activeListings = MOCK_EVENTS.filter((event) => event.type !== 'announcement' && eventPhase(event, now) !== 'past').length

  function refresh() {
    setSaved(eventStore.read(user))
  }

  function notifySaved(nextSaved) {
    setSaveFeedback(null)
    setSaveToast({ id: ++toastSequence.current, text: nextSaved ? 'Added to Saved Events.' : 'Removed from Saved Events.', exiting: false })
  }

  useEffect(() => {
    if (!toastId) return
    const fadeTimer = window.setTimeout(() => {
      setSaveToast((current) => current?.id === toastId ? { ...current, exiting: true } : current)
    }, 2700)
    const dismissTimer = window.setTimeout(() => {
      setSaveToast((current) => current?.id === toastId ? null : current)
    }, 3000)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(dismissTimer)
    }
  }, [toastId])

  function saveEvent(event, nextSaved) {
    const trigger = document.activeElement
    try {
      eventStore.setSaved(user, event.id, nextSaved)
      refresh()
      notifySaved(nextSaved)
      requestAnimationFrame(() => {
        if (!trigger?.isConnected) (collectionHeadingRef.current ?? resultsHeadingRef.current)?.focus({ preventScroll: true })
      })
    } catch (err) {
      setSaveToast(null)
      setSaveFeedback({ text: err.message || 'This event could not be saved. Please try again.', error: true })
    }
  }

  function setFilter(key, value) {
    if (key === 'view') {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('view', value)
        next.delete('collection')
        next.delete('event')
        return next
      })
    } else {
      setFilters((current) => ({ ...current, [key]: value }))
    }
    setPagination({ key: '', page: 1 })
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS)
    setPagination({ key: '', page: 1 })
  }

  function selectCollection(value) {
    restoreCollectionRef.current = false
    setCollectionQuery('')
    setCollectionLimit({ key: '', count: PAGE_SIZE })
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (COLLECTION_VIEWS.includes(next.get('view'))) next.set('view', view)
      next.set('collection', value)
      next.delete('event')
      return next
    })
  }

  function closePopup() {
    restoreCollectionRef.current = false
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (COLLECTION_VIEWS.includes(next.get('view'))) next.set('view', view)
      next.delete('collection')
      next.delete('event')
      return next
    }, { replace: true })
  }

  function changePage(page) {
    setPagination({ key: filterKey, page })
    resultsHeadingRef.current?.focus({ preventScroll: true })
    resultsHeadingRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }

  function searchCollection(value) {
    setCollectionQuery(value)
    setCollectionLimit({ key: '', count: PAGE_SIZE })
  }

  function showMore() {
    const trigger = document.activeElement
    setCollectionLimit({ key: collectionFilterKey, count: visibleLimit + PAGE_SIZE })
    requestAnimationFrame(() => {
      if (!trigger?.isConnected) collectionHeadingRef.current?.focus({ preventScroll: true })
    })
  }

  function selectEvent(event) {
    if (collectionView && event) {
      restoreCollectionRef.current = true
      collectionReturnRef.current = document.activeElement
      collectionScrollRef.current = popupRef.current?.scrollTop ?? 0
    }
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (event) next.set('event', event.id)
      else next.delete('event')
      return next
    }, { replace: !event })
  }

  function backToCollection() {
    restoreCollectionRef.current = true
    selectEvent(null)
  }

  function viewMyEvents() {
    restoreCollectionRef.current = false
    focusResultsAfterDialog.current = true
    clearFilters()
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('event')
      next.delete('collection')
      next.set('view', 'my')
      return next
    })
  }

  useEffect(() => {
    if (!selected && collectionView && restoreCollectionRef.current) {
      restoreCollectionRef.current = false
      const target = collectionReturnRef.current
      if (target?.isConnected) target.focus({ preventScroll: true })
      else collectionHeadingRef.current?.focus({ preventScroll: true })
      if (popupRef.current) popupRef.current.scrollTop = collectionScrollRef.current
    }
    if (!selected && !collectionView && focusResultsAfterDialog.current) {
      focusResultsAfterDialog.current = false
      resultsHeadingRef.current?.focus({ preventScroll: true })
    }
  }, [selected, collectionView])

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
      <section className="events-metrics" aria-label="Your event overview">
        {[[Radio, activeListings, 'Live & upcoming'], [Bookmark, savedCount, 'Saved events'], [CalendarCheck2, totalRegistrations, 'My registrations'], [Trophy, completedCount, 'Participation records']].map(([Icon, count, label]) => <div key={label}><span className="events-metric-icon"><Icon size={20} aria-hidden="true" /></span><dl><dt>{label}</dt><dd>{count}</dd></dl></div>)}
      </section>
      <div className="events-view-row"><nav className="events-views events-primary-views" aria-label="Event views">
        {[
          ['upcoming', 'Upcoming', Calendar], ['ongoing', 'Ongoing', Radio],
          ['my', 'My Events', CalendarCheck2, totalRegistrations],
        ].map(([value, label, Icon, count]) => <button type="button" key={value} title={label} aria-label={count === undefined ? label : `${label} (${count})`} aria-pressed={filters.view === value} onClick={() => setFilter('view', value)}><Icon size={16} aria-hidden="true" /><span>{label}</span>{count !== undefined && <span className="events-view-count">{count}</span>}</button>)}
      </nav><nav className="events-views events-secondary-views" aria-label="Event collections">
        {[
          ['saved', 'Saved Events', Bookmark, savedCount], ['past', 'Past Events', History], ['completed', 'Completed', CheckCircle2],
        ].map(([value, label, Icon, count]) => <button type="button" key={value} title={count === undefined ? label : `${label} (${count})`} aria-label={count === undefined ? label : `${label} (${count})`} aria-haspopup="dialog" aria-expanded={collectionView === value} onClick={() => selectCollection(value)}><Icon size={18} aria-hidden="true" /></button>)}
      </nav></div>
      {saveFeedback && !collectionView && !selected && <p className="events-feedback events-feedback--error" role="alert">{saveFeedback.text}</p>}
      {!collectionView && !selected && createPortal(<EventSaveToast key={toastId} notification={saveToast} />, document.body)}
      <section className="events-discovery-toolbar" aria-label="Find events">
        <EventsSearchField value={filters.query} onChange={(value) => setFilter('query', value)} onSubmit={() => changePage(1)} />
        <EventFiltersDropdown filters={filters} onChange={setFilter} onClear={clearFilters} />
      </section>
      {filters.view === 'my' && <div className="events-my-period events-list-controls"><div><span className="events-eyebrow"><CalendarCheck2 size={16} aria-hidden="true" />Your registrations</span><p>Track upcoming plans, past events, and your participation records.</p></div><label className="events-field">Show registrations<select aria-label="My Events period" value={filters.myPeriod} onChange={(e) => setFilter('myPeriod', e.target.value)}><option value="all">All registrations</option><option value="upcoming">Upcoming events</option><option value="ongoing">Happening now</option><option value="past">Past events</option><option value="completed">Participation recorded</option></select></label></div>}
      <div className="events-results-heading"><h3 ref={resultsHeadingRef} tabIndex={-1}>{VIEW_NAMES[filters.view]}</h3><p className="events-count" role="status">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}{filters.view === 'my' ? ' in My Events' : ''}</p></div>
      {filtered.length === 0 ? <EventEmptyState view={view} savedCount={savedCount} /> : <div className="events-grid">{visible.map((event) => <EventCard key={event.id} event={event} registration={saved.registrations[event.id]} outcome={outcomes[event.id]} saved={Boolean(savedEvents[event.id])} user={user} now={now} onSelect={selectEvent} onSave={saveEvent} />)}</div>}
      <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} itemLabel="events" onPageChange={changePage} label="Event pages" className="events-pagination" />
      <p className="events-page-footnote"><Radio size={13} aria-hidden="true" />Sample broadcast network · All times in IST · No real registrations, payments, or messages</p>
      {(collectionView || selected) && <EventsPopup dialogRef={popupRef} titleId={selected ? 'event-dialog-title' : 'events-collection-title'} returnFocusRef={resultsHeadingRef} onClose={closePopup} className={collectionView ? 'events-collection-dialog' : ''} notification={<EventSaveToast key={toastId} notification={saveToast} />}>
        {collectionView && <div className="events-collection-content" hidden={Boolean(selected)}>
          <h2 id="events-collection-title" ref={collectionHeadingRef} tabIndex={-1}>{VIEW_NAMES[collectionView]}</h2>
          <EventsSearchField label={`Search ${VIEW_NAMES[collectionView].toLowerCase()}`} value={collectionQuery} onChange={searchCollection} onSubmit={() => collectionHeadingRef.current?.focus({ preventScroll: true })} />
          {saveFeedback && <p className="events-feedback events-feedback--error" role="alert">{saveFeedback.text}</p>}
          <p className="events-collection-count" role="status">{collectionEvents.length} {collectionEvents.length === 1 ? 'event' : 'events'}</p>
          {collectionEvents.length ? <EventList events={visibleCollection} registrations={saved.registrations} outcomes={outcomes} savedEvents={savedEvents} user={user} now={now} onSelect={selectEvent} onSave={saveEvent} label={VIEW_NAMES[collectionView]} /> : <EventEmptyState view={collectionView} savedCount={savedCount} />}
          {collectionEvents.length > visibleCollection.length && <div className="events-show-more"><p className="events-note">Showing {visibleCollection.length} of {collectionEvents.length} events</p><button type="button" className="events-button" onClick={showMore}>Show more<ChevronDown size={16} aria-hidden="true" /></button></div>}
        </div>}
        {selected && <EventDetails key={selected.id} event={selected} user={user} registration={saved.registrations[selected.id]} outcome={outcomes[selected.id]} saved={Boolean(savedEvents[selected.id])} now={now} dialogRef={popupRef} onClose={closePopup} onChanged={refresh} onSaved={notifySaved} onViewMyEvents={viewMyEvents} onBack={collectionView ? backToCollection : null} backLabel={collectionView ? `Back to ${VIEW_NAMES[collectionView]}` : undefined} />}
      </EventsPopup>}
    </div>
  )
}

export function EventsPage() {
  const { user } = useAuth()
  return user ? <EventsContent key={user.id} user={user} /> : null
}
