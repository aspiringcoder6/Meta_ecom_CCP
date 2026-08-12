import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildCategoryTree, categoryPathMatches } from '../../utils/creatorCategoryPaths'
import Icon from '../common/Icon'

const MENU_WIDTH = 252
const SUBMENU_WIDTH = 238
const VIEWPORT_GAP = 8

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function submenuPosition(element, childCount) {
  const rect = element.getBoundingClientRect()
  const estimatedHeight = Math.min(330, childCount * 35 + 16)
  const opensRight = rect.right + 6 + SUBMENU_WIDTH <= window.innerWidth - VIEWPORT_GAP
  const preferredLeft = opensRight ? rect.right + 6 : rect.left - SUBMENU_WIDTH - 6
  return {
    left: clamp(preferredLeft, VIEWPORT_GAP, window.innerWidth - SUBMENU_WIDTH - VIEWPORT_GAP),
    top: clamp(rect.top - 7, VIEWPORT_GAP, window.innerHeight - estimatedHeight - VIEWPORT_GAP),
  }
}

function CategoryTreeNode({ node, selectedValues, onToggle }) {
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const exactSelected = selectedValues.includes(node.value)
  const coveredByParent = !exactSelected && selectedValues.some((selected) => categoryPathMatches(node.value, selected))
  const hasChildren = node.children.length > 0
  const updatePosition = (event) => {
    if (hasChildren) setPosition(submenuPosition(event.currentTarget, node.children.length))
  }

  return (
    <div className="category-tree-node" onPointerEnter={updatePosition} onFocus={updatePosition}>
      <button className={`category-tree-option ${exactSelected ? 'is-selected' : ''} ${coveredByParent ? 'is-covered' : ''}`} type="button" role="option" aria-selected={exactSelected || coveredByParent} onClick={() => onToggle(node.value)}>
        <span className="category-tree-check"><Icon name="check" size={13} /></span>
        <span className="category-tree-label">{node.label}</span>
        {hasChildren && <Icon name="chevronRight" size={14} />}
      </button>
      {hasChildren && (
        <div className="category-tree-submenu" data-category-filter-menu style={position}>
          {node.children.map((child) => <CategoryTreeNode node={child} selectedValues={selectedValues} onToggle={onToggle} key={child.value} />)}
        </div>
      )}
    </div>
  )
}

export default function CreatorCategoryFilter({ values, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, maxHeight: 360 })
  const triggerRef = useRef(null)
  const containerRef = useRef(null)
  const selectedValues = Array.isArray(values) ? values : []
  const tree = useMemo(() => buildCategoryTree(options), [options])
  const triggerLabel = selectedValues.length === 0 ? 'Tất cả Category' : selectedValues.length === 1 ? selectedValues[0] : 'Category đã chọn'

  const openMenu = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    const availableBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP
    const availableAbove = rect.top - VIEWPORT_GAP
    const opensBelow = availableBelow >= Math.min(280, availableAbove)
    const maxHeight = Math.max(180, Math.min(380, opensBelow ? availableBelow : availableAbove))
    setMenuPosition({
      left: clamp(rect.right - MENU_WIDTH, VIEWPORT_GAP, window.innerWidth - MENU_WIDTH - VIEWPORT_GAP),
      top: opensBelow ? rect.bottom + 6 : Math.max(VIEWPORT_GAP, rect.top - maxHeight - 6),
      maxHeight,
    })
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutsideClick = (event) => {
      const target = event.target
      if (containerRef.current?.contains(target) || target.closest?.('[data-category-filter-menu]')) return
      setIsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    const closeOnViewportChange = () => setIsOpen(false)
    const closeOnExternalScroll = (event) => {
      if (event.target?.closest?.('[data-category-filter-menu]')) return
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('scroll', closeOnExternalScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('scroll', closeOnExternalScroll, true)
    }
  }, [isOpen])

  const toggleValue = (path) => {
    if (selectedValues.includes(path)) {
      onChange(selectedValues.filter((value) => value !== path))
      return
    }
    const unrelated = selectedValues.filter((value) => !categoryPathMatches(value, path) && !categoryPathMatches(path, value))
    onChange([...unrelated, path])
  }

  const menu = isOpen && createPortal(
    <div className="category-tree-menu" data-category-filter-menu role="listbox" aria-label="Lọc theo Category" aria-multiselectable="true" style={{ left: menuPosition.left, top: menuPosition.top, maxHeight: menuPosition.maxHeight }} onClick={(event) => event.stopPropagation()}>
      <header><strong>Category</strong><small>Hover để xem cấp con</small></header>
      <button className={`category-tree-option category-tree-all ${selectedValues.length === 0 ? 'is-selected' : ''}`} type="button" role="option" aria-selected={selectedValues.length === 0} onClick={() => onChange([])}><span className="category-tree-check"><Icon name="check" size={13} /></span><span className="category-tree-label">Tất cả Category</span></button>
      <div className="category-tree-scroll">{tree.map((node) => <CategoryTreeNode node={node} selectedValues={selectedValues} onToggle={toggleValue} key={node.value} />)}</div>
      {selectedValues.length > 0 && <footer><span>{selectedValues.length} lựa chọn</span><button type="button" onClick={() => onChange([])}>Xóa lựa chọn</button></footer>}
    </div>,
    document.body,
  )

  return (
    <div className={`multi-filter category-tree-filter ${isOpen ? 'is-open' : ''}`} ref={containerRef} onClick={(event) => event.stopPropagation()}>
      <button ref={triggerRef} className={`multi-filter-trigger ${selectedValues.length ? 'has-value' : ''}`} type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={openMenu}>
        <span>{triggerLabel}</span>
        {selectedValues.length > 1 && <strong>{selectedValues.length}</strong>}
        <Icon name="chevronDown" size={15} />
      </button>
      {menu}
    </div>
  )
}
