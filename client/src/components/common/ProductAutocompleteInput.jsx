import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fillProductToken, productSuggestions } from '../../utils/campaignProducts'
import '../../styles/product-autocomplete.css'

export default function ProductAutocompleteInput({ value = '', options = [], multiple = true, onChange, onFocus, onBlur, disabled, label = 'Sản phẩm', placeholder = 'Sản phẩm A, sản phẩm B...' }) {
  const input = useRef(null)
  const popup = useRef(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [caret, setCaret] = useState(value.length)
  const [active, setActive] = useState(-1)
  const [position, setPosition] = useState(null)
  const suggestions = productSuggestions(options, value, caret, multiple)
  const visible = open && !disabled && suggestions.length > 0

  useLayoutEffect(() => {
    if (!visible) return
    const place = () => {
      const rect = input.current?.getBoundingClientRect()
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) { setOpen(false); return }
      const width = Math.min(Math.max(rect.width, 250), window.innerWidth - 16)
      const height = Math.min(300, suggestions.length * 38 + 46)
      const below = window.innerHeight - rect.bottom - 12
      const above = rect.top - 12
      const showAbove = below < height && above > below
      const maxHeight = Math.max(60, Math.min(height, showAbove ? above : below))
      setPosition({ width, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: showAbove ? rect.top - maxHeight - 4 : rect.bottom + 4, maxHeight })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [visible, suggestions.length])

  useEffect(() => { popup.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [active])

  const choose = (product) => {
    // Keep the token that produced these suggestions; pointer focus can change the DOM caret.
    const next = fillProductToken(value, caret, product, multiple)
    onChange(next.value)
    setCaret(next.caret); setActive(-1); setOpen(false)
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(next.caret, next.caret) })
  }
  const handleKey = (event) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') { if (open) { event.preventDefault(); event.stopPropagation() }; setOpen(false); setActive(-1); return }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && suggestions.length) {
      event.preventDefault(); setOpen(true)
      setActive((current) => event.key === 'ArrowDown' ? (current + 1) % suggestions.length : current < 0 ? suggestions.length - 1 : (current - 1 + suggestions.length) % suggestions.length)
    } else if (visible && ['Tab', 'Enter'].includes(event.key) && suggestions[active]) {
      event.preventDefault(); choose(suggestions[active])
    }
  }

  return <div className="product-autocomplete">
    <input ref={input} role="combobox" aria-label={label} aria-expanded={visible} aria-controls={visible ? listId : undefined} aria-autocomplete="list" aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" value={value} title={value} disabled={disabled} placeholder={placeholder}
      onChange={(event) => { onChange(event.target.value); setCaret(event.target.selectionStart); setActive(-1); setOpen(true) }}
      onClick={() => { setCaret(input.current.selectionStart); setActive(-1); setOpen(true) }}
      onSelect={() => setCaret(input.current.selectionStart)}
      onFocus={(event) => { setOpen(true); setCaret(event.target.selectionStart); onFocus?.(event) }}
      onBlur={(event) => { setOpen(false); setActive(-1); onBlur?.(event) }} onKeyDown={handleKey} />
    {visible && position && createPortal(<div ref={popup} className="product-autocomplete-popup" style={position}>
      <small>↓ ↑ để chọn · Tab để điền</small>
      <div role="listbox" id={listId} aria-label="Sản phẩm gợi ý">{suggestions.map((product, index) => <button type="button" role="option" aria-selected={active === index} id={`${listId}-${index}`} key={product} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); choose(product) }} onMouseEnter={() => setActive(index)} onClick={() => choose(product)}>{product}</button>)}</div>
    </div>, document.body)}
  </div>
}
