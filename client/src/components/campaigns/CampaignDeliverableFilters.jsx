import Icon from '../common/Icon'
import CreatorMultiFilter from '../creators/CreatorMultiFilter'
import DeliverableNumericFilters from './DeliverableNumericFilters'

export default function CampaignDeliverableFilters({
  filters,
  numericFilters,
  options,
  shownCreators,
  shownDeliverables,
  totalCreators,
  onChange,
  onAddNumericFilter,
  onRemoveNumericFilter,
  onClear,
}) {
  const hasFilters = Boolean(
    filters.search
    || filters.segment.length
    || filters.type.length
    || filters.progress.length
    || filters.product.length
    || filters.sdha.length
    || numericFilters.length,
  )

  return (
    <section className="deliverables-filter-shell" data-tour="campaign-deliverables-filters">
      <div className="deliverables-filter-main">
        <label className="deliverables-search-field">
          <Icon name="search" size={17} />
          <input value={filters.search} onChange={(event) => onChange('search', event.target.value)} placeholder="Tìm KOC, ID, link, ghi chú, Product..." />
          {filters.search && <button type="button" onClick={() => onChange('search', '')} aria-label="Xóa tìm kiếm"><Icon name="close" size={13} /></button>}
        </label>
        <div className="deliverables-filter-selects">
          <CreatorMultiFilter label="Segment" values={filters.segment} options={options.segment} onChange={(values) => onChange('segment', values)} />
          <CreatorMultiFilter label="Type" values={filters.type} options={options.type} onChange={(values) => onChange('type', values)} />
          <CreatorMultiFilter label="Tiến độ" values={filters.progress} options={options.progress} onChange={(values) => onChange('progress', values)} />
          <CreatorMultiFilter label="Product" values={filters.product} options={options.product} onChange={(values) => onChange('product', values)} />
          <CreatorMultiFilter label="SDHA" values={filters.sdha} options={options.sdha} onChange={(values) => onChange('sdha', values)} />
        </div>
      </div>
      <div className="deliverables-filter-secondary">
        <DeliverableNumericFilters filters={numericFilters} onAdd={onAddNumericFilter} onRemove={onRemoveNumericFilter} />
        <div className="deliverables-filter-summary"><strong>{shownCreators}</strong>/{totalCreators} KOC · <strong>{shownDeliverables}</strong> deliverable</div>
        {hasFilters && <button className="deliverables-clear-filters" type="button" onClick={onClear}><Icon name="close" size={13} />Xóa tất cả bộ lọc</button>}
      </div>
    </section>
  )
}
