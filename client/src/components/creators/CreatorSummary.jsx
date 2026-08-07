import { useMemo, useState } from 'react'
import Icon from '../common/Icon'
import { formatCompactCurrency } from '../../utils/formatters'
import { getCreatorInsights } from '../../utils/creatorInsights'

const CATEGORY_TONES = ['navy', 'blue', 'sky', 'mint', 'warm', 'violet', 'rose', 'slate', 'pale']

function SummaryMetric({ metric }) {
  return (
    <div className="creator-summary-metric">
      <span className="summary-icon"><Icon name={metric.icon} /></span>
      <span><strong title={String(metric.value)}>{metric.value}</strong><small>{metric.label}</small><em>{metric.detail}</em></span>
    </div>
  )
}

function CategoryBreakdown({ categories, total }) {
  const maxCount = categories[0]?.count || 1
  return (
    <article className="creator-insight-detail-card category-breakdown-card">
      <header><div><h3>Creator theo Category</h3><p>Phân bổ các Creator đang khả dụng</p></div><span>{categories.length} Category</span></header>
      <div className="category-breakdown-list">
        {categories.map((category, index) => (
          <div className="category-breakdown-row" key={category.label}>
            <div><span className={`insight-dot tone-${CATEGORY_TONES[index % CATEGORY_TONES.length]}`} /><strong>{category.label}</strong></div>
            <div className="category-count-track"><span className={`tone-${CATEGORY_TONES[index % CATEGORY_TONES.length]}`} style={{ width: `${Math.max(4, (category.count / maxCount) * 100)}%` }} /></div>
            <span><strong>{category.count}</strong><small>{total ? category.percent : 0}%</small></span>
          </div>
        ))}
        {!categories.length && <p className="insight-empty">Chưa có dữ liệu Category.</p>}
      </div>
    </article>
  )
}

function SegmentBookingBreakdown({ segments, totalExpense }) {
  return (
    <article className="creator-insight-detail-card segment-booking-card">
      <header><div><h3>Booking Expense theo Segment</h3><p>Insight liên quan từ Dashboard</p></div><strong>{formatCompactCurrency(totalExpense)}</strong></header>
      <div className="segment-booking-list">
        {segments.map((segment, index) => (
          <div key={segment.label}>
            <div><span><i className={`segment-color segment-color-${(index % 4) + 1}`} />{segment.label}</span><strong>{formatCompactCurrency(segment.bookingExpense)}</strong></div>
            <div className="segment-expense-track"><span className={`segment-color-${(index % 4) + 1}`} style={{ width: `${segment.expensePercent}%` }} /></div>
            <small>{segment.count} Creator · {segment.creatorPercent}% mạng lưới · {segment.expensePercent}% chi phí</small>
          </div>
        ))}
        {!segments.length && <p className="insight-empty">Chưa có dữ liệu Segment.</p>}
      </div>
    </article>
  )
}

export default function CreatorSummary({ creators }) {
  const [expanded, setExpanded] = useState(false)
  const insights = useMemo(() => getCreatorInsights(creators), [creators])
  const topCategory = insights.topCategory
  const metrics = [
    { icon: 'users', value: insights.totalCreators, label: 'Tổng số Creator', detail: `${insights.archivedCount} Creator đang lưu trữ` },
    { icon: 'userCheck', value: insights.availableCount, label: 'Creator khả dụng', detail: `${insights.totalCreators ? Math.round((insights.availableCount / insights.totalCreators) * 100) : 0}% toàn bộ danh sách` },
    { icon: 'tag', value: insights.categories.length, label: 'Category đang có', detail: topCategory ? `${topCategory.label}: ${topCategory.count} Creator` : 'Chưa có dữ liệu Category' },
    { icon: 'briefcase', value: formatCompactCurrency(insights.totalBookingExpense), label: 'Booking Expense dự kiến', detail: `${formatCompactCurrency(insights.averageBookingExpense)} trung bình / Creator` },
  ]

  return (
    <section className={`creator-insights-panel${expanded ? ' is-expanded' : ''}`}>
      <header className="creator-insights-heading">
        <div><h2>Creator Insights</h2><p>{expanded ? 'Phân bổ chi tiết theo Category và Segment' : 'Các thông tin tổng quan quan trọng'}</p></div>
        <button type="button" className="creator-insights-toggle" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Thu gọn' : 'Xem chi tiết'}<Icon name="chevronDown" size={15} />
        </button>
      </header>
      <div className="creator-summary-strip">{metrics.map((metric) => <SummaryMetric metric={metric} key={metric.label} />)}</div>
      {expanded && (
        <div className="creator-insight-details">
          <CategoryBreakdown categories={insights.categories} total={insights.availableCount} />
          <SegmentBookingBreakdown segments={insights.segments} totalExpense={insights.totalBookingExpense} />
        </div>
      )}
    </section>
  )
}
