import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../common/Icon'
import { INTERNAL_FILE_COLUMNS } from '../../utils/campaignInternalFiles'
import { formatCategoryPaths } from '../../utils/creatorCategoryPaths'
import { formatCreatorList } from '../../utils/creatorLists'
import { formatNumber } from '../../utils/formatters'

const actions = { create: 'Tạo mới + thêm', add: 'Thêm vào Campaign', update: 'Cập nhật', skip: 'Bỏ qua' }
const columns = INTERNAL_FILE_COLUMNS.filter(([, field]) => !['totalCast', 'bookingExpense', 'agi'].includes(field))
const PAGE_SIZE = 30

function displayValue(field, value) {
  if (value == null) return '—'
  if (field === 'category') return formatCategoryPaths(value)
  if (field === 'type') return formatCreatorList(value)
  if (['cost', 'extraCost', 'gmvMonth', 'followers'].includes(field)) return Number.isFinite(value) ? formatNumber(value) : 'Không hợp lệ'
  return String(value)
}

export default function CampaignInternalImportModal({ fileName, rows, onImport, onClose, onApplied }) {
  const [showPreview, setShowPreview] = useState(true)
  const [showErrors, setShowErrors] = useState(true)
  const [page, setPage] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [result, setResult] = useState(null)
  const dialog = useRef(null)
  const savingRef = useRef(false)
  const validRows = rows.filter((row) => !row.errors.length)
  const errors = [
    ...rows.filter((row) => row.errors.length).map((row) => ({ rowNumber: row.rowNumber, tiktokId: row.values.tiktokId, message: row.errors.join('; ') })),
    ...(result?.errors || []),
  ]
  const counts = rows.reduce((current, row) => ({ ...current, [row.action]: current[row.action] + 1 }), { create: 0, add: 0, update: 0, skip: 0 })
  const serverErrorsByRow = new Map((result?.errors || []).map((error) => [error.rowNumber, error.message]))
  const displayRows = rows.map((row) => serverErrorsByRow.has(row.rowNumber) ? { ...row, action: 'skip', errors: [...row.errors, serverErrorsByRow.get(row.rowNumber)] } : row)
  const maxPage = Math.ceil(rows.length / PAGE_SIZE)

  useEffect(() => {
    const focused = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const handleKey = (event) => {
      if (event.key === 'Escape' && !savingRef.current) { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const focusable = [...dialog.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), [tabindex="0"]')]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!focusable.length) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handleKey); focused?.focus?.() }
  }, [onClose])

  const save = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    setSaveError('')
    try {
      const saved = await onImport(validRows.map(({ rowNumber, values }) => ({ rowNumber, values })))
      setResult(saved)
      onApplied?.(saved)
    } catch (error) {
      setSaveError(error.message || 'Chưa lưu được import. Preview vẫn được giữ để bạn thử lại.')
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="modal-layer internal-import-layer">
      <button type="button" className="modal-scrim" aria-label="Đóng preview" disabled={isSaving} onClick={onClose} />
      <section ref={dialog} tabIndex={-1} className="internal-import-dialog" role="dialog" aria-modal="true" aria-labelledby="internal-import-title">
        <header><div><span className="eyebrow">Internal Listings</span><h2 id="internal-import-title">Import Creator vào Campaign</h2><p title={fileName}>{fileName}</p></div><button type="button" className="internal-import-close" aria-label="Đóng" disabled={isSaving} onClick={onClose}><Icon name="close" /></button></header>
        <div className="internal-import-body">
          <div className="internal-import-summary">
            <span className="is-new"><strong>{result ? result.addedCount : counts.create + counts.add}</strong> thêm vào Campaign</span>
            <span className="is-updated"><strong>{result ? result.updatedCount : counts.update}</strong> cập nhật</span>
            <span><strong>{result ? result.createdCount : counts.create}</strong> hồ sơ mới</span>
            <span className={errors.length ? 'is-error' : ''}><strong>{errors.length}</strong> dòng bỏ qua</span>
          </div>
          <p className="internal-import-help">Đối chiếu theo ID hoặc Link TikTok; hồ sơ đã khớp giữ nguyên ID và Link hiện có. Ô trống giữ dữ liệu cũ; Creator mới dùng giá trị mặc định. Category và Type được gộp thêm. Cast, Expense và AGI tự tính, không lấy từ file.</p>
          <p className="internal-import-help">Cost, Extra/FOC, Scope và PIC lưu riêng trong Campaign. Followers, GMV, Contact và MCN Note đồng bộ về kho Creator. Import không xóa Creator, trạng thái duyệt hoặc Deliverables hiện có.</p>
          {result && <div className={`internal-import-result ${result.interrupted ? 'is-error' : ''}`} role="status">{result.interrupted ? 'Đã lưu một phần. Kết nối bị gián đoạn; các dòng chưa lưu được liệt kê bên dưới.' : 'Đã lưu vào database. Bạn có thể đóng preview để xem bảng cập nhật.'}</div>}
          {saveError && <div className="internal-import-result is-error" role="alert">{saveError}</div>}
          <div className="internal-import-toggles"><button type="button" aria-expanded={showPreview} onClick={() => setShowPreview(!showPreview)}><span style={{ transform: showPreview ? 'rotate(180deg)' : undefined }}><Icon name="chevronDown" size={14} /></span>{showPreview ? 'Ẩn' : 'Hiện'} preview ({rows.length} dòng)</button>{errors.length > 0 && <button type="button" aria-expanded={showErrors} onClick={() => setShowErrors(!showErrors)}>{showErrors ? 'Ẩn' : 'Hiện'} lỗi ({errors.length})</button>}</div>
          {showErrors && errors.length > 0 && <div className="internal-import-errors" role="region" aria-label="Các dòng lỗi">{errors.map((error, index) => <div key={`${error.rowNumber}-${index}`}><strong>Dòng {error.rowNumber}{error.tiktokId ? ` · ${error.tiktokId}` : ''}</strong><span>{error.message}</span></div>)}</div>}
          {showPreview && <><div className="internal-import-preview"><table><thead><tr><th>Dòng</th><th>Xử lý</th>{columns.map(([header, field]) => <th key={field}>{header}</th>)}</tr></thead><tbody>{displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => <tr key={row.rowNumber} className={`is-${row.action}`}><td>{row.rowNumber}</td><td><strong>{actions[row.action]}</strong>{row.errors.length > 0 && <small>{row.errors.join('; ')}</small>}</td>{columns.map(([, field]) => <td key={field}>{displayValue(field, row.values[field])}</td>)}</tr>)}</tbody></table></div><div className="internal-import-pagination"><span>{rows.length} dòng · Trang {page}/{maxPage}</span><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button><button type="button" disabled={page === maxPage} onClick={() => setPage(page + 1)}>Sau</button></div></>}
        </div>
        <footer><span>{isSaving ? 'Đang lưu vào database, vui lòng giữ cửa sổ này mở...' : result ? 'Dòng lỗi không được lưu. Sửa trong file rồi import lại nếu cần.' : `${validRows.length} dòng hợp lệ sẽ được lưu. ${errors.length} dòng lỗi sẽ bỏ qua.`}</span><button type="button" className="secondary-button" disabled={isSaving} onClick={onClose}>{result ? 'Đóng' : 'Hủy import'}</button>{!result && <button type="button" className="primary-button" disabled={isSaving || !validRows.length} onClick={save}><Icon name="check" size={15} />{isSaving ? 'Đang lưu...' : `Lưu ${validRows.length} dòng hợp lệ`}</button>}</footer>
      </section>
    </div>, document.body,
  )
}
