import { useMemo, useState } from 'react'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import { formatCompactCurrency } from '../../utils/formatters'
import { getCreatorInsights } from '../../utils/creatorInsights'
import { formatCreatorHandle, formatCreatorList } from '../../utils/creatorLists'

const SEGMENTS = ['MASSIVE', 'TOP', 'MINI', 'FREECAST']

function SummaryMetric({ metric }) {
  return (
    <div className="creator-summary-metric">
      <span className="summary-icon"><Icon name={metric.icon} /></span>
      <span><strong title={String(metric.value)}>{metric.value}</strong><small>{metric.label}</small><em>{metric.detail}</em></span>
    </div>
  )
}

function CategorySegmentBreakdown({ categories, total }) {
  return (
    <article className="creator-insight-detail-card category-segment-card">
      <header><div><h3>Phân bổ tệp KOC trong từng Category</h3><p>Tổng data và cơ cấu Segment từng category</p></div><span>{categories.length} Category</span></header>
      <div className="category-segment-table-wrap">
        <div className="category-segment-table">
          <div className="category-segment-header"><span>Category</span><span>Tổng</span>{SEGMENTS.map((segment) => <span key={segment}>{segment}</span>)}</div>
          {categories.map((category) => (
            <div className="category-segment-row" key={category.label}>
              <span><strong>{category.label}</strong><small><span className='text-green-400 font-bold text-xs'>{category.percent}%</span> tổng số creators</small></span>
              <strong className="category-total-cell">{category.count}</strong>
              {SEGMENTS.map((segment) => <span className={`segment-count-cell segment-${segment.toLowerCase()}`} key={segment}>{category.segmentCounts[segment] || 0}</span>)}
            </div>
          ))}
          {!categories.length && <p className="insight-empty">Chưa có dữ liệu Category.</p>}
        </div>
      </div>
      <footer>Tổng cộng <strong>{total}</strong> Creator trong hệ thống</footer>
    </article>
  )
}

function SegmentBookingBreakdown({ segments, totalExpense, creatorCount }) {
  return (
    <article className="creator-insight-detail-card segment-booking-card">
      <header><div><h3>Booking Expense theo Segment</h3><p>Phân phối của booking expense tháng này theo các segment</p></div></header>
      <div className="booking-total"><span>Tổng dự kiến</span><strong>{formatCompactCurrency(totalExpense)}</strong><small>{creatorCount} Creator khả dụng</small></div>
      <div className="booking-segment-list">
        {segments.map((segment, index) => (
          <div key={segment.label}>
            <div><span><i className={`segment-color segment-color-${(index % 4) + 1}`} />{segment.label}</span><strong>{formatCompactCurrency(segment.bookingExpense)}</strong></div>
            <div className="segment-expense-track"><span className={`segment-color-${(index % 4) + 1}`} style={{ width: `${segment.expensePercent}%` }} /></div>
            <small>{segment.count} Creator · {segment.creatorPercent}% tệp khả dụng · {segment.expensePercent}% chi phí</small>
          </div>
        ))}
        {!segments.length && <p className="insight-empty">Chưa có dữ liệu Segment.</p>}
      </div>
    </article>
  )
}

function LeadingCreators({ creators, onSelect }) {
  return (
    <article className="creator-insight-detail-card insight-leaders-card">
      <header><div><h3>Creator dẫn đầu</h3><p>Xếp hạng theo GMV / Month</p></div></header>
      <div className="mini-table financial-creators-table creator-insight-leaders-table">
        <div className="financial-mini-header"><span>Creator</span><span>Category</span><span>GMV / Month</span><span>Booking Expense</span></div>
        {creators.map(({ creator, bookingExpense }, index) => (
          <button type="button" className="mini-table-row" key={creator.id} onClick={() => onSelect?.(creator.id)}>
            <span className="rank">{String(index + 1).padStart(2, '0')}</span>
            <Avatar creator={creator} />
            <span className="creator-primary"><strong>{creator.name}</strong><small>{formatCreatorHandle(creator.tiktokId)}</small></span>
            <span className="category-tag" title={formatCreatorList(creator.category)}>{formatCreatorList(creator.category, ' · ')}</span>
            <span className="financial-value"><strong>{formatCompactCurrency(creator.gmvMonth)}</strong><small>GMV</small></span>
            <span className="financial-value expense"><strong>{formatCompactCurrency(bookingExpense)}</strong><small>Booking</small></span>
          </button>
        ))}
        {!creators.length && <p className="insight-empty">Chưa có dữ liệu Creator dẫn đầu.</p>}
      </div>
    </article>
  )
}

export default function CreatorSummary({ creators, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const insights = useMemo(() => getCreatorInsights(creators), [creators])
  const topCategory = insights.topCategory
  const leader = insights.leadingCreators[0]?.creator
  const metrics = [
    { icon: 'users', value: insights.totalCreators, label: 'Tổng số Creator', detail: `${insights.availableCount} khả dụng · ${insights.archivedCount} lưu trữ` },
    { icon: 'tag', value: topCategory?.label || '—', label: 'Category lớn nhất', detail: topCategory ? `${topCategory.count} Creator · ${topCategory.percent}% tổng số creators` : 'Chưa có dữ liệu Category' },
    { icon: 'briefcase', value: formatCompactCurrency(insights.totalBookingExpense), label: 'Booking Expense dự kiến', detail: `${formatCompactCurrency(insights.averageBookingExpense)} trung bình / Creator` },
    { icon: 'sparkles', value: leader ? formatCreatorHandle(leader.tiktokId) : '—', label: 'Creator dẫn đầu', detail: leader ? `${formatCompactCurrency(leader.gmvMonth)} GMV · ${formatCreatorList(leader.category, ' · ')}` : 'Chưa có dữ liệu GMV' },
  ]

  return (
    <section className={`creator-insights-panel${expanded ? ' is-expanded' : ''}`} data-tour="creator-insights">
      <header className="creator-insights-heading">
        <div><h2>Creator Insights</h2><p>{expanded ? 'Category, Segment, Booking Expense và Creator dẫn đầu' : 'Thông tin overview quan trọng của kho Creator'}</p></div>
        <button type="button" className="creator-insights-toggle" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Thu gọn' : 'Xem chi tiết'}<Icon name="chevronDown" size={16} />
        </button>
      </header>
      <div className="creator-summary-strip">{metrics.map((metric) => <SummaryMetric metric={metric} key={metric.label} />)}</div>
      {expanded && (
        <div className="creator-insight-details">
          <CategorySegmentBreakdown categories={insights.categories} total={insights.totalCreators} />
          <LeadingCreators creators={insights.leadingCreators} onSelect={onSelect} />
          <SegmentBookingBreakdown segments={insights.segments} totalExpense={insights.totalBookingExpense} creatorCount={insights.availableCount} />
        </div>
      )}
    </section>
  )
}
