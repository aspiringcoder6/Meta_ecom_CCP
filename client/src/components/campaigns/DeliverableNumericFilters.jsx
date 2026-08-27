import { useEffect, useRef, useState } from 'react'
import {
  DELIVERABLE_NUMERIC_FILTER_FIELDS,
  DELIVERABLE_NUMERIC_FILTER_OPERATORS,
} from '../../utils/campaignDeliverableTable'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import Icon from '../common/Icon'

const INITIAL_DRAFT = {
  field: DELIVERABLE_NUMERIC_FILTER_FIELDS[0].value,
  operator: 'between',
  value: '',
  maxValue: '',
}

function formatValue(value, format) {
  return format === 'currency' ? formatCurrency(value) : formatNumber(value)
}

function filterSummary(filter) {
  const field = DELIVERABLE_NUMERIC_FILTER_FIELDS.find((item) => item.value === filter.field)
  const operator = DELIVERABLE_NUMERIC_FILTER_OPERATORS.find((item) => item.value === filter.operator)
  const first = formatValue(filter.value, field.format)
  const values = filter.operator === 'between'
    ? `${first} – ${formatValue(filter.maxValue, field.format)}`
    : first
  return `${field.label} · ${operator.label} ${values}`
}

export default function DeliverableNumericFilters({ filters, onAdd, onRemove }) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(INITIAL_DRAFT)
  const containerRef = useRef(null)
  const isRange = draft.operator === 'between'
  const canAdd = draft.value !== '' && (!isRange || (draft.maxValue !== '' && Number(draft.value) <= Number(draft.maxValue)))
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!isOpen) return undefined
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.type === 'pointerdown' && containerRef.current?.contains(event.target)) return
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [isOpen])

  const addFilter = () => {
    if (!canAdd) return
    onAdd({ ...draft, id: `${Date.now()}-${Math.random()}` })
    setDraft(INITIAL_DRAFT)
    setIsOpen(false)
  }

  return (
    <div className={`advanced-filters deliverable-numeric-filters ${isOpen ? 'is-open' : ''}`} ref={containerRef} onClick={(event) => event.stopPropagation()}>
      <div className="advanced-filter-row">
        <button className={`add-filter-button ${isOpen ? 'is-active' : ''}`} type="button" onClick={() => setIsOpen((current) => !current)}><Icon name="plus" size={15} /> Thêm bộ lọc số</button>
        {filters.map((filter) => {
          const summary = filterSummary(filter)
          return <span className="numeric-filter-chip" key={filter.id}>{summary}<button type="button" onClick={() => onRemove(filter.id)} aria-label={`Xóa bộ lọc ${summary}`}><Icon name="close" size={13} /></button></span>
        })}
      </div>
      {isOpen && <div className="numeric-filter-builder">
        <label><span>Tiêu chí</span><select value={draft.field} onChange={(event) => updateDraft('field', event.target.value)}>{DELIVERABLE_NUMERIC_FILTER_FIELDS.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</select></label>
        <label><span>Điều kiện</span><select value={draft.operator} onChange={(event) => updateDraft('operator', event.target.value)}>{DELIVERABLE_NUMERIC_FILTER_OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select></label>
        <label><span>{isRange ? 'Từ' : 'Giá trị'}</span><input type="number" min="0" value={draft.value} onChange={(event) => updateDraft('value', event.target.value)} placeholder="Nhập giá trị" /></label>
        {isRange && <label><span>Đến</span><input type="number" min="0" value={draft.maxValue} onChange={(event) => updateDraft('maxValue', event.target.value)} placeholder="Nhập giá trị" /></label>}
        <div className="numeric-filter-actions"><button className="clear-filter" type="button" onClick={() => setIsOpen(false)}>Hủy</button><button className="primary-button compact-button" type="button" disabled={!canAdd} onClick={addFilter}>Áp dụng</button></div>
        {isRange && draft.value !== '' && draft.maxValue !== '' && Number(draft.value) > Number(draft.maxValue) && <small className="filter-error">Giá trị “Từ” phải nhỏ hơn hoặc bằng “Đến”.</small>}
      </div>}
    </div>
  )
}
