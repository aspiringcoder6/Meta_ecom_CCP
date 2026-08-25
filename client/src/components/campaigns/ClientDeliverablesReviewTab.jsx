import { acceptedCampaignCreators, campaignCreatorDeliverables } from '../../utils/campaignDeliverables'
import Icon from '../common/Icon'

function DeliverableLink({ href, label, emptyLabel }) {
  if (!href) return emptyLabel
  return <a href={href} target="_blank" rel="noreferrer">{label}</a>
}

function ClientDeliverableRow({ creatorId, item, index, quantity, feedback, onChange }) {
  const feedbackKey = `${creatorId}:${item.id}`
  return (
    <tr>
      {index === 0 && <td className="client-deliverable-count" rowSpan={quantity}><strong>{quantity}</strong><small>deliverable</small></td>}
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

function ClientDeliverablesTable({ campaign, creator, feedback, onChange }) {
  const deliverables = campaignCreatorDeliverables(campaign, creator)
  return (
    <div className="client-deliverables-review-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Quantity</th>
            <th>Product</th>
            <th>Tiến độ</th>
            <th>SDHA</th>
            <th>KB, Demo KOC</th>
            <th>Meta Ecom Note</th>
            <th className="client-deliverable-brand-feedback">Brand Feedback</th>
            <th>Air Time</th>
            <th>Link Air</th>
            <th>Code Ads</th>
            <th>Expiry Date Code Ads</th>
          </tr>
        </thead>
        <tbody>
          {deliverables.map((item, index) => (
            <ClientDeliverableRow creatorId={creator.creatorId} item={item} index={index} quantity={deliverables.length} feedback={feedback} onChange={onChange} key={item.id} />
          ))}
        </tbody>
      </table>
      {!deliverables.length && <p>Team chưa cập nhật deliverable cho KOC này.</p>}
    </div>
  )
}

export default function ClientDeliverablesReviewTab({ campaign, feedback, onChange, changedCount, savedMessage, saving, onSubmit }) {
  const creators = acceptedCampaignCreators(campaign)
  return <>
    <section className="client-review-instruction"><Icon name="checkSquare" size={19} /><div><strong>Theo dõi Deliverables của KOC đã đồng ý</strong><p>Bạn có thể xem tiến độ, demo, lịch air, Code Ads và nhập Brand Feedback cho từng deliverable. Feedback chỉ được gửi khi bấm nút bên dưới.</p></div></section>
    <section className="client-deliverables-review-list">
      {creators.map((creator, creatorIndex) => <article key={creator.creatorId}>
        <header><span>{String(creatorIndex + 1).padStart(2, '0')}</span><div><strong>{creator.name}</strong><small>@{String(creator.tiktokId).replace(/^@/, '')}</small></div><em>{campaignCreatorDeliverables(campaign, creator).length} deliverable</em></header>
        <ClientDeliverablesTable campaign={campaign} creator={creator} feedback={feedback} onChange={onChange} />
      </article>)}
    </section>
    {!creators.length && <section className="client-review-no-deliverables"><Icon name="clock" size={24} /><strong>Chưa có KOC accepted</strong><p>Deliverables sẽ xuất hiện sau khi Brand Pick và KOC Confirm đều Approved.</p></section>}
    <footer className="client-review-submit"><div><strong>{changedCount} feedback chưa gửi</strong><small>{savedMessage || 'Brand Feedback sẽ được gom thành một lần cập nhật.'}</small></div><button type="button" disabled={!changedCount || saving} onClick={onSubmit}><Icon name="check" size={17} />{saving ? 'Đang gửi...' : 'Gửi Brand Feedback'}</button></footer>
  </>
}
