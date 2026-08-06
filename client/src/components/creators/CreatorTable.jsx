import { formatCurrency, formatNumber } from '../../utils/formatters'
import { calculateBookingPricing } from '../../utils/pricing'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'

function EmptyResults() {
  return <div className="no-results"><span><Icon name="search" size={28} /></span><h3>Không tìm thấy Creator</h3><p>Hãy thử thay đổi từ khóa hoặc bộ lọc.</p></div>
}

function HistoricalBadge({ value }) {
  const collaborated = value === 'Đã hợp tác'
  return <span className={`history-badge ${collaborated ? 'is-collaborated' : 'is-new'}`}><i />{value}</span>
}

export default function CreatorTable({ creators, onSelect, onArchive }) {
  if (!creators.length) return <EmptyResults />

  return (
    <div className="creator-table-wrap">
      <table className="creator-table">
        <thead>
          <tr>
            <th>Link TikTok</th><th>ID TikTok</th><th>Segment</th><th>Category</th><th>Type</th><th>Cost</th>
            <th>Extra/FOC<br /><small>(SHDA + hashtag)</small></th>
            <th>Tổng Cast<br /><small>(Đã bao gồm thuế)</small></th>
            <th>Booking Expense</th><th>Followers</th><th>GMV / Month</th><th>Scope</th><th>Contact</th><th>Historical campaign</th><th>MCN note</th>
            <th><span className="sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {creators.map((creator) => {
            const pricing = calculateBookingPricing(creator.cost, creator.extraCost)
            return <tr key={creator.id} onClick={() => onSelect(creator.id)}>
              <td className="sticky-link-cell"><a className="tiktok-link" href={creator.tiktokLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{creator.tiktokLink.replace('https://www.', '')}</a></td>
              <td className="sticky-id-cell"><div className="creator-cell"><Avatar creator={creator} /><div><strong>{creator.tiktokId}</strong><small>{creator.name}</small></div></div></td>
              <td><span className="segment-tag">{creator.segment}</span></td>
              <td><span className="category-tag">{creator.category}</span></td>
              <td><span className="type-tag">{creator.type}</span></td>
              <td className="number-cell">{formatCurrency(creator.cost)}</td>
              <td className="number-cell">{formatCurrency(creator.extraCost)}</td>
              <td className="number-cell calculated-cell">{formatCurrency(pricing.totalCast)}</td>
              <td className="number-cell calculated-cell">{formatCurrency(pricing.bookingExpense)}</td>
              <td className="number-cell">{formatNumber(creator.followers)}</td>
              <td className="number-cell">{formatCurrency(creator.gmvMonth)}</td>
              <td className="long-text-cell">{creator.scope || '—'}</td>
              <td className="long-text-cell">{creator.contact || '—'}</td>
              <td><HistoricalBadge value={creator.historicalCampaign} /></td>
              <td className="long-text-cell mcn-note-cell">{creator.mcnNote || <span className="empty-value">Để trống</span>}</td>
              <td className="sticky-action-cell"><div className="row-actions">
                <button className="subtle-icon" onClick={(event) => { event.stopPropagation(); onSelect(creator.id) }} aria-label={`Xem ${creator.name}`}><Icon name="chevronRight" size={18} /></button>
                <button className="subtle-icon" onClick={(event) => { event.stopPropagation(); onArchive(creator.id) }} aria-label={`${creator.status === 'Archived' ? 'Khôi phục' : 'Lưu trữ'} ${creator.name}`}><Icon name="more" size={18} /></button>
              </div></td>
            </tr>
          })}
        </tbody>
      </table>

      <div className="creator-cards">
        {creators.map((creator) => (
          <button className="creator-mobile-card" key={creator.id} onClick={() => onSelect(creator.id)}>
            <Avatar creator={creator} /><span className="creator-primary"><strong>{creator.tiktokId}</strong><small>{creator.name} · {creator.category}</small></span><span className="segment-tag">{creator.segment}</span>
            <span className="mobile-card-stats"><span>{formatNumber(creator.followers)} followers</span><span>{formatCurrency(creator.cost)}</span></span><Icon name="chevronRight" />
          </button>
        ))}
      </div>
    </div>
  )
}
