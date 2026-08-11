import { useEffect, useRef, useState } from 'react'
import Icon from '../common/Icon'

export default function CreatorMultiFilter({ label, values, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const selectedValues = Array.isArray(values) ? values : []
  const triggerLabel = selectedValues.length === 0
    ? `Tất cả ${label}`
    : selectedValues.length === 1
      ? selectedValues[0]
      : `${label} đã chọn`

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const toggleValue = (option) => {
    onChange(selectedValues.includes(option)
      ? selectedValues.filter((value) => value !== option)
      : [...selectedValues, option])
  }

  return (
    <div className={`multi-filter ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
      <button ref={triggerRef} className={`multi-filter-trigger ${selectedValues.length ? 'has-value' : ''}`} type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <span>{triggerLabel}</span>
        {selectedValues.length > 1 && <strong>{selectedValues.length}</strong>}
        <Icon name="chevronDown" size={15} />
      </button>
      {isOpen && (
        <div className="multi-filter-menu" role="listbox" aria-label={`Lọc theo ${label}`} aria-multiselectable="true">
          <header><strong>{label}</strong><small>Có thể chọn nhiều</small></header>
          <button className={`multi-filter-option ${selectedValues.length === 0 ? 'is-selected' : ''}`} type="button" role="option" aria-selected={selectedValues.length === 0} onClick={() => onChange([])}>
            <span><Icon name="check" size={13} /></span>Tất cả {label}
          </button>
          <div className="multi-filter-options">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option)
              return <button className={`multi-filter-option ${isSelected ? 'is-selected' : ''}`} type="button" role="option" aria-selected={isSelected} key={option} onClick={() => toggleValue(option)}><span><Icon name="check" size={13} /></span>{option}</button>
            })}
          </div>
          {selectedValues.length > 0 && <footer><button type="button" onClick={() => onChange([])}>Xóa lựa chọn</button></footer>}
        </div>
      )}
    </div>
  )
}
