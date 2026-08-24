import { useEffect, useMemo, useState } from 'react'
import { effectiveClientDecision } from '../../config/campaigns'
import { calculateBookingPricing } from '../../utils/pricing'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import { toCreatorList } from '../../utils/creatorLists'
import Icon from '../common/Icon'

const PROGRESS_OPTIONS = [
  'Đang liên hệ', 'Đã yêu cầu mẫu', 'Đã duyệt yêu cầu mẫu', 'Đang giao hàng', 'Đã nhận hàng',
  'Lên kịch bản', 'Duyệt kịch bản', 'Lên demo', 'Brand feedback', 'Duyệt, chờ air', 'Done', 'Cancel',
]

function isAcceptedCreator(assignment) {
  const kocDecision = assignment.kocDecision || (assignment.creatorConfirmed ? 'APPROVED' : 'PENDING')
  return effectiveClientDecision(assignment) === 'APPROVED' && kocDecision === 'APPROVED'
}

function normalizedDeliverable(item, creatorId, index) {
  const progressAliases = { NOT_STARTED: 'Đang liên hệ', IN_PROGRESS: 'Lên kịch bản', PENDING_REVIEW: 'Brand feedback', COMPLETED: 'Done' }
  const details = { ...(item || {}) }
  delete details.quantity
  return {
    ...details,
    id: item?.id || `deliverable-${creatorId}-${index + 1}`,
    progress: item?.progress || progressAliases[item?.status] || 'Đang liên hệ',
    sdha: Boolean(item?.sdha),
    product: item?.product || '',
    demoLink: item?.demoLink || '',
    metaEcomNote: item?.metaEcomNote || '',
    brandFeedback: item?.brandFeedback || '',
    airTime: item?.airTime || item?.deadline || '',
    airLink: item?.airLink || '',
    codeAds: item?.codeAds || '',
    codeAdsExpiry: item?.codeAdsExpiry || '',
  }
}

function newDeliverable(creatorId) {
  return normalizedDeliverable({ id: `deliverable-${creatorId}-${Date.now()}` }, creatorId, 0)
}

export default function CampaignDeliverablesTab({ campaign, creators, canEdit, onUpdateCreator, onMarkChangesRead }) {
  const [highlightedIds, setHighlightedIds] = useState([])
  const sourceById = useMemo(() => new Map(creators.map((creator) => [String(creator.id), creator])), [creators])
  const acceptedCreators = useMemo(() => (campaign.creators || []).filter(isAcceptedCreator), [campaign.creators])
  const productOptions = useMemo(() => [...new Set(acceptedCreators.flatMap((assignment) => (assignment.deliverables || []).map((item) => item.product)).filter(Boolean))], [acceptedCreators])

  useEffect(() => {
    const unreadIds = acceptedCreators.filter((creator) => creator.clientChangeUnread).map((creator) => String(creator.creatorId))
    if (!unreadIds.length) return
    setHighlightedIds((current) => [...new Set([...current, ...unreadIds])])
    onMarkChangesRead()
  }, [acceptedCreators, onMarkChangesRead])

  const deliverablesFor = (assignment) => {
    const source = assignment.deliverables?.length ? assignment.deliverables : campaign.deliverables || []
    const values = source.length ? source : [{ id: `deliverable-${assignment.creatorId}-1` }]
    return values.map((item, index) => normalizedDeliverable(item, assignment.creatorId, index))
  }
  const replaceDeliverables = (assignment, next) => onUpdateCreator(assignment.creatorId, { deliverables: next })
  const updateDeliverable = (assignment, deliverableId, field, value) => replaceDeliverables(assignment, deliverablesFor(assignment).map((item) => item.id === deliverableId ? { ...item, [field]: value } : item))
  const addDeliverable = (assignment) => replaceDeliverables(assignment, [...deliverablesFor(assignment), newDeliverable(assignment.creatorId)])
  const removeDeliverable = (assignment, deliverableId) => {
    const current = deliverablesFor(assignment)
    replaceDeliverables(assignment, current.length === 1 ? [newDeliverable(assignment.creatorId)] : current.filter((item) => item.id !== deliverableId))
  }

  return (
    <div className="campaign-detail-tab campaign-deliverables-tab">
      <section className="campaign-detail-card deliverables-tracker-card" data-tour="campaign-deliverables-workspace">
        <header className="campaign-tab-heading"><div><span className="eyebrow">Execution Tracking</span><h2>Deliverables</h2><p>Mỗi dòng con là một deliverable. Chỉ KOC đã được Brand duyệt và KOC xác nhận mới xuất hiện.</p></div><div><span className="brand-selection-count">{acceptedCreators.length} KOC accepted</span></div></header>
        <div className="deliverables-tracker-table-wrap" data-tour="campaign-deliverables-table">
          <table className="deliverables-tracker-table">
            <thead><tr><th>Link TikTok</th><th>ID TikTok</th><th>Expense</th><th>Segment</th><th>Concept</th><th>Type</th><th>GMV / Month</th><th>Followers</th><th>Quantity</th><th>Tiến độ</th><th>SDHA</th><th>Product</th><th>KB, DEMO KOC</th><th>Meta Ecom Note</th><th>Brand Feedback</th><th>Air Time</th><th>Link Air</th><th>Code Ads</th><th>Expiry Date Code Ads</th></tr></thead>
            <tbody>{acceptedCreators.flatMap((assignment) => {
              const source = sourceById.get(String(assignment.creatorId)) || assignment
              const items = deliverablesFor(assignment)
              const cost = assignment.quotedCost !== '' && assignment.quotedCost != null ? assignment.quotedCost : source.cost
              const extraCost = assignment.quotedExtraCost !== '' && assignment.quotedExtraCost != null ? assignment.quotedExtraCost : source.extraCost
              const expense = calculateBookingPricing(cost, extraCost).bookingExpense
              const highlighted = highlightedIds.includes(String(assignment.creatorId))
              return items.map((item, index) => <tr className={`${highlighted ? 'is-deliverable-updated' : ''} ${index > 0 ? 'is-deliverable-child' : ''}`} key={`${assignment.creatorId}-${item.id}`}>
                {index === 0 && <><td className="deliverables-sticky-link" rowSpan={items.length}><a href={source.tiktokLink || '#'} target="_blank" rel="noreferrer" title={source.tiktokLink}>{source.tiktokLink || '—'}</a></td><td className="deliverables-sticky-id" rowSpan={items.length}><strong>@{String(source.tiktokId || '').replace(/^@/, '')}</strong><small>{source.name}</small>{canEdit && <button type="button" className="add-creator-deliverable" onClick={() => addDeliverable(assignment)}><Icon name="plus" size={12} />Deliverable</button>}</td><td rowSpan={items.length}><strong>{formatCompactCurrency(expense)}</strong></td><td rowSpan={items.length}><span className="segment-tag">{source.segment || '—'}</span></td><td rowSpan={items.length}><span className="deliverable-static-text">{source.concept || '—'}</span></td><td rowSpan={items.length}><div className="internal-type-list">{toCreatorList(source.type, ['—']).map((type) => <span key={type}>{type}</span>)}</div></td><td rowSpan={items.length}><strong>{formatCompactCurrency(source.gmvMonth)}</strong></td><td rowSpan={items.length}>{formatNumber(source.followers)}</td><td className="deliverable-count-cell" rowSpan={items.length}><strong>{items.length}</strong><small>deliverable</small></td></>}
                <td>{canEdit ? <div className="deliverable-progress-cell"><select value={item.progress} onChange={(event) => updateDeliverable(assignment, item.id, 'progress', event.target.value)}>{PROGRESS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select><button type="button" onClick={() => removeDeliverable(assignment, item.id)} title="Xóa deliverable"><Icon name="trash" size={13} /></button></div> : item.progress}</td>
                <td><label className="deliverable-checkbox"><input type="checkbox" disabled={!canEdit} checked={item.sdha} onChange={(event) => updateDeliverable(assignment, item.id, 'sdha', event.target.checked)} /><span><Icon name="check" size={12} /></span></label></td>
                <td>{canEdit ? <input list={`products-${campaign.id}`} value={item.product} onChange={(event) => updateDeliverable(assignment, item.id, 'product', event.target.value)} placeholder="Chọn hoặc nhập" /> : item.product || '—'}</td>
                <td>{canEdit ? <input value={item.demoLink} onChange={(event) => updateDeliverable(assignment, item.id, 'demoLink', event.target.value)} placeholder="Link file" /> : item.demoLink ? <a href={item.demoLink} target="_blank" rel="noreferrer">Mở file</a> : '—'}</td>
                <td>{canEdit ? <textarea rows="2" value={item.metaEcomNote} onChange={(event) => updateDeliverable(assignment, item.id, 'metaEcomNote', event.target.value)} placeholder="ME điền tay" /> : item.metaEcomNote || '—'}</td>
                <td><span className="deliverable-brand-feedback">{item.brandFeedback || 'Chưa có feedback'}</span></td>
                <td>{canEdit ? <input type="date" value={item.airTime} onChange={(event) => updateDeliverable(assignment, item.id, 'airTime', event.target.value)} /> : item.airTime || '—'}</td>
                <td>{canEdit ? <input value={item.airLink} onChange={(event) => updateDeliverable(assignment, item.id, 'airLink', event.target.value)} placeholder="Link video" /> : item.airLink ? <a href={item.airLink} target="_blank" rel="noreferrer">Mở video</a> : '—'}</td>
                <td>{canEdit ? <input value={item.codeAds} onChange={(event) => updateDeliverable(assignment, item.id, 'codeAds', event.target.value)} placeholder="Mã code" /> : item.codeAds || '—'}</td>
                <td>{canEdit ? <input type="date" value={item.codeAdsExpiry} onChange={(event) => updateDeliverable(assignment, item.id, 'codeAdsExpiry', event.target.value)} /> : item.codeAdsExpiry || '—'}</td>
              </tr>)
            })}</tbody>
          </table>
          <datalist id={`products-${campaign.id}`}>{productOptions.map((product) => <option value={product} key={product} />)}</datalist>
          {!acceptedCreators.length && <div className="campaign-inline-empty"><Icon name="checkSquare" size={24} /><strong>Chưa có KOC accepted</strong><span>KOC sẽ xuất hiện khi Brand Pick là Approved và KOC Confirm là Approved.</span></div>}
        </div>
      </section>
    </div>
  )
}
