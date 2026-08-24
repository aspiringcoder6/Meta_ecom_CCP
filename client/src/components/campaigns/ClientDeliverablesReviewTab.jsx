import { acceptedCampaignCreators, campaignCreatorDeliverables } from '../../utils/campaignDeliverables'
import Icon from '../common/Icon'

export default function ClientDeliverablesReviewTab({ campaign, feedback, onChange, changedCount, savedMessage, saving, onSubmit }) {
  const creators = acceptedCampaignCreators(campaign)
  return <>
    <section className="client-review-instruction"><Icon name="checkSquare" size={19} /><div><strong>Theo dõi Deliverables của KOC đã đồng ý</strong><p>Bạn có thể xem tiến độ, demo, lịch air và nhập Brand Feedback cho từng deliverable. Feedback chỉ được gửi khi bấm nút bên dưới.</p></div></section>
    <section className="client-deliverables-review-list">{creators.map((creator, creatorIndex) => <article key={creator.creatorId}>
      <header><span>{String(creatorIndex + 1).padStart(2, '0')}</span><div><strong>{creator.name}</strong><small>@{String(creator.tiktokId).replace(/^@/, '')}</small></div><em>{campaignCreatorDeliverables(campaign, creator).length} deliverable</em></header>
      <div className="client-deliverables-review-table-wrap"><table><thead><tr><th>Quantity</th><th>Product</th><th>Tiến độ</th><th>SDHA</th><th>KB, Demo KOC</th><th>Meta Ecom Note</th><th>Air Time / Link</th><th>Brand Feedback</th></tr></thead><tbody>{campaignCreatorDeliverables(campaign, creator).map((item, index, items) => {
        const key = `${creator.creatorId}:${item.id}`
        return <tr key={item.id}>{index === 0 && <td className="client-deliverable-count" rowSpan={items.length}><strong>{items.length}</strong><small>deliverable</small></td>}<td>{item.product || '—'}</td><td><span className="client-deliverable-progress">{item.progress || 'Đang liên hệ'}</span></td><td>{item.sdha ? <Icon name="check" size={15} /> : '—'}</td><td>{item.demoLink ? <a href={item.demoLink} target="_blank" rel="noreferrer">Mở demo</a> : 'Chưa có link'}</td><td>{item.metaEcomNote || '—'}</td><td className="client-deliverable-air"><span>{item.airTime || 'Chưa có lịch'}</span>{item.airLink && <a href={item.airLink} target="_blank" rel="noreferrer">Mở video</a>}</td><td><textarea rows="3" value={feedback[key] || ''} onChange={(event) => onChange(key, event.target.value)} placeholder="Nhập feedback cho deliverable..." /></td></tr>
      })}</tbody></table>{!campaignCreatorDeliverables(campaign, creator).length && <p>Team chưa cập nhật deliverable cho KOC này.</p>}</div>
    </article>)}</section>
    {!creators.length && <section className="client-review-no-deliverables"><Icon name="clock" size={24} /><strong>Chưa có KOC accepted</strong><p>Deliverables sẽ xuất hiện sau khi Brand Pick và KOC Confirm đều Approved.</p></section>}
    <footer className="client-review-submit"><div><strong>{changedCount} feedback chưa gửi</strong><small>{savedMessage || 'Brand Feedback sẽ được gom thành một lần cập nhật.'}</small></div><button type="button" disabled={!changedCount || saving} onClick={onSubmit}><Icon name="check" size={17} />{saving ? 'Đang gửi...' : 'Gửi Brand Feedback'}</button></footer>
  </>
}
