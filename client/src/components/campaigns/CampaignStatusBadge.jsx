import { campaignStatusLabel } from '../../config/campaigns'

export default function CampaignStatusBadge({ status }) {
  return <span className={`campaign-status campaign-status-${String(status).toLowerCase()}`}><i />{campaignStatusLabel(status)}</span>
}
