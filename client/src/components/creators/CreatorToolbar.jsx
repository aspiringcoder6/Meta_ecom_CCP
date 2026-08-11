import Icon from '../common/Icon'
import AdvancedNumericFilters from './AdvancedNumericFilters'
import CreatorMultiFilter from './CreatorMultiFilter'

export default function CreatorToolbar({ filters, options, numericFilters, tourScope = 'page', onFilterChange, onAddNumericFilter, onRemoveNumericFilter, onReset, onEnterFullscreen }) {
  const hasFilters = filters.search || filters.segment.length > 0 || filters.category.length > 0 || filters.type.length > 0 || numericFilters.length > 0

  return (
    <div className="creator-toolbar-shell" data-tour={`${tourScope}-toolbar`} onClick={(event) => event.stopPropagation()}>
      <div className="creator-toolbar">
        <label className="search-box"><Icon name="search" size={19} /><input value={filters.search} onChange={(event) => onFilterChange('search', event.target.value)} placeholder="Tìm theo tên, ID TikTok, Category..." /><kbd>⌘ K</kbd></label>
        <div className="filter-group">
          <span className="filter-label"><Icon name="filter" size={17} /> Bộ lọc</span>
          <CreatorMultiFilter label="Segment" values={filters.segment} options={options.segments} onChange={(values) => onFilterChange('segment', values)} />
          <CreatorMultiFilter label="Category" values={filters.category} options={options.categories} onChange={(values) => onFilterChange('category', values)} />
          <CreatorMultiFilter label="Type" values={filters.type} options={options.types} onChange={(values) => onFilterChange('type', values)} />
          {hasFilters && <button className="clear-filter" type="button" onClick={onReset}>Xóa lọc</button>}
          {onEnterFullscreen && <button className="fullscreen-button" type="button" data-tour="page-fullscreen" onClick={onEnterFullscreen}><Icon name="maximize" size={16} /> Toàn màn hình</button>}
        </div>
      </div>
      <AdvancedNumericFilters filters={numericFilters} tourId={`${tourScope}-numeric-filter`} onAdd={onAddNumericFilter} onRemove={onRemoveNumericFilter} />
    </div>
  )
}
