import { useNavigate } from 'react-router-dom'
import { formatCompactCurrency } from '../../utils/formatters'
import { campaignProgress, formatCampaignDate } from '../../utils/campaigns'
import Icon from '../common/Icon'
import CampaignStatusBadge from './CampaignStatusBadge'

function CreatorSummary({ creators }) {
  const confirmed = creators.filter((creator) => creator.status === 'CONFIRMED').length
  return <span className="campaign-creator-summary"><strong>{creators.length}</strong><small>{confirmed} đã chốt</small></span>
}

export default function CampaignList({ campaigns, highlightedId }) {
  const navigate = useNavigate()
  if (!campaigns.length) return <div className="campaign-empty"><span><Icon name="briefcase" size={28} /></span><h3>Chưa có Campaign phù hợp</h3><p>Thử thay đổi bộ lọc hoặc tạo Campaign đầu tiên.</p></div>

  return (
    <div className="campaign-table-wrap">
      <table className="campaign-table">
        <thead><tr><th>Campaign</th><th>Owner</th><th>Thời gian</th><th>Creator</th><th>Ngân sách</th><th>Trạng thái</th><th><span className="sr-only">Mở</span></th></tr></thead>
        <tbody>{campaigns.map((campaign) => {
          const progress = campaignProgress(campaign)
          return <tr className={highlightedId === campaign.id ? 'is-new-campaign' : ''} key={campaign.id} onClick={() => navigate(`/campaigns/${campaign.id}`)}>
            <td><div className="campaign-name-cell"><span>{campaign.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div><strong>{campaign.name}</strong><small>{campaign.id} · {campaign.client}</small></div></div></td>
            <td><span className="campaign-owner"><i>{campaign.owner?.slice(0, 1).toUpperCase()}</i>{campaign.owner}</span></td>
            <td><div className="campaign-time-cell"><span>{formatCampaignDate(campaign.startDate)} — {formatCampaignDate(campaign.endDate)}</span><div><i style={{ width: `${progress}%` }} /></div><small>{progress}% timeline</small></div></td>
            <td><CreatorSummary creators={campaign.creators || []} /></td>
            <td><span className="campaign-budget"><strong>{formatCompactCurrency(campaign.totalBudget)}</strong><small>{campaign.creatorBudget ? `${formatCompactCurrency(campaign.creatorBudget)} / Creator` : 'Chưa chia theo Creator'}</small></span></td>
            <td><CampaignStatusBadge status={campaign.status} /></td>
            <td><Icon name="chevronRight" size={17} /></td>
          </tr>
        })}</tbody>
      </table>
      <div className="campaign-cards">{campaigns.map((campaign) => <button type="button" key={campaign.id} onClick={() => navigate(`/campaigns/${campaign.id}`)}><header><div><small>{campaign.id}</small><strong>{campaign.name}</strong><span>{campaign.client}</span></div><CampaignStatusBadge status={campaign.status} /></header><dl><div><dt>Owner</dt><dd>{campaign.owner}</dd></div><div><dt>Timeline</dt><dd>{formatCampaignDate(campaign.startDate)} — {formatCampaignDate(campaign.endDate)}</dd></div><div><dt>Creator</dt><dd>{campaign.creators?.length || 0}</dd></div><div><dt>Ngân sách</dt><dd>{formatCompactCurrency(campaign.totalBudget)}</dd></div></dl></button>)}</div>
    </div>
  )
}
