import { useState } from 'react'
import { CREATOR_CATEGORIES, CREATOR_SEGMENTS, CREATOR_TYPES } from '../../config/labels'
import { formatCurrency } from '../../utils/formatters'
import { calculateBookingPricing } from '../../utils/pricing'
import { validateCreatorValue } from '../../utils/creatorValidation'
import Icon from '../common/Icon'

const EMPTY_FORM = {
  name: '', handle: '', tiktokLink: '', segment: 'MINI', category: 'BEAUTY', type: 'VIDEO',
  cost: '', extraCost: '', followers: '', gmvMonth: '', scope: '', contact: '',
  historicalCampaign: 'Chưa hợp tác', mcnNote: '', engagement: '', email: '', phone: '',
}

function getInitialForm(creator) {
  if (!creator) return EMPTY_FORM
  return {
    name: creator.name || '', handle: creator.tiktokId || '', tiktokLink: creator.tiktokLink || '',
    segment: creator.segment || 'MINI', category: creator.category || 'BEAUTY', type: creator.type || 'VIDEO',
    cost: creator.cost ?? '', extraCost: creator.extraCost ?? '', followers: creator.followers ?? '', gmvMonth: creator.gmvMonth ?? '',
    scope: creator.scope || '', contact: creator.contact === 'Chưa cung cấp' ? '' : creator.contact || '',
    historicalCampaign: creator.historicalCampaign || 'Chưa hợp tác', mcnNote: creator.mcnNote || '', engagement: creator.engagement ?? '',
    email: creator.email === 'Chưa cung cấp' ? '' : creator.email || '', phone: creator.phone === 'Chưa cung cấp' ? '' : creator.phone || '',
  }
}

function validateForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Tên Creator không được để trống.'
  const idResult = validateCreatorValue('tiktokId', form.handle)
  if (idResult.error) errors.handle = idResult.error
  if (form.tiktokLink.trim()) {
    const linkResult = validateCreatorValue('tiktokLink', form.tiktokLink)
    if (linkResult.error) errors.tiktokLink = linkResult.error
  }
  return errors
}

function FieldError({ message }) {
  return message ? <small className="form-field-error" role="alert">{message}</small> : null
}

export default function AddCreatorModal({ creator, onClose, onSubmit }) {
  const [form, setForm] = useState(() => getInitialForm(creator))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = Boolean(creator)
  const pricing = calculateBookingPricing(form.cost, form.extraCost)

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
    setSubmitError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const errors = validateForm(form)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await onSubmit(form)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không thể lưu Creator.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-layer">
      <button className="modal-scrim" aria-label="Đóng form Creator" onClick={onClose} />
      <form className="creator-modal" onSubmit={submit}>
        <div className="modal-header">
          <div><span className="eyebrow">Kho Creator</span><h2>{isEditing ? 'Chỉnh sửa Creator' : 'Thêm Creator mới'}</h2><p>{isEditing ? 'Cập nhật thông tin hồ sơ và lưu trực tiếp vào hệ thống.' : 'Tạo profile ngay. Bạn có thể bổ sung lịch sử Campaign sau.'}</p></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng"><Icon name="close" /></button>
        </div>

        {submitError && <div className="form-submit-error" role="alert"><Icon name="warning" size={16} /><span>{submitError}</span></div>}

        <div className="form-grid">
          <label className={`field full-field ${fieldErrors.name ? 'has-error' : ''}`}><span>Tên Creator <b>*</b></span><input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="VD: Ngọc Anh" /><FieldError message={fieldErrors.name} /></label>
          <label className={`field ${fieldErrors.handle ? 'has-error' : ''}`}><span>ID TikTok <b>*</b></span><input value={form.handle} onChange={(event) => update('handle', event.target.value)} placeholder="vickiee.bae" /><FieldError message={fieldErrors.handle} /></label>
          <label className={`field ${fieldErrors.tiktokLink ? 'has-error' : ''}`}><span>Link TikTok</span><input value={form.tiktokLink} onChange={(event) => update('tiktokLink', event.target.value)} placeholder="https://www.tiktok.com/@..." /><FieldError message={fieldErrors.tiktokLink} /></label>
          <label className="field"><span>Segment</span><select value={form.segment} onChange={(event) => update('segment', event.target.value)}>{CREATOR_SEGMENTS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="field"><span>Category</span><select value={form.category} onChange={(event) => update('category', event.target.value)}>{CREATOR_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="field"><span>Type</span><select value={form.type} onChange={(event) => update('type', event.target.value)}>{CREATOR_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="field"><span>Cost</span><input type="number" min="0" value={form.cost} onChange={(event) => update('cost', event.target.value)} placeholder="0" /></label>
          <label className="field"><span>Extra/FOC (SHDA + hashtag)</span><input type="number" min="0" value={form.extraCost} onChange={(event) => update('extraCost', event.target.value)} placeholder="0" /></label>
          <div className="pricing-preview full-field"><div><span>Tổng Cast</span><strong>{pricing.totalCast ? formatCurrency(pricing.totalCast) : '—'}</strong><small>Tự động tính từ Cost + Extra</small></div><div><span>Booking Expense</span><strong>{pricing.bookingExpense ? formatCurrency(pricing.bookingExpense) : '—'}</strong><small>Tự động áp dụng tỷ lệ MCN</small></div></div>
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

        <div className="modal-footer"><button className="secondary-button" type="button" onClick={onClose} disabled={isSubmitting}>Hủy</button><button className="primary-button" type="submit" disabled={isSubmitting}><Icon name={isEditing ? 'check' : 'plus'} />{isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Thêm Creator'}</button></div>
      </form>
    </div>
  )
}
