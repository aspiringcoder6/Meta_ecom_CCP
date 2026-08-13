import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildCategoryTree, categoryPathMatches } from '../../utils/creatorCategoryPaths'
import Icon from '../common/Icon'

const MENU_WIDTH = 252
const SUBMENU_WIDTH = 238
const VIEWPORT_GAP = 8
const SUBMENU_OVERLAP = 4
const SUBMENU_CLOSE_DELAY = 280

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function submenuPosition(element, childCount) {
  const rect = element.getBoundingClientRect()
  const estimatedHeight = Math.min(330, childCount * 35 + 16)
  const opensRight = rect.right - SUBMENU_OVERLAP + SUBMENU_WIDTH <= window.innerWidth - VIEWPORT_GAP
  const preferredLeft = opensRight ? rect.right - SUBMENU_OVERLAP : rect.left - SUBMENU_WIDTH + SUBMENU_OVERLAP
  return {
    left: clamp(preferredLeft, VIEWPORT_GAP, window.innerWidth - SUBMENU_WIDTH - VIEWPORT_GAP),
    top: clamp(rect.top - 7, VIEWPORT_GAP, window.innerHeight - estimatedHeight - VIEWPORT_GAP),
    side: opensRight ? 'right' : 'left',
  }
}

function CategoryTreeNode({ node, selectedValues, onToggle, isSubmenuOpen, onOpenSubmenu, onKeepSubmenu, onScheduleSubmenuClose }) {
  const [position, setPosition] = useState({ left: 0, top: 0, side: 'right' })
  const exactSelected = selectedValues.includes(node.value)
  const coveredByParent = !exactSelected && selectedValues.some((selected) => categoryPathMatches(node.value, selected))
  const hasChildren = node.children.length > 0
  const openSubmenu = (event) => {
    if (!hasChildren) return
    setPosition(submenuPosition(event.currentTarget, node.children.length))
    onOpenSubmenu(node.value)
  }

  return (
    <div className="category-tree-node" onPointerEnter={openSubmenu} onPointerLeave={() => onScheduleSubmenuClose(node.value)} onFocus={openSubmenu} onBlur={() => onScheduleSubmenuClose(node.value)}>
      <button className={`category-tree-option ${exactSelected ? 'is-selected' : ''} ${coveredByParent ? 'is-covered' : ''}`} type="button" role="option" aria-selected={exactSelected || coveredByParent} onClick={() => onToggle(node.value)}>
        <span className="category-tree-check"><Icon name="check" size={13} /></span>
        <span className="category-tree-label">{node.label}</span>
        {hasChildren && <Icon name="chevronRight" size={14} />}
      </button>
      {hasChildren && (
        <div className={`category-tree-submenu opens-${position.side}${isSubmenuOpen ? ' is-open' : ''}`} data-category-filter-menu style={{ left: position.left, top: position.top }} onPointerEnter={() => onKeepSubmenu(node.value)} onPointerLeave={() => onScheduleSubmenuClose(node.value)}>
          <CategoryTreeLevel nodes={node.children} selectedValues={selectedValues} onToggle={onToggle} />
        </div>
      )}
    </div>
  )
}

function CategoryTreeLevel({ nodes, selectedValues, onToggle }) {
  const [activeSubmenu, setActiveSubmenu] = useState(null)
  const closeTimerRef = useRef(null)
  const clearCloseTimer = () => {
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }
  const openSubmenu = (value) => {
    clearCloseTimer()
    setActiveSubmenu(value)
  }
  const keepSubmenuOpen = (value) => {
    clearCloseTimer()
    setActiveSubmenu(value)
  }
  const scheduleSubmenuClose = (value) => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setActiveSubmenu((current) => current === value ? null : current)
    }, SUBMENU_CLOSE_DELAY)
  }

  useEffect(() => () => clearCloseTimer(), [])

  return nodes.map((node) => (
    <CategoryTreeNode
      node={node}
      selectedValues={selectedValues}
      onToggle={onToggle}
      isSubmenuOpen={activeSubmenu === node.value}
      onOpenSubmenu={openSubmenu}
      onKeepSubmenu={keepSubmenuOpen}
      onScheduleSubmenuClose={scheduleSubmenuClose}
      key={node.value}
    />
  ))
}

export default function CreatorCategoryFilter({ values, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, maxHeight: 360 })
  const triggerRef = useRef(null)
  const containerRef = useRef(null)
  const menuRef = useRef(null)
  const selectedValues = Array.isArray(values) ? values : []
  const tree = useMemo(() => buildCategoryTree(options), [options])
  const triggerLabel = selectedValues.length === 0 ? 'Tất cả Category' : selectedValues.length === 1 ? selectedValues[0] : 'Category đã chọn'

  const updateMenuPosition = useCallback((measuredHeight) => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const availableBelow = Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_GAP - 6)
    const availableAbove = Math.max(0, rect.top - VIEWPORT_GAP - 6)
    const estimatedHeight = Math.min(380, 88 + tree.length * 35 + (selectedValues.length ? 32 : 0))
    const desiredHeight = Math.max(110, Math.min(380, measuredHeight || estimatedHeight))
    const fitsBelow = availableBelow >= desiredHeight
    const fitsAbove = availableAbove >= desiredHeight
    const opensBelow = fitsBelow || (!fitsAbove && availableBelow >= availableAbove)
    const availableSpace = opensBelow ? availableBelow : availableAbove
    const maxHeight = Math.max(110, Math.min(380, availableSpace))
    const visibleHeight = Math.min(desiredHeight, maxHeight)

    setMenuPosition({
      left: clamp(rect.right - MENU_WIDTH, VIEWPORT_GAP, window.innerWidth - MENU_WIDTH - VIEWPORT_GAP),
      top: opensBelow ? rect.bottom + 6 : Math.max(VIEWPORT_GAP, rect.top - visibleHeight - 6),
      maxHeight,
    })
  }, [selectedValues.length, tree.length])

  const openMenu = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    updateMenuPosition()
    setIsOpen(true)
  }

  useLayoutEffect(() => {
    if (!isOpen) return undefined
    const syncPosition = () => updateMenuPosition(menuRef.current?.offsetHeight)
    syncPosition()
    const frame = window.requestAnimationFrame(syncPosition)
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(syncPosition) : null
    if (triggerRef.current) resizeObserver?.observe(triggerRef.current)
    if (menuRef.current) resizeObserver?.observe(menuRef.current)
    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
    }
  }, [isOpen, updateMenuPosition])

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
    const syncOnViewportChange = () => updateMenuPosition(menuRef.current?.offsetHeight)
    const closeOnExternalScroll = (event) => {
      if (event.target?.closest?.('[data-category-filter-menu]')) return
      syncOnViewportChange()
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', syncOnViewportChange)
    window.addEventListener('scroll', closeOnExternalScroll, true)
    window.visualViewport?.addEventListener('resize', syncOnViewportChange)
    window.visualViewport?.addEventListener('scroll', syncOnViewportChange)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', syncOnViewportChange)
      window.removeEventListener('scroll', closeOnExternalScroll, true)
      window.visualViewport?.removeEventListener('resize', syncOnViewportChange)
      window.visualViewport?.removeEventListener('scroll', syncOnViewportChange)
    }
  }, [isOpen, updateMenuPosition])

  const toggleValue = (path) => {
    if (selectedValues.includes(path)) {
      onChange(selectedValues.filter((value) => value !== path))
      return
    }
    const unrelated = selectedValues.filter((value) => !categoryPathMatches(value, path) && !categoryPathMatches(path, value))
    onChange([...unrelated, path])
  }

  const menu = isOpen && createPortal(
    <div ref={menuRef} className="category-tree-menu" data-category-filter-menu role="listbox" aria-label="Lọc theo Category" aria-multiselectable="true" style={{ left: menuPosition.left, top: menuPosition.top, maxHeight: menuPosition.maxHeight }} onClick={(event) => event.stopPropagation()}>
      <header><strong>Category</strong><small>Hover để xem cấp con</small></header>
      <button className={`category-tree-option category-tree-all ${selectedValues.length === 0 ? 'is-selected' : ''}`} type="button" role="option" aria-selected={selectedValues.length === 0} onClick={() => onChange([])}><span className="category-tree-check"><Icon name="check" size={13} /></span><span className="category-tree-label">Tất cả Category</span></button>
      <div className="category-tree-scroll"><CategoryTreeLevel nodes={tree} selectedValues={selectedValues} onToggle={toggleValue} /></div>
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
