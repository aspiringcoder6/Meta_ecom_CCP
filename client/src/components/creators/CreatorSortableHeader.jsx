import Icon from '../common/Icon'

export default function CreatorSortableHeader({ label, sortKey, criterion, priority, onSort }) {
  if (!sortKey) return label

  const directionLabel = criterion?.direction === 'asc' ? 'tăng dần' : 'giảm dần'
  const nextAction = !criterion
    ? 'Sắp xếp tăng dần'
    : criterion.direction === 'asc'
      ? 'Chuyển sang giảm dần'
      : 'Bỏ tiêu chí sắp xếp'

  return (
    <button
      type="button"
      className={`sortable-column-button${criterion ? ' is-active' : ''}${criterion?.direction === 'desc' ? ' is-descending' : ''}`}
      onClick={() => onSort(sortKey)}
      title={`${nextAction}. Tiêu chí được chọn trước có mức ưu tiên cao hơn.`}
      aria-label={`${nextAction} theo cột này${criterion ? `; hiện đang ${directionLabel}, ưu tiên ${priority}` : ''}`}
    >
      <span className="sortable-column-label">{label}</span>
      {criterion ? (
        <span className="sort-state" aria-hidden="true">
          <span className="sort-priority">{priority}</span>
          <Icon name="arrowUp" size={13} strokeWidth={2.2} />
        </span>
      ) : <span className="sort-neutral" aria-hidden="true">↕</span>}
    </button>
  )
}
