import { clientReviewDecisionLabel } from '../../config/campaigns'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import { toCreatorList } from '../../utils/creatorLists'
import Icon from '../common/Icon'

const DECISIONS = [
  { value: 'APPROVED', label: 'Đồng ý', icon: 'check' },
  { value: 'PENDING', label: 'Pending', icon: 'clock' },
  { value: 'REJECTED', label: 'Từ chối', icon: 'close' },
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
  const creators = campaign.creators || []
  const counts = creators.reduce((result, creator) => {
    const decision = responses[String(creator.creatorId)]?.decision || 'PENDING'
    result[decision] = (result[decision] || 0) + 1
    return result
  }, { APPROVED: 0, PENDING: 0, REJECTED: 0 })

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
      <div className="client-koc-listing-table-wrap">
        <table className="client-koc-listing-table">
          <thead><tr><th>Link TikTok</th><th>ID TikTok</th><th>Expense</th><th>Segment</th><th>Concept</th><th>Type</th><th>Followers</th><th>GMV / Month</th><th>Meta Ecom Note</th><th>Brand Pick</th><th>Brand Note</th><th>KOC Confirm</th></tr></thead>
          <tbody>{creators.map((creator) => {
            const response = responses[String(creator.creatorId)] || { decision: 'PENDING', note: '' }
            const tone = decisionTone(response.decision)
            const confirm = kocDecision(creator)
            const tiktokLink = creatorTikTokLink(creator)
            return <tr className={`is-${tone}`} key={creator.creatorId}>
              <td className="client-listing-sticky-link">{tiktokLink ? <a href={tiktokLink} target="_blank" rel="noreferrer" title={tiktokLink}>{tiktokLink}</a> : <span>Chưa có link</span>}</td>
              <td className="client-listing-sticky-id"><strong>@{String(creator.tiktokId || '').replace(/^@/, '')}</strong><small>{creator.name || 'Creator'}</small></td>
              <td><strong>{formatCompactCurrency(creator.expense ?? creator.suggestedPrice)}</strong></td>
              <td><span className="client-listing-segment">{creator.segment || '—'}</span></td>
              <td><span className="client-listing-clamped" title={creator.concept}>{creator.concept || '—'}</span></td>
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
      </div>
    </section>
    <footer className="client-review-submit"><div><strong>{changedCount} thay đổi chưa gửi</strong><small>{savedMessage || 'Phản hồi sẽ được gom và gửi một lần đến Meta Ecom.'}</small></div><button type="button" disabled={!changedCount || saving} onClick={onSubmit}><Icon name="check" size={17} />{saving ? 'Đang gửi...' : 'Gửi phản hồi'}</button></footer>
  </>
}
