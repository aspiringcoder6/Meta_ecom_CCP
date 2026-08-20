import { useMemo, useState } from 'react'
import { formatCompactCurrency } from '../../utils/formatters'
import Icon from '../common/Icon'
import CampaignCreatorPicker from './CampaignCreatorPicker'
import CampaignDeliverableFields from './CampaignDeliverableFields'
import CampaignTimelineFields from './CampaignTimelineFields'

function initialForm(owner) {
  return {
    name: '',
    client: '',
    description: '',
    owner: owner || '',
    startDate: '',
    endDate: '',
    milestones: [],
    totalBudget: '',
    creatorBudget: '',
    creators: [],
    deliverables: [],
  }
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Vui lòng nhập tên Campaign.'
  if (!form.client.trim()) errors.client = 'Vui lòng nhập Client hoặc Brand.'
  if (!form.owner.trim()) errors.owner = 'Vui lòng nhập người phụ trách.'
  if (!form.startDate) errors.startDate = 'Vui lòng chọn ngày bắt đầu.'
  if (!form.endDate) errors.endDate = 'Vui lòng chọn ngày kết thúc.'
  if (form.startDate && form.endDate && form.endDate < form.startDate) errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu.'
  if (form.totalBudget === '') errors.totalBudget = 'Vui lòng nhập tổng ngân sách.'
  else if (Number(form.totalBudget) < 0) errors.totalBudget = 'Ngân sách không thể là số âm.'
  if (form.creatorBudget !== '' && Number(form.creatorBudget) < 0) errors.creatorBudget = 'Ngân sách không thể là số âm.'
  return errors
}

function FieldError({ message }) {
  return message ? <small className="campaign-field-error"><Icon name="warning" size={13} />{message}</small> : null
}

export default function CreateCampaignForm({ creators, owner, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initialForm(owner))
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => current[field] ? { ...current, [field]: undefined } : current)
  }
  const completion = useMemo(() => [
    Boolean(form.name.trim() && form.client.trim() && form.owner.trim()),
    Boolean(form.startDate && form.endDate && form.endDate >= form.startDate),
    form.totalBudget !== '',
  ].filter(Boolean).length, [form])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      window.requestAnimationFrame(() => document.querySelector('.campaign-field.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        client: form.client.trim(),
        description: form.description.trim(),
        owner: form.owner.trim(),
        totalBudget: Number(form.totalBudget) || 0,
        creatorBudget: form.creatorBudget === '' ? null : Number(form.creatorBudget) || 0,
        milestones: form.milestones.filter((milestone) => milestone.title.trim() || milestone.date),
        deliverables: form.deliverables.filter((deliverable) => deliverable.type || deliverable.deadline || deliverable.demoLink || deliverable.description),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="campaign-form-layout" onSubmit={handleSubmit} noValidate>
      <div className="campaign-form-main">
        <section className="campaign-form-section">
          <div className="campaign-section-heading"><span><Icon name="briefcase" size={20} /></span><div><h2>Thông tin chung</h2><p>Thông tin nhận diện và người chịu trách nhiệm chính.</p></div></div>
          <div className="campaign-form-grid">
            <label className={`campaign-field campaign-field-full ${errors.name ? 'has-error' : ''}`}><span>Tên Campaign <b>*</b></span><input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ví dụ: Summer Glow 2026" /><FieldError message={errors.name} /></label>
            <label className={`campaign-field ${errors.client ? 'has-error' : ''}`}><span>Client / Brand <b>*</b></span><input value={form.client} onChange={(event) => update('client', event.target.value)} placeholder="Tên khách hàng hoặc thương hiệu" /><FieldError message={errors.client} /></label>
            <label className={`campaign-field ${errors.owner ? 'has-error' : ''}`}><span>Người phụ trách (Owner) <b>*</b></span><input value={form.owner} onChange={(event) => update('owner', event.target.value)} placeholder="Tên người phụ trách" /><FieldError message={errors.owner} /></label>
            <label className="campaign-field campaign-field-full"><span>Mô tả</span><textarea rows="4" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Mục tiêu, thông điệp và ghi chú chính của Campaign..." /></label>
          </div>
        </section>

        <section className="campaign-form-section">
          <div className="campaign-section-heading"><span><Icon name="clock" size={20} /></span><div><h2>Thời gian & timeline</h2><p>Thiết lập thời gian chạy và những cột mốc cần theo dõi.</p></div></div>
          <div className="campaign-form-grid campaign-date-grid">
            <label className={`campaign-field ${errors.startDate ? 'has-error' : ''}`}><span>Ngày bắt đầu <b>*</b></span><input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} /><FieldError message={errors.startDate} /></label>
            <label className={`campaign-field ${errors.endDate ? 'has-error' : ''}`}><span>Ngày kết thúc <b>*</b></span><input type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => update('endDate', event.target.value)} /><FieldError message={errors.endDate} /></label>
          </div>
          <CampaignTimelineFields value={form.milestones} onChange={(value) => update('milestones', value)} />
        </section>

        <section className="campaign-form-section">
          <div className="campaign-section-heading"><span><Icon name="trending" size={20} /></span><div><h2>Ngân sách</h2><p>Ngân sách theo Creator là tuỳ chọn và có thể cập nhật sau.</p></div></div>
          <div className="campaign-form-grid">
            <label className={`campaign-field ${errors.totalBudget ? 'has-error' : ''}`}><span>Tổng ngân sách <b>*</b></span><div className="campaign-money-input"><input type="number" min="0" step="100000" value={form.totalBudget} onChange={(event) => update('totalBudget', event.target.value)} placeholder="0" /><i>₫</i></div><FieldError message={errors.totalBudget} />{form.totalBudget !== '' && !errors.totalBudget && <small className="campaign-field-hint">{formatCompactCurrency(Number(form.totalBudget))}</small>}</label>
            <label className={`campaign-field ${errors.creatorBudget ? 'has-error' : ''}`}><span>Ngân sách / Creator <em>Tuỳ chọn</em></span><div className="campaign-money-input"><input type="number" min="0" step="100000" value={form.creatorBudget} onChange={(event) => update('creatorBudget', event.target.value)} placeholder="0" /><i>₫</i></div><FieldError message={errors.creatorBudget} />{form.creatorBudget !== '' && !errors.creatorBudget && <small className="campaign-field-hint">{formatCompactCurrency(Number(form.creatorBudget))} / Creator</small>}</label>
          </div>
        </section>

        <section className="campaign-form-section">
          <div className="campaign-section-heading"><span><Icon name="users" size={20} /></span><div><h2>Creator tham gia</h2><p>Chọn Creator và cập nhật trạng thái duyệt ban đầu.</p></div><strong className="campaign-section-count">{form.creators.length} Creator</strong></div>
          <CampaignCreatorPicker creators={creators} value={form.creators} onChange={(value) => update('creators', value)} />
        </section>

        <section className="campaign-form-section">
          <div className="campaign-section-heading"><span><Icon name="checkSquare" size={20} /></span><div><h2>Nội dung bàn giao</h2><p>Thiết lập Deliverable dự kiến cho Campaign.</p></div></div>
          <CampaignDeliverableFields value={form.deliverables} onChange={(value) => update('deliverables', value)} />
        </section>
      </div>

      <aside className="campaign-form-aside">
        <div className="campaign-draft-card">
          <span className="campaign-draft-icon"><Icon name="edit" size={21} /></span>
          <small>Trạng thái khi tạo</small>
          <strong>Draft</strong>
          <p>Campaign sẽ được tạo với ID riêng. Bạn có thể tiếp tục bổ sung và kiểm tra trước khi cho chạy.</p>
        </div>
        <div className="campaign-readiness-card">
          <header><span>Mức độ hoàn thiện</span><strong>{completion}/3</strong></header>
          <div><i style={{ width: `${completion / 3 * 100}%` }} /></div>
          <ul>
            <li className={completion >= 1 && form.name && form.client && form.owner ? 'done' : ''}><Icon name="check" size={14} />Thông tin chung</li>
            <li className={form.startDate && form.endDate && form.endDate >= form.startDate ? 'done' : ''}><Icon name="check" size={14} />Thời gian Campaign</li>
            <li className={form.totalBudget !== '' ? 'done' : ''}><Icon name="check" size={14} />Tổng ngân sách</li>
          </ul>
        </div>
        <div className="campaign-form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Huỷ</button>
          <button type="submit" className="primary-button" disabled={submitting}><Icon name="plus" size={17} />{submitting ? 'Đang tạo...' : 'Tạo Campaign'}</button>
        </div>
        <p className="campaign-permission-note"><Icon name="shield" size={15} />Chỉ Admin và Campaign Manager có quyền tạo.</p>
      </aside>
    </form>
  )
}
