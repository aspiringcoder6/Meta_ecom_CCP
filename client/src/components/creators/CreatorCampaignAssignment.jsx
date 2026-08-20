import { useMemo, useState } from 'react'
import { campaignCreatorStatusLabel } from '../../config/campaigns'
import CampaignStatusBadge from '../campaigns/CampaignStatusBadge'
import Icon from '../common/Icon'

function includesCreator(campaign, creatorId) {
  return (campaign.creators || []).some((item) => String(item.creatorId) === String(creatorId))
}

export default function CreatorCampaignAssignment({ creator, campaigns, canAssign, onAssign }) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [search, setSearch] = useState('')
  const assignedCampaigns = useMemo(() => campaigns.filter((campaign) => includesCreator(campaign, creator.id)), [campaigns, creator.id])
  const results = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []
    return campaigns.filter((campaign) => `${campaign.name} ${campaign.id} ${campaign.client}`.toLowerCase().includes(term)).slice(0, 8)
  }, [campaigns, search])

  const assign = (campaignId) => {
    const assigned = onAssign(creator.id, campaignId)
    if (!assigned) return
    setSearch('')
    setAssignOpen(false)
  }

  return (
    <section className="profile-section creator-campaign-assignment">
      <div className="section-title">
        <div><h4>Campaign tham gia</h4><small>{assignedCampaigns.length} Campaign</small></div>
        {canAssign && <button type="button" className={assignOpen ? 'is-open' : ''} onClick={() => setAssignOpen((current) => !current)}><Icon name="plus" size={15} />Assign nhanh</button>}
      </div>

      {assignOpen && (
        <div className="quick-campaign-assign">
          <label><Icon name="search" size={16} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên Campaign..." />{search && <button type="button" onClick={() => setSearch('')} aria-label="Xoá tìm kiếm"><Icon name="close" size={13} /></button>}</label>
          <div className="quick-campaign-results">
            {!search.trim() && <p>Nhập tên, ID hoặc Client để tìm Campaign.</p>}
            {search.trim() && !results.length && <p>Không tìm thấy Campaign phù hợp.</p>}
            {results.map((campaign) => {
              const alreadyAssigned = includesCreator(campaign, creator.id)
              return <button type="button" key={campaign.id} disabled={alreadyAssigned} onClick={() => assign(campaign.id)}><span><strong>{campaign.name}</strong><small>{campaign.id} · {campaign.client}</small></span>{alreadyAssigned ? <em><Icon name="check" size={12} />Đã assign</em> : <Icon name="plus" size={15} />}</button>
            })}
          </div>
        </div>
      )}

      <div className="assigned-campaign-list">
        {assignedCampaigns.map((campaign) => {
          const assignment = campaign.creators.find((item) => String(item.creatorId) === String(creator.id))
          return <div className="campaign-mini" key={campaign.id}><span>{campaign.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div><strong>{campaign.name}</strong><small>{campaign.client} · {campaignCreatorStatusLabel(assignment?.status)}</small></div><CampaignStatusBadge status={campaign.status} /></div>
        })}
        {!assignedCampaigns.length && <p className="assigned-campaign-empty">Creator này chưa được assign vào Campaign nào.</p>}
      </div>
    </section>
  )
}
