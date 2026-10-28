import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, Filter, Search } from 'lucide-react'
import { EVENT_CATEGORIES, EVENT_CITIES } from '../services/mock_events.js'
import './EventsDiscoveryControls.css'

export function EventsSearchField({ value, onChange, onSubmit, label = 'Search events', placeholder = 'Search events…' }) {
  return <form className="events-search-field" role="search" aria-label={`${label} form`} onSubmit={(event) => { event.preventDefault(); onSubmit?.() }}>
    <Search size={19} aria-hidden="true" />
    <input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    <button type="submit" aria-label="Submit event search" title="Search"><ArrowRight size={18} aria-hidden="true" /></button>
  </form>
}

export function EventFiltersDropdown({ filters, onChange, onClear }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelId = useId()
  const count = ['category', 'format', 'eligibility', 'fee', 'prizes', 'sponsored'].filter((key) => filters[key] !== 'all').length
    + ['dateFrom', 'dateTo', 'location'].filter((key) => Boolean(filters[key])).length

  useEffect(() => {
    if (!open) return undefined
    const dismissOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const dismissWithEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissWithEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissWithEscape)
    }
  }, [open])

  return <div className="events-filter-dropdown" ref={rootRef}>
    <button ref={triggerRef} type="button" className="events-filter-toggle" aria-label="Filters" title="Filters" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
      <Filter size={20} aria-hidden="true" />
      {count > 0 && <span className="events-filter-toggle__count" aria-label={`${count} active filters`}>{count}</span>}
    </button>
    {open && <section id={panelId} className="events-filter-dropdown__panel" aria-label="Event filters">
      <div className="events-filter-dropdown__heading"><h3>Filters</h3><button type="button" className="events-text-button" onClick={onClear}>Clear filters</button></div>
      <div className="events-filter-dropdown__fields">
        <label className="events-field">Category<select aria-label="Category" value={filters.category} onChange={(event) => onChange('category', event.target.value)}><option value="all">All categories</option>{EVENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="events-field">Format<select aria-label="Format" value={filters.format} onChange={(event) => onChange('format', event.target.value)}><option value="all">All formats</option><option>Online</option><option>In person</option><option>Hybrid</option></select></label>
        <label className="events-field">Sort by<select aria-label="Sort by" value={filters.sort} onChange={(event) => onChange('sort', event.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
        <label className="events-field">Location<select aria-label="Location" value={filters.location} onChange={(event) => onChange('location', event.target.value)}><option value="">All cities</option>{EVENT_CITIES.map((city) => <option key={city}>{city}</option>)}</select></label>
        <label className="events-field">Starts from<input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => onChange('dateFrom', event.target.value)} /></label>
        <label className="events-field">Starts by<input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => onChange('dateTo', event.target.value)} /></label>
        <label className="events-field">Eligibility<select aria-label="Eligibility" value={filters.eligibility} onChange={(event) => onChange('eligibility', event.target.value)}><option value="all">All eligibility</option><option value="eligible">Eligible for my role</option></select></label>
        <label className="events-field">Fee<select aria-label="Fee" value={filters.fee} onChange={(event) => onChange('fee', event.target.value)}><option value="all">Any fee</option><option value="free">Free</option><option value="paid">Paid</option></select></label>
        <label className="events-field">Prizes &amp; benefits<select aria-label="Prizes & benefits" value={filters.prizes} onChange={(event) => onChange('prizes', event.target.value)}><option value="all">Any benefits</option><option value="with-prizes">With prizes or benefits</option></select></label>
        <label className="events-field">Sponsorship<select aria-label="Sponsorship" value={filters.sponsored} onChange={(event) => onChange('sponsored', event.target.value)}><option value="all">All listings</option><option value="sponsored">Sponsored only</option><option value="organic">Not sponsored</option></select></label>
      </div>
      <p className="events-note">Date filters use India Standard Time and include both selected dates.</p>
    </section>}
  </div>
}
