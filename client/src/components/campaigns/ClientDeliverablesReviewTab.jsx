import { useMemo, useState } from 'react'
import { acceptedCampaignCreators, campaignCreatorDeliverables } from '../../utils/campaignDeliverables'
import { cycleCreatorSort } from '../../utils/creatorSorting'
import { EMPTY_CLIENT_DELIVERABLE_FILTERS, filterAndSortClientDeliverables } from '../../utils/clientReviewTables'
import Icon from '../common/Icon'
import CreatorSortableHeader from '../creators/CreatorSortableHeader'
import ClientReviewFilterBar from './ClientReviewFilterBar'

const DELIVERABLE_COLUMNS = [
  ['Quantity', 'quantity'], ['Product', 'product'], ['Tiến độ', 'progress'], ['SDHA', 'sdha'],
  ['KB, Demo KOC', 'demoLink'], ['Meta Ecom Note', 'metaEcomNote'], ['Brand Feedback', 'brandFeedback'],
  ['Air Time', 'airTime'], ['Link Air', 'airLink'], ['Code Ads', 'codeAds'], ['Expiry Date Code Ads', 'codeAdsExpiry'],
]

function DeliverableLink({ href, label, emptyLabel }) {
  if (!href) return emptyLabel
  return <a href={href} target="_blank" rel="noreferrer">{label}</a>
}

function ClientDeliverableRow({ creatorId, item, index, quantity, rowSpan, feedback, onChange }) {
  const feedbackKey = `${creatorId}:${item.id}`
  return (
    <tr>
      {index === 0 && <td className="client-deliverable-count" rowSpan={rowSpan}><strong>{quantity}</strong><small>deliverable</small></td>}
      <td>{item.product || '—'}</td>
      <td><span className="client-deliverable-progress">{item.progress || 'Đang liên hệ'}</span></td>
      <td className="client-deliverable-sdha">{item.sdha ? <Icon name="check" size={15} /> : '—'}</td>
      <td><DeliverableLink href={item.demoLink} label="Mở demo" emptyLabel="Chưa có link" /></td>
      <td className="client-deliverable-meta-note"><span title={item.metaEcomNote || ''}>{item.metaEcomNote || '—'}</span></td>
      <td className="client-deliverable-brand-feedback"><textarea rows="3" value={feedback[feedbackKey] || ''} onChange={(event) => onChange(feedbackKey, event.target.value)} placeholder="Nhập feedback cho deliverable..." /></td>
      <td className="client-deliverable-air-time">{item.airTime || 'Chưa có lịch'}</td>
      <td><DeliverableLink href={item.airLink} label="Mở video" emptyLabel="Chưa có link" /></td>
      <td className="client-deliverable-code"><span title={item.codeAds || ''}>{item.codeAds || '—'}</span></td>
      <td>{item.codeAdsExpiry || '—'}</td>
    </tr>
  )
}

function ClientDeliverablesTable({ creator, deliverables, totalQuantity, feedback, sortCriteria, onSort, onChange }) {
  return (
    <div className="client-deliverables-review-table-wrap">
      <table>
        <thead><tr>{DELIVERABLE_COLUMNS.map(([label, key]) => {
          const sortIndex = sortCriteria.findIndex((criterion) => criterion.key === key)
          return <th className={key === 'brandFeedback' ? 'client-deliverable-brand-feedback' : undefined} key={key}><CreatorSortableHeader label={label} sortKey={key} criterion={sortCriteria[sortIndex]} priority={sortIndex + 1} onSort={onSort} /></th>
        })}</tr></thead>
        <tbody>
          {deliverables.map((item, index) => (
            <ClientDeliverableRow creatorId={creator.creatorId} item={item} index={index} quantity={totalQuantity} rowSpan={deliverables.length} feedback={feedback} onChange={onChange} key={item.id} />
          ))}
        </tbody>
      </table>
      {!deliverables.length && <p>Team chưa cập nhật deliverable cho KOC này.</p>}
    </div>
  )
}

export default function ClientDeliverablesReviewTab({ campaign, feedback, onChange, changedCount, savedMessage, saving, onSubmit }) {
  const [filters, setFilters] = useState(EMPTY_CLIENT_DELIVERABLE_FILTERS)
  const [sortCriteria, setSortCriteria] = useState([])
  const creators = useMemo(() => acceptedCampaignCreators(campaign), [campaign])
  const groups = useMemo(() => creators.map((creator) => {
    const items = campaignCreatorDeliverables(campaign, creator)
    return { creator, items, quantity: items.length }
  }), [campaign, creators])
  const filterOptions = useMemo(() => ({
    progress: [...new Set(groups.flatMap(({ items }) => items.map((item) => item.progress || 'Đang liên hệ')))],
    product: [...new Set(groups.flatMap(({ items }) => items.map((item) => item.product || 'Chưa có Product')))].sort(),
    sdha: ['Có SDHA', 'Không SDHA'],
    airStatus: ['Đã có Link Air', 'Chưa có Link Air'],
  }), [groups])
  const visibleGroups = useMemo(() => filterAndSortClientDeliverables(groups, filters, sortCriteria), [filters, groups, sortCriteria])
  const visibleDeliverables = useMemo(() => visibleGroups.reduce((total, group) => total + group.items.length, 0), [visibleGroups])
  const totalDeliverables = useMemo(() => groups.reduce((total, group) => total + group.quantity, 0), [groups])
  const changeFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const clearFilters = () => setFilters(EMPTY_CLIENT_DELIVERABLE_FILTERS)
  const sortBy = (key) => setSortCriteria((current) => cycleCreatorSort(current, key))
  return <>
    <section className="client-review-instruction"><Icon name="checkSquare" size={19} /><div><strong>Theo dõi Deliverables của KOC đã đồng ý</strong><p>Bạn có thể xem tiến độ, demo, lịch air, Code Ads và nhập Brand Feedback cho từng deliverable. Feedback chỉ được gửi khi bấm nút bên dưới.</p></div></section>
    <div className="client-deliverables-filter-wrap">
      <ClientReviewFilterBar
        search={filters.search}
        filters={[
          { key: 'progress', label: 'Tiến độ', values: filters.progress, options: filterOptions.progress },
          { key: 'product', label: 'Product', values: filters.product, options: filterOptions.product },
          { key: 'sdha', label: 'SDHA', values: filters.sdha, options: filterOptions.sdha },
          { key: 'airStatus', label: 'Link Air', values: filters.airStatus, options: filterOptions.airStatus },
        ]}
        resultLabel={`${visibleGroups.length}/${creators.length} KOC · ${visibleDeliverables}/${totalDeliverables} deliverable`}
        onSearch={(value) => changeFilter('search', value)}
        onChange={changeFilter}
        onClear={clearFilters}
      />
      <div className="client-review-sort-hint">Bấm header để sort nhiều tiêu chí · tiêu chí chọn trước được ưu tiên cao hơn</div>
    </div>
    <section className="client-deliverables-review-list">
      {visibleGroups.map(({ creator, items, quantity }, creatorIndex) => <article key={creator.creatorId}>
        <header><span>{String(creatorIndex + 1).padStart(2, '0')}</span><div><strong>{creator.name}</strong><small>@{String(creator.tiktokId).replace(/^@/, '')}</small></div><em>{quantity} deliverable</em></header>
        <ClientDeliverablesTable creator={creator} deliverables={items} totalQuantity={quantity} feedback={feedback} sortCriteria={sortCriteria} onSort={sortBy} onChange={onChange} />
      </article>)}
    </section>
    {!creators.length && <section className="client-review-no-deliverables"><Icon name="clock" size={24} /><strong>Chưa có KOC accepted</strong><p>Deliverables sẽ xuất hiện sau khi Brand Pick và KOC Confirm đều Approved.</p></section>}
    {creators.length > 0 && !visibleGroups.length && <section className="client-review-no-deliverables"><Icon name="search" size={24} /><strong>Không có Deliverable phù hợp</strong><p>Hãy thử thay đổi hoặc xóa các bộ lọc hiện tại.</p><button type="button" onClick={clearFilters}>Xóa bộ lọc</button></section>}
    <footer className="client-review-submit"><div><strong>{changedCount} feedback chưa gửi</strong><small>{savedMessage || 'Brand Feedback sẽ được gom thành một lần cập nhật.'}</small></div><button type="button" disabled={!changedCount || saving} onClick={onSubmit}><Icon name="check" size={17} />{saving ? 'Đang gửi...' : 'Gửi Brand Feedback'}</button></footer>
  </>
}
