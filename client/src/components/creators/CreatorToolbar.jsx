import Icon from '../common/Icon'

function FilterSelect({ value, onChange, options }) {
  return (
    <label className="select-wrap">
      <select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <Icon name="chevronDown" size={15} />
    </label>
  )
}

export default function CreatorToolbar({ filters, options, onFilterChange, onReset }) {
  const hasFilters = filters.search || filters.segment !== 'all' || filters.category !== 'all' || filters.type !== 'all'
  const segmentOptions = [{ value: 'all', label: 'Tất cả Segment' }, ...options.segments.map((value) => ({ value, label: value }))]
  const categoryOptions = [{ value: 'all', label: 'Tất cả Category' }, ...options.categories.map((value) => ({ value, label: value }))]
  const typeOptions = [{ value: 'all', label: 'Tất cả Type' }, ...options.types.map((value) => ({ value, label: value }))]

  return (
    <div className="creator-toolbar">
      <label className="search-box"><Icon name="search" size={19} /><input value={filters.search} onChange={(event) => onFilterChange('search', event.target.value)} placeholder="Tìm theo tên, handle, nền tảng..." /><kbd>⌘ K</kbd></label>
      <div className="filter-group">
        <span className="filter-label"><Icon name="filter" size={17} /> Bộ lọc</span>
        <FilterSelect value={filters.segment} onChange={(value) => onFilterChange('segment', value)} options={segmentOptions} />
        <FilterSelect value={filters.category} onChange={(value) => onFilterChange('category', value)} options={categoryOptions} />
        <FilterSelect value={filters.type} onChange={(value) => onFilterChange('type', value)} options={typeOptions} />
        {hasFilters && <button className="clear-filter" onClick={onReset}>Xóa lọc</button>}
      </div>
    </div>
  )
}
