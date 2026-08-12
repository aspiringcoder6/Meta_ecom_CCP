import { useEffect, useMemo, useState } from 'react'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function visiblePages(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((left, right) => left - right)
}

export default function CreatorPagination({ currentPage, totalItems, pageSize, tourId, onPageChange, onPageSizeChange, children }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const [pageDraft, setPageDraft] = useState(String(currentPage))
  const pages = useMemo(() => visiblePages(currentPage, totalPages), [currentPage, totalPages])
  const start = totalItems ? (currentPage - 1) * pageSize + 1 : 0
  const end = Math.min(currentPage * pageSize, totalItems)

  useEffect(() => setPageDraft(String(currentPage)), [currentPage])

  const goToDraftPage = (event) => {
    event.preventDefault()
    const requestedPage = Number.parseInt(pageDraft, 10)
    const nextPage = Number.isFinite(requestedPage) ? Math.min(totalPages, Math.max(1, requestedPage)) : currentPage
    setPageDraft(String(nextPage))
    onPageChange(nextPage)
  }

  return (
    <div className="pagination" data-tour={tourId}>
      <div className="pagination-summary">
        <span>Hiển thị <strong>{start}–{end}</strong> trên <strong>{totalItems}</strong></span>
        <label>Số hàng<select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      </div>
      {children}
      <div className="pagination-navigation">
        <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Trước</button>
        <div className="pagination-pages">
          {pages.map((page, index) => <span key={page} className="pagination-page-slot">{index > 0 && page - pages[index - 1] > 1 && <i>…</i>}<button className={page === currentPage ? 'page-active' : ''} aria-current={page === currentPage ? 'page' : undefined} onClick={() => onPageChange(page)}>{page}</button></span>)}
        </div>
        <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Sau</button>
        <form className="pagination-jump" onSubmit={goToDraftPage}><label>Đến trang<input type="number" min="1" max={totalPages} value={pageDraft} onChange={(event) => setPageDraft(event.target.value)} /></label><span>/ {totalPages}</span><button type="submit">Đi</button></form>
      </div>
    </div>
  )
}
