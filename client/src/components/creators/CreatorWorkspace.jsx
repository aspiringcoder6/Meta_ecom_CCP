import { useEffect, useState } from 'react'
import CreatorTable from './CreatorTable'
import CreatorToolbar from './CreatorToolbar'
import CreatorImportMenu from './CreatorImportMenu'
import ResizeDivider from '../common/ResizeDivider'
import Icon from '../common/Icon'
import ImportReviewBanner from './ImportReviewBanner'

const DEFAULT_COLUMN_WIDTHS = [180, 190, 90, 145, 145, 125, 190, 150, 150, 105, 145, 220, 220, 145, 220, 72]
const DEFAULT_ROW_HEIGHT = 64
const MIN_ROW_HEIGHT = 40
const MAX_ROW_HEIGHT = 120
const ROW_HEIGHT_STEP = 8

function getDensityLabel(rowHeight) {
  if (rowHeight <= 48) return 'Rất gọn'
  if (rowHeight <= 64) return 'Gọn'
  if (rowHeight <= 80) return 'Tiêu chuẩn'
  return 'Thoáng'
}

export default function CreatorWorkspace({ creators, filters, filterOptions, numericFilters, sortCriteria, isFullscreen = false, canManage = false, canUndo = false, canRedo = false, recentlyAddedCreatorId, importReview, onFilterChange, onAddNumericFilter, onRemoveNumericFilter, onReset, onSort, onSelect, onArchive, onUpdateCreator, onDeleteCreator, onQuickAdd, onUndo, onRedo, onBeginEdit, onCommitEdit, onCancelEdit, onAcceptImport, onCancelImport, onImport, onExport, onAddCreator, onEnterFullscreen, onExitFullscreen }) {
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS)
  const [headerHeight, setHeaderHeight] = useState(64)
  const [toolbarHeight, setToolbarHeight] = useState(106)
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT)
  const [editMode, setEditMode] = useState(Boolean(importReview) && canManage)

  useEffect(() => {
    if (!isFullscreen || !editMode) return undefined
    const handleHistoryShortcut = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      const isUndo = key === 'z' && !event.shiftKey
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey)
      if (!isUndo && !isRedo) return
      event.preventDefault()
      const activeElement = document.activeElement
      if (activeElement?.matches('input, select')) activeElement.blur()
      window.setTimeout(() => { if (isUndo) onUndo(); else onRedo() }, 0)
    }
    window.addEventListener('keydown', handleHistoryShortcut)
    return () => window.removeEventListener('keydown', handleHistoryShortcut)
  }, [editMode, isFullscreen, onRedo, onUndo])

  useEffect(() => {
    if (isFullscreen && importReview) setEditMode(true)
  }, [importReview, isFullscreen])

  const updateColumnWidth = (index, width) => setColumnWidths((current) => current.map((item, itemIndex) => itemIndex === index ? width : item))
  const resetColumnWidth = (index) => updateColumnWidth(index, DEFAULT_COLUMN_WIDTHS[index])
  const changeRowHeight = (amount) => setRowHeight((current) => Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, current + amount)))
  const enterEditMode = () => { onBeginEdit(); setEditMode(true) }
  const finishEditMode = () => { onCommitEdit(); setEditMode(false) }
  const cancelEditMode = () => { onCancelEdit(); setEditMode(false) }
  const acceptImport = () => { onAcceptImport(); setEditMode(false) }
  const cancelImport = () => { onCancelImport(); setEditMode(false) }
  const exitFullscreen = () => {
    if (importReview) onCancelImport()
    else if (editMode) onCommitEdit()
    onExitFullscreen()
  }
  useEffect(() => {
    if (!isFullscreen) return undefined
    const handleEscape = (event) => {
      if (event.key !== 'Escape' || event.target.matches('input, select')) return
      if (importReview) onCancelImport()
      else if (editMode) onCommitEdit()
      onExitFullscreen()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [editMode, importReview, isFullscreen, onCancelImport, onCommitEdit, onExitFullscreen])
  const toolbar = <CreatorToolbar filters={filters} options={filterOptions} numericFilters={numericFilters} tourScope={isFullscreen ? 'fullscreen' : 'page'} onFilterChange={onFilterChange} onAddNumericFilter={onAddNumericFilter} onRemoveNumericFilter={onRemoveNumericFilter} onReset={onReset} onEnterFullscreen={isFullscreen ? undefined : onEnterFullscreen} />

  return (
    <section className={`panel creators-panel ${isFullscreen ? 'creator-fullscreen-view' : ''} ${editMode ? 'fullscreen-edit-mode' : ''}`}>
      {isFullscreen && (
        <>
          <header className="fullscreen-header" data-tour="fullscreen-header" style={{ height: `${headerHeight}px` }}>
            <div><span className="fullscreen-kicker">Creator Management</span><h2>Danh sách Creator</h2><p>{importReview ? `Xem trước import · ${importReview.fileName}` : editMode ? 'Chế độ chỉnh sửa spreadsheet' : `${creators.length} kết quả phù hợp`}</p></div>
            <div className="fullscreen-actions">
              <button className="secondary-button" onClick={onExport}><Icon name="download" />Export</button>
              {canManage && !importReview && <CreatorImportMenu onImport={onImport} disabled={editMode} disabledReason="Hoàn tất hoặc hủy chế độ chỉnh sửa trước khi Import" />}
              {editMode && <div className="history-actions" data-tour="edit-history"><button disabled={!canUndo} onClick={onUndo} aria-label="Hoàn tác" title="Undo · Ctrl+Z"><Icon name="undo" size={17} /></button><button disabled={!canRedo} onClick={onRedo} aria-label="Quay lại" title="Redo · Ctrl+Y"><Icon name="redo" size={17} /></button></div>}
              {canManage && (importReview ? <><button className="cancel-edit-button" onClick={cancelImport}><Icon name="close" size={15} />Hủy import</button><button className="mode-toggle-button is-editing" onClick={acceptImport}><Icon name="check" size={16} />Chấp nhận tất cả</button></> : <>{editMode ? <button className="quick-add-button" onClick={onQuickAdd}><Icon name="plus" />Thêm nhanh</button> : <button className="primary-button" onClick={onAddCreator}><Icon name="plus" />Thêm Creator</button>}{editMode && <button className="cancel-edit-button" data-tour="cancel-edit" onClick={cancelEditMode}><Icon name="close" size={15} />Hủy thay đổi</button>}<button className={`mode-toggle-button ${editMode ? 'is-editing' : ''}`} data-tour="edit-toggle" onClick={editMode ? finishEditMode : enterEditMode}><Icon name={editMode ? 'check' : 'edit'} size={16} />{editMode ? 'Hoàn tất' : 'Chỉnh sửa'}</button></>)}
              <button className="fullscreen-close" data-tour="fullscreen-close" onClick={exitFullscreen} aria-label="Thoát toàn màn hình"><Icon name="minimize" /></button>
            </div>
          </header>
          <ResizeDivider value={headerHeight} min={52} max={150} onChange={setHeaderHeight} label="Điều chỉnh chiều cao thanh thao tác" tourId="header-height-resizer" />
          <div className="fullscreen-toolbar-region" style={{ height: `${toolbarHeight}px` }}>{toolbar}</div>
          <ResizeDivider value={toolbarHeight} min={62} max={360} onChange={setToolbarHeight} label="Điều chỉnh chiều cao khu vực tìm kiếm và bộ lọc" tourId="workspace-height-resizer" />
        </>
      )}
      {!isFullscreen && toolbar}
      {importReview && isFullscreen && <ImportReviewBanner review={importReview} />}
      <div className="table-meta"><span><strong>{creators.length}</strong> Creator</span><span>{importReview ? 'Dòng xanh: dữ liệu hợp lệ, dòng lỗi được liệt kê màu đỏ phía trên' : editMode ? 'Bấm vào ô để sửa · Enter để lưu · Esc để hủy nội dung đang nhập' : isFullscreen ? 'Bấm header để sort nhiều tiêu chí · Kéo mép cột để chỉnh độ rộng' : 'Bấm header để sort nhiều tiêu chí · Cuộn ngang để xem toàn bộ thông tin'}</span></div>
      <CreatorTable creators={creators} canManage={canManage} highlightedCreatorIds={importReview?.importedIds || (recentlyAddedCreatorId ? [recentlyAddedCreatorId] : [])} sortCriteria={sortCriteria} onSort={onSort} onSelect={onSelect} onArchive={onArchive} editMode={editMode} onUpdate={onUpdateCreator} onDelete={onDeleteCreator} resizable={isFullscreen} columnWidths={columnWidths} rowHeight={rowHeight} onColumnResize={updateColumnWidth} onColumnReset={resetColumnWidth} />
      <div className="pagination">
        <span>Hiển thị 1–{creators.length} trên {creators.length}</span>
        {isFullscreen && <div className="row-density-controls" data-tour="row-density"><span>Mật độ: <strong>{getDensityLabel(rowHeight)}</strong></span><button disabled={rowHeight === MIN_ROW_HEIGHT} onClick={() => changeRowHeight(-ROW_HEIGHT_STEP)} aria-label="Giảm chiều cao hàng để xem nhiều Creator hơn" title="Xem nhiều hàng hơn"><Icon name="minus" size={14} /></button><button className="density-value" onClick={() => setRowHeight(DEFAULT_ROW_HEIGHT)} title="Đặt lại chiều cao hàng">{rowHeight}px</button><button disabled={rowHeight === MAX_ROW_HEIGHT} onClick={() => changeRowHeight(ROW_HEIGHT_STEP)} aria-label="Tăng chiều cao hàng" title="Tăng chiều cao hàng"><Icon name="plus" size={14} /></button></div>}
        <div className="pagination-pages"><button disabled>Trước</button><button className="page-active">1</button><button disabled>Sau</button></div>
      </div>
    </section>
  )
}
