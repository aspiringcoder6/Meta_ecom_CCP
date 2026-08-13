import { useMemo, useState } from 'react'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import { formatCategoryPaths } from '../../utils/creatorCategoryPaths'
import { getCreatorInsights } from '../../utils/creatorInsights'
import { formatCreatorHandle } from '../../utils/creatorLists'

const SEGMENTS = ['MASSIVE', 'TOP', 'MINI', 'FREECAST']

function SummaryMetric({ metric }) {
  return (
    <div className="creator-summary-metric">
      <span className="summary-icon"><Icon name={metric.icon} /></span>
      <span><strong title={String(metric.value)}>{metric.value}</strong><small>{metric.label}</small><em>{metric.detail}</em></span>
    </div>
  )
}

function CategorySegmentBreakdown({ categories, total, expanded, selectedCategory, onSelect }) {
  const visibleCategories = expanded ? categories : categories.slice(0, 3)
  return (
    <article className="creator-insight-detail-card category-segment-card">
      <header><div><h3>Phân bổ tệp KOC trong từng Category</h3><p>{expanded ? 'Toàn bộ Category trong hệ thống' : 'Top 3 Category có nhiều KOC nhất'} - Hãy bấm vào một dòng bất kì để xem top 5 KOC của category đó</p></div><span>{visibleCategories.length}/{categories.length} Category</span></header>
      <div className="category-segment-table-wrap">
        <div className="category-segment-table">
          <div className="category-segment-header"><span>Category</span><span>Tổng</span>{SEGMENTS.map((segment) => <span key={segment}>{segment}</span>)}</div>
          {visibleCategories.map((category) => (
            <button type="button" className={`category-segment-row${selectedCategory === category.label ? ' is-selected' : ''}`} aria-pressed={selectedCategory === category.label} onClick={() => onSelect(category.label)} key={category.label}>
              <span><strong>{category.label}</strong><small><span className='text-green-400 font-bold text-xs'>{category.percent}%</span> tổng số creators</small></span>
              <strong className="category-total-cell">{category.count}</strong>
              {SEGMENTS.map((segment) => <span className={`segment-count-cell segment-${segment.toLowerCase()}`} key={segment}>{category.segmentCounts[segment] || 0}</span>)}
            </button>
          ))}
          {!visibleCategories.length && <p className="insight-empty">Chưa có dữ liệu Category.</p>}
        </div>
      </div>
      <footer>Tổng cộng <strong>{total}</strong> Creator trong hệ thống</footer>
    </article>
  )
}

function CategoryTopCreators({ category, onSelect }) {
  if (!category) return null
  return (
    <article className="creator-insight-detail-card category-top-creators-card">
      <header><div><h3>Top KOC 5 - {category.label}</h3><p>Xếp theo GMV / Month, sau đó Followers</p></div></header>
      <div className="category-top-creators-table">
        <div className="category-top-creators-header"><span>Creator</span><span>Segment</span><span>GMV / Month</span><span>Followers</span></div>
        {category.topCreators.map((creator, index) => (
          <button type="button" className="category-top-creator-row" onClick={() => onSelect?.(creator.id)} key={creator.id}>
            <span className="rank">{String(index + 1).padStart(2, '0')}</span>
            <Avatar creator={creator} />
            <span className="creator-primary"><strong>{creator.name}</strong><small>{formatCreatorHandle(creator.tiktokId)}</small></span>
            <span className="segment-tag">{creator.segment}</span>
            <span className="financial-value"><strong>{formatCompactCurrency(creator.gmvMonth)}</strong><small>GMV</small></span>
            <span className="financial-value followers"><strong>{formatNumber(creator.followers)}</strong><small>Followers</small></span>
          </button>
        ))}
        {!category.topCreators.length && <p className="insight-empty">Chưa có Creator trong Category này.</p>}
      </div>
    </article>
  )
}

export default function CreatorSummary({ creators, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const insights = useMemo(() => getCreatorInsights(creators), [creators])
  const topCategory = insights.topCategory
  const leader = insights.leadingCreators[0]
  const selectedCategoryData = insights.categories.find((category) => category.label === selectedCategory)
  const metrics = [
    { icon: 'users', value: insights.totalCreators, label: 'Tổng số Creator', detail: `${insights.availableCount} khả dụng · ${insights.archivedCount} lưu trữ` },
    { icon: 'tag', value: topCategory?.label || '—', label: 'Category lớn nhất', detail: topCategory ? `${topCategory.count} Creator · ${topCategory.percent}% tổng số creators` : 'Chưa có dữ liệu Category' },
    { icon: 'sparkles', value: leader ? formatCreatorHandle(leader.tiktokId) : '—', label: 'Creator dẫn đầu', detail: leader ? `${formatCompactCurrency(leader.gmvMonth)} GMV · ${formatCategoryPaths(leader.category, ' · ', 2)}` : 'Chưa có dữ liệu GMV' },
  ]

  return (
    <section className={`creator-insights-panel${expanded ? ' is-expanded' : ''}`} data-tour="creator-insights">
      <header className="creator-insights-heading">
        <div><h2>Creator Insights</h2><p>{expanded ? 'Toàn bộ phân bổ Category và top KOC theo Category' : 'Overview và top 3 Category có nhiều KOC nhất'}</p></div>
        <button type="button" className="creator-insights-toggle" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Thu gọn' : 'Xem chi tiết'}<Icon name="chevronDown" size={16} />
        </button>
      </header>
      <div className="creator-summary-strip is-three-metrics">{metrics.map((metric) => <SummaryMetric metric={metric} key={metric.label} />)}</div>
      <div className="creator-category-insights">
        <CategorySegmentBreakdown categories={insights.categories} total={insights.totalCreators} expanded={expanded} selectedCategory={selectedCategory} onSelect={(category) => setSelectedCategory((current) => current === category ? null : category)} />
        <CategoryTopCreators category={selectedCategoryData} onSelect={onSelect} />
      </div>
    </section>
  )
}
