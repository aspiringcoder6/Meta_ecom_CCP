export function startDragResize(event, { axis, value, min, max, onChange }) {
  event.preventDefault()
  const startPosition = axis === 'x' ? event.clientX : event.clientY
  const previousCursor = document.body.style.cursor
  const previousUserSelect = document.body.style.userSelect
  document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'

  const handleMove = (moveEvent) => {
    const position = axis === 'x' ? moveEvent.clientX : moveEvent.clientY
    const nextValue = Math.min(max, Math.max(min, value + position - startPosition))
    onChange(Math.round(nextValue))
  }

  const handleEnd = () => {
    window.removeEventListener('pointermove', handleMove)
    window.removeEventListener('pointerup', handleEnd)
    window.removeEventListener('pointercancel', handleEnd)
    document.body.style.cursor = previousCursor
    document.body.style.userSelect = previousUserSelect
  }

  window.addEventListener('pointermove', handleMove)
  window.addEventListener('pointerup', handleEnd)
  window.addEventListener('pointercancel', handleEnd)
}
