import { useNavigate } from 'react-router-dom'
import { calculateBookingPricing } from '../../utils/pricing'
import { formatCompactCurrency } from '../../utils/formatters'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'

export default function CreatorsToWatch({ creators }) {
  const navigate = useNavigate()
  const topCreators = [...creators].sort((a, b) => b.gmvMonth - a.gmvMonth).slice(0, 5)

  return (
    <article className="panel top-creators-panel">
      <div className="panel-heading"><div><h2>Creator dẫn đầu GMV</h2><p>So sánh GMV / Month với Booking Expense dự kiến</p></div><button className="text-button" onClick={() => navigate('/creators')}>Xem tất cả <Icon name="chevronRight" size={15} /></button></div>
      <div className="mini-table financial-creators-table">
        <div className="financial-mini-header"><span>Creator</span><span>Category</span><span>GMV / Month</span><span>Booking Expense</span><span>Hiệu suất</span></div>
        {topCreators.map((creator, index) => {
          const bookingExpense = calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense
          const efficiency = bookingExpense ? creator.gmvMonth / bookingExpense : 0
          return <button className="mini-table-row" key={creator.id} onClick={() => navigate('/creators')}><span className="rank">{String(index + 1).padStart(2, '0')}</span><Avatar creator={creator} /><span className="creator-primary"><strong>{creator.name}</strong><small>@{creator.tiktokId}</small></span><span className="category-tag">{creator.category}</span><span className="financial-value"><strong>{formatCompactCurrency(creator.gmvMonth)}</strong><small>GMV</small></span><span className="financial-value expense"><strong>{formatCompactCurrency(bookingExpense)}</strong><small>Booking</small></span><span className="efficiency-pill">{efficiency.toFixed(1)}x</span></button>
        })}
      </div>
    </article>
  )
}
