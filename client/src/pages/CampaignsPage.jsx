import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CampaignList from '../components/campaigns/CampaignList'
import CampaignMetrics from '../components/campaigns/CampaignMetrics'
import Icon from '../components/common/Icon'
import { CAMPAIGN_STATUSES } from '../config/campaigns'
import { useApp } from '../hooks/useApp'
import { useAuth } from '../hooks/useAuth'

export default function CampaignsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { campaigns, recentlyCreatedCampaignId } = useApp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const canCreate = ['ADMIN', 'CAMPAIGN_MANAGER'].includes(user?.role)
  const visibleCampaigns = useMemo(() => {
    const term = search.trim().toLowerCase()
    return campaigns.filter((campaign) => {
      const matchesTerm = !term || `${campaign.id} ${campaign.name} ${campaign.client} ${campaign.owner}`.toLowerCase().includes(term)
      return matchesTerm && (status === 'ALL' || campaign.status === status)
    })
  }, [campaigns, search, status])

  return (
    <main className="page campaigns-page">
      <section className="page-heading campaigns-heading">
        <div><p className="page-kicker">Campaign Management</p><h1>Campaigns</h1><p>Tạo, theo dõi và quản lý toàn bộ Campaign tại một nơi.</p></div>
        {canCreate && <button className="primary-button campaign-create-button" onClick={() => navigate('/campaigns/new')}><Icon name="plus" />Tạo Campaign</button>}
      </section>
      <CampaignMetrics campaigns={campaigns} />
      <section className="campaign-list-panel panel">
        <header className="campaign-list-header">
          <div><h2>Danh sách Campaign</h2><p>{visibleCampaigns.length} / {campaigns.length} Campaign</p></div>
          <div className="campaign-list-filters">
            <label><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, ID, Client hoặc Owner..." />{search && <button type="button" onClick={() => setSearch('')} aria-label="Xoá tìm kiếm"><Icon name="close" size={14} /></button>}</label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc theo trạng thái"><option value="ALL">Tất cả trạng thái</option>{CAMPAIGN_STATUSES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
          </div>
        </header>
        <CampaignList campaigns={visibleCampaigns} highlightedId={recentlyCreatedCampaignId} />
      </section>
    </main>
  )
}
