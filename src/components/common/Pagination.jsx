import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react'
import './Pagination.css'

export function Pagination({ page, pageSize = 10, total, itemLabel = 'results', onPageChange, label = 'Result pages', className = '' }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.max(1, Math.min(page, pageCount))
  const firstItem = total ? (currentPage - 1) * pageSize + 1 : 0
  const lastItem = Math.min(currentPage * pageSize, total)
  const firstPageNumber = pageCount <= 5 ? 1 : Math.max(1, Math.min(currentPage - 1, pageCount - 2))
  const lastPageNumber = pageCount <= 5 ? pageCount : Math.min(pageCount, firstPageNumber + 2)
  const numbers = Array.from({ length: lastPageNumber - firstPageNumber + 1 }, (_, index) => firstPageNumber + index)

  return (
    <nav className={`collection-pagination ${className}`.trim()} aria-label={label}>
      <p className="collection-pagination__summary" role="status">Showing <strong>{firstItem}–{lastItem}</strong> of <strong>{total}</strong> {itemLabel}</p>
      <div className="collection-pagination__controls">
        <button type="button" aria-label="First page" disabled={currentPage === 1} onClick={() => onPageChange(1)}><ChevronFirst size={17} aria-hidden="true" /></button>
        <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft size={17} aria-hidden="true" /></button>
        {firstPageNumber > 1 && <span className="collection-pagination__ellipsis" aria-hidden="true">…</span>}
        {numbers.map((number) => <button key={number} type="button" aria-label={`Page ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => onPageChange(number)}>{number}</button>)}
        {lastPageNumber < pageCount && <span className="collection-pagination__ellipsis" aria-hidden="true">…</span>}
        <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)}><ChevronRight size={17} aria-hidden="true" /></button>
        <button type="button" aria-label="Last page" disabled={currentPage === pageCount} onClick={() => onPageChange(pageCount)}><ChevronLast size={17} aria-hidden="true" /></button>
      </div>
    </nav>
  )
}
