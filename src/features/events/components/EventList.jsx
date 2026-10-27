import { ArrowUpRight, Bell, Bookmark, BookmarkCheck, CalendarCheck2, CheckCircle2, Clock, History, MapPin } from 'lucide-react'
import { eventPhase, getRegistrationAvailability, getTrackingStatus } from '../services/mock_events.js'
import './EventsPage.css'

const dateOptions = { timeZone: 'Asia/Kolkata' }
const dateFormatter = new Intl.DateTimeFormat('en-IN', { ...dateOptions, dateStyle: 'medium', timeStyle: 'short' })
const monthFormatter = new Intl.DateTimeFormat('en-IN', { ...dateOptions, month: 'short' })
const dayFormatter = new Intl.DateTimeFormat('en-IN', { ...dateOptions, day: '2-digit' })
const yearFormatter = new Intl.DateTimeFormat('en-IN', { ...dateOptions, year: 'numeric' })

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

        return (
          <li key={event.id}>
            <article className="events-list-row" aria-labelledby={`event-list-title-${event.id}`}>
              <time className="events-list-date" dateTime={event.startsAt} aria-label={fullDate}>
                <span>{monthFormatter.format(startsAt)}</span>
                <strong>{dayFormatter.format(startsAt)}</strong>
                <small>{yearFormatter.format(startsAt)}</small>
              </time>
              <div className="events-list-row__content">
                <span className="events-list-row__category">{event.category}</span>
                <h3 id={`event-list-title-${event.id}`}>{event.title}</h3>
                <p className="events-list-row__organizer">{event.organizer}</p>
                <dl className="events-list-facts">
                  <div>
                    <dt><Clock size={14} aria-hidden="true" /><span className="events-sr-only">{event.type === 'announcement' ? 'Published' : 'Starts'}</span></dt>
                    <dd><time dateTime={event.startsAt}>{fullDate}</time></dd>
                  </div>
                  <div>
                    <dt><MapPin size={14} aria-hidden="true" /><span className="events-sr-only">Format and location</span></dt>
                    <dd>{event.format}{event.location ? ` · ${event.location}` : ''}</dd>
                  </div>
                </dl>
              </div>
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
