import { useState } from 'react'
import { CREATOR_CATEGORIES, CREATOR_SEGMENTS, CREATOR_TYPES } from '../../config/labels'
import { formatCurrency } from '../../utils/formatters'
import { calculateBookingPricing } from '../../utils/pricing'
import Icon from '../common/Icon'

const INITIAL_FORM = {
  name: '', handle: '', tiktokLink: '', segment: 'MINI', category: 'BEAUTY', type: 'VIDEO',
  cost: '', extraCost: '', followers: '', gmvMonth: '', scope: '', contact: '',
  historicalCampaign: 'Chưa hợp tác', mcnNote: '', engagement: '', email: '', phone: '',
}

export default function AddCreatorModal({ onClose, onAdd }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const pricing = calculateBookingPricing(form.cost, form.extraCost)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.handle.trim()) return
    onAdd(form)
  }

  return (
    <div className="modal-layer">
      <button className="modal-scrim" aria-label="Đóng form thêm Creator" onClick={onClose} />
      <form className="creator-modal" onSubmit={submit}>
        <div className="modal-header"><div><span className="eyebrow">Kho Creator</span><h2>Thêm Creator mới</h2><p>Tạo profile ngay. Bạn có thể bổ sung lịch sử Campaign sau.</p></div><button className="icon-button" type="button" onClick={onClose}><Icon name="close" /></button></div>
        <div className="form-grid">
          <label className="field full-field"><span>Tên Creator <b>*</b></span><input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="VD: Ngọc Anh" required /></label>
          <label className="field"><span>Handle kênh <b>*</b></span><input value={form.handle} onChange={(event) => update('handle', event.target.value)} placeholder="@creator.handle" required /></label>
          <label className="field"><span>Link TikTok</span><input value={form.tiktokLink} onChange={(event) => update('tiktokLink', event.target.value)} placeholder="https://www.tiktok.com/@..." /></label>
          <label className="field"><span>Segment</span><select value={form.segment} onChange={(event) => update('segment', event.target.value)}>{CREATOR_SEGMENTS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="field"><span>Category</span><select value={form.category} onChange={(event) => update('category', event.target.value)}>{CREATOR_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="field"><span>Type</span><select value={form.type} onChange={(event) => update('type', event.target.value)}>{CREATOR_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="field"><span>Cost</span><input type="number" min="0" value={form.cost} onChange={(event) => update('cost', event.target.value)} placeholder="0" /></label>
          <label className="field"><span>Extra/FOC (SHDA + hashtag)</span><input type="number" min="0" value={form.extraCost} onChange={(event) => update('extraCost', event.target.value)} placeholder="0" /></label>
          <div className="pricing-preview full-field">
            <div><span>Tổng Cast</span><strong>{pricing.totalCast ? formatCurrency(pricing.totalCast) : '—'}</strong><small>Tự động tính từ Cost + Extra</small></div>
            <div><span>Booking Expense</span><strong>{pricing.bookingExpense ? formatCurrency(pricing.bookingExpense) : '—'}</strong><small>Tự động áp dụng tỷ lệ MCN</small></div>
          </div>
          <label className="field"><span>Người theo dõi</span><input type="number" min="0" value={form.followers} onChange={(event) => update('followers', event.target.value)} placeholder="0" /></label>
          <label className="field"><span>GMV / Month</span><input type="number" min="0" value={form.gmvMonth} onChange={(event) => update('gmvMonth', event.target.value)} placeholder="0" /></label>
          <label className="field full-field"><span>Scope</span><input value={form.scope} onChange={(event) => update('scope', event.target.value)} placeholder="Phạm vi công việc" /></label>
          <label className="field full-field"><span>Contact</span><input value={form.contact} onChange={(event) => update('contact', event.target.value)} placeholder="Email, SĐT, TikTok, ..." /></label>
          <label className="field"><span>Historical campaign</span><select value={form.historicalCampaign} onChange={(event) => update('historicalCampaign', event.target.value)}><option>Chưa hợp tác</option><option>Đã hợp tác</option></select></label>
          <label className="field"><span>MCN note</span><input value={form.mcnNote} onChange={(event) => update('mcnNote', event.target.value)} placeholder="Để trống nếu chưa có ghi chú" /></label>
          <label className="field"><span>Tỷ lệ engagement</span><div className="input-suffix"><input type="number" min="0" step="0.1" value={form.engagement} onChange={(event) => update('engagement', event.target.value)} placeholder="0.0" /><span>%</span></div></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="creator@example.com" /></label>
          <label className="field"><span>Số điện thoại</span><input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+84 ..." /></label>
        </div>
        <div className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>Hủy</button><button className="primary-button" type="submit"><Icon name="plus" />Thêm Creator</button></div>
      </form>
    </div>
  )
}
