import { calculateBookingPricing } from '../../utils/pricing'
import { formatCompactCurrency } from '../../utils/formatters'

const SEGMENT_ORDER = ['MASSIVE', 'TOP', 'MINI', 'FREECAST']

export default function BookingBySegmentPanel({ creators }) {
  const segments = SEGMENT_ORDER.map((segment) => {
    const members = creators.filter((creator) => creator.segment === segment)
    return {
      segment,
      creators: members.length,
      expense: members.reduce((total, creator) => total + calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense, 0),
    }
  })
  const totalExpense = segments.reduce((total, segment) => total + segment.expense, 0)

  return (
    <article className="panel booking-segment-panel">
      <div className="panel-heading"><div><h2>Booking Expense</h2><p>Chi phí dự kiến theo Segment</p></div></div>
      <div className="booking-total"><span>Tổng dự kiến</span><strong>{formatCompactCurrency(totalExpense)}</strong><small>{creators.length} Creator khả dụng</small></div>
      <div className="booking-segment-list">
        {segments.map((item, index) => <div key={item.segment}><div><span><i className={`segment-color segment-color-${index + 1}`} />{item.segment}</span><strong>{formatCompactCurrency(item.expense)}</strong></div><div className="segment-expense-track"><span className={`segment-color-${index + 1}`} style={{ width: `${totalExpense ? (item.expense / totalExpense) * 100 : 0}%` }} /></div><small>{item.creators} Creator · {totalExpense ? Math.round((item.expense / totalExpense) * 100) : 0}% chi phí</small></div>)}
      </div>
    </article>
  )
}
