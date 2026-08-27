import { useEffect, useMemo, useState } from 'react'
import { effectiveClientDecision } from '../../config/campaigns'
import { calculateBookingPricing } from '../../utils/pricing'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import { toCreatorList } from '../../utils/creatorLists'
import { exportCampaignDeliverablesToCsv } from '../../utils/exportCampaignDeliverables'
import {
  cycleDeliverableSort,
  EMPTY_DELIVERABLE_FILTERS,
  filterAndSortDeliverableGroups,
} from '../../utils/campaignDeliverableTable'
import Icon from '../common/Icon'
import CreatorSortableHeader from '../creators/CreatorSortableHeader'
import CampaignDeliverableFilters from './CampaignDeliverableFilters'

const PROGRESS_OPTIONS = [
  'Đang liên hệ', 'Đã yêu cầu mẫu', 'Đã duyệt yêu cầu mẫu', 'Đang giao hàng', 'Đã nhận hàng',
  'Lên kịch bản', 'Duyệt kịch bản', 'Lên demo', 'Brand feedback', 'Duyệt, chờ air', 'Done', 'Cancel',
]

const DELIVERABLE_COLUMNS = [
  ['Link TikTok', 'tiktokLink'], ['ID TikTok', 'tiktokId'], ['Expense', 'expense'],
  ['Segment', 'segment'], ['Concept', 'concept'], ['Type', 'type'],
  ['GMV / Month', 'gmvMonth'], ['Followers', 'followers'], ['Quantity', 'quantity'],
  ['Tiến độ', 'progress'], ['SDHA', 'sdha'], ['Product', 'product'],
  ['KB, DEMO KOC', 'demoLink'], ['Meta Ecom Note', 'metaEcomNote'],
  ['Brand Feedback', 'brandFeedback'], ['Performance (GMV)', 'performance'],
  ['Air Time', 'airTime'], ['Link Air', 'airLink'], ['Code Ads', 'codeAds'],
  ['Expiry Date Code Ads', 'codeAdsExpiry'],
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
    performance: item?.performance ?? '',
    airTime: item?.airTime || item?.deadline || '',
    airLink: item?.airLink || '',
    codeAds: item?.codeAds || '',
    codeAdsExpiry: item?.codeAdsExpiry || '',
  }
}

function newDeliverable(creatorId) {
  return normalizedDeliverable({ id: `deliverable-${creatorId}-${Date.now()}` }, creatorId, 0)
}

function deliverablesForAssignment(campaign, assignment) {
  const source = assignment.deliverables?.length ? assignment.deliverables : campaign.deliverables || []
  const values = source.length ? source : [{ id: `deliverable-${assignment.creatorId}-1` }]
  return values.map((item, index) => normalizedDeliverable(item, assignment.creatorId, index))
}

export default function CampaignDeliverablesTab({ campaign, creators, canEdit, onUpdateCreator, onMarkChangesRead, onNotify }) {
  const [highlightedIds, setHighlightedIds] = useState([])
  const [filters, setFilters] = useState(EMPTY_DELIVERABLE_FILTERS)
  const [numericFilters, setNumericFilters] = useState([])
  const [sortCriteria, setSortCriteria] = useState([])
  const sourceById = useMemo(() => new Map(creators.map((creator) => [String(creator.id), creator])), [creators])
  const acceptedCreators = useMemo(() => (campaign.creators || []).filter(isAcceptedCreator), [campaign.creators])
  const deliverableGroups = useMemo(() => acceptedCreators.map((assignment) => {
    const source = sourceById.get(String(assignment.creatorId)) || assignment
    const items = deliverablesForAssignment(campaign, assignment)
    const cost = assignment.quotedCost !== '' && assignment.quotedCost != null ? assignment.quotedCost : source.cost
    const extraCost = assignment.quotedExtraCost !== '' && assignment.quotedExtraCost != null ? assignment.quotedExtraCost : source.extraCost
    return {
      assignment,
      source,
      items,
      quantity: items.length,
      expense: calculateBookingPricing(cost, extraCost).bookingExpense,
    }
  }), [acceptedCreators, campaign, sourceById])
  const filterOptions = useMemo(() => ({
    segment: [...new Set(deliverableGroups.map(({ source }) => source.segment).filter(Boolean))].sort(),
    type: [...new Set(deliverableGroups.flatMap(({ source }) => toCreatorList(source.type)).filter(Boolean))].sort(),
    progress: [...new Set(deliverableGroups.flatMap(({ items }) => items.map((item) => item.progress)).filter(Boolean))],
    product: [...new Set(deliverableGroups.flatMap(({ items }) => items.map((item) => item.product || 'Chưa có Product')))].sort(),
    sdha: ['Có SDHA', 'Không SDHA'],
  }), [deliverableGroups])
  const productOptions = useMemo(() => filterOptions.product.filter((product) => product !== 'Chưa có Product'), [filterOptions.product])
  const displayedGroups = useMemo(
    () => filterAndSortDeliverableGroups(deliverableGroups, filters, numericFilters, sortCriteria),
    [deliverableGroups, filters, numericFilters, sortCriteria],
  )
  const displayedDeliverableCount = useMemo(() => displayedGroups.reduce((total, group) => total + group.items.length, 0), [displayedGroups])
  const overview = useMemo(() => acceptedCreators.reduce((result, assignment) => {
    deliverablesForAssignment(campaign, assignment).forEach((item) => {
      result.total += 1
      if (item.progress === 'Done') result.done += 1
      else if (item.progress === 'Cancel') result.cancelled += 1
      else result.active += 1
      result.performance += Number(item.performance) || 0
    })
    return result
  }, { total: 0, done: 0, active: 0, cancelled: 0, performance: 0 }), [acceptedCreators, campaign])

  useEffect(() => {
    const unreadIds = acceptedCreators.filter((creator) => creator.clientChangeUnread).map((creator) => String(creator.creatorId))
    if (!unreadIds.length) return
    setHighlightedIds((current) => [...new Set([...current, ...unreadIds])])
    onMarkChangesRead()
  }, [acceptedCreators, onMarkChangesRead])

  const deliverablesFor = (assignment) => deliverablesForAssignment(campaign, assignment)
  const replaceDeliverables = (assignment, next) => onUpdateCreator(assignment.creatorId, { deliverables: next })
  const updateDeliverable = (assignment, deliverableId, field, value) => replaceDeliverables(assignment, deliverablesFor(assignment).map((item) => item.id === deliverableId ? { ...item, [field]: value } : item))
  const addDeliverable = (assignment) => replaceDeliverables(assignment, [...deliverablesFor(assignment), newDeliverable(assignment.creatorId)])
  const removeDeliverable = (assignment, deliverableId) => {
    const current = deliverablesFor(assignment)
    replaceDeliverables(assignment, current.length === 1 ? [newDeliverable(assignment.creatorId)] : current.filter((item) => item.id !== deliverableId))
  }
  const changeFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const clearFilters = () => {
    setFilters(EMPTY_DELIVERABLE_FILTERS)
    setNumericFilters([])
  }
  const sortBy = (key) => setSortCriteria((current) => cycleDeliverableSort(current, key))
  const exportSheet = () => {
    const rows = displayedGroups.flatMap(({ source, items, quantity, expense }) => {
      return items.map((item) => ({ ...item, tiktokLink: source.tiktokLink, tiktokId: source.tiktokId, expense, segment: source.segment, concept: source.concept, type: toCreatorList(source.type).join(', '), gmvMonth: source.gmvMonth, followers: source.followers, quantity }))
    })
    exportCampaignDeliverablesToCsv(campaign, rows)
    onNotify?.(`Đã export ${rows.length} deliverable trong kết quả hiện tại ra file sheet`)
  }

  return (
    <div className="campaign-detail-tab campaign-deliverables-tab">
      <section className="campaign-detail-card deliverables-tracker-card" data-tour="campaign-deliverables-workspace">
        <header className="campaign-tab-heading"><div><span className="eyebrow">Execution Tracking</span><h2>Deliverables</h2><p>Mỗi dòng con là một deliverable. Chỉ KOC đã được Brand duyệt và KOC xác nhận mới xuất hiện.</p></div><div className="deliverables-heading-actions"><span className="brand-selection-count">{acceptedCreators.length} KOC accepted</span><button type="button" className="secondary-button" disabled={!displayedDeliverableCount} onClick={exportSheet}><Icon name="download" size={15} />Export sheet</button></div></header>
        <section className="deliverables-overview" data-tour="campaign-deliverables-overview">
          <article><span><Icon name="checkSquare" size={17} /></span><div><small>Tổng Deliverables</small><strong>{overview.total}</strong></div></article>
          <article><span className="is-done"><Icon name="check" size={17} /></span><div><small>Đã hoàn thành</small><strong>{overview.done}</strong></div></article>
          <article><span className="is-active"><Icon name="clock" size={17} /></span><div><small>Đang xử lý</small><strong>{overview.active}</strong></div></article>
          <article><span className="is-performance"><Icon name="trending" size={17} /></span><div><small>Performance (GMV)</small><strong>{formatCompactCurrency(overview.performance)}</strong></div></article>
        </section>
        <CampaignDeliverableFilters
          filters={filters}
          numericFilters={numericFilters}
          options={filterOptions}
          shownCreators={displayedGroups.length}
          shownDeliverables={displayedDeliverableCount}
          totalCreators={acceptedCreators.length}
          onChange={changeFilter}
          onAddNumericFilter={(filter) => setNumericFilters((current) => [...current, filter])}
          onRemoveNumericFilter={(filterId) => setNumericFilters((current) => current.filter((filter) => filter.id !== filterId))}
          onClear={clearFilters}
        />
        <div className="deliverables-sort-hint"><Icon name="filter" size={13} />Bấm header để sort nhiều tiêu chí · tiêu chí chọn trước được ưu tiên cao hơn</div>
        <div className="deliverables-tracker-table-wrap" data-tour="campaign-deliverables-table">
          <table className="deliverables-tracker-table">
            <thead><tr>{DELIVERABLE_COLUMNS.map(([label, key]) => {
              const criterionIndex = sortCriteria.findIndex((criterion) => criterion.key === key)
              return <th key={key}><CreatorSortableHeader label={label} sortKey={key} criterion={sortCriteria[criterionIndex]} priority={criterionIndex + 1} onSort={sortBy} /></th>
            })}</tr></thead>
            <tbody>{displayedGroups.flatMap(({ assignment, source, items, quantity, expense }) => {
              const highlighted = highlightedIds.includes(String(assignment.creatorId))
              return items.map((item, index) => <tr className={`${highlighted ? 'is-deliverable-updated' : ''} ${index > 0 ? 'is-deliverable-child' : ''}`} key={`${assignment.creatorId}-${item.id}`}>
                {index === 0 && <><td className="deliverables-sticky-link" rowSpan={items.length}><a href={source.tiktokLink || '#'} target="_blank" rel="noreferrer" title={source.tiktokLink}>{source.tiktokLink || '—'}</a></td><td className="deliverables-sticky-id" rowSpan={items.length}><strong>@{String(source.tiktokId || '').replace(/^@/, '')}</strong><small>{source.name}</small>{canEdit && <button type="button" className="add-creator-deliverable" onClick={() => addDeliverable(assignment)}><Icon name="plus" size={12} />Deliverable</button>}</td><td rowSpan={items.length}><strong>{formatCompactCurrency(expense)}</strong></td><td rowSpan={items.length}><span className="segment-tag">{source.segment || '—'}</span></td><td rowSpan={items.length}><span className="deliverable-static-text">{source.concept || '—'}</span></td><td rowSpan={items.length}><div className="internal-type-list">{toCreatorList(source.type, ['—']).map((type) => <span key={type}>{type}</span>)}</div></td><td rowSpan={items.length}><strong>{formatCompactCurrency(source.gmvMonth)}</strong></td><td rowSpan={items.length}>{formatNumber(source.followers)}</td><td className="deliverable-count-cell" rowSpan={items.length}><strong>{quantity}</strong><small>deliverable</small></td></>}
                <td>{canEdit ? <div className="deliverable-progress-cell"><select value={item.progress} onChange={(event) => updateDeliverable(assignment, item.id, 'progress', event.target.value)}>{PROGRESS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select><button type="button" onClick={() => removeDeliverable(assignment, item.id)} title="Xóa deliverable"><Icon name="trash" size={13} /></button></div> : item.progress}</td>
                <td><label className="deliverable-checkbox"><input type="checkbox" disabled={!canEdit} checked={item.sdha} onChange={(event) => updateDeliverable(assignment, item.id, 'sdha', event.target.checked)} /><span><Icon name="check" size={12} /></span></label></td>
                <td>{canEdit ? <input list={`products-${campaign.id}`} value={item.product} onChange={(event) => updateDeliverable(assignment, item.id, 'product', event.target.value)} placeholder="Chọn hoặc nhập" /> : item.product || '—'}</td>
                <td>{canEdit ? <input value={item.demoLink} onChange={(event) => updateDeliverable(assignment, item.id, 'demoLink', event.target.value)} placeholder="Link file" /> : item.demoLink ? <a href={item.demoLink} target="_blank" rel="noreferrer">Mở file</a> : '—'}</td>
                <td>{canEdit ? <textarea rows="2" value={item.metaEcomNote} onChange={(event) => updateDeliverable(assignment, item.id, 'metaEcomNote', event.target.value)} placeholder="ME điền tay" /> : item.metaEcomNote || '—'}</td>
                <td><span className="deliverable-brand-feedback">{item.brandFeedback || 'Chưa có feedback'}</span></td>
                <td>{canEdit ? <label className="deliverable-performance-input"><input type="number" min="0" step="1000" value={item.performance} onChange={(event) => updateDeliverable(assignment, item.id, 'performance', event.target.value === '' ? '' : Number(event.target.value))} placeholder="Nhập GMV" /><span>₫</span></label> : formatCompactCurrency(item.performance)}</td>
                <td>{canEdit ? <input type="date" value={item.airTime} onChange={(event) => updateDeliverable(assignment, item.id, 'airTime', event.target.value)} /> : item.airTime || '—'}</td>
                <td>{canEdit ? <input value={item.airLink} onChange={(event) => updateDeliverable(assignment, item.id, 'airLink', event.target.value)} placeholder="Link video" /> : item.airLink ? <a href={item.airLink} target="_blank" rel="noreferrer">Mở video</a> : '—'}</td>
                <td>{canEdit ? <input value={item.codeAds} onChange={(event) => updateDeliverable(assignment, item.id, 'codeAds', event.target.value)} placeholder="Mã code" /> : item.codeAds || '—'}</td>
                <td>{canEdit ? <input type="date" value={item.codeAdsExpiry} onChange={(event) => updateDeliverable(assignment, item.id, 'codeAdsExpiry', event.target.value)} /> : item.codeAdsExpiry || '—'}</td>
              </tr>)
            })}</tbody>
          </table>
          <datalist id={`products-${campaign.id}`}>{productOptions.map((product) => <option value={product} key={product} />)}</datalist>
          {!acceptedCreators.length && <div className="campaign-inline-empty"><Icon name="checkSquare" size={24} /><strong>Chưa có KOC accepted</strong><span>KOC sẽ xuất hiện khi Brand Pick là Approved và KOC Confirm là Approved.</span></div>}
          {acceptedCreators.length > 0 && displayedGroups.length === 0 && <div className="campaign-inline-empty"><Icon name="search" size={24} /><strong>Không có kết quả phù hợp</strong><span>Hãy thử bỏ bớt tiêu chí hoặc xóa tất cả bộ lọc.</span><button type="button" className="secondary-button" onClick={clearFilters}>Xóa tất cả bộ lọc</button></div>}
        </div>
      </section>
    </div>
  )
}
