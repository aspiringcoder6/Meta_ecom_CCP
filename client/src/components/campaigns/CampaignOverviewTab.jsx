import { effectiveClientDecision } from '../../config/campaigns'
import { acceptedCampaignCreators, campaignCreatorDeliverables, finalCampaignCreators } from '../../utils/campaignDeliverables'
import { campaignProgress, formatCampaignDate } from '../../utils/campaigns'
import { formatCompactCurrency } from '../../utils/formatters'
import Icon from '../common/Icon'

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

export default function CampaignOverviewTab({ campaign, onOpenTab }) {
  const creators = campaign.creators || []
  const brandDecisions = creators.reduce((counts, creator) => {
    const decision = effectiveClientDecision(creator)
    counts[decision] = (counts[decision] || 0) + 1
    return counts
  }, { PENDING: 0, APPROVED: 0, CONSIDER: 0, REJECTED: 0 })
  const acceptedCreators = acceptedCampaignCreators(campaign)
  const finalCreators = finalCampaignCreators(campaign)
  const deliverables = acceptedCreators.flatMap((creator) => deliverablesForOverview(campaign, creator))
  const doneDeliverables = deliverables.filter(isDeliverableDone).length
  const cancelledDeliverables = deliverables.filter((item) => item.progress === 'Cancel' || item.status === 'CANCELLED').length
  const activeDeliverables = Math.max(0, deliverables.length - doneDeliverables - cancelledDeliverables)
  const deliverableProgress = deliverables.length ? Math.round((doneDeliverables / deliverables.length) * 100) : 0
  const internalExpense = creators.reduce((total, creator) => total + (Number(creator.expense) || Number(creator.suggestedPrice) || 0), 0)
  const finalExpense = finalCreators.reduce((total, creator) => total + (Number(creator.expense) || Number(creator.suggestedPrice) || 0), 0)
  const finalExpenseWithAgencyFee = Math.round(finalExpense * 1.06)
  const progress = campaignProgress(campaign)
  const completedMilestones = (campaign.milestones || []).filter((milestone) => milestone.status === 'COMPLETED').length
  const totalBudget = Number(campaign.totalBudget || 0)
  const remainingBudget = totalBudget > 0 ? totalBudget - internalExpense : null
  const metrics = [
    { icon: 'fileSpreadsheet', label: 'Internal Listings', value: creators.length, detail: `${brandDecisions.PENDING} đang chờ Brand Pick` },
    { icon: 'users', label: 'Brand Approved', value: brandDecisions.APPROVED, detail: `${brandDecisions.CONSIDER} cân nhắc · ${brandDecisions.REJECTED} từ chối` },
    { icon: 'checkSquare', label: 'Deliverables Done', value: `${doneDeliverables}/${deliverables.length}`, detail: `${acceptedCreators.length} KOC đã accepted` },
    { icon: 'userCheck', label: 'Final Creators', value: finalCreators.length, detail: `${formatCompactCurrency(finalExpense)} Expense` },
  ]

  return (
    <div className="campaign-detail-tab campaign-overview-tab">
      <section className="campaign-detail-metrics" data-tour="campaign-overview-metrics">{metrics.map((metric) => <article key={metric.label}><span><Icon name={metric.icon} size={19} /></span><div><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.detail}</em></div></article>)}</section>

      <div className="campaign-overview-operations">
        <section className="campaign-detail-card campaign-overview-workflow" data-tour="campaign-overview-workflow">
          <header><div><span className="eyebrow">Campaign Workflow</span><h2>Tiến trình KOC</h2><p>Theo dõi thông tin của từng giai đoạn ở đây</p></div></header>
          <div className="campaign-workflow-stages">
            <WorkflowStage icon="fileSpreadsheet" label="Internal Listings" value={creators.length} detail="Creator nội bộ" onClick={() => onOpenTab('internal-listings')} />
            <WorkflowStage icon="message" label="Brand Pick" value={brandDecisions.APPROVED} detail={`${brandDecisions.CONSIDER} đang cân nhắc`} tone="brand" onClick={() => onOpenTab('external-listings')} />
            <WorkflowStage icon="userCheck" label="KOC Confirm" value={acceptedCreators.length} detail="Brand và KOC cùng duyệt" tone="accepted" onClick={() => onOpenTab('deliverables')} />
            <WorkflowStage icon="check" label="Final Creators" value={finalCreators.length} detail="Tất cả deliverable Done" tone="final" onClick={() => onOpenTab('final-creators')} />
          </div>
          <div className="campaign-brand-breakdown" aria-label="Phân bổ Brand Pick">
            <span><i className="is-approved" />Approved <strong>{brandDecisions.APPROVED}</strong></span>
            <span><i className="is-consider" />Cân nhắc <strong>{brandDecisions.CONSIDER}</strong></span>
            <span><i className="is-pending" />Chờ phản hồi <strong>{brandDecisions.PENDING}</strong></span>
            <span><i className="is-rejected" />Từ chối <strong>{brandDecisions.REJECTED}</strong></span>
          </div>
        </section>

        <section className="campaign-detail-card campaign-overview-deliverables" data-tour="campaign-overview-deliverables">
          <header><div><span className="eyebrow">Execution</span><h2>Tiến độ Deliverables</h2><p>Tính trên KOC đã được Brand duyệt và KOC xác nhận.</p></div><strong>{deliverableProgress}%</strong></header>
          <div className="overview-deliverable-progress"><i style={{ width: `${deliverableProgress}%` }} /></div>
          <div className="overview-deliverable-counts">
            <div><span className="is-done"><Icon name="check" size={14} /></span><strong>{doneDeliverables}</strong><small>Done</small></div>
            <div><span className="is-active"><Icon name="clock" size={14} /></span><strong>{activeDeliverables}</strong><small>Đang xử lý</small></div>
            <div><span className="is-cancel"><Icon name="close" size={14} /></span><strong>{cancelledDeliverables}</strong><small>Cancel</small></div>
          </div>
          <button type="button" className="overview-open-tab" onClick={() => onOpenTab('deliverables')}>Mở bảng Deliverables <Icon name="chevronRight" size={14} /></button>
        </section>
      </div>

      <div className="campaign-overview-grid">
        <section className="campaign-detail-card campaign-overview-description" data-tour="campaign-overview-finance">
          <header><div><h2>Thông tin Campaign</h2><p>Thông tin chung và ngân sách dự kiến từ Internal Listings.</p></div></header>
          <p>{campaign.description || 'Chưa có mô tả cho Campaign này.'}</p>
          <dl>
            <div><dt>Client / Brand</dt><dd>{campaign.client}</dd></div><div><dt>Owner</dt><dd>{campaign.owner}</dd></div>
            <div><dt>Ngày bắt đầu</dt><dd>{formatCampaignDate(campaign.startDate)}</dd></div><div><dt>Ngày kết thúc</dt><dd>{formatCampaignDate(campaign.endDate)}</dd></div>
            <div><dt>Tổng ngân sách</dt><dd>{totalBudget > 0 ? formatCompactCurrency(totalBudget) : 'Chưa thiết lập'}</dd></div><div><dt>Expense dự kiến</dt><dd>{formatCompactCurrency(internalExpense)}</dd></div>
            <div className={remainingBudget != null && remainingBudget < 0 ? 'is-over-budget' : ''}><dt>Ngân sách còn lại</dt><dd>{remainingBudget == null ? 'Chưa thiết lập' : formatCompactCurrency(remainingBudget)}</dd></div><div><dt>Final + agency fee 6%</dt><dd>{formatCompactCurrency(finalExpenseWithAgencyFee)}</dd></div>
          </dl>
        </section>
        <section className="campaign-detail-card campaign-overview-progress"><header><div><h2>Timeline Campaign</h2><p>{completedMilestones}/{campaign.milestones?.length || 0} milestone đã hoàn thành.</p></div><strong>{progress}%</strong></header><div className="campaign-progress-ring" style={{ '--progress': `${progress * 3.6}deg` }}><span>{progress}%</span></div><div className="campaign-progress-track"><i style={{ width: `${progress}%` }} /></div><small>{formatCampaignDate(campaign.startDate)} — {formatCampaignDate(campaign.endDate)}</small><button type="button" className="overview-open-tab" onClick={() => onOpenTab('timeline')}>Xem Timeline <Icon name="chevronRight" size={14} /></button></section>
      </div>
    </div>
  )
}
