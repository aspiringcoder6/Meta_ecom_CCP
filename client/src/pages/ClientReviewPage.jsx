import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import ClientDeliverablesReviewTab from '../components/campaigns/ClientDeliverablesReviewTab'
import ClientKocListingTab from '../components/campaigns/ClientKocListingTab'
import Icon from '../components/common/Icon'
import { INITIAL_CAMPAIGNS } from '../data/campaigns'
import { findCampaignByReviewToken, readStoredCampaigns, writeStoredCampaigns } from '../utils/campaignStorage'
import { appendStoredNotification } from '../utils/notificationStorage'
import { effectiveClientDecision } from '../config/campaigns'
import { publicReviewApi } from '../services/campaignApi'
import { acceptedCampaignCreators, campaignCreatorDeliverables, deliverableFeedbackState } from '../utils/campaignDeliverables'
import { normalizeProducts, withProductVideos } from '../utils/campaignProducts'
import { clientResponseChanges } from '../utils/clientProductResponses'
import { getApiErrorMessage } from '../services/apiClient'

function initialResponses(campaign) {
  return Object.fromEntries((campaign?.creators || []).map((creator) => [String(creator.creatorId), {
    decision: effectiveClientDecision(creator), note: creator.clientNote || '', brandProducts: normalizeProducts(creator.brandProducts).join(', '),
  }]))
}

export default function ClientReviewPage() {
  const { token } = useParams()
  const initialCampaign = findCampaignByReviewToken(readStoredCampaigns(INITIAL_CAMPAIGNS), token)
  const [campaign, setCampaign] = useState(initialCampaign)
  const [activeTab, setActiveTab] = useState('listing')
  const [responses, setResponses] = useState(() => initialResponses(initialCampaign))
  const [deliverableFeedback, setDeliverableFeedback] = useState(() => deliverableFeedbackState(initialCampaign))
  const [savedMessage, setSavedMessage] = useState('')
  const [deliverableSavedMessage, setDeliverableSavedMessage] = useState('')
  const [loading, setLoading] = useState(!initialCampaign)
  const [saving, setSaving] = useState(false)
  const [savingDeliverables, setSavingDeliverables] = useState(false)
  const remoteLoaded = useRef(false)

  useEffect(() => {
    let active = true
    remoteLoaded.current = false
    publicReviewApi.get(token).then((serverCampaign) => {
      if (!active) return
      remoteLoaded.current = true
      setCampaign(serverCampaign)
      setResponses(initialResponses(serverCampaign))
      setDeliverableFeedback(deliverableFeedbackState(serverCampaign))
    }).catch(() => { /* Fall back to the locally stored demo campaign. */ }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token])

  const changedCount = useMemo(() => (campaign?.creators || []).filter((creator) => {
    const response = responses[String(creator.creatorId)]
    return Boolean(clientResponseChanges(creator, response))
  }).length, [campaign, responses])
  const deliverableChangedCount = useMemo(() => acceptedCampaignCreators(campaign).reduce((count, creator) => count + campaignCreatorDeliverables(campaign, creator).filter((item) => (deliverableFeedback[`${creator.creatorId}:${item.id}`] || '').trim() !== (item.brandFeedback || '').trim()).length, 0), [campaign, deliverableFeedback])
  const acceptedCount = useMemo(() => acceptedCampaignCreators(campaign).length, [campaign])

  if (loading) return <main className="client-review-page client-review-not-found"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><h1>Đang tải Client Review...</h1><p>Vui lòng chờ trong giây lát.</p></main>
  if (!campaign) return <main className="client-review-page client-review-not-found"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><h1>Link review không hợp lệ</h1><p>Campaign không tồn tại hoặc link đã hết hiệu lực.</p></main>

  const updateResponse = (creatorId, field, value) => {
    setSavedMessage('')
    setResponses((current) => ({ ...current, [String(creatorId)]: { ...current[String(creatorId)], [field]: value } }))
  }
  const submitListing = async () => {
    if (!changedCount) { setSavedMessage('Không có thay đổi mới để gửi.'); return }
    const changedResponses = (campaign.creators || []).flatMap((creator) => {
      const response = responses[String(creator.creatorId)]
      const changes = clientResponseChanges(creator, response)
      return changes ? [changes] : []
    })
    setSaving(true)
    try {
      const updatedCampaign = await publicReviewApi.submit(token, changedResponses)
      setCampaign(updatedCampaign); setResponses(initialResponses(updatedCampaign)); setDeliverableFeedback(deliverableFeedbackState(updatedCampaign))
      setSavedMessage(`Đã gửi ${changedResponses.length} thay đổi đến team Campaign.`)
      return
    } catch (error) {
      if (remoteLoaded.current || error?.response) {
        setSavedMessage(`Chưa gửi được: ${getApiErrorMessage(error)}. Nội dung đang nhập vẫn được giữ lại.`)
        return
      }
    }
    finally { setSaving(false) }
    const allCampaigns = readStoredCampaigns(INITIAL_CAMPAIGNS)
    const latest = findCampaignByReviewToken(allCampaigns, token)
    if (!latest) { setSavedMessage('Không thể kết nối hệ thống. Vui lòng thử lại.'); return }
    const changedAt = new Date().toISOString()
    const counts = { APPROVED: 0, REJECTED: 0, PENDING: 0, notes: 0, products: 0 }
    const changesById = new Map(changedResponses.map((response) => [String(response.creatorId), response]))
    const nextCreators = (latest.creators || []).map((creator) => {
      const response = changesById.get(String(creator.creatorId))
      if (!response) return creator
      if (response.decision && counts[response.decision] !== undefined) counts[response.decision] += 1
      if (response.note !== undefined) counts.notes += 1
      if (response.brandProducts !== undefined) counts.products += 1
      const status = response.decision === 'APPROVED' ? 'CLIENT_APPROVED' : response.decision === 'REJECTED' ? 'CLIENT_REJECTED' : 'PROPOSED'
      return {
        ...creator,
        ...(response.decision !== undefined ? { clientDecision: response.decision, status } : {}),
        ...(response.note !== undefined ? { clientNote: response.note } : {}),
        ...(response.brandProducts !== undefined ? { brandProducts: response.brandProducts, deliverables: withProductVideos(campaignCreatorDeliverables(latest, creator), response.brandProducts, creator.creatorId) } : {}),
        clientChangedAt: changedAt, clientChangeUnread: true,
      }
    })
    const updatedCampaign = { ...latest, creators: nextCreators, lastClientReviewAt: changedAt }
    writeStoredCampaigns(allCampaigns.map((item) => item.id === latest.id ? updatedCampaign : item))
    const parts = [counts.APPROVED && `đồng ý ${counts.APPROVED}`, counts.REJECTED && `từ chối ${counts.REJECTED}`, counts.PENDING && `pending ${counts.PENDING}`, counts.notes && `${counts.notes} ghi chú`, counts.products && `${counts.products} KOC cập nhật sản phẩm`].filter(Boolean)
    appendStoredNotification({ id: `client-review-${latest.id}-${Date.now()}`, icon: 'userCheck', title: `${latest.client} đã cập nhật Brand Review`, detail: `${latest.name} · ${parts.join(' · ')}`, campaignId: latest.id, href: `/campaigns/${latest.id}?tab=external-listings` })
    setCampaign(updatedCampaign); setResponses(initialResponses(updatedCampaign)); setDeliverableFeedback(deliverableFeedbackState(updatedCampaign))
    setSavedMessage(`Đã gửi ${changedCount} thay đổi đến team Campaign.`)
  }

  const submitDeliverables = async () => {
    if (!deliverableChangedCount) { setDeliverableSavedMessage('Không có feedback mới để gửi.'); return }
    const updates = acceptedCampaignCreators(campaign).flatMap((creator) => {
      const deliverables = campaignCreatorDeliverables(campaign, creator).flatMap((item) => {
        const value = (deliverableFeedback[`${creator.creatorId}:${item.id}`] || '').trim()
        return value === (item.brandFeedback || '').trim() ? [] : [{ id: item.id, brandFeedback: value }]
      })
      return deliverables.length ? [{ creatorId: creator.creatorId, deliverables }] : []
    })
    setSavingDeliverables(true)
    try {
      const updatedCampaign = await publicReviewApi.submitDeliverables(token, updates)
      setCampaign(updatedCampaign); setDeliverableFeedback(deliverableFeedbackState(updatedCampaign))
      setDeliverableSavedMessage(`Đã gửi ${deliverableChangedCount} Brand Feedback đến team Campaign.`)
      return
    } catch (error) {
      if (remoteLoaded.current || error?.response) {
        setDeliverableSavedMessage(`Chưa gửi được: ${getApiErrorMessage(error)}. Feedback vẫn được giữ lại.`)
        return
      }
    }
    finally { setSavingDeliverables(false) }
    const allCampaigns = readStoredCampaigns(INITIAL_CAMPAIGNS)
    const latest = findCampaignByReviewToken(allCampaigns, token)
    if (!latest) { setDeliverableSavedMessage('Không thể kết nối hệ thống. Vui lòng thử lại.'); return }
    const acceptedIds = new Set(acceptedCampaignCreators(latest).map((creator) => String(creator.creatorId)))
    const nextCreators = (latest.creators || []).map((creator) => !acceptedIds.has(String(creator.creatorId)) ? creator : { ...creator, clientChangeUnread: true, deliverables: campaignCreatorDeliverables(latest, creator).map((item) => ({ ...item, brandFeedback: (deliverableFeedback[`${creator.creatorId}:${item.id}`] || '').trim() })) })
    const updatedCampaign = { ...latest, creators: nextCreators }
    writeStoredCampaigns(allCampaigns.map((item) => item.id === latest.id ? updatedCampaign : item))
    appendStoredNotification({ id: `deliverable-feedback-${latest.id}-${Date.now()}`, icon: 'checkSquare', title: `${latest.client} đã cập nhật Deliverable`, detail: `${latest.name} · ${deliverableChangedCount} Brand Feedback`, campaignId: latest.id, href: `/campaigns/${latest.id}?tab=deliverables` })
    setCampaign(updatedCampaign); setDeliverableFeedback(deliverableFeedbackState(updatedCampaign))
    setDeliverableSavedMessage(`Đã gửi ${deliverableChangedCount} Brand Feedback đến team Campaign.`)
  }

  return (
    <main className="client-review-page">
      <header className="client-review-topbar"><div><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><span><strong>Meta Ecom</strong><small>Client Selection Portal</small></span></div><em>Kết nối bảo mật</em></header>
      <section className="client-review-hero"><p className="page-kicker">Client Review · {campaign.id}</p><h1>{campaign.name}</h1><p>{campaign.description}</p><div><span>Client / Brand <strong>{campaign.client}</strong></span><span>Creators <strong>{campaign.creators?.length || 0}</strong></span></div></section>
      <nav className="client-review-tabs" aria-label="Client Review"><button type="button" className={activeTab === 'listing' ? 'is-active' : ''} onClick={() => setActiveTab('listing')}><Icon name="users" size={16} />KOC Listing<span>{campaign.creators?.length || 0}</span></button><button type="button" className={activeTab === 'deliverables' ? 'is-active' : ''} onClick={() => setActiveTab('deliverables')}><Icon name="checkSquare" size={16} />Deliverables<span>{acceptedCount}</span></button></nav>
      {activeTab === 'listing' && <ClientKocListingTab campaign={campaign} responses={responses} onUpdate={updateResponse} changedCount={changedCount} savedMessage={savedMessage} saving={saving} onSubmit={submitListing} />}
      {activeTab === 'deliverables' && <ClientDeliverablesReviewTab campaign={campaign} feedback={deliverableFeedback} onChange={(key, value) => setDeliverableFeedback((current) => ({ ...current, [key]: value }))} changedCount={deliverableChangedCount} savedMessage={deliverableSavedMessage} saving={savingDeliverables} onSubmit={submitDeliverables} />}
    </main>
  )
}
