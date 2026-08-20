import { useEffect, useRef, useState } from 'react'
import { clientReviewDecisionLabel } from '../../config/campaigns'
import { campaignReviewToken } from '../../utils/campaignStorage'
import { formatCompactCurrency } from '../../utils/formatters'
import Icon from '../common/Icon'

export default function CampaignDeliverablesPreview({ campaign, onEnsureLink, onNotify }) {
  const [reviewToken, setReviewToken] = useState(() => campaignReviewToken(campaign))
  const requestedCampaignId = useRef(null)
  useEffect(() => {
    if (campaign.reviewToken) {
      setReviewToken(campaign.reviewToken)
      return
    }
    if (requestedCampaignId.current === campaign.id) return
    requestedCampaignId.current = campaign.id
    let active = true
    void onEnsureLink().then((token) => { if (active && token) setReviewToken(token) })
    return () => { active = false }
  }, [campaign.id, campaign.reviewToken, onEnsureLink])
  const reviewUrl = `${window.location.origin}/client-review/${reviewToken}`
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl)
      onNotify('Đã sao chép link Client Review')
    } catch {
      window.prompt('Sao chép link Client Review:', reviewUrl)
    }
  }
  return (
    <div className="campaign-detail-tab campaign-deliverables-preview">
      <section className="campaign-review-link-card">
        <span><Icon name="message" size={21} /></span>
        <div><small>Link Client Review tự động</small><strong>{reviewUrl}</strong><p>Client không cần tài khoản. Phản hồi được gom thành một lần cập nhật khi Client bấm gửi.</p></div>
        <button type="button" className="secondary-button" onClick={copyLink}><Icon name="replace" size={15} />Sao chép</button>
        <button type="button" className="primary-button" onClick={() => window.open(reviewUrl, '_blank', 'noopener,noreferrer')}><Icon name="eye" size={15} />Mở preview</button>
      </section>
      <section className="campaign-detail-card client-preview-card">
        <header><div><span className="eyebrow">Client Selection</span><h2>{campaign.name}</h2><p>{campaign.client} · Danh sách Creator và yêu cầu Deliverable</p></div><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /></header>
        <div className="client-preview-table-wrap"><table className="client-preview-table"><thead><tr><th>Creator</th><th>Deliverable</th><th>Deadline</th><th>Giá cuối cùng</th><th>Client Review</th></tr></thead><tbody>{(campaign.creators || []).map((creator) => {
          const deliverables = creator.deliverables?.length ? creator.deliverables : campaign.deliverables || []
          return <tr key={creator.creatorId}><td><strong>{creator.name}</strong><small>@{String(creator.tiktokId).replace(/^@/, '')}</small></td><td><div className="client-deliverable-list">{deliverables.map((item) => <span key={item.id}><strong>{item.type}</strong><em>{item.description || 'Chưa có mô tả'}</em></span>)}{!deliverables.length && <small>Chưa có yêu cầu</small>}</div></td><td>{deliverables.map((item) => <span className="client-deliverable-deadline" key={item.id}>{item.deadline || '—'}</span>)}</td><td><strong>{creator.actualPrice === '' || creator.actualPrice == null ? 'Chưa cập nhật' : formatCompactCurrency(creator.actualPrice)}</strong></td><td><span className={`client-decision client-decision-${String(creator.clientDecision || 'PENDING').toLowerCase()}`}>{clientReviewDecisionLabel(creator.clientDecision || 'PENDING')}</span></td></tr>
        })}</tbody></table>{!campaign.creators?.length && <p className="campaign-inline-empty">Chưa có Creator để preview.</p>}</div>
      </section>
    </div>
  )
}
