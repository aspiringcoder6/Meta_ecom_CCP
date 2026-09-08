import Icon from '../common/Icon'
import CreatorMultiFilter from '../creators/CreatorMultiFilter'

export default function ClientReviewFilterBar({ search, filters, resultLabel, onSearch, onChange, onClear }) {
  const hasFilters = Boolean(search || filters.some(({ values }) => values.length))
  return (
    <section className="client-review-filter-bar">
      <label className="client-review-filter-search">
        <Icon name="search" size={16} />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Tìm theo Creator, ID, nội dung, ghi chú..." />
        {search && <button type="button" onClick={() => onSearch('')} aria-label="Xóa tìm kiếm"><Icon name="close" size={12} /></button>}
      </label>
      <div className="client-review-filter-options">
        {filters.map((filter) => <CreatorMultiFilter label={filter.label} values={filter.values} options={filter.options} onChange={(values) => onChange(filter.key, values)} key={filter.key} />)}
      </div>
      <div className="client-review-filter-result"><strong>{resultLabel}</strong>{hasFilters && <button type="button" onClick={onClear}><Icon name="close" size={12} />Xóa bộ lọc</button>}</div>
    </section>
  )
}
