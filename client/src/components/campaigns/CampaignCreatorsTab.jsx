import { Fragment, useEffect, useMemo, useState } from 'react'
import { CAMPAIGN_CREATOR_STATUSES, clientReviewDecisionLabel } from '../../config/campaigns'
import { calculateBookingPricing } from '../../utils/pricing'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import Icon from '../common/Icon'
import CategoryPathRibbons from '../creators/CategoryPathRibbons'
import CampaignCreatorSelector from './CampaignCreatorSelector'
import CampaignDeliverableFields from './CampaignDeliverableFields'

function decisionFromAssignment(assignment) {
  if (assignment.clientDecision && assignment.clientDecision !== 'PENDING') return assignment.clientDecision
  if (assignment.status === 'CLIENT_APPROVED') return 'APPROVED'
  if (assignment.status === 'CLIENT_REJECTED') return 'REJECTED'
  if (assignment.status === 'CONSIDER') return 'CONSIDER'
  return 'PENDING'
}

export default function CampaignCreatorsTab({ campaign, creators, canEdit, onAddCreators, onRemoveCreator, onUpdateCreator, onMarkChangesRead }) {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [expandedCreatorId, setExpandedCreatorId] = useState(null)
  const [highlightedIds, setHighlightedIds] = useState([])
  useEffect(() => {
    const unreadIds = (campaign.creators || []).filter((creator) => creator.clientChangeUnread).map((creator) => String(creator.creatorId))
    if (!unreadIds.length) return
    setHighlightedIds((current) => [...new Set([...current, ...unreadIds])])
    onMarkChangesRead()
  }, [campaign.creators, onMarkChangesRead])
  const sourceById = useMemo(() => new Map(creators.map((creator) => [String(creator.id), creator])), [creators])
  const orderedCreators = useMemo(() => [...(campaign.creators || [])].sort((left, right) => Number(highlightedIds.includes(String(right.creatorId))) - Number(highlightedIds.includes(String(left.creatorId)))), [campaign.creators, highlightedIds])
  const actualTotal = orderedCreators.reduce((total, creator) => total + (Number(creator.actualPrice) || 0), 0)
  const confirmSelection = (ids) => {
    onAddCreators(ids)
    setSelectorOpen(false)
  }

  return (
    <div className="campaign-detail-tab campaign-creators-tab">
      <section className="campaign-detail-card">
        <header className="campaign-tab-heading"><div><h2>Creators trong Campaign</h2><p>Giá gợi ý lấy từ Booking Expense; giá thực tế do team tự quyết định.</p></div><div><span className="campaign-actual-total">Tổng giá thực tế <strong>{formatCompactCurrency(actualTotal)}</strong></span>{canEdit && <button className="primary-button" onClick={() => setSelectorOpen(true)}><Icon name="plus" size={15} />Thêm Creator</button>}</div></header>
        <div className="campaign-assignment-table-wrap"><table className="campaign-assignment-table"><thead><tr><th>Creator</th><th>Thông tin</th><th>Giá gợi ý</th><th>Giá thực tế</th><th>Client Review</th><th>Ghi chú</th><th>Trạng thái</th><th>Creator đồng ý</th><th /></tr></thead><tbody>{orderedCreators.map((assignment) => {
          const source = sourceById.get(String(assignment.creatorId))
          const pricing = calculateBookingPricing(source?.cost, source?.extraCost)
          const suggestedPrice = Number(assignment.suggestedPrice) || pricing.bookingExpense
          const decision = decisionFromAssignment(assignment)
          const expanded = String(expandedCreatorId) === String(assignment.creatorId)
          const highlighted = highlightedIds.includes(String(assignment.creatorId))
          const deliverables = assignment.deliverables?.length ? assignment.deliverables : campaign.deliverables || []
          return <Fragment key={assignment.creatorId}><tr className={highlighted ? 'is-client-updated' : ''}><td><div className="campaign-assignment-creator"><span>{assignment.name?.slice(0, 1).toUpperCase()}</span><div><strong>{assignment.name}</strong><small>@{String(assignment.tiktokId).replace(/^@/, '')}</small>{highlighted && <em>Mới cập nhật</em>}</div></div></td><td><div className="campaign-assignment-info"><span className="segment-tag">{source?.segment || assignment.segment || '—'}</span><CategoryPathRibbons values={source?.category || assignment.category || []} level={1} /><small>{formatNumber(source?.followers || assignment.followers)} followers</small></div></td><td><strong>{formatCompactCurrency(suggestedPrice)}</strong><small>Booking Expense</small></td><td>{canEdit ? <label className="campaign-actual-price"><input type="number" min="0" value={assignment.actualPrice ?? ''} onChange={(event) => onUpdateCreator(assignment.creatorId, { actualPrice: event.target.value })} placeholder="Nhập giá" /><span>₫</span></label> : <strong>{assignment.actualPrice === '' || assignment.actualPrice == null ? 'Chưa nhập' : formatCompactCurrency(assignment.actualPrice)}</strong>}</td><td><span className={`client-decision client-decision-${decision.toLowerCase()}`}>{clientReviewDecisionLabel(decision)}</span></td><td className="campaign-client-note">{assignment.clientNote ? <p title={assignment.clientNote}>{assignment.clientNote}</p> : <span>Chưa có ghi chú</span>}</td><td>{canEdit ? <select className="campaign-assignment-status" value={assignment.status || 'PROPOSED'} onChange={(event) => onUpdateCreator(assignment.creatorId, { status: event.target.value })}>{CAMPAIGN_CREATOR_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select> : assignment.status}</td><td><label className={`creator-confirm-toggle ${decision !== 'APPROVED' ? 'is-disabled' : ''}`} title={decision !== 'APPROVED' ? 'Chỉ xác nhận sau khi Client đồng ý' : 'Xác nhận Creator đã đồng ý tham gia'}><input type="checkbox" disabled={!canEdit || decision !== 'APPROVED'} checked={Boolean(assignment.creatorConfirmed)} onChange={(event) => onUpdateCreator(assignment.creatorId, { creatorConfirmed: event.target.checked, status: event.target.checked ? 'CONFIRMED' : 'CLIENT_APPROVED' })} /><span><Icon name="check" size={13} /></span>{assignment.creatorConfirmed ? 'Đã đồng ý' : 'Chưa xác nhận'}</label></td><td><div className="campaign-assignment-actions"><button type="button" className={expanded ? 'is-active' : ''} onClick={() => setExpandedCreatorId(expanded ? null : assignment.creatorId)} title="Yêu cầu Deliverable"><Icon name="checkSquare" size={15} /></button>{canEdit && <button type="button" className="is-danger" onClick={() => { if (window.confirm(`Xoá ${assignment.name} khỏi Campaign?`)) onRemoveCreator(assignment.creatorId) }} title="Xoá khỏi Campaign"><Icon name="trash" size={15} /></button>}</div></td></tr>{expanded && <tr className="campaign-deliverable-editor-row"><td colSpan="9"><div><header><strong>Yêu cầu Deliverable · {assignment.name}</strong><small>Mặc định từ Campaign và có thể chỉnh riêng cho Creator này.</small></header>{canEdit ? <CampaignDeliverableFields value={deliverables} onChange={(value) => onUpdateCreator(assignment.creatorId, { deliverables: value })} /> : <div className="creator-deliverable-readonly">{deliverables.map((item) => <article key={item.id}><strong>{item.type}</strong><p>{item.description || 'Chưa có mô tả'}</p><small>{item.deadline || 'Chưa có deadline'}</small></article>)}</div>}</div></td></tr>}</Fragment>
        })}</tbody></table>{!orderedCreators.length && <div className="campaign-inline-empty"><Icon name="users" size={24} /><strong>Chưa có Creator</strong><span>Dùng bộ chọn để thêm Creator từ database.</span></div>}</div>
      </section>
      {selectorOpen && <CampaignCreatorSelector creators={creators} assignedIds={(campaign.creators || []).map((creator) => creator.creatorId)} onClose={() => setSelectorOpen(false)} onConfirm={confirmSelection} />}
    </div>
  )
}
