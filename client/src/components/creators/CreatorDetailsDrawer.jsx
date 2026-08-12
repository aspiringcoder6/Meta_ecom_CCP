import { formatAudience, formatCurrency } from '../../utils/formatters'
import { calculateBookingPricing } from '../../utils/pricing'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'
import StatusBadge from '../common/StatusBadge'
import { formatCategoryPaths } from '../../utils/creatorCategoryPaths'
import { formatCreatorList } from '../../utils/creatorLists'

export default function CreatorDetailsDrawer({ creator, canManage = false, onClose, onArchive, onEdit }) {
  if (!creator) return null
  const pricing = calculateBookingPricing(creator.cost, creator.extraCost)
  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" aria-label="Đóng chi tiết Creator" onClick={onClose} />
      <aside className="creator-drawer">
        <div className="drawer-header"><div><span className="eyebrow">Profile Creator</span><h2>Chi tiết hồ sơ</h2></div><button className="icon-button" onClick={onClose}><Icon name="close" /></button></div>
        <div className="profile-hero"><Avatar creator={creator} size="large" /><div><h3>{creator.name}</h3><p>{creator.handle}</p><StatusBadge status={creator.status} /></div></div>
        <div className="profile-stats"><div><strong>{formatAudience(creator.followers)}</strong><span>Người theo dõi</span></div><div><strong>{creator.engagement}%</strong><span>Engagement</span></div><div><strong>{creator.campaigns}</strong><span>Campaign</span></div></div>
        <section className="profile-section">
          <div className="section-title"><h4>Thông tin Creator</h4>{canManage && <button type="button" onClick={() => onEdit(creator.id)}><Icon name="edit" size={15} /> Chỉnh sửa</button>}</div>
          <dl className="profile-details"><div><dt>Segment</dt><dd>{creator.segment}</dd></div><div><dt>Category</dt><dd>{formatCategoryPaths(creator.category, ' · ')}</dd></div><div><dt>Type</dt><dd>{formatCreatorList(creator.type, ' · ')}</dd></div><div><dt>Tình trạng hợp tác</dt><dd>{creator.historicalCampaign}</dd></div><div><dt>Cost</dt><dd>{formatCurrency(creator.cost)}</dd></div><div><dt>Extra/FOC</dt><dd>{formatCurrency(creator.extraCost)}</dd></div><div><dt>Tổng Cast</dt><dd>{formatCurrency(pricing.totalCast)}</dd></div><div><dt>Booking Expense</dt><dd>{formatCurrency(pricing.bookingExpense)}</dd></div><div className="profile-detail-wide"><dt>Concept</dt><dd>{creator.concept || 'Chưa cập nhật'}</dd></div><div className="profile-detail-wide"><dt>Product Focus</dt><dd>{creator.productFocus || 'Chưa cập nhật'}</dd></div></dl>
        </section>
        <section className="profile-section"><div className="section-title"><h4>Liên hệ</h4></div><div className="contact-list"><a href={`mailto:${creator.email}`}><Icon name="mail" size={17} />{creator.email}</a><a href={`tel:${creator.phone}`}><Icon name="phone" size={17} />{creator.phone}</a></div></section>
        <section className="profile-section">
          <div className="section-title"><h4>Campaign gần đây</h4><button>Xem tất cả</button></div>
          <div className="campaign-mini"><span>SG</span><div><strong>Summer Glow 2026</strong><small>Demo đã duyệt · 28/07/2026</small></div><StatusBadge status="Active" /></div>
          <div className="campaign-mini"><span>LF</span><div><strong>Live Fresh</strong><small>Hoàn thành · 14/06/2026</small></div><StatusBadge status="Available" /></div>
        </section>
        {canManage && <div className="drawer-actions"><button className="secondary-button" type="button" onClick={() => onEdit(creator.id)}><Icon name="edit" />Chỉnh sửa hồ sơ</button><button className="danger-text-button" type="button" onClick={() => onArchive(creator.id)}><Icon name="archive" />{creator.status === 'Archived' ? 'Khôi phục' : 'Lưu trữ'}</button></div>}
      </aside>
    </div>
  )
}
