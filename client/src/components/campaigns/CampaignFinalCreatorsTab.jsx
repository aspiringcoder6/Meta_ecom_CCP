import { formatCompactCurrency } from '../../utils/formatters'
import Icon from '../common/Icon'
import { effectiveClientDecision } from '../../config/campaigns'

export default function CampaignFinalCreatorsTab({ campaign }) {
  const finalCreators = (campaign.creators || []).filter((creator) => effectiveClientDecision(creator) === 'APPROVED' && creator.creatorConfirmed)
  return (
    <div className="campaign-detail-tab campaign-final-creators-tab">
      <section className="campaign-detail-card">
        <header className="campaign-tab-heading"><div><h2>Final Creators</h2><p>Chỉ gồm Creator đã được Client đồng ý và Creator xác nhận tham gia.</p></div><span className="final-creators-count"><Icon name="userCheck" size={16} />{finalCreators.length} Creator</span></header>
        <div className="final-creator-grid">{finalCreators.map((creator, index) => {
          const deliverables = creator.deliverables?.length ? creator.deliverables : campaign.deliverables || []
          return <article key={creator.creatorId}><header><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{creator.name}</strong><small>@{String(creator.tiktokId).replace(/^@/, '')}</small></div><em><Icon name="check" size={12} />Đã final</em></header><dl><div><dt>Giá thực tế</dt><dd>{creator.actualPrice === '' || creator.actualPrice == null ? 'Chưa cập nhật' : formatCompactCurrency(creator.actualPrice)}</dd></div><div><dt>Deliverable</dt><dd>{deliverables.length} yêu cầu</dd></div></dl><div className="final-deliverable-list">{deliverables.map((item) => <span key={item.id}><strong>{item.type}</strong><small>{item.description || 'Chưa có mô tả'}</small></span>)}</div></article>
        })}</div>
        {!finalCreators.length && <div className="campaign-tab-empty inline"><span><Icon name="userCheck" size={24} /></span><h2>Chưa có Final Creator</h2><p>Creator sẽ xuất hiện tại đây sau khi Client đồng ý và team xác nhận Creator tham gia.</p></div>}
      </section>
    </div>
  )
}
