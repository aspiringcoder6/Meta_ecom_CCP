import { useMemo } from 'react'
import { finalCampaignCreators } from '../../utils/campaignDeliverables'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import { calculateBookingPricing } from '../../utils/pricing'
import CategoryPathRibbons from '../creators/CategoryPathRibbons'
import Icon from '../common/Icon'

function campaignAmount(assignmentValue, sourceValue) {
  return assignmentValue !== '' && assignmentValue != null ? assignmentValue : sourceValue
}

function editableAmount(value) {
  return value === '' ? null : Math.max(0, Number(value) || 0)
}

export default function CampaignFinalCreatorsTab({ campaign, creators, canEdit, onUpdateCreator }) {
  const sourceById = useMemo(() => new Map(creators.map((creator) => [String(creator.id), creator])), [creators])
  const finalCreators = finalCampaignCreators(campaign)
  const rows = finalCreators.map((assignment) => {
    const source = sourceById.get(String(assignment.creatorId)) || assignment
    const cost = campaignAmount(assignment.quotedCost, source.cost)
    const extraCost = campaignAmount(assignment.quotedExtraCost, source.extraCost)
    return { assignment, source, cost, extraCost, pricing: calculateBookingPricing(cost, extraCost) }
  })
  const totals = rows.reduce((sum, row) => ({
    cost: sum.cost + (Number(row.cost) || 0),
    extraCost: sum.extraCost + (Number(row.extraCost) || 0),
    totalCast: sum.totalCast + row.pricing.totalCast,
    agi: sum.agi + row.pricing.agi,
    bookingExpense: sum.bookingExpense + row.pricing.bookingExpense,
  }), { cost: 0, extraCost: 0, totalCast: 0, agi: 0, bookingExpense: 0 })
  const budgetWithAgencyFee = Math.round(totals.bookingExpense * 1.06)

  return (
    <div className="campaign-detail-tab campaign-final-creators-tab">
      <section className="campaign-detail-card final-creators-card" data-tour="campaign-final-workspace">
        <header className="campaign-tab-heading">
          <div><span className="eyebrow">Final KOC & Payment Tracking</span><h2>Final Creators</h2><p>Chỉ hiển thị KOC đã được Brand duyệt, KOC xác nhận và toàn bộ deliverables đều ở trạng thái Done.</p></div>
          <span className="final-creators-count"><Icon name="userCheck" size={16} />{finalCreators.length} Creator</span>
        </header>

        {rows.length > 0 && <div className="final-creators-table-wrap">
          <table className="final-creators-table">
            <thead><tr><th>Category</th><th>ID TikTok</th><th>Cost</th><th>Extra</th><th>Cast</th><th>AGI</th><th>Expense</th><th>Tracking</th><th>Note</th></tr></thead>
            <tbody>{rows.map(({ assignment, source, cost, extraCost, pricing }) => <tr key={assignment.creatorId}>
              <td><CategoryPathRibbons values={source.category || assignment.category || []} level={2} /></td>
              <td><strong>@{String(source.tiktokId || assignment.tiktokId || '').replace(/^@/, '')}</strong><small>{source.name || assignment.name}</small></td>
              <td>{canEdit ? <label className="final-finance-input"><input type="number" min="0" value={assignment.quotedCost ?? ''} placeholder={formatNumber(source.cost || 0)} onChange={(event) => onUpdateCreator(assignment.creatorId, { quotedCost: editableAmount(event.target.value) })} /><span>₫</span></label> : formatCurrency(cost)}</td>
              <td>{canEdit ? <label className="final-finance-input"><input type="number" min="0" value={assignment.quotedExtraCost ?? ''} placeholder={formatNumber(source.extraCost || 0)} onChange={(event) => onUpdateCreator(assignment.creatorId, { quotedExtraCost: editableAmount(event.target.value) })} /><span>₫</span></label> : formatCurrency(extraCost)}</td>
              <td><strong>{formatCurrency(pricing.totalCast)}</strong><small>Tự tính</small></td>
              <td className={pricing.agi < 0 ? 'is-negative' : ''}><strong>{formatCurrency(pricing.agi)}</strong><small>Expense − Cast</small></td>
              <td><strong>{formatCurrency(pricing.bookingExpense)}</strong><small>Tự tính</small></td>
              <td>{canEdit ? <textarea rows="2" value={assignment.finalTracking || ''} onChange={(event) => onUpdateCreator(assignment.creatorId, { finalTracking: event.target.value })} placeholder="VD: 30/09/2026 · Thanh toán 50%" /> : assignment.finalTracking || '—'}</td>
              <td>{canEdit ? <textarea rows="2" value={assignment.finalNote || ''} onChange={(event) => onUpdateCreator(assignment.creatorId, { finalNote: event.target.value })} placeholder="Ghi chú thanh toán..." /> : assignment.finalNote || '—'}</td>
            </tr>)}</tbody>
            <tfoot>
              <tr className="final-estimated-total"><th colSpan="2">Estimated Total Budget</th><td>{formatCurrency(totals.cost)}</td><td>{formatCurrency(totals.extraCost)}</td><td>{formatCurrency(totals.totalCast)}</td><td className={totals.agi < 0 ? 'is-negative' : ''}>{formatCurrency(totals.agi)}</td><td>{formatCurrency(totals.bookingExpense)}</td><td /><td /></tr>
              <tr className="final-agency-total"><th colSpan="2">Inc agency fee 6%</th><td /><td /><td /><td /><td><strong>{formatCurrency(budgetWithAgencyFee)}</strong><small>Expense × 1.06</small></td><td /><td /></tr>
            </tfoot>
          </table>
        </div>}

        {!rows.length && <div className="campaign-tab-empty inline"><span><Icon name="userCheck" size={24} /></span><h2>Chưa có Final Creator</h2><p>KOC sẽ xuất hiện khi Brand Pick và KOC Confirm đều Approved, đồng thời tất cả deliverables của KOC đã chuyển sang Done.</p></div>}
      </section>
    </div>
  )
}
