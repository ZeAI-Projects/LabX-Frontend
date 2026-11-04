import { useMemo, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, MessageCircle, Pencil, Search, Trash2, X } from 'lucide-react'

const PAGE_SIZE = 10
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function descriptionFor(session) {
  const content = session.messages.findLast(message => message.role === 'user')?.content
  if (!content) return 'No message description available.'
  return content.length > 180 ? `${content.slice(0, 177).trimEnd()}...` : content
}

function createdLabel(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function timestamp(value) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function paginationItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1)
  const values = [...new Set([1, pages, ...Array.from({ length: 5 }, (_, index) => Math.min(pages - 2, Math.max(3, page)) - 2 + index)])].sort((a, b) => a - b)
  return values.flatMap((value, index) => index && value - values[index - 1] > 1 ? [`gap-${value}`, value] : [value])
}

function SortableHeader({ field, sort, direction, onSort, children }) {
  const ariaSort = sort === field ? direction === 'asc' ? 'ascending' : 'descending' : 'none'
  const SortIcon = sort === field ? direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown
  return <th scope="col" aria-sort={ariaSort}><button className="chats-table-sort" type="button" aria-pressed={sort === field} onClick={() => onSort(field)}>{children}<SortIcon size={14} aria-hidden="true"/></button></th>
}

function ChatRow({ session, activeId, busy, onOpen, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [title, setTitle] = useState(session.title)
  const description = descriptionFor(session)

  function saveTitle(event) {
    event.preventDefault()
    if (!title.trim() || busy) return
    const nextTitle = title.trim()
    if (nextTitle === session.title || onRename(session.id, nextTitle)) setEditing(false)
  }

  function confirmDelete() {
    if (busy) return
    onDelete(session.id)
    setDeleting(false)
  }

  return <tr className={session.id === activeId ? 'is-active' : undefined}>
    <th scope="row" className="chats-table__name">
      {editing
        ? <form className="chats-table__rename" onSubmit={saveTitle}>
          <label className="chats-sr-only" htmlFor={`chat-title-${session.id}`}>Chat name</label>
          <input id={`chat-title-${session.id}`} aria-label="Chat name" value={title} maxLength={70} onChange={event => setTitle(event.target.value)} autoFocus/>
          <button className="sharp-icon-button" type="submit" aria-label="Save chat name" disabled={busy || !title.trim()}><Check size={16}/></button>
          <button className="sharp-icon-button" type="button" aria-label="Cancel rename" onClick={() => { setTitle(session.title); setEditing(false) }}><X size={16}/></button>
        </form>
        : <span title={session.title}>{session.title}</span>}
    </th>
    <td className="chats-table__description" title={description}>{description}</td>
    <td className="chats-table__date"><time dateTime={session.createdAt}>{createdLabel(session.createdAt)}</time></td>
    <td className="chats-table__actions">
      {deleting
        ? <div className="chats-table__confirm"><span>Delete?</span><button type="button" className="chats-table__confirm-delete" onClick={confirmDelete} disabled={busy}>Delete</button><button type="button" onClick={() => setDeleting(false)} disabled={busy}>Cancel</button></div>
        : <div className="chats-table__action-group">
          <button type="button" className="chats-table__open" onClick={() => onOpen(session.id)} disabled={busy}><MessageCircle size={14}/>Open</button>
          <button type="button" className="sharp-icon-button" aria-label={`Edit chat: ${session.title}`} onClick={() => { setTitle(session.title); setEditing(true) }} disabled={busy}><Pencil size={15}/></button>
          <button type="button" className="sharp-icon-button chats-table__delete" aria-label={`Delete chat: ${session.title}`} onClick={() => setDeleting(true)} disabled={busy}><Trash2 size={15}/></button>
        </div>}
    </td>
  </tr>
}

export function ChatHistoryGrid({ sessions, activeId, busy, onBack, onOpen, onRename, onDelete }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('createdAt')
  const [direction, setDirection] = useState('desc')
  const [page, setPage] = useState(1)
  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    const filtered = sessions.filter(session => {
      const description = descriptionFor(session)
      return !needle || `${session.title} ${description} ${createdLabel(session.createdAt)}`.toLocaleLowerCase().includes(needle)
    })
    filtered.sort((a, b) => {
      const left = sort === 'createdAt' ? timestamp(a.createdAt) : sort === 'description' ? descriptionFor(a) : a.title
      const right = sort === 'createdAt' ? timestamp(b.createdAt) : sort === 'description' ? descriptionFor(b) : b.title
      const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : collator.compare(String(left), String(right))
      return (direction === 'asc' ? comparison : -comparison) || collator.compare(a.id, b.id)
    })
    return filtered
  }, [sessions, query, sort, direction])
  const pages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const from = filteredSessions.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const to = Math.min(currentPage * PAGE_SIZE, filteredSessions.length)
  const visibleSessions = filteredSessions.slice(from - 1, to)

  function changeSort(field) {
    if (sort === field) setDirection(value => value === 'asc' ? 'desc' : 'asc')
    else { setSort(field); setDirection(field === 'createdAt' ? 'desc' : 'asc') }
    setPage(1)
  }

  return <section className="chats-all" aria-labelledby="chats-all-title">
    <header className="chats-all__header">
      <div><span className="sharp-eyebrow">Your conversations</span><h2 id="chats-all-title">All chats</h2><p>Browse, rename, or remove your saved conversations.</p></div>
      <div className="chats-all__header-actions">
        <div className="chats-all__search-count">
          <label className="chats-grid-search"><Search size={17}/><span className="chats-sr-only">Search all chats</span><input type="search" aria-label="Search all chats" placeholder="Search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }}/></label>
          <span className="chats-all__count">{sessions.length} {sessions.length === 1 ? 'chat' : 'chats'}</span>
        </div>
        <button type="button" className="chats-back-to-chat" onClick={onBack}><ArrowLeft size={15}/>Back to chat</button>
      </div>
    </header>
    {filteredSessions.length
      ? <>
        <div className="chats-table-scroll" role="region" aria-label="All chats table" tabIndex={0}>
          <table className="chats-table">
            <caption className="chats-sr-only">Saved chats, descriptions, creation dates, and actions</caption>
            <colgroup><col className="chats-table__name-column"/><col className="chats-table__description-column"/><col className="chats-table__date-column"/><col className="chats-table__actions-column"/></colgroup>
            <thead><tr>
              <SortableHeader field="title" sort={sort} direction={direction} onSort={changeSort}>Chat name</SortableHeader>
              <SortableHeader field="description" sort={sort} direction={direction} onSort={changeSort}>Description</SortableHeader>
              <SortableHeader field="createdAt" sort={sort} direction={direction} onSort={changeSort}>Created at</SortableHeader>
              <th scope="col">Actions</th>
            </tr></thead>
            <tbody>{visibleSessions.map(session => <ChatRow key={session.id} session={session} activeId={activeId} busy={busy} onOpen={onOpen} onRename={onRename} onDelete={onDelete}/>)}</tbody>
          </table>
        </div>
        <div className="chats-grid-pagination">
          <p>Showing <strong>{from}–{to}</strong> of <strong>{filteredSessions.length}</strong> chats</p>
          <nav aria-label="Chat history pagination">
            <button type="button" className="chats-page-button" aria-label="First page" disabled={currentPage === 1} onClick={() => setPage(1)}><ChevronFirst size={16}/></button>
            <button type="button" className="chats-page-button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button>
            {paginationItems(currentPage, pages).map(value => typeof value === 'number'
              ? <button type="button" className="chats-page-button chats-page-button--number" key={value} aria-label={`Page ${value}`} aria-current={currentPage === value ? 'page' : undefined} onClick={() => setPage(value)}>{value}</button>
              : <span className="chats-page-gap" key={value} aria-hidden="true">…</span>)}
            <button type="button" className="chats-page-button" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button>
            <button type="button" className="chats-page-button" aria-label="Last page" disabled={currentPage === pages} onClick={() => setPage(pages)}><ChevronLast size={16}/></button>
          </nav>
        </div>
      </>
      : <div className="chats-history-empty"><MessageCircle size={23}/><strong>{query.trim() ? 'No chats match your search' : 'No saved chats yet'}</strong><p>{query.trim() ? 'Try a different name, description, or date.' : 'Start a conversation and it will appear here.'}</p></div>}
  </section>
}
