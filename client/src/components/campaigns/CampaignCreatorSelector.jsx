import { useMemo, useState } from 'react'
import { DEFAULT_CREATOR_FILTERS, matchesCreatorFilters } from '../../utils/creatorFilters'
import { cycleCreatorSort, sortCreators } from '../../utils/creatorSorting'
import { calculateBookingPricing } from '../../utils/pricing'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import { toCreatorList } from '../../utils/creatorLists'
import Icon from '../common/Icon'
import CategoryPathRibbons from '../creators/CategoryPathRibbons'
import AdvancedNumericFilters from '../creators/AdvancedNumericFilters'
import CreatorCategoryFilter from '../creators/CreatorCategoryFilter'
import CreatorMultiFilter from '../creators/CreatorMultiFilter'
import CreatorSortableHeader from '../creators/CreatorSortableHeader'

export default function CampaignCreatorSelector({ creators, assignedIds, onClose, onConfirm }) {
  const [filters, setFilters] = useState(DEFAULT_CREATOR_FILTERS)
  const [numericFilters, setNumericFilters] = useState([])
  const [sortCriteria, setSortCriteria] = useState([])
  const [selected, setSelected] = useState([])
  const assigned = useMemo(() => new Set(assignedIds.map(String)), [assignedIds])
  const options = useMemo(() => ({
    segments: [...new Set(creators.map((creator) => creator.segment).filter(Boolean))],
    categories: [...new Set(creators.flatMap((creator) => toCreatorList(creator.category)))],
    types: [...new Set(creators.flatMap((creator) => toCreatorList(creator.type)))],
  }), [creators])
  const visible = useMemo(() => sortCreators(
    creators.filter((creator) => matchesCreatorFilters(creator, filters, numericFilters)),
    sortCriteria,
  ), [creators, filters, numericFilters, sortCriteria])
  const selectableVisible = visible.filter((creator) => !assigned.has(String(creator.id)))
  const selectedSet = new Set(selected)
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }))
  const sortBy = (key) => setSortCriteria((current) => cycleCreatorSort(current, key))
  const sortHeader = (label, key) => {
    const sortIndex = sortCriteria.findIndex((criterion) => criterion.key === key)
    const criterion = sortIndex >= 0 ? sortCriteria[sortIndex] : undefined
    return <CreatorSortableHeader label={label} sortKey={key} criterion={criterion} priority={sortIndex + 1} onSort={sortBy} />
  }
  const toggle = (creatorId) => {
    const id = String(creatorId)
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  const toggleVisible = () => {
    const visibleIds = selectableVisible.map((creator) => String(creator.id))
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id))
    setSelected((current) => allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])])
  }

  return (
    <div className="modal-layer campaign-selector-layer">
      <button className="modal-scrim" type="button" aria-label="Đóng bộ chọn Creator" onClick={onClose} />
      <section className="campaign-creator-selector">
        <header><div><span className="eyebrow">Creator Database</span><h2>Chọn Creator cho Campaign</h2><p>Tìm kiếm và lọc giống bảng Creator Management.</p></div><button type="button" className="icon-button" onClick={onClose}><Icon name="close" /></button></header>
        <div className="campaign-selector-filters">
          <label className="campaign-selector-search"><Icon name="search" size={17} /><input autoFocus value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Tìm tên, ID TikTok, Category..." />{filters.search && <button type="button" onClick={() => updateFilter('search', '')}><Icon name="close" size={13} /></button>}</label>
          <CreatorMultiFilter label="Segment" values={filters.segment} options={options.segments} onChange={(value) => updateFilter('segment', value)} />
          <CreatorCategoryFilter values={filters.category} options={options.categories} onChange={(value) => updateFilter('category', value)} />
          <CreatorMultiFilter label="Type" values={filters.type} options={options.types} onChange={(value) => updateFilter('type', value)} />
        </div>
        <div className="campaign-selector-numeric-filters"><AdvancedNumericFilters filters={numericFilters} onAdd={(filter) => setNumericFilters((current) => [...current, filter])} onRemove={(filterId) => setNumericFilters((current) => current.filter((filter) => filter.id !== filterId))} /></div>
        <div className="campaign-selector-meta"><span><strong>{visible.length}</strong> kết quả · {selected.length} đã chọn{sortCriteria.length > 0 && ` · ${sortCriteria.length} tiêu chí sắp xếp`}</span><div>{sortCriteria.length > 0 && <button type="button" onClick={() => setSortCriteria([])}>Xóa sắp xếp</button>}<button type="button" onClick={toggleVisible}>{selectableVisible.length && selectableVisible.every((creator) => selectedSet.has(String(creator.id))) ? 'Bỏ chọn kết quả' : 'Chọn tất cả kết quả'}</button></div></div>
        <div className="campaign-selector-table-wrap">
          <table className="campaign-selector-table"><thead><tr><th /><th>{sortHeader('Creator', 'name')}</th><th>{sortHeader('Segment', 'segment')}</th><th>{sortHeader('Category', 'category')}</th><th>{sortHeader('Followers', 'followers')}</th><th>{sortHeader('Giá gợi ý', 'bookingExpense')}</th></tr></thead><tbody>{visible.map((creator) => { const isAssigned = assigned.has(String(creator.id)); const isSelected = selectedSet.has(String(creator.id)); const pricing = calculateBookingPricing(creator.cost, creator.extraCost); return <tr className={`${isSelected ? 'is-selected' : ''} ${isAssigned ? 'is-assigned' : ''}`} onClick={() => !isAssigned && toggle(creator.id)} key={creator.id}><td><span className="campaign-selector-check">{isAssigned ? <Icon name="check" size={13} /> : isSelected && <Icon name="check" size={13} />}</span></td><td><strong>{creator.name}</strong><small>@{String(creator.tiktokId).replace(/^@/, '')}</small></td><td><span className="segment-tag">{creator.segment}</span></td><td><CategoryPathRibbons values={creator.category} level={2} /></td><td>{formatNumber(creator.followers)}</td><td><strong>{formatCompactCurrency(pricing.bookingExpense)}</strong><small>{isAssigned ? 'Đã có trong Campaign' : 'Booking Expense'}</small></td></tr> })}</tbody></table>
          {!visible.length && <div className="campaign-selector-empty"><Icon name="search" size={25} /><strong>Không tìm thấy Creator</strong><span>Thử thay đổi từ khoá hoặc bộ lọc.</span></div>}
        </div>
        <footer><button type="button" className="secondary-button" onClick={onClose}>Huỷ</button><button type="button" className="primary-button" disabled={!selected.length} onClick={() => onConfirm(selected)}><Icon name="plus" size={16} />Thêm {selected.length || ''} Creator</button></footer>
      </section>
    </div>
  )
}
