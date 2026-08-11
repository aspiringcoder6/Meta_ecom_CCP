import { useEffect, useRef, useState } from 'react'
import { NUMERIC_FILTER_FIELDS, NUMERIC_FILTER_OPERATORS } from '../../utils/creatorFilters'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import Icon from '../common/Icon'

const INITIAL_DRAFT = { field: NUMERIC_FILTER_FIELDS[0].value, operator: 'between', value: '', maxValue: '' }

function formatFilterValue(value, format) {
  if (format === 'currency') return formatCurrency(value)
  if (format === 'percent') return `${value}%`
  return formatNumber(value)
}

function getFilterSummary(filter) {
  const field = NUMERIC_FILTER_FIELDS.find((item) => item.value === filter.field)
  const operator = NUMERIC_FILTER_OPERATORS.find((item) => item.value === filter.operator)
  const first = formatFilterValue(filter.value, field.format)
  const values = filter.operator === 'between' ? `${first} – ${formatFilterValue(filter.maxValue, field.format)}` : first
  return `${field.label} · ${operator.label} ${values}`
}

export default function AdvancedNumericFilters({ filters, tourId, onAdd, onRemove }) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(INITIAL_DRAFT)
  const containerRef = useRef(null)
  const isRange = draft.operator === 'between'
  const canAdd = draft.value !== '' && (!isRange || (draft.maxValue !== '' && Number(draft.value) <= Number(draft.maxValue)))
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const handleAdd = () => {
    if (!canAdd) return
    onAdd({ ...draft, id: `${Date.now()}-${Math.random()}` })
    setDraft(INITIAL_DRAFT)
    setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <div className={`advanced-filters ${isOpen ? 'is-open' : ''}`} ref={containerRef} onClick={(event) => event.stopPropagation()}>
      <div className="advanced-filter-row">
        <button className={`add-filter-button ${isOpen ? 'is-active' : ''}`} type="button" data-tour={tourId} onClick={() => setIsOpen((current) => !current)}><Icon name="plus" size={15} /> Thêm bộ lọc số</button>
        {filters.map((filter) => <span className="numeric-filter-chip" key={filter.id}>{getFilterSummary(filter)}<button type="button" onClick={() => onRemove(filter.id)} aria-label={`Xóa bộ lọc ${getFilterSummary(filter)}`}><Icon name="close" size={13} /></button></span>)}
      </div>
      {isOpen && (
        <div className="numeric-filter-builder">
          <label><span>Tiêu chí</span><select value={draft.field} onChange={(event) => updateDraft('field', event.target.value)}>{NUMERIC_FILTER_FIELDS.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</select></label>
          <label><span>Điều kiện</span><select value={draft.operator} onChange={(event) => updateDraft('operator', event.target.value)}>{NUMERIC_FILTER_OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select></label>
          <label><span>{isRange ? 'Từ' : 'Giá trị'}</span><input type="number" min="0" value={draft.value} onChange={(event) => updateDraft('value', event.target.value)} placeholder="Nhập giá trị" /></label>
          {isRange && <label><span>Đến</span><input type="number" min="0" value={draft.maxValue} onChange={(event) => updateDraft('maxValue', event.target.value)} placeholder="Nhập giá trị" /></label>}
          <div className="numeric-filter-actions"><button className="clear-filter" type="button" onClick={() => setIsOpen(false)}>Hủy</button><button className="primary-button compact-button" type="button" disabled={!canAdd} onClick={handleAdd}>Áp dụng</button></div>
          {isRange && draft.value !== '' && draft.maxValue !== '' && Number(draft.value) > Number(draft.maxValue) && <small className="filter-error">Giá trị “Từ” phải nhỏ hơn hoặc bằng “Đến”.</small>}
        </div>
      )}
    </div>
  )
}
