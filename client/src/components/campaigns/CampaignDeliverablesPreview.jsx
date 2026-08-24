import { useEffect, useMemo, useRef, useState } from 'react'
import { clientReviewDecisionLabel, effectiveClientDecision } from '../../config/campaigns'
import { campaignReviewToken } from '../../utils/campaignStorage'
import { calculateBookingPricing } from '../../utils/pricing'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import { toCreatorList } from '../../utils/creatorLists'
import Icon from '../common/Icon'

const KOC_DECISIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

function decisionTone(decision) {
  if (decision === 'APPROVED') return 'approved'
  if (decision === 'REJECTED') return 'rejected'
  return 'pending'
}

export default function CampaignDeliverablesPreview({ campaign, creators, canEdit, onUpdateCreator, onMarkChangesRead, onEnsureLink, onNotify }) {
  const [reviewToken, setReviewToken] = useState(() => campaignReviewToken(campaign))
  const [highlightedIds, setHighlightedIds] = useState([])
  const requestedCampaignId = useRef(null)
  const sourceById = useMemo(() => new Map(creators.map((creator) => [String(creator.id), creator])), [creators])

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

  useEffect(() => {
    const unreadIds = (campaign.creators || []).filter((creator) => creator.clientChangeUnread).map((creator) => String(creator.creatorId))
    if (!unreadIds.length) return
    setHighlightedIds((current) => [...new Set([...current, ...unreadIds])])
    onMarkChangesRead()
  }, [campaign.creators, onMarkChangesRead])

  const reviewUrl = `${window.location.origin}/client-review/${reviewToken}`
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl)
      onNotify('Đã sao chép link Brand Review')
    } catch {
      window.prompt('Sao chép link Brand Review:', reviewUrl)
    }
  }

  return (
    <div className="campaign-detail-tab campaign-brand-selection-tab">
      <section className="campaign-review-link-card" data-tour="campaign-review-link">
        <span><Icon name="message" size={21} /></span>
        <div><small>Link Brand Review tự động</small><strong>{reviewUrl}</strong><p>Brand dùng link này để cập nhật Brand Pick và Brand Note. Các thay đổi sẽ đồng bộ về bảng bên dưới.</p></div>
        <button type="button" className="secondary-button" onClick={copyLink}><Icon name="replace" size={15} />Sao chép</button>
        <button type="button" className="primary-button" onClick={() => window.open(reviewUrl, '_blank', 'noopener,noreferrer')}><Icon name="eye" size={15} />Mở preview</button>
      </section>
      <section className="campaign-detail-card brand-selection-card" data-tour="campaign-external-workspace">
        <header className="campaign-tab-heading"><div><span className="eyebrow">Brand & KOC Selection</span><h2>External Listings</h2><p>Dữ liệu ở đây sẽ hiển thị cho bên khách hàng, bấm vào link ở phía trên để gửi link cho client duyệt.</p></div><div><span className="brand-selection-count">{campaign.creators?.length || 0} Creator</span></div></header>
        <div className="brand-selection-table-wrap">
          <table className="brand-selection-table">
            <thead><tr><th>Link TikTok</th><th>ID TikTok</th><th>Expense</th><th>Segment</th><th>Concept</th><th>Type</th><th>Followers</th><th>GMV / Month</th><th>Meta Ecom Note</th><th>Brand Pick</th><th>Brand Note</th><th>KOC Confirm</th></tr></thead>
            <tbody>{(campaign.creators || []).map((assignment) => {
              const source = sourceById.get(String(assignment.creatorId)) || assignment
              const cost = assignment.quotedCost !== '' && assignment.quotedCost != null ? assignment.quotedCost : source.cost
              const extraCost = assignment.quotedExtraCost !== '' && assignment.quotedExtraCost != null ? assignment.quotedExtraCost : source.extraCost
              const expense = calculateBookingPricing(cost, extraCost).bookingExpense
              const brandPick = effectiveClientDecision(assignment)
              const kocDecision = assignment.kocDecision || (assignment.creatorConfirmed ? 'APPROVED' : 'PENDING')
              return <tr className={highlightedIds.includes(String(assignment.creatorId)) ? 'is-brand-updated' : ''} key={assignment.creatorId}>
                <td><a href={source.tiktokLink || '#'} target="_blank" rel="noreferrer" title={source.tiktokLink}>{source.tiktokLink || '—'}</a></td>
                <td><strong>@{String(source.tiktokId || '').replace(/^@/, '')}</strong><small>{source.name}</small></td>
                <td><strong>{formatCompactCurrency(expense)}</strong></td>
                <td><span className="segment-tag">{source.segment || '—'}</span></td>
                <td><span className="brand-selection-text" title={source.concept}>{source.concept || '—'}</span></td>
                <td><div className="internal-type-list">{toCreatorList(source.type, ['—']).map((type) => <span key={type}>{type}</span>)}</div></td>
                <td>{formatNumber(source.followers)}</td>
                <td><strong>{formatCompactCurrency(source.gmvMonth)}</strong></td>
                <td>{canEdit ? <textarea rows="2" value={assignment.metaEcomNote || ''} onChange={(event) => onUpdateCreator(assignment.creatorId, { metaEcomNote: event.target.value })} placeholder="Nhập note nội bộ..." /> : <span className="brand-selection-text">{assignment.metaEcomNote || '—'}</span>}</td>
                <td><span className={`selection-status selection-status-${decisionTone(brandPick)}`}>{clientReviewDecisionLabel(brandPick)}</span></td>
                <td><span className="brand-selection-text" title={assignment.clientNote}>{assignment.clientNote || '—'}</span></td>
                <td>{canEdit ? <select className={`selection-select selection-select-${decisionTone(kocDecision)}`} value={kocDecision} onChange={(event) => onUpdateCreator(assignment.creatorId, { kocDecision: event.target.value, creatorConfirmed: event.target.value === 'APPROVED' })}>{KOC_DECISIONS.map((decision) => <option value={decision.value} key={decision.value}>{decision.label}</option>)}</select> : <span className={`selection-status selection-status-${decisionTone(kocDecision)}`}>{KOC_DECISIONS.find((item) => item.value === kocDecision)?.label || kocDecision}</span>}</td>
              </tr>
            })}</tbody>
          </table>
          {!campaign.creators?.length && <div className="campaign-inline-empty"><Icon name="users" size={24} /><strong>Chưa có Creator</strong><span>Thêm Creator trong Internal Listings để đồng bộ sang đây.</span></div>}
        </div>
      </section>
    </div>
  )
}
