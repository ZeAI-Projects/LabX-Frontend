import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bell, Calendar, CheckCircle2, Clock, Flag, MapPin, Megaphone, Radio, Search, Users, X } from 'lucide-react'
import { useAuth } from '../../../hooks/use_auth.js'
import { EVENT_CATEGORIES, MOCK_EVENTS, REPORT_REASONS, eventPhase, eventStore, getRegistrationAvailability, selectEvents } from '../services/mock_events.js'
import '../components/EventsPage.css'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))
}

function EventFacts({ event, detailed = false }) {
  return (
    <dl className={`events-facts${detailed ? ' events-facts--details' : ''}`}>
      <div><dt><Users size={14} />Organizer</dt><dd>{event.organizer}</dd></div>
      <div><dt><Calendar size={14} />{event.type === 'announcement' ? 'Published' : 'Starts'}</dt><dd><time dateTime={event.startsAt}>{formatDate(event.startsAt)}</time> IST</dd></div>
      {detailed && <div><dt>Ends</dt><dd><time dateTime={event.endsAt}>{formatDate(event.endsAt)}</time> IST</dd></div>}
      <div><dt><MapPin size={14} />{event.format}</dt><dd>{event.location}</dd></div>
      {event.deadline && <div><dt><Clock size={14} />Register by</dt><dd><time dateTime={event.deadline}>{formatDate(event.deadline)}</time> IST</dd></div>}
      <div><dt>Eligibility</dt><dd>{event.eligibility}</dd></div>
      {event.fee && <div><dt>Fee</dt><dd>{event.fee}</dd></div>}
      {event.prize && <div><dt>Benefits</dt><dd>{event.prize}</dd></div>}
      {detailed && event.capacity !== null && <div><dt>Availability</dt><dd>{event.available} of {event.capacity} sample places available</dd></div>}
      {detailed && <div><dt>Time zone</dt><dd>India Standard Time · Asia/Kolkata (UTC+05:30)</dd></div>}
      {detailed && <div><dt>Contact</dt><dd>{event.contact}</dd></div>}
    </dl>
  )
}

function EventDialog({ event, user, registration, now, onClose, onChanged }) {
  const dialogRef = useRef(null)
  const headingRef = useRef(null)
  const [panel, setPanel] = useState('details')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const availability = getRegistrationAvailability(event, user, registration, now)
  const past = eventPhase(event, now) === 'past'

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  function showPanel(nextPanel) {
    setNotice('')
    setError('')
    setPanel(nextPanel)
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function register(e) {
    e.preventDefault()
    try {
      eventStore.register(user, event.id)
      onChanged()
      setPanel('details')
      setNotice('Registration confirmed in this demo. Your event is saved in My Events.')
      requestAnimationFrame(() => headingRef.current?.focus())
    } catch (err) {
      setError(err.message)
    }
  }

  function report(e) {
    e.preventDefault()
    try {
      eventStore.report(user, event.id, reason, notes)
      onChanged()
      setPanel('details')
      setNotice('Report saved in this demo. It has not been sent to the organizer.')
      requestAnimationFrame(() => headingRef.current?.focus())
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleReminder(e) {
    try {
      eventStore.setReminder(user, event.id, e.target.checked)
      onChanged()
      setNotice(e.target.checked ? 'Reminder preference saved on this browser. No email or notification will be sent.' : 'Reminder turned off.')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <dialog ref={dialogRef} className="events-dialog" aria-labelledby="event-dialog-title" onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="events-dialog__body">
        <button type="button" className="events-dialog__close" aria-label="Close event details" onClick={onClose}><X size={21} /></button>
        <span className="events-eyebrow">{event.category} · {event.format}</span>
        <h2 id="event-dialog-title" tabIndex={-1} ref={headingRef}>{panel === 'confirm' ? 'Confirm registration' : panel === 'report' ? 'Report listing' : event.title}</h2>
        {error && <p className="events-feedback events-feedback--error" role="alert">{error}</p>}
        {notice && <p className="events-feedback" role="status">{notice}</p>}
        {panel === 'details' && <>
          <p className="events-dialog__description">{event.description}</p>
          {event.sponsored && <p className="events-sponsored">Sponsored by {event.sponsor}. This is a sample sponsored listing.</p>}
          <EventFacts event={event} detailed />
          <section className="events-schedule" aria-labelledby="event-schedule"><h3 id="event-schedule">Schedule</h3><p>{event.schedule}</p></section>
          {event.format !== 'In person' && event.type !== 'announcement' && <p className="events-note">This sample event has no live meeting or external registration link.</p>}
          {registration ? <div className="events-registration">
            <p><CheckCircle2 size={18} /><strong>Registered</strong>{past && <span> · Past event</span>}</p>
            <span>Saved {formatDate(registration.registeredAt)} IST</span>
            <label className="events-reminder"><input type="checkbox" checked={Boolean(registration.reminder)} disabled={past} onChange={toggleReminder} /><Bell size={17} />Save a reminder for this event</label>
            <p className="events-note">{past ? 'This event has ended. Reminder preferences are read-only.' : 'Reminders are a browser-only preference in this demo; no messages are sent.'}</p>
          </div> : event.type !== 'announcement' && <div className="events-register-action">
            <button type="button" className="events-button events-button--primary" disabled={!availability.allowed} onClick={() => showPanel('confirm')}>{availability.label}</button>
            {!availability.allowed && <p className="events-note">{availability.label === 'Not eligible' ? `This listing is for ${event.eligibility.toLowerCase()}.` : 'Registration is unavailable for this listing.'}</p>}
          </div>}
          <footer className="events-dialog__footer"><button type="button" className="events-text-button" onClick={() => showPanel('report')}><Flag size={15} />Report listing</button><button type="button" className="events-button" onClick={onClose}>Close</button></footer>
        </>}
        {panel === 'confirm' && <form onSubmit={register}>
          <p className="events-dialog__description">Save a place for <strong>{event.title}</strong>?</p>
          <p className="events-confirm-time"><Calendar size={18} />{formatDate(event.startsAt)} IST</p>
          <p className="events-note">This is a mock registration saved to your account on this browser. It does not reserve a real place or send anything to the organizer.</p>
          <div className="events-dialog__actions"><button type="button" className="events-button" onClick={() => showPanel('details')}>Cancel</button><button type="submit" className="events-button events-button--primary" disabled={!availability.allowed}>Confirm registration</button></div>
          {!availability.allowed && <p className="events-feedback events-feedback--error" role="alert">{availability.label}</p>}
        </form>}
        {panel === 'report' && <form onSubmit={report}>
          <p className="events-dialog__description">Flag <strong>{event.title}</strong> for review.</p>
          <label className="events-field">Reason<select aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required><option value="">Select a reason</option>{REPORT_REASONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="events-field">Additional details (optional)<textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Tell us what needs attention" /></label>
          <p className="events-note">The report is saved locally for this demo. It is not submitted to moderators or the organizer.</p>
          <div className="events-dialog__actions"><button type="button" className="events-button" onClick={() => showPanel('details')}><ArrowLeft size={15} />Back</button><button type="submit" className="events-button events-button--primary" disabled={!reason}>Save report</button></div>
        </form>}
      </div>
    </dialog>
  )
}

function EventsContent({ user }) {
  const [saved, setSaved] = useState(() => eventStore.read(user))
  const [filters, setFilters] = useState({ query: '', category: 'all', format: 'all', view: 'upcoming', broadcast: 'all', sort: 'soonest', myPeriod: 'all' })
  const [selected, setSelected] = useState(null)
  const [now, setNow] = useState(Date.now)
  const filtered = selectEvents(MOCK_EVENTS, filters, saved.registrations, now)
  const upcomingRegistrations = MOCK_EVENTS.filter((event) => saved.registrations[event.id] && eventPhase(event, now) === 'upcoming').length
  const totalRegistrations = Object.keys(saved.registrations).length
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    const refresh = () => { setSaved(eventStore.read(user)); setNow(Date.now()) }
    const timer = setInterval(refresh, 60000)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh) }
  }, [user])

  return (
    <div className="events-page">
      <section className="events-hero" aria-labelledby="events-showcase-title">
        <div><span className="events-eyebrow"><Radio size={15} />Global Broadcast Network</span><h2 id="events-showcase-title">Showcase Events &amp; Keynotes</h2><p>Join live founder masterclasses, investor demo days, and global venture ecosystem announcements.</p><span className="events-demo-note">Sample listings · registrations and reminders stay on this browser.</span></div>
        <div className="events-broadcasts" aria-label="Broadcast type">{[['all', 'All Broadcasts', Radio], ['event', 'Showcase Events', Calendar], ['announcement', 'Transmissions', Megaphone]].map(([value, label, Icon]) => <button type="button" className={`events-button${filters.broadcast === value ? ' events-button--primary' : ''}`} key={value} aria-pressed={filters.broadcast === value} onClick={() => setFilter('broadcast', value)}><Icon size={15} />{label}</button>)}</div>
      </section>

      <div className="events-view-row"><nav className="events-views" aria-label="Event views">{[['upcoming', 'Upcoming'], ['my', `My Events (${totalRegistrations})`], ['past', 'Past']].map(([value, label]) => <button type="button" key={value} aria-pressed={filters.view === value} onClick={() => setFilter('view', value)}>{label}</button>)}</nav><p><CheckCircle2 size={15} />{upcomingRegistrations} upcoming registration{upcomingRegistrations === 1 ? '' : 's'}</p></div>
      <section className="events-filters" aria-label="Find events">
        <label className="events-field events-search">Search events<span><Search size={18} /><input type="search" value={filters.query} placeholder="Search events, organizers, opportunities..." onChange={(e) => setFilter('query', e.target.value)} /></span></label>
        <label className="events-field">Category<select aria-label="Category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}><option value="all">All categories</option>{EVENT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="events-field">Format<select aria-label="Format" value={filters.format} onChange={(e) => setFilter('format', e.target.value)}><option value="all">All formats</option><option>Online</option><option>In person</option><option>Hybrid</option></select></label>
        <label className="events-field">Sort by date<select aria-label="Sort by date" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
      </section>
      {filters.view === 'my' && <div className="events-my-period"><label className="events-field">My Events period<select aria-label="My Events period" value={filters.myPeriod} onChange={(e) => setFilter('myPeriod', e.target.value)}><option value="all">Upcoming and past</option><option value="upcoming">Upcoming only</option><option value="past">Past only</option></select></label><p>Your saved registrations and reminder preferences.</p></div>}
      <p className="events-count" role="status">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}{filters.view === 'my' ? ' in My Events' : ` · ${filters.view === 'past' ? 'Past broadcasts' : 'Upcoming broadcasts'}`}</p>
      {filtered.length === 0 ? <section className="events-empty"><Calendar size={42} /><h3>{filters.view === 'my' ? 'No saved events match this view' : 'No broadcasts found'}</h3><p>{filters.view === 'my' ? 'Register for an event to find it here, or adjust your filters.' : 'Try another category, format, or search. Older sample listings are available in Past.'}</p><button type="button" className="events-button" onClick={() => setFilters((current) => ({ ...current, query: '', category: 'all', format: 'all', broadcast: 'all', myPeriod: 'all' }))}>Clear filters</button></section> : <div className="events-grid">{filtered.map((event) => {
        const registration = saved.registrations[event.id]
        const availability = getRegistrationAvailability(event, user, registration, now)
        const past = eventPhase(event, now) === 'past'
        return <article className="events-card" key={event.id} aria-labelledby={`event-title-${event.id}`}>
          <div className="events-card__top"><span className={`events-tag${event.type === 'announcement' ? ' events-tag--purple' : ''}`}>{event.type === 'announcement' ? <Megaphone size={13} /> : <Calendar size={13} />}{event.category}</span>{event.sponsored && <span className="events-sponsored-tag">Sponsored</span>}</div>
          <h3 id={`event-title-${event.id}`}>{event.title}</h3><p className="events-card__description">{event.description}</p>
          <EventFacts event={event} />
          <div className="events-card__footer"><span className={`events-status${registration ? ' events-status--registered' : ''}`}>{registration ? <CheckCircle2 size={14} /> : <Clock size={14} />}{past ? registration ? 'Registered · Past event' : 'Expired · Event ended' : availability.allowed ? 'Registration open' : availability.label}{registration?.reminder && !past && <Bell size={14} aria-label="Reminder saved" />}</span><button type="button" className="events-button" aria-label={`View details: ${event.title}`} onClick={() => setSelected(event)}>View Details</button></div>
        </article>
      })}</div>}
      {selected && <EventDialog key={selected.id} event={selected} user={user} registration={saved.registrations[selected.id]} now={now} onClose={() => setSelected(null)} onChanged={() => { setSaved(eventStore.read(user)); setNow(Date.now()) }} />}
    </div>
  )
}

export function EventsPage() {
  const { user } = useAuth()
  return user ? <EventsContent key={user.id} user={user} /> : null
}
