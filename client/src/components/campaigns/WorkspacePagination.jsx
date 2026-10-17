import { useEffect, useState } from 'react'

export default function WorkspacePagination({ value, onChange, disabled }) {
  const { page = 1, pages = 1, pageSize = 25, total = 0 } = value || {}
  const [target, setTarget] = useState(String(page))
  useEffect(() => setTarget(String(page)), [page])
  const go = () => onChange({ page: Math.min(pages, Math.max(1, Number(target) || 1)) })
  return <footer className="workspace-pagination"><span>{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : 0} / {total} KOC</span><label>Số dòng <select value={pageSize} disabled={disabled} onChange={(event) => onChange({ page: 1, pageSize: Number(event.target.value) })}>{[25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label><div><button type="button" disabled={disabled || page <= 1} onClick={() => onChange({ page: page - 1 })}>Trước</button><label>Trang <input aria-label="Đi đến trang" type="number" min="1" max={pages} value={target} disabled={disabled} onChange={(event) => setTarget(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') go() }} onBlur={go} /> / {pages}</label><button type="button" disabled={disabled || page >= pages} onClick={() => onChange({ page: page + 1 })}>Sau</button></div></footer>
}
