import { formatCompactCurrency } from '../../utils/formatters'
import { campaignProgress, formatCampaignDate } from '../../utils/campaigns'
import Icon from '../common/Icon'
import { effectiveClientDecision } from '../../config/campaigns'

export default function CampaignOverviewTab({ campaign }) {
  const finalCreators = (campaign.creators || []).filter((creator) => effectiveClientDecision(creator) === 'APPROVED' && creator.creatorConfirmed)
  const actualBudget = (campaign.creators || []).reduce((total, creator) => total + (Number(creator.actualPrice) || 0), 0)
  const progress = campaignProgress(campaign)
  const metrics = [
    { icon: 'users', label: 'Creator tham gia', value: campaign.creators?.length || 0, detail: `${finalCreators.length} Creator final` },
    { icon: 'trending', label: 'Ngân sách', value: formatCompactCurrency(campaign.totalBudget), detail: `${formatCompactCurrency(actualBudget)} giá thực tế` },
    { icon: 'clock', label: 'Tiến độ timeline', value: `${progress}%`, detail: `${campaign.milestones?.length || 0} milestone` },
    { icon: 'checkSquare', label: 'Deliverable mặc định', value: campaign.deliverables?.length || 0, detail: 'Có thể tuỳ chỉnh theo Creator' },
  ]
  return (
    <div className="campaign-detail-tab campaign-overview-tab">
      <section className="campaign-detail-metrics">{metrics.map((metric) => <article key={metric.label}><span><Icon name={metric.icon} size={19} /></span><div><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.detail}</em></div></article>)}</section>
      <div className="campaign-overview-grid">
        <section className="campaign-detail-card campaign-overview-description"><header><div><h2>Thông tin Campaign</h2><p>Nội dung và phạm vi triển khai tổng quát.</p></div></header><p>{campaign.description || 'Chưa có mô tả cho Campaign này.'}</p><dl><div><dt>Client / Brand</dt><dd>{campaign.client}</dd></div><div><dt>Owner</dt><dd>{campaign.owner}</dd></div><div><dt>Ngày bắt đầu</dt><dd>{formatCampaignDate(campaign.startDate)}</dd></div><div><dt>Ngày kết thúc</dt><dd>{formatCampaignDate(campaign.endDate)}</dd></div></dl></section>
        <section className="campaign-detail-card campaign-overview-progress"><header><div><h2>Tiến độ</h2><p>Tổng quan theo thời gian Campaign.</p></div><strong>{progress}%</strong></header><div className="campaign-progress-ring" style={{ '--progress': `${progress * 3.6}deg` }}><span>{progress}%</span></div><div className="campaign-progress-track"><i style={{ width: `${progress}%` }} /></div><small>{formatCampaignDate(campaign.startDate)} — {formatCampaignDate(campaign.endDate)}</small></section>
      </div>
    </div>
  )
}
