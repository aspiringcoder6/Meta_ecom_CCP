import { effectiveClientDecision } from '../../config/campaigns'
import { acceptedCampaignCreators, campaignCreatorDeliverables, finalCampaignCreators } from '../../utils/campaignDeliverables'
import { formatCompactCurrency } from '../../utils/formatters'
import Icon from '../common/Icon'
import CampaignSegmentGoalProgress from './CampaignSegmentGoalProgress'
import CampaignTimelineTab from './CampaignTimelineTab'

function deliverablesForOverview(campaign, creator) {
  const deliverables = campaignCreatorDeliverables(campaign, creator)
  return deliverables.length ? deliverables : [{ id: `overview-${creator.creatorId}`, progress: 'Đang liên hệ' }]
}

function isDeliverableDone(deliverable) {
  return deliverable.progress === 'Done' || deliverable.status === 'COMPLETED'
}

function WorkflowStage({ icon, label, value, detail, tone, onClick }) {
  return (
    <button type="button" className={`campaign-workflow-stage ${tone ? `is-${tone}` : ''}`} onClick={onClick}>
      <span><Icon name={icon} size={17} /></span>
      <div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div>
      <Icon name="chevronRight" size={15} />
    </button>
  )
}

export default function CampaignOverviewTab({ campaign, canEdit, onOpenTab, onSaveTimeline }) {
  const creators = campaign.creators || []
  const brandDecisions = creators.reduce((counts, creator) => {
    const decision = effectiveClientDecision(creator)
    counts[decision] = (counts[decision] || 0) + 1
    return counts
  }, { PENDING: 0, APPROVED: 0, CONSIDER: 0, REJECTED: 0 })
  const acceptedCreators = acceptedCampaignCreators(campaign)
  const financialCreators = finalCampaignCreators(campaign)
  const deliverables = acceptedCreators.flatMap((creator) => deliverablesForOverview(campaign, creator))
  const doneDeliverables = deliverables.filter(isDeliverableDone).length
  const cancelledDeliverables = deliverables.filter((item) => item.progress === 'Cancel' || item.status === 'CANCELLED').length
  const activeDeliverables = Math.max(0, deliverables.length - doneDeliverables - cancelledDeliverables)
  const deliverableProgress = deliverables.length ? Math.round((doneDeliverables / deliverables.length) * 100) : 0
  const totalPerformance = deliverables.reduce((total, item) => total + (Number(item.performance) || 0), 0)
  const financialExpense = financialCreators.reduce((total, creator) => total + (Number(creator.expense) || Number(creator.suggestedPrice) || 0), 0)
  const metrics = [
    { icon: 'fileSpreadsheet', label: 'Internal Listings', value: creators.length, detail: `${brandDecisions.PENDING} đang chờ Brand Pick` },
    { icon: 'users', label: 'Brand Approved', value: brandDecisions.APPROVED, detail: `${brandDecisions.CONSIDER} cân nhắc · ${brandDecisions.REJECTED} từ chối` },
    { icon: 'checkSquare', label: 'Deliverables Done', value: `${doneDeliverables}/${deliverables.length}`, detail: `${acceptedCreators.length} KOC đã accepted` },
    { icon: 'trending', label: 'Financial Listings', value: financialCreators.length, detail: `${formatCompactCurrency(financialExpense)} Expense` },
  ]

  return (
    <div className="campaign-detail-tab campaign-overview-tab">
      <section className="campaign-detail-card campaign-overview-deliverables campaign-overview-deliverables-hero" data-tour="campaign-overview-deliverables">
        <header><div><span className="eyebrow">EXECUTION PRIORITY</span><h2>Tiến độ Deliverables</h2><p>Chỉ số quan trọng nhất của Campaign, tính trên KOC đã được Brand duyệt và KOC xác nhận.</p></div><strong>{deliverableProgress}%</strong></header>
        <div className="overview-deliverable-progress"><i style={{ width: `${deliverableProgress}%` }} /></div>
        <div className="overview-deliverable-hero-body">
          <div className="overview-deliverable-counts">
            <div><span className="is-done"><Icon name="check" size={14} /></span><strong>{doneDeliverables}</strong><small>Done</small></div>
            <div><span className="is-active"><Icon name="clock" size={14} /></span><strong>{activeDeliverables}</strong><small>Đang xử lý</small></div>
            <div><span className="is-cancel"><Icon name="close" size={14} /></span><strong>{cancelledDeliverables}</strong><small>Cancel</small></div>
            <div><span className="is-performance"><Icon name="trending" size={14} /></span><strong>{formatCompactCurrency(totalPerformance)}</strong><small>Performance (GMV)</small></div>
          </div>
          <button type="button" className="overview-open-tab" onClick={() => onOpenTab('deliverables')}>Mở bảng Deliverables <Icon name="chevronRight" size={14} /></button>
        </div>
      </section>

      <section className="campaign-detail-metrics" data-tour="campaign-overview-metrics">{metrics.map((metric) => <article key={metric.label}><span><Icon name={metric.icon} size={19} /></span><div><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.detail}</em></div></article>)}</section>

      <CampaignSegmentGoalProgress campaign={campaign} />

      <section className="campaign-detail-card campaign-overview-workflow" data-tour="campaign-overview-workflow">
        <header><div><span className="eyebrow">Campaign Workflow</span><h2>Tiến trình KOC</h2><p>Theo dõi thông tin của từng giai đoạn ở đây</p></div></header>
        <div className="campaign-workflow-stages">
          <WorkflowStage icon="fileSpreadsheet" label="Internal Listings" value={creators.length} detail="Creator nội bộ" onClick={() => onOpenTab('internal-listings')} />
          <WorkflowStage icon="message" label="Brand Pick" value={brandDecisions.APPROVED} detail={`${brandDecisions.CONSIDER} đang cân nhắc`} tone="brand" onClick={() => onOpenTab('external-listings')} />
          <WorkflowStage icon="userCheck" label="KOC Confirm" value={acceptedCreators.length} detail="Brand và KOC cùng duyệt" tone="accepted" onClick={() => onOpenTab('deliverables')} />
          <WorkflowStage icon="trending" label="Financial Listings" value={financialCreators.length} detail="Hoàn tất mọi deliverable" tone="final" onClick={() => onOpenTab('financial-listings')} />
        </div>
        <div className="campaign-brand-breakdown" aria-label="Phân bổ Brand Pick">
          <span><i className="is-approved" />Approved <strong>{brandDecisions.APPROVED}</strong></span>
          <span><i className="is-consider" />Cân nhắc <strong>{brandDecisions.CONSIDER}</strong></span>
          <span><i className="is-pending" />Chờ phản hồi <strong>{brandDecisions.PENDING}</strong></span>
          <span><i className="is-rejected" />Từ chối <strong>{brandDecisions.REJECTED}</strong></span>
        </div>
      </section>

      <CampaignTimelineTab campaign={campaign} canEdit={canEdit} onSave={onSaveTimeline} embedded />
    </div>
  )
}
