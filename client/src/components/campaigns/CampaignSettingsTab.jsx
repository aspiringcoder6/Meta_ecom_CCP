import { useMemo, useState } from 'react'
import { formatCompactCurrency } from '../../utils/formatters'
import Icon from '../common/Icon'
import CampaignCategoryField from './CampaignCategoryField'

function settingsFromCampaign(campaign) {
  return {
    name: campaign.name || '',
    client: campaign.client || '',
    owner: campaign.owner || '',
    description: campaign.description || '',
    category: Array.isArray(campaign.category) ? campaign.category : [],
    startDate: campaign.startDate || '',
    endDate: campaign.endDate || '',
    totalBudget: campaign.totalBudget ?? '',
    creatorBudget: campaign.creatorBudget ?? '',
  }
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Vui lòng nhập tên Campaign.'
  if (!form.client.trim()) errors.client = 'Vui lòng nhập Client hoặc Brand.'
  if (!form.owner.trim()) errors.owner = 'Vui lòng nhập Owner.'
  if (!form.startDate) errors.startDate = 'Vui lòng chọn ngày bắt đầu.'
  if (!form.endDate) errors.endDate = 'Vui lòng chọn ngày kết thúc.'
  if (form.startDate && form.endDate && form.endDate < form.startDate) errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu.'
  if (form.totalBudget === '' || Number(form.totalBudget) < 0) errors.totalBudget = 'Tổng ngân sách không hợp lệ.'
  if (form.creatorBudget !== '' && Number(form.creatorBudget) < 0) errors.creatorBudget = 'Ngân sách Creator không hợp lệ.'
  return errors
}

function SettingsFieldError({ message }) {
  return message ? <small className="campaign-field-error"><Icon name="warning" size={13} />{message}</small> : null
}

export default function CampaignSettingsTab({ campaign, creators, canEdit, onSave }) {
  const [form, setForm] = useState(() => settingsFromCampaign(campaign))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const original = useMemo(() => settingsFromCampaign(campaign), [campaign])
  const dirty = JSON.stringify(form) !== JSON.stringify(original)
  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => current[field] ? { ...current, [field]: undefined } : current)
    setSaveError('')
  }
  const reset = () => {
    setForm(settingsFromCampaign(campaign))
    setErrors({})
    setSaveError('')
  }
  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const saved = await onSave({
        ...form,
        name: form.name.trim(),
        client: form.client.trim(),
        owner: form.owner.trim(),
        description: form.description.trim(),
        totalBudget: Number(form.totalBudget) || 0,
        creatorBudget: form.creatorBudget === '' ? null : Number(form.creatorBudget) || 0,
      })
      setForm(settingsFromCampaign(saved))
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không thể cập nhật Campaign.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="campaign-detail-tab campaign-settings-tab">
      <form className="campaign-detail-card campaign-settings-card" onSubmit={submit} noValidate>
        <header className="campaign-tab-heading">
          <div><span className="eyebrow">Campaign Configuration</span><h2>Settings</h2><p>Chỉnh sửa thông tin chung, Category, thời gian và ngân sách của Campaign.</p></div>
          {canEdit && <div className="campaign-settings-actions"><button type="button" className="secondary-button" disabled={!dirty || saving} onClick={reset}>Hoàn tác</button><button type="submit" className="primary-button" disabled={!dirty || saving}><Icon name="check" size={15} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>}
        </header>

        {!canEdit && <div className="campaign-settings-readonly"><Icon name="shield" size={15} />Bạn chỉ có quyền xem thông tin Campaign.</div>}
        {saveError && <div className="campaign-settings-error"><Icon name="warning" size={15} />{saveError}</div>}

        <fieldset disabled={!canEdit || saving}>
          <section className="campaign-settings-section">
            <div className="campaign-settings-section-heading"><span><Icon name="briefcase" size={18} /></span><div><h3>Thông tin chung</h3><p>Tên, khách hàng, người phụ trách và mô tả Campaign.</p></div></div>
            <div className="campaign-form-grid">
              <label className={`campaign-field campaign-field-full ${errors.name ? 'has-error' : ''}`}><span>Tên Campaign <b>*</b></span><input value={form.name} onChange={(event) => update('name', event.target.value)} /><SettingsFieldError message={errors.name} /></label>
              <label className={`campaign-field ${errors.client ? 'has-error' : ''}`}><span>Client / Brand <b>*</b></span><input value={form.client} onChange={(event) => update('client', event.target.value)} /><SettingsFieldError message={errors.client} /></label>
              <label className={`campaign-field ${errors.owner ? 'has-error' : ''}`}><span>Owner <b>*</b></span><input value={form.owner} onChange={(event) => update('owner', event.target.value)} /><SettingsFieldError message={errors.owner} /></label>
              <label className="campaign-field campaign-field-full"><span>Mô tả</span><textarea rows="4" value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
              <div className="campaign-field campaign-field-full"><span>Category <em>Tuỳ chọn</em></span><CampaignCategoryField creators={creators} value={form.category} onChange={(value) => update('category', value)} disabled={!canEdit || saving} /></div>
            </div>
          </section>

          <section className="campaign-settings-section">
            <div className="campaign-settings-section-heading"><span><Icon name="clock" size={18} /></span><div><h3>Thời gian & ngân sách</h3><p>Timeline chi tiết vẫn được quản lý riêng trong tab Timeline.</p></div></div>
            <div className="campaign-form-grid">
              <label className={`campaign-field ${errors.startDate ? 'has-error' : ''}`}><span>Ngày bắt đầu <b>*</b></span><input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} /><SettingsFieldError message={errors.startDate} /></label>
              <label className={`campaign-field ${errors.endDate ? 'has-error' : ''}`}><span>Ngày kết thúc <b>*</b></span><input type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => update('endDate', event.target.value)} /><SettingsFieldError message={errors.endDate} /></label>
              <label className={`campaign-field ${errors.totalBudget ? 'has-error' : ''}`}><span>Tổng ngân sách <b>*</b></span><div className="campaign-money-input"><input type="number" min="0" value={form.totalBudget} onChange={(event) => update('totalBudget', event.target.value)} /><i>₫</i></div><SettingsFieldError message={errors.totalBudget} />{form.totalBudget !== '' && !errors.totalBudget && <small className="campaign-field-hint">{formatCompactCurrency(Number(form.totalBudget))}</small>}</label>
              <label className={`campaign-field ${errors.creatorBudget ? 'has-error' : ''}`}><span>Ngân sách / Creator <em>Tuỳ chọn</em></span><div className="campaign-money-input"><input type="number" min="0" value={form.creatorBudget} onChange={(event) => update('creatorBudget', event.target.value)} /><i>₫</i></div><SettingsFieldError message={errors.creatorBudget} />{form.creatorBudget !== '' && !errors.creatorBudget && <small className="campaign-field-hint">{formatCompactCurrency(Number(form.creatorBudget))} / Creator</small>}</label>
            </div>
          </section>
        </fieldset>
      </form>
    </div>
  )
}
