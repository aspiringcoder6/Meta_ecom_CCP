import { useEffect, useRef, useState } from 'react'
import useShippingWorkspace, { emptyShipment } from '../../hooks/useShippingWorkspace'
import WorkspacePagination from './WorkspacePagination'
import '../../styles/shipping-workspace.css'

const SHIPPING_LABELS = { NOT_SENT: 'Chưa gửi', SENT: 'Đã gửi', IN_TRANSIT: 'Đang giao', PARTIAL: 'Nhận một phần', DELIVERED: 'Brand báo đã nhận đủ', ISSUE: 'Có vấn đề' }
const RECEIPTS = { UNCONFIRMED: 'Chưa xác nhận', PARTIAL: 'KOC nhận một phần', CONFIRMED: 'KOC đã nhận đủ' }
const formatTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : ''

function ShipmentEditor({ source, creator, state, isTeam, canEdit, api }) {
  const draft = state.drafts[source.id]
  const value = { ...source, ...(draft?.changes || {}) }
  const issue = state.issues[source.id]
  const [events, setEvents] = useState(null), [historyError, setHistoryError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  useEffect(() => {
    if (!historyOpen) return undefined
    let active = true
    api.history(source.id).then((value) => { if (active) { setEvents(value); setHistoryError('') } }).catch(() => { if (active) setHistoryError('Chưa tải được lịch sử. Đóng và mở lại để thử lại.') })
    return () => { active = false }
  }, [api, source.id, source.revision, historyOpen])
  const changedElsewhere = draft && source.revision !== draft.base.revision
  const update = (changes) => state.change(source, changes)
  const setStatus = (status) => update({ status, ...(status === 'DELIVERED' ? { items: value.items.map((item) => ({ ...item, receivedQuantity: item.quantity })) } : {}) })
  const editItem = (index, field, entry) => update({ items: value.items.map((item, i) => i === index ? { ...item, [field]: field === 'product' ? entry : Number(entry) } : item) })
  return <section className={`shipment-editor ${issue || changedElsewhere ? 'has-error' : ''}`}>
    <header><strong>Đợt gửi {source.revision ? source.id.slice(0, 8) : 'mới'}</strong><span>{draft ? state.saving ? 'Đang lưu...' : issue ? 'Chưa lưu được' : 'Bản nháp · chờ lưu' : `Đã lưu · ${formatTime(source.updatedAt)}`}</span>{draft && canEdit && <button type="button" onClick={() => state.discard(source.id)}>Bỏ nháp</button>}</header>
    {(issue || changedElsewhere) && <div className="shipping-error" role="alert"><p>{issue?.message || 'Có người vừa sửa đợt hàng này. Hãy đối chiếu thông tin mới bên dưới trước khi tiếp tục.'}</p>{(issue?.current || changedElsewhere) && <details><summary>Xem bản đang lưu trên hệ thống</summary><p>{SHIPPING_LABELS[(issue?.current || source).status]} · {(issue?.current || source).carrier} · {(issue?.current || source).trackingCode}</p><p>{(issue?.current || source).note}</p><ul>{((issue?.current || source).items || []).map((item, i) => <li key={i}>{item.product}: {item.receivedQuantity}/{item.quantity}</li>)}</ul></details>}<div><button type="button" onClick={() => state.retry(source.id, issue?.current || source)}>{issue?.code === 'SHIPMENT_CONFLICT' || changedElsewhere ? 'Giữ nháp và lưu theo bản mới' : 'Thử lưu lại'}</button><button type="button" onClick={() => state.discard(source.id)}>Dùng bản trên hệ thống</button></div></div>}
    <div className="shipment-fields">
      <label>Tình trạng Brand báo<select aria-label="Tình trạng Brand báo" disabled={!canEdit} value={value.status} onChange={(event) => setStatus(event.target.value)}>{Object.entries(SHIPPING_LABELS).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
      <label>Đơn vị vận chuyển<input disabled={!canEdit} value={value.carrier} onChange={(event) => update({ carrier: event.target.value })} placeholder="GHN, GHTK, Viettel Post..." /></label>
      <label>Mã vận đơn<input disabled={!canEdit} value={value.trackingCode} onChange={(event) => update({ trackingCode: event.target.value })} /></label>
      <label>Ngày gửi<input disabled={!canEdit} type="date" value={value.sentDate} onChange={(event) => update({ sentDate: event.target.value })} /></label>
      <label>Dự kiến nhận<input disabled={!canEdit} type="date" value={value.expectedDate} onChange={(event) => update({ expectedDate: event.target.value })} /></label>
      <label>Ngày báo nhận<input disabled={!canEdit} type="date" value={value.receivedDate} onChange={(event) => update({ receivedDate: event.target.value })} /></label>
    </div>
    <div className="shipment-items"><div className="shipment-items-heading"><strong>Sản phẩm trong đợt</strong><span>Số gửi / Số Brand báo đã nhận</span></div>{value.items.map((item, index) => <div className="shipment-item" key={index}><input aria-label={`Sản phẩm ${index + 1} ${creator.tiktokId}`} list={`shipping-products-${source.id}`} disabled={!canEdit} value={item.product} onChange={(event) => editItem(index, 'product', event.target.value)} placeholder="Tên sản phẩm" /><input aria-label={`Số gửi ${index + 1}`} type="number" min="1" max="10000" disabled={!canEdit} value={item.quantity} onChange={(event) => editItem(index, 'quantity', event.target.value)} /><input aria-label={`Số đã nhận ${index + 1}`} type="number" min="0" max={item.quantity} disabled={!canEdit} value={item.receivedQuantity} onChange={(event) => editItem(index, 'receivedQuantity', event.target.value)} />{canEdit && <button type="button" aria-label={`Bỏ sản phẩm ${index + 1}`} onClick={() => update({ items: value.items.filter((_, i) => i !== index) })}>×</button>}</div>)}<datalist id={`shipping-products-${source.id}`}>{(creator.brandProducts || []).map((product) => <option key={product}>{product}</option>)}</datalist>{canEdit && <button type="button" className="shipping-text-button" onClick={() => update({ items: [...value.items, { product: '', quantity: 1, receivedQuantity: 0 }] })}>+ Thêm sản phẩm</button>}</div>
    <label className="shipment-note">Ghi chú giao/nhận hàng<textarea aria-label="Ghi chú giao/nhận hàng" disabled={!canEdit} rows="2" value={value.note} onChange={(event) => update({ note: event.target.value })} /></label>
    <div className="shipment-confirmation"><div><strong>Xác nhận của team/KOC</strong><p>{source.confirmedBy ? `${source.confirmedBy} · ${formatTime(source.confirmedAt)}` : 'Thông tin Brand báo không thay thế xác nhận thực nhận của team/KOC.'}</p></div>{isTeam ? <select disabled={!canEdit} aria-label={`Xác nhận nhận hàng ${creator.tiktokId}`} value={value.teamReceipt} onChange={(event) => update({ teamReceipt: event.target.value })}>{Object.entries(RECEIPTS).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select> : <span className={`shipping-receipt ${value.teamReceipt === 'CONFIRMED' ? 'is-confirmed' : ''}`}>{RECEIPTS[source.teamReceipt] || RECEIPTS.UNCONFIRMED}</span>}</div>
    {source.revision > 0 && <details onToggle={(event) => setHistoryOpen(event.currentTarget.open)}><summary>Lịch sử cập nhật</summary>{historyError && <p role="alert">{historyError}</p>}{events?.map((entry) => <article className="shipment-history-entry" key={entry.id}><strong>{entry.actorType === 'BRAND' ? 'Brand' : 'Team'} · {entry.actor}</strong><small>{formatTime(entry.createdAt)}</small><p>{Object.entries(entry.snapshot || {}).filter(([key]) => key !== 'revision').map(([key, value]) => key === 'items' ? `Sản phẩm: ${value.map((item) => `${item.product} (${item.receivedQuantity}/${item.quantity})`).join(', ')}` : `${({ status: 'Trạng thái', note: 'Ghi chú', teamReceipt: 'Xác nhận', carrier: 'Vận chuyển', trackingCode: 'Vận đơn', sentDate: 'Ngày gửi', expectedDate: 'Dự kiến nhận', receivedDate: 'Ngày nhận' })[key] || key}: ${SHIPPING_LABELS[value] || RECEIPTS[value] || value}`).join(' · ')}</p></article>)}</details>}
  </section>
}

export default function ShippingWorkspace({ scope, api, isTeam = false, canEdit = true, reloadSignal = 0, initialUnread = false }) {
  const state = useShippingWorkspace(scope, api, initialUnread)
  const [expanded, setExpanded] = useState({}), [selected, setSelected] = useState({})
  const [bulkStatus, setBulkStatus] = useState('SENT'), [paste, setPaste] = useState(''), [pasteMessage, setPasteMessage] = useState('')
  // Realtime refresh is driven by the parent; stable queries keep active drafts/focus intact.
  const seenReload = useRef(reloadSignal)
  const refresh = state.refresh
  useEffect(() => { if (seenReload.current !== reloadSignal) { seenReload.current = reloadSignal; refresh() } }, [reloadSignal, refresh])
  const creators = state.data?.creators || []
  const pendingCount = Object.keys(state.drafts).length
  const [readError, setReadError] = useState('')
  const markRead = async (creator) => {
    try { await api.markRead((creator.shipments || []).filter((item) => item.unread).map((item) => ({ id: item.id, revision: item.lastBrandRevision }))); state.refresh(); setReadError('') }
    catch { setReadError('Chưa lưu được trạng thái đã xem. Hãy thử lại.') }
  }
  const shipmentsFor = (creator) => {
    const result = new Map((creator.shipments || []).map((item) => [item.id, item]))
    for (const draft of Object.values(state.drafts)) if (draft.base.creatorId === creator.creatorId && !result.has(draft.base.id)) result.set(draft.base.id, draft.base)
    return [...result.values()]
  }
  const add = (creator) => { const shipment = emptyShipment(creator); state.change(shipment, { items: shipment.items, status: 'NOT_SENT' }); setExpanded((old) => ({ ...old, [creator.creatorId]: true })) }
  const applyBulk = () => {
    for (const creator of state.cached.values()) {
      if (!selected[creator.creatorId]) continue
      const source = shipmentsFor(creator).at(-1) || emptyShipment(creator)
      state.change(source, { status: bulkStatus, ...(source.revision ? {} : { items: source.items }), ...(bulkStatus === 'DELIVERED' ? { items: (state.drafts[source.id]?.changes.items || source.items).map((item) => ({ ...item, receivedQuantity: item.quantity })) } : {}) })
    }
  }
  const [lookingUp, setLookingUp] = useState(false)
  const applyPaste = async () => {
    const lines = paste.split(/\r?\n/).filter((line) => line.trim())
    if (!lines.length || lines.length > 200) { setPasteMessage('Dán từ 1–200 dòng trong một lần.'); return }
    setLookingUp(true)
    try { await state.resolveHandles(lines.map((line) => line.split('\t')[0].trim())) }
    catch { setPasteMessage('Chưa tra cứu được KOC. Danh sách dán vẫn được giữ; hãy thử lại.'); setLookingUp(false); return }
    setLookingUp(false)
    const problems = []; let count = 0
    for (const [index, line] of lines.entries()) {
      if (!line.trim()) continue
      const [handle, trackingCode, carrier] = line.split('\t').map((value) => value.trim())
      const creator = [...state.cached.values()].find((row) => row.tiktokId.replace(/^@/, '').toLowerCase() === handle.replace(/^@/, '').toLowerCase())
      if (!creator || !trackingCode) { problems.push(`Dòng ${index + 1}: ${!creator ? 'không tìm thấy KOC đủ điều kiện trong Campaign' : 'thiếu mã vận đơn'}`); continue }
      const source = shipmentsFor(creator).at(-1) || emptyShipment(creator)
      state.change(source, { trackingCode, carrier: carrier || '', status: 'SENT', ...(source.revision ? {} : { items: source.items }) }); count++
    }
    setPasteMessage(`Đã áp dụng ${count} dòng. ${problems.join(' · ')}`)
  }
  return <section className="shipping-workspace">
    <header className="shipping-heading"><div><span>GIAO & NHẬN HÀNG</span><h2>Sản phẩm gửi KOC</h2><p>Mỗi KOC có thể có nhiều đợt hàng. Tiến độ giao hàng tách biệt với tiến độ sản xuất video.</p></div><div className="shipping-save-status" aria-live="polite">{state.saving ? 'Đang lưu...' : pendingCount ? `${pendingCount} đợt chưa lưu` : state.lastSaved ? `Đã lưu lúc ${state.lastSaved}` : 'Tự động lưu khi chỉnh sửa'}{!state.storageOk && <strong>Không lưu được nháp trên trình duyệt. Hãy giữ tab mở.</strong>}</div></header>
    <div className="shipping-toolbar"><input aria-label="Tìm KOC hoặc vận đơn" value={state.query.search} onChange={(event) => state.setQuery((old) => ({ ...old, page: 1, search: event.target.value }))} placeholder="Tìm KOC, sản phẩm, vận đơn..." /><select aria-label="Lọc tình trạng giao hàng" onChange={(event) => state.setQuery((old) => ({ ...old, page: 1, filters: JSON.stringify(event.target.value ? { shippingStatus: [event.target.value] } : {}) }))}><option value="">Tất cả tình trạng giao hàng</option>{Object.entries(SHIPPING_LABELS).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select><button type="button" onClick={state.refresh} disabled={state.loading}>Làm mới</button></div>
    {isTeam && <label className="shipping-unread-filter"><input type="checkbox" checked={state.query.unread === '1'} onChange={(event) => state.setQuery((old) => ({ ...old, page: 1, unread: event.target.checked ? '1' : '' }))} />Chỉ hiện KOC có cập nhật Brand chưa xem</label>}
    {readError && <p className="shipping-error" role="alert">{readError}</p>}
    {state.error && <div className="shipping-error" role="alert">{state.error}<button type="button" onClick={state.refresh}>Thử lại</button></div>}
    {canEdit && <details className="shipping-bulk"><summary>Cập nhật nhiều KOC / Dán vận đơn từ Excel</summary><div><select aria-label="Trạng thái cập nhật hàng loạt" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>{Object.entries(SHIPPING_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button type="button" disabled={!Object.values(selected).some(Boolean)} onClick={applyBulk}>Áp dụng cho {Object.values(selected).filter(Boolean).length} KOC đã chọn</button></div><label>Dán 3 cột: ID TikTok · Mã vận đơn · Đơn vị vận chuyển<textarea aria-label="Dán vận đơn từ Excel" value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={'creator01\tVD123\tGHN'} /></label><p>Đối chiếu tối đa 200 KOC trên toàn Campaign, không cần mở từng trang. Dòng không khớp được báo lại; dòng hợp lệ vẫn xử lý.</p><button type="button" disabled={lookingUp} onClick={applyPaste}>{lookingUp ? 'Đang đối chiếu KOC...' : 'Áp dụng danh sách vận đơn'}</button><p role="status">{pasteMessage}</p></details>}
    {state.loading && <p className="shipping-loading" role="status">Đang tải giao/nhận hàng...</p>}
    <div className="shipping-creators">{creators.map((creator) => {
      const shipments = shipmentsFor(creator)
      const open = expanded[creator.creatorId]
      const unread = isTeam && shipments.some((item) => item.unread)
      return <article className={`shipping-creator${unread ? ' has-unread' : ''}`} key={creator.creatorId}><header>{canEdit && <input aria-label={`Chọn ${creator.tiktokId}`} type="checkbox" checked={Boolean(selected[creator.creatorId])} onChange={(event) => setSelected((old) => ({ ...old, [creator.creatorId]: event.target.checked }))} />}<button type="button" aria-expanded={Boolean(open)} onClick={() => setExpanded((old) => ({ ...old, [creator.creatorId]: !open }))}><strong>@{creator.tiktokId}{unread ? ' · Mới' : ''}</strong><span>{creator.name}</span></button><div><span>{shipments.length ? `${shipments.length} đợt hàng` : 'Chưa có đợt hàng'}</span><small>{shipments.filter((item) => item.teamReceipt === 'CONFIRMED').length} đợt đã được team xác nhận</small></div>{unread && <button type="button" onClick={() => markRead(creator)}>Đã xem thay đổi</button>}{canEdit && <button type="button" onClick={() => add(creator)}>+ Thêm đợt gửi</button>}</header>{!open && shipments.length > 0 && <div className="shipping-row-summary">{shipments.map((item) => <span key={item.id}>{SHIPPING_LABELS[state.drafts[item.id]?.changes.status || item.status]}{item.trackingCode ? ` · ${item.trackingCode}` : ''}</span>)}</div>}{open && <div className="shipment-editors">{shipments.map((source) => <ShipmentEditor key={source.id} source={source} creator={creator} state={state} isTeam={isTeam} canEdit={canEdit} api={api} />)}{!shipments.length && <p>Chưa có đợt giao hàng cho KOC này.</p>}</div>}</article>
    })}</div>
    {!state.loading && !creators.length && <div className="shipping-empty">Chưa có KOC phù hợp. Giao hàng dành cho KOC được Brand và KOC cùng đồng ý.</div>}
    <WorkspacePagination value={state.data?.pagination} disabled={state.loading} onChange={(changes) => state.setQuery((old) => ({ ...old, ...changes }))} />
  </section>
}
