import { useEffect } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import CampaignCreatorsTab from '../components/campaigns/CampaignCreatorsTab'
import CampaignDeliverablesPreview from '../components/campaigns/CampaignDeliverablesPreview'
import CampaignFinalCreatorsTab from '../components/campaigns/CampaignFinalCreatorsTab'
import CampaignOverviewTab from '../components/campaigns/CampaignOverviewTab'
import CampaignQuotationTab from '../components/campaigns/CampaignQuotationTab'
import CampaignStatusBadge from '../components/campaigns/CampaignStatusBadge'
import CampaignTimelineTab from '../components/campaigns/CampaignTimelineTab'
import Icon from '../components/common/Icon'
import { useApp } from '../hooks/useApp'
import { useAuth } from '../hooks/useAuth'
import { effectiveClientDecision } from '../config/campaigns'

const TABS = [
  { value: 'overview', label: 'Tổng quan', icon: 'dashboard' },
  { value: 'quotation', label: 'Quotation', icon: 'fileSpreadsheet' },
  { value: 'creators', label: 'Creators', icon: 'users' },
  { value: 'timeline', label: 'Timeline', icon: 'clock' },
  { value: 'deliverables', label: 'Deliverables', icon: 'checkSquare' },
  { value: 'final-creators', label: 'Final Creators', icon: 'userCheck' },
]

export default function CampaignDetailPage() {
  const navigate = useNavigate()
  const { campaignId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { campaigns, creators, isLoadingCampaigns, campaignBackendAvailable, addCampaignCreators, removeCampaignCreator, updateCampaignCreator, updateCampaignMilestones, markCampaignClientChangesRead, refreshCampaign, ensureCampaignReviewLink, showToast } = useApp()
  const campaign = campaigns.find((item) => item.id === campaignId)
  const requestedTab = searchParams.get('tab')
  const activeTab = TABS.some((tab) => tab.value === requestedTab) ? requestedTab : 'overview'
  const canEdit = ['ADMIN', 'CAMPAIGN_MANAGER'].includes(user?.role)
  const changeTab = (tab) => setSearchParams(tab === 'overview' ? {} : { tab })

  useEffect(() => {
    if (!campaignBackendAvailable) return undefined
    void refreshCampaign(campaignId)
    const interval = window.setInterval(() => void refreshCampaign(campaignId), 3000)
    return () => window.clearInterval(interval)
  }, [campaignBackendAvailable, campaignId, refreshCampaign])

  if (!campaign && isLoadingCampaigns) return <main className="page campaign-detail-page"><section className="campaign-detail-empty panel"><span><Icon name="clock" size={27} /></span><h1>Đang tải Campaign...</h1><p>Hệ thống đang đồng bộ dữ liệu mới nhất.</p></section></main>
  if (!campaign) return <main className="page campaign-detail-page"><section className="campaign-detail-empty panel"><span><Icon name="briefcase" size={27} /></span><h1>Không tìm thấy Campaign</h1><p>Campaign này không tồn tại hoặc đã được xoá.</p><button className="secondary-button" onClick={() => navigate('/campaigns')}>Quay lại danh sách</button></section></main>

  return (
    <main className="page campaign-detail-page">
      <button type="button" className="campaign-back-button" onClick={() => navigate('/campaigns')}><Icon name="chevronRight" size={18} />Danh sách Campaign</button>
      <section className="campaign-detail-heading">
        <div><p className="page-kicker">{campaign.id} · {campaign.client}</p><h1>{campaign.name}</h1><p>{campaign.owner} · {campaign.creators?.length || 0} Creator</p></div>
        <CampaignStatusBadge status={campaign.status} />
      </section>
      <nav className="campaign-detail-tabs" aria-label="Các phần của Campaign">{TABS.map((tab) => <button type="button" className={activeTab === tab.value ? 'is-active' : ''} aria-current={activeTab === tab.value ? 'page' : undefined} onClick={() => changeTab(tab.value)} key={tab.value}><Icon name={tab.icon} size={16} />{tab.label}{tab.value === 'final-creators' && <span>{(campaign.creators || []).filter((creator) => effectiveClientDecision(creator) === 'APPROVED' && creator.creatorConfirmed).length}</span>}</button>)}</nav>
      {activeTab === 'overview' && <CampaignOverviewTab campaign={campaign} />}
      {activeTab === 'quotation' && <CampaignQuotationTab />}
      {activeTab === 'creators' && <CampaignCreatorsTab campaign={campaign} creators={creators} canEdit={canEdit} onAddCreators={(ids) => addCampaignCreators(campaign.id, ids)} onRemoveCreator={(creatorId) => removeCampaignCreator(campaign.id, creatorId)} onUpdateCreator={(creatorId, changes) => updateCampaignCreator(campaign.id, creatorId, changes)} onMarkChangesRead={() => markCampaignClientChangesRead(campaign.id)} />}
      {activeTab === 'timeline' && <CampaignTimelineTab campaign={campaign} canEdit={canEdit} onSave={(milestones) => updateCampaignMilestones(campaign.id, milestones)} />}
      {activeTab === 'deliverables' && <CampaignDeliverablesPreview campaign={campaign} onEnsureLink={() => ensureCampaignReviewLink(campaign.id)} onNotify={showToast} />}
      {activeTab === 'final-creators' && <CampaignFinalCreatorsTab campaign={campaign} />}
    </main>
  )
}
