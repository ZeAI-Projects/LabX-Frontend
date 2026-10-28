import { ArrowUpRight, Bell, Bookmark, BookmarkCheck, CalendarCheck2, CheckCircle2, Clock, History, MapPin } from 'lucide-react'
import { eventPhase, getRegistrationAvailability, getTrackingStatus } from '../services/mock_events.js'
import './EventsPage.css'
import './EventList.css'

const dateOptions = { timeZone: 'Asia/Kolkata' }
const dateFormatter = new Intl.DateTimeFormat('en-IN', { ...dateOptions, dateStyle: 'medium', timeStyle: 'short' })

export function EventList({ events, registrations = {}, outcomes = {}, savedEvents = {}, user, now, onSelect, onSave, label = 'Events' }) {
  return (
    <ul className="events-list" aria-label={label}>
      {events.map((event) => {
        const registration = registrations[event.id]
        const outcome = outcomes[event.id]
        const isSaved = Boolean(savedEvents[event.id])
        const phase = eventPhase(event, now)
        const availability = getRegistrationAvailability(event, user, registration, now)
        const trackingStatus = getTrackingStatus(event, registration, outcome, now)
        const confirmed = registration?.status === 'registered'
        const completed = confirmed && outcome?.status === 'completed'
        const status = registration
          ? confirmed && !completed ? `Registered · ${trackingStatus}` : trackingStatus
          : phase === 'past' ? 'Event ended' : availability.allowed ? 'Registration open' : availability.label
        const StatusIcon = completed ? CheckCircle2 : phase === 'past' ? History : confirmed ? CalendarCheck2 : Clock
        const startsAt = new Date(event.startsAt)
        const fullDate = `${dateFormatter.format(startsAt)} IST`
        const venue = event.format === 'Online' ? '' : event.location?.replace(/\s*\/\s*online\s*$/i, '')

        return (
          <li key={event.id}>
            <article className="events-list-row events-list-row--compact" aria-labelledby={`event-list-title-${event.id}`}>
              <div className="events-list-row__content">
                <span className="events-list-row__category">{event.category}</span>
                <h3 id={`event-list-title-${event.id}`}>{event.title}</h3>
              </div>
              <span className="events-list-row__format">{event.format}</span>
              <dl className="events-list-facts">
                  <div>
                    <dt><Clock size={14} aria-hidden="true" /><span className="events-sr-only">{event.type === 'announcement' ? 'Published' : 'Starts'}</span></dt>
                    <dd><time dateTime={event.startsAt}>{fullDate}</time></dd>
                  </div>
                  {venue && <div>
                    <dt><MapPin size={14} aria-hidden="true" /><span className="events-sr-only">Location</span></dt>
                    <dd>{venue}</dd>
                  </div>}
              </dl>
              <div className="events-list-row__trailing">
                <span className={`events-status${confirmed ? ' events-status--registered' : ''}${completed ? ' events-status--completed' : ''}`}>
                  <StatusIcon size={15} aria-hidden="true" />
                  {status}
                  {registration?.reminder && phase !== 'past' && <Bell size={14} aria-label="Reminder saved" role="img" />}
                </span>
                <div className="events-list-row__actions">
                  {event.type !== 'announcement' && (
                    <button
                      type="button"
                      className="events-button events-save-button"
                      aria-pressed={isSaved}
                      aria-label={`${isSaved ? 'Remove saved event' : 'Save event'}: ${event.title}`}
                      onClick={() => onSave(event, !isSaved)}
                    >
                      {isSaved ? <BookmarkCheck size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                  )}
                  <button type="button" className="events-button events-list-details" aria-label={`View details: ${event.title}`} onClick={() => onSelect(event)}>
                    View Details<ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
