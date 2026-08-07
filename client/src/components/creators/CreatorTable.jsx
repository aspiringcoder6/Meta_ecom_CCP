import { formatCurrency, formatNumber } from '../../utils/formatters'
import { calculateBookingPricing } from '../../utils/pricing'
import { startDragResize } from '../../utils/dragResize'
import { CREATOR_FIELD_OPTIONS } from '../../utils/creatorValidation'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import EditableCreatorCell from './EditableCreatorCell'
import CreatorSortableHeader from './CreatorSortableHeader'

const COLUMNS = [
  { key: 'tiktokLink', label: <span>Link TikTok</span> },
  { key: 'tiktokId', label: <span>ID TikTok</span> },
  { key: 'segment', label: <span>Segment</span> },
  { key: 'category', label: <span>Category</span> },
  { key: 'type', label: <span>Type</span> },
  { key: 'cost', label: <span>Cost</span> },
  { key: 'extraCost', label: <span>Extra/FOC<br /><small>(SHDA + hashtag)</small></span> },
  { key: 'totalCast', label: <span>Tổng Cast<br /><small>(Đã bao gồm thuế)</small></span> },
  { key: 'bookingExpense', label: <span>Booking Expense</span> },
  { key: 'followers', label: <span>Followers</span> },
  { key: 'gmvMonth', label: <span>GMV / Month</span> },
  { key: 'scope', label: <span>Scope</span> },
  { key: 'contact', label: <span>Contact</span> },
  { key: 'historicalCampaign', label: <span>Tình trạng hợp tác</span> },
  { key: 'mcnNote', label: <span>MCN note</span> },
  { key: null, label: <span className="sr-only">Thao tác</span> },
]

function EmptyResults() {
  return <div className="no-results"><span><Icon name="search" size={28} /></span><h3>Không tìm thấy Creator</h3><p>Hãy thử thay đổi từ khóa hoặc bộ lọc.</p></div>
}

function CollaborationBadge({ value }) {
  const collaborated = value === 'Đã hợp tác'
  return <span className={`history-badge ${collaborated ? 'is-collaborated' : 'is-new'}`}><i />{value}</span>
}

function ColumnResizeHandle({ index, width, onResize, onReset }) {
  const resizeWithKeyboard = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const nextWidth = width + (event.key === 'ArrowLeft' ? -12 : 12)
    onResize(index, Math.min(480, Math.max(64, nextWidth)))
  }

  return <span className="column-resize-handle" role="separator" tabIndex="0" aria-label={`Điều chỉnh độ rộng cột ${index + 1}`} aria-orientation="vertical" aria-valuemin="64" aria-valuemax="480" aria-valuenow={width} onDoubleClick={() => onReset(index)} onKeyDown={resizeWithKeyboard} onPointerDown={(event) => { event.stopPropagation(); startDragResize(event, { axis: 'x', value: width, min: 64, max: 480, onChange: (nextWidth) => onResize(index, nextWidth) }) }} />
}

export default function CreatorTable({ creators, highlightedCreatorIds = [], sortCriteria = [], onSort, onSelect, onArchive, editMode = false, onUpdate, onDelete, resizable = false, columnWidths = [], rowHeight = 76, onColumnResize, onColumnReset }) {
  if (!creators.length) return <EmptyResults />

  const tableWidth = resizable ? columnWidths.reduce((total, width) => total + width, 0) : undefined
  const secondStickyStyle = resizable ? { left: `${columnWidths[0]}px` } : undefined
  const editableCell = (creator, field, options = undefined, className = '', note = undefined) => <EditableCreatorCell creatorId={creator.id} field={field} value={creator[field]} options={options} className={className} note={note} onCommit={onUpdate} />

  return (
    <div className="creator-table-wrap">
      <table className={`creator-table ${resizable ? 'is-resizable' : ''} ${editMode ? 'is-editing' : ''}`} style={resizable ? { width: `${tableWidth}px`, minWidth: `${tableWidth}px`, '--creator-row-height': `${rowHeight}px` } : undefined}>
        {resizable && <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width: `${width}px` }} />)}</colgroup>}
        <thead><tr>{COLUMNS.map((column, index) => {
          const sortIndex = sortCriteria.findIndex((criterion) => criterion.key === column.key)
          const criterion = sortIndex >= 0 ? sortCriteria[sortIndex] : undefined
          return <th key={column.key || 'actions'} style={index === 1 ? secondStickyStyle : undefined} aria-sort={criterion ? (criterion.direction === 'asc' ? 'ascending' : 'descending') : undefined}><CreatorSortableHeader label={column.label} sortKey={column.key} criterion={criterion} priority={sortIndex + 1} onSort={onSort} />{resizable && <ColumnResizeHandle index={index} width={columnWidths[index]} onResize={onColumnResize} onReset={onColumnReset} />}</th>
        })}</tr></thead>
        <tbody>
          {creators.map((creator) => {
            const pricing = calculateBookingPricing(creator.cost, creator.extraCost)
            return <tr className={highlightedCreatorIds.includes(creator.id) ? 'is-newly-added' : ''} key={creator.id} onClick={editMode ? undefined : () => onSelect(creator.id)}>
              {editMode ? editableCell(creator, 'tiktokLink', undefined, 'sticky-link-cell') : <td className="sticky-link-cell"><a className="tiktok-link" href={creator.tiktokLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{creator.tiktokLink.replace('https://www.', '')}</a></td>}
              {editMode ? <EditableCreatorCell creatorId={creator.id} field="tiktokId" value={creator.tiktokId} className="sticky-id-cell" style={secondStickyStyle} note={creator.name} onCommit={onUpdate} /> : <td className="sticky-id-cell" style={secondStickyStyle}><div className="creator-cell creator-id-copy"><div><strong>{creator.tiktokId}</strong><small>{creator.name}</small></div></div></td>}
              {editMode ? editableCell(creator, 'segment', CREATOR_FIELD_OPTIONS.segment) : <td><span className="segment-tag">{creator.segment}</span></td>}
              {editMode ? editableCell(creator, 'category', CREATOR_FIELD_OPTIONS.category) : <td><span className="category-tag">{creator.category}</span></td>}
              {editMode ? editableCell(creator, 'type', CREATOR_FIELD_OPTIONS.type) : <td><span className="type-tag">{creator.type}</span></td>}
              {editMode ? editableCell(creator, 'cost') : <td className="number-cell">{formatCurrency(creator.cost)}</td>}
              {editMode ? editableCell(creator, 'extraCost') : <td className="number-cell">{formatCurrency(creator.extraCost)}</td>}
              <td className={`number-cell calculated-cell ${editMode ? 'spreadsheet-readonly-cell' : ''}`} title={editMode ? 'Tự động tính từ Cost và Extra/FOC' : undefined}>{formatCurrency(pricing.totalCast)}</td>
              <td className={`number-cell calculated-cell ${editMode ? 'spreadsheet-readonly-cell' : ''}`} title={editMode ? 'Tự động tính theo công thức Booking Expense' : undefined}>{formatCurrency(pricing.bookingExpense)}</td>
              {editMode ? editableCell(creator, 'followers') : <td className="number-cell">{formatNumber(creator.followers)}</td>}
              {editMode ? editableCell(creator, 'gmvMonth') : <td className="number-cell">{formatCurrency(creator.gmvMonth)}</td>}
              {editMode ? editableCell(creator, 'scope') : <td className="long-text-cell">{creator.scope || '—'}</td>}
              {editMode ? editableCell(creator, 'contact') : <td className="long-text-cell">{creator.contact || '—'}</td>}
              {editMode ? editableCell(creator, 'historicalCampaign', CREATOR_FIELD_OPTIONS.historicalCampaign) : <td><CollaborationBadge value={creator.historicalCampaign} /></td>}
              {editMode ? editableCell(creator, 'mcnNote') : <td className="long-text-cell mcn-note-cell">{creator.mcnNote || <span className="empty-value">Để trống</span>}</td>}
              <td className="sticky-action-cell"><div className="row-actions">{editMode ? <button className="delete-row-button" onClick={(event) => { event.stopPropagation(); onDelete(creator.id) }} aria-label={`Xóa ${creator.tiktokId}`} title="Xóa nhanh; có thể Undo"><Icon name="trash" size={16} /></button> : <><button className="subtle-icon" onClick={(event) => { event.stopPropagation(); onSelect(creator.id) }} aria-label={`Xem ${creator.name}`}><Icon name="chevronRight" size={18} /></button><button className="subtle-icon" onClick={(event) => { event.stopPropagation(); onArchive(creator.id) }} aria-label={`${creator.status === 'Archived' ? 'Khôi phục' : 'Lưu trữ'} ${creator.name}`}><Icon name="more" size={18} /></button></>}</div></td>
            </tr>
          })}
        </tbody>
      </table>

      <div className="creator-cards">
        {creators.map((creator) => <button className="creator-mobile-card" key={creator.id} onClick={() => onSelect(creator.id)}><Avatar creator={creator} /><span className="creator-primary"><strong>{creator.tiktokId}</strong><small>{creator.name} · {creator.category}</small></span><span className="segment-tag">{creator.segment}</span><span className="mobile-card-stats"><span>{formatNumber(creator.followers)} followers</span><span>{formatCurrency(creator.cost)}</span></span><Icon name="chevronRight" /></button>)}
      </div>
    </div>
  )
}
