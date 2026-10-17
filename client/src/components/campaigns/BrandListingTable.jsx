import { memo, useLayoutEffect, useRef, useState } from 'react'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import CategoryPathRibbons from '../creators/CategoryPathRibbons'
import ProductAutocompleteInput from '../common/ProductAutocompleteInput'

const DECISIONS = { APPROVED: 'Đồng ý', PENDING: 'Pending', REJECTED: 'Từ chối' }
export function BrandConflict({ row, conflicted, onRebase }) {
  return conflicted ? <div className="brand-conflict" role="alert"><strong>KOC vừa có cập nhật từ người khác</strong><details><summary>Đối chiếu bản trên hệ thống</summary><p>Brand Pick: {DECISIONS[row.clientDecision]} · Brand Note: {row.clientNote || 'Chưa có'} · Sản phẩm: {row.brandProducts?.join(', ') || 'Chưa có'}</p>{row.deliverables?.map((item) => <p key={item.id}>{item.product || item.id}: {item.brandFeedback || 'Chưa có feedback'}</p>)}</details><button type="button" onClick={() => onRebase(row.creatorId)}>Giữ nháp và gửi theo bản mới</button><button type="button" onClick={() => onRebase(row.creatorId, true)}>Dùng bản trên hệ thống</button></div> : null
}

const ListingRow = memo(function ListingRow({ row, draft, issue, saving, options, onEdit, onRebase }) {
  const [expanded, setExpanded] = useState(false)
  const value = draft?.changes || {}
  const decision = value.decision ?? row.clientDecision
  return <><tr className={`${draft ? 'has-draft' : ''} ${issue ? 'has-error' : ''}`}>
    <td className="brand-sticky-link">{/^https?:\/\//i.test(row.tiktokLink || '') ? <a href={row.tiktokLink} target="_blank" rel="noreferrer" title={row.tiktokLink}>TikTok ↗</a> : <span title={row.tiktokLink}>{row.tiktokLink || '—'}</span>}</td>
    <td className="brand-sticky-id"><strong>@{row.tiktokId}</strong><small>{row.name}</small><button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}</button>{issue && <span className="brand-row-error">{issue.message}</span>}</td>
    <td><strong>{formatCompactCurrency(row.expense)}</strong></td>
    <td><textarea rows="2" aria-label={`Brand Note ${row.tiktokId}`} disabled={saving} value={value.note ?? row.clientNote} onChange={(event) => onEdit(row, 'note', event.target.value)} /></td>
    <td><ProductAutocompleteInput label={`Sản phẩm gửi @${row.tiktokId}`} disabled={saving} value={value.brandProducts ?? row.brandProducts.join(', ')} options={options} onChange={(text) => onEdit(row, 'brandProducts', text)} /><small>Ngăn cách bằng dấu phẩy</small></td>
    <td><span className={`brand-decision-tag is-${row.kocDecision.toLowerCase()}`}>{DECISIONS[row.kocDecision]}</span></td>
    <td className="brand-sticky-pick"><div className="brand-pick-buttons">{Object.entries(DECISIONS).map(([id, label]) => <button title={label} type="button" disabled={saving} className={`${decision === id ? 'is-selected' : ''} is-${id.toLowerCase()}`} onClick={() => onEdit(row, 'decision', id)} key={id}>{label}</button>)}</div></td>
  </tr>{(expanded || (draft && draft.expectedRevision !== row.revision)) && <tr className="brand-row-details"><td colSpan="7"><BrandConflict row={row} conflicted={draft && draft.expectedRevision !== row.revision} onRebase={onRebase} /><div className="brand-profile-details"><div><small>Category</small><CategoryPathRibbons values={row.category} level={2} /></div><div><small>Segment / Type</small><strong>{row.segment} · {row.type.join(', ')}</strong></div><div><small>Followers</small><strong>{formatNumber(row.followers)}</strong></div><div><small>GMV / Month</small><strong>{formatCompactCurrency(row.gmvMonth)}</strong></div><div><small>Meta Ecom Note</small><p>{row.metaEcomNote || 'Chưa có ghi chú'}</p></div><div><small>Link TikTok</small><a href={row.tiktokLink} target="_blank" rel="noreferrer">{row.tiktokLink}</a></div></div></td></tr>}</>
})

export default function BrandListingTable({ rows, drafts, errors, saving, onEdit, onRebase, options, onSort, sort }) {
  const wrapper = useRef(null)
  useLayoutEffect(() => {
    const cell = wrapper.current?.querySelector('thead th')
    if (!cell) return undefined
    const measure = () => wrapper.current?.style.setProperty('--brand-link-width', `${cell.getBoundingClientRect().width}px`)
    measure()
    const observer = new ResizeObserver(measure); observer.observe(cell)
    return () => observer.disconnect()
  }, [])
  const priority = sort.findIndex((item) => item.key === 'tiktokId')
  return <div className="brand-table-scroll" ref={wrapper}><table className="brand-listing-table"><thead><tr><th className="brand-sticky-link">Link TikTok</th><th className="brand-sticky-id"><button type="button" onClick={() => onSort('tiktokId')}>ID TikTok {priority >= 0 ? `${sort[priority].direction === 'asc' ? '↑' : '↓'} ${priority + 1}` : '↕'}</button></th><th><button type="button" onClick={() => onSort('expense')}>Expense ↕</button></th><th>Brand Note</th><th>Sản phẩm gửi KOC</th><th>KOC Confirm</th><th className="brand-sticky-pick">Brand Pick</th></tr></thead><tbody>{rows.map((row) => <ListingRow key={row.creatorId} row={row} draft={drafts[row.creatorId]} issue={errors?.find((issue) => issue.creatorId === row.creatorId)} saving={saving} options={options} onEdit={onEdit} onRebase={onRebase} />)}</tbody></table></div>
}
