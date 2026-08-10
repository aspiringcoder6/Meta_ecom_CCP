import { startDragResize } from '../../utils/dragResize'

export default function ResizeDivider({ value, min, max, onChange, label, tourId }) {
  const changeByKeyboard = (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const adjustment = event.key === 'ArrowUp' ? -10 : 10
    onChange(Math.min(max, Math.max(min, value + adjustment)))
  }

  return <div className="horizontal-resize-divider" data-tour={tourId} role="separator" tabIndex="0" aria-label={label} aria-orientation="horizontal" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} onKeyDown={changeByKeyboard} onPointerDown={(event) => startDragResize(event, { axis: 'y', value, min, max, onChange })}><span /></div>
}
