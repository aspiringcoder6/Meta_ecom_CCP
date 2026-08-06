import Icon from '../common/Icon'
import { formatAudience, formatCompactCurrency } from '../../utils/formatters'
import { calculateBookingPricing } from '../../utils/pricing'

export default function CreatorSummary({ creators }) {
  const categoryCounts = creators.reduce((counts, creator) => {
    if (creator.category) counts[creator.category] = (counts[creator.category] || 0) + 1
    return counts
  }, {})
  const [topCategory = '—', topCategoryCount = 0] = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] || []
  const totalFollowers = creators.reduce((sum, creator) => sum + (Number(creator.followers) || 0), 0)
  const totalGmv = creators.reduce((sum, creator) => sum + (Number(creator.gmvMonth) || 0), 0)
  const totalBookingExpense = creators.reduce((sum, creator) => sum + calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense, 0)
  const categoryShare = creators.length ? Math.round((topCategoryCount / creators.length) * 100) : 0

  const metrics = [
    { icon: 'users', value: creators.length, label: 'Tổng số Creator', detail: `${Object.keys(categoryCounts).length} Category` },
    { icon: 'tag', value: topCategory, label: 'Category nhiều nhất', detail: `${topCategoryCount} Creator · ${categoryShare}% danh sách` },
    { icon: 'trending', value: formatAudience(totalFollowers), label: 'Tổng Followers', detail: 'Quy mô tệp khán giả' },
    { icon: 'sparkles', value: formatCompactCurrency(totalGmv), label: 'Tổng GMV / Month', detail: 'GMV ước tính mỗi tháng' },
    { icon: 'briefcase', value: formatCompactCurrency(totalBookingExpense), label: 'Tổng Booking Expense', detail: 'Chi phí booking dự kiến' },
  ]

  return (
    <section className="creator-summary-strip">
      {metrics.map((metric) => <div className="creator-summary-metric" key={metric.label}><span className="summary-icon"><Icon name={metric.icon} /></span><span><strong title={String(metric.value)}>{metric.value}</strong><small>{metric.label}</small><em>{metric.detail}</em></span></div>)}
    </section>
  )
}
