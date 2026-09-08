import { useMemo, useState } from 'react'
import { clientReviewDecisionLabel } from '../../config/campaigns'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import { toCreatorList } from '../../utils/creatorLists'
import { projectCategoryPaths } from '../../utils/creatorCategoryPaths'
import { cycleCreatorSort } from '../../utils/creatorSorting'
import { EMPTY_CLIENT_KOC_FILTERS, filterAndSortClientKocs } from '../../utils/clientReviewTables'
import Icon from '../common/Icon'
import CategoryPathRibbons from '../creators/CategoryPathRibbons'
import CreatorSortableHeader from '../creators/CreatorSortableHeader'
import ClientReviewFilterBar from './ClientReviewFilterBar'

const DECISIONS = [
  { value: 'APPROVED', label: 'Đồng ý', icon: 'check' },
  { value: 'PENDING', label: 'Pending', icon: 'clock' },
  { value: 'REJECTED', label: 'Từ chối', icon: 'close' },
]

const KOC_COLUMNS = [
  ['Link TikTok', 'tiktokLink'], ['ID TikTok', 'tiktokId'], ['Expense', 'expense'],
  ['Segment', 'segment'], ['Category', 'category'], ['Type', 'type'],
  ['Followers', 'followers'], ['GMV / Month', 'gmvMonth'], ['Meta Ecom Note', 'metaEcomNote'],
  ['Brand Pick', 'brandPick'], ['Brand Note', 'brandNote'], ['KOC Confirm', 'kocConfirm'],
]

function decisionTone(value) {
  if (value === 'APPROVED') return 'approved'
  if (value === 'REJECTED') return 'rejected'
  return 'pending'
}

function kocDecision(creator) {
  return creator.kocDecision || (creator.creatorConfirmed ? 'APPROVED' : 'PENDING')
}

function creatorTikTokLink(creator) {
  const savedLink = String(creator.tiktokLink || creator.channelLink || '').trim()
  if (savedLink) return savedLink
  const tiktokId = String(creator.tiktokId || '').trim().replace(/^@/, '')
  return tiktokId ? `https://www.tiktok.com/@${tiktokId}` : ''
}

export default function ClientKocListingTab({ campaign, responses, onUpdate, changedCount, savedMessage, saving, onSubmit }) {
  const [filters, setFilters] = useState(EMPTY_CLIENT_KOC_FILTERS)
  const [sortCriteria, setSortCriteria] = useState([])
  const creators = useMemo(() => campaign.creators || [], [campaign.creators])
  const counts = creators.reduce((result, creator) => {
    const decision = responses[String(creator.creatorId)]?.decision || 'PENDING'
    result[decision] = (result[decision] || 0) + 1
    return result
  }, { APPROVED: 0, PENDING: 0, REJECTED: 0 })
  const filterOptions = useMemo(() => ({
    segment: [...new Set(creators.map((creator) => creator.segment).filter(Boolean))].sort(),
    category: [...new Set(creators.flatMap((creator) => projectCategoryPaths(creator.category || [], 2)))].sort(),
    type: [...new Set(creators.flatMap((creator) => toCreatorList(creator.type)))].sort(),
    brandPick: [...new Set(creators.map((creator) => clientReviewDecisionLabel(responses[String(creator.creatorId)]?.decision || 'PENDING')))],
    kocConfirm: [...new Set(creators.map((creator) => clientReviewDecisionLabel(kocDecision(creator))))],
  }), [creators, responses])
  const visibleCreators = useMemo(() => filterAndSortClientKocs(creators, responses, filters, sortCriteria), [creators, filters, responses, sortCriteria])
  const changeFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const clearFilters = () => setFilters(EMPTY_CLIENT_KOC_FILTERS)
  const sortBy = (key) => setSortCriteria((current) => cycleCreatorSort(current, key))

  return <>
    <section className="client-review-instruction"><Icon name="users" size={19} /><div><strong>Duyệt danh sách KOC cho Campaign</strong><p>Toàn bộ thông tin từ External Listings được hiển thị bên dưới. Bạn có thể xem hồ sơ, chọn Brand Pick và để lại Brand Note trước khi gửi một lần cho Meta Ecom.</p></div></section>
    <section className="client-koc-summary" aria-label="Tổng quan Brand Pick">
      <article><span><Icon name="users" size={17} /></span><div><small>Tổng KOC</small><strong>{creators.length}</strong></div></article>
      <article className="is-approved"><span><Icon name="check" size={17} /></span><div><small>Đồng ý</small><strong>{counts.APPROVED}</strong></div></article>
      <article className="is-pending"><span><Icon name="clock" size={17} /></span><div><small>Pending</small><strong>{counts.PENDING}</strong></div></article>
      <article className="is-rejected"><span><Icon name="close" size={17} /></span><div><small>Từ chối</small><strong>{counts.REJECTED}</strong></div></article>
    </section>
    <section className="client-koc-listing-card">
      <header><div><span className="client-listing-eyebrow">External Listings</span><h2>Danh sách KOC</h2><p>Cuộn ngang để xem đầy đủ thông tin. Link và ID TikTok được giữ cố định.</p></div><span>{creators.length} Creator</span></header>
      <ClientReviewFilterBar
        search={filters.search}
        filters={[
          { key: 'segment', label: 'Segment', values: filters.segment, options: filterOptions.segment },
          { key: 'category', label: 'Category', values: filters.category, options: filterOptions.category },
          { key: 'type', label: 'Type', values: filters.type, options: filterOptions.type },
          { key: 'brandPick', label: 'Brand Pick', values: filters.brandPick, options: filterOptions.brandPick },
          { key: 'kocConfirm', label: 'KOC Confirm', values: filters.kocConfirm, options: filterOptions.kocConfirm },
        ]}
        resultLabel={`${visibleCreators.length}/${creators.length} Creator`}
        onSearch={(value) => changeFilter('search', value)}
        onChange={changeFilter}
        onClear={clearFilters}
      />
      <div className="client-review-sort-hint">Bấm header để sort nhiều tiêu chí · tiêu chí chọn trước được ưu tiên cao hơn</div>
      <div className="client-koc-listing-table-wrap">
        <table className="client-koc-listing-table">
          <thead><tr>{KOC_COLUMNS.map(([label, key]) => {
            const sortIndex = sortCriteria.findIndex((criterion) => criterion.key === key)
            return <th key={key}><CreatorSortableHeader label={label} sortKey={key} criterion={sortCriteria[sortIndex]} priority={sortIndex + 1} onSort={sortBy} /></th>
          })}</tr></thead>
          <tbody>{visibleCreators.map((creator) => {
            const response = responses[String(creator.creatorId)] || { decision: 'PENDING', note: '' }
            const tone = decisionTone(response.decision)
            const confirm = kocDecision(creator)
            const tiktokLink = creatorTikTokLink(creator)
            return <tr className={`is-${tone}`} key={creator.creatorId}>
              <td className="client-listing-sticky-link">{tiktokLink ? <a href={tiktokLink} target="_blank" rel="noreferrer" title={tiktokLink}>{tiktokLink}</a> : <span>Chưa có link</span>}</td>
              <td className="client-listing-sticky-id"><strong>@{String(creator.tiktokId || '').replace(/^@/, '')}</strong><small>{creator.name || 'Creator'}</small></td>
              <td><strong>{formatCompactCurrency(creator.expense ?? creator.suggestedPrice)}</strong></td>
              <td><span className="client-listing-segment">{creator.segment || '—'}</span></td>
              <td className="client-listing-category"><CategoryPathRibbons values={creator.category || []} level={2} /></td>
              <td><div className="client-listing-types">{toCreatorList(creator.type, ['—']).map((type) => <span key={type}>{type}</span>)}</div></td>
              <td>{formatNumber(creator.followers)}</td>
              <td><strong>{formatCompactCurrency(creator.gmvMonth)}</strong></td>
              <td><span className="client-listing-note-text" title={creator.metaEcomNote}>{creator.metaEcomNote || '—'}</span></td>
              <td className="client-listing-brand-pick"><div className="client-listing-decisions">{DECISIONS.map((decision) => <button type="button" className={response.decision === decision.value ? 'is-selected' : ''} onClick={() => onUpdate(creator.creatorId, 'decision', decision.value)} title={decision.label} key={decision.value}><Icon name={decision.icon} size={13} /><span>{decision.label}</span></button>)}</div></td>
              <td className="client-listing-brand-note"><textarea rows="2" value={response.note} onChange={(event) => onUpdate(creator.creatorId, 'note', event.target.value)} placeholder="" /></td>
              <td className="client-listing-koc-confirm"><span className={`client-listing-status is-${decisionTone(confirm)}`}>{clientReviewDecisionLabel(confirm)}</span></td>
            </tr>
          })}</tbody>
        </table>
        {!creators.length && <div className="client-review-no-listing"><Icon name="users" size={24} /><strong>Chưa có KOC trong danh sách</strong><span>Meta Ecom chưa thêm Creator vào External Listings.</span></div>}
        {creators.length > 0 && !visibleCreators.length && <div className="client-review-no-listing"><Icon name="search" size={24} /><strong>Không có KOC phù hợp</strong><span>Hãy thử thay đổi hoặc xóa các bộ lọc hiện tại.</span><button type="button" onClick={clearFilters}>Xóa bộ lọc</button></div>}
      </div>
    </section>
    <footer className="client-review-submit"><div><strong>{changedCount} thay đổi chưa gửi</strong><small>{savedMessage || 'Phản hồi sẽ được gom và gửi một lần đến Meta Ecom.'}</small></div><button type="button" disabled={!changedCount || saving} onClick={onSubmit}><Icon name="check" size={17} />{saving ? 'Đang gửi...' : 'Gửi phản hồi'}</button></footer>
  </>
}
