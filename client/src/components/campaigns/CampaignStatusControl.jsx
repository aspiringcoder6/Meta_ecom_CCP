import { useState } from 'react'
import { CAMPAIGN_STATUSES } from '../../config/campaigns'
import CampaignStatusBadge from './CampaignStatusBadge'

export default function CampaignStatusControl({ status, canEdit, onChange }) {
  const [saving, setSaving] = useState(false)

  if (!canEdit) return <span data-tour="campaign-status-control"><CampaignStatusBadge status={status} /></span>

  const handleChange = async (event) => {
    const nextStatus = event.target.value
    if (nextStatus === status) return
    setSaving(true)
    try {
      await onChange(nextStatus)
    } finally {
      setSaving(false)
    }
  }

  return (
    <label className={`campaign-status-control campaign-status-control-${String(status).toLowerCase()} ${saving ? 'is-saving' : ''}`} data-tour="campaign-status-control">
      <span>Trạng thái Campaign</span>
      <div><i /><select value={status} disabled={saving} onChange={handleChange} aria-label="Cập nhật trạng thái Campaign">{CAMPAIGN_STATUSES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div>
      <small>{saving ? 'Đang lưu thay đổi...' : 'Admin và Campaign Manager có thể cập nhật'}</small>
    </label>
  )
}
