import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ClientDeliverablesReviewTab from '../components/campaigns/ClientDeliverablesReviewTab'
import ClientKocListingTab from '../components/campaigns/ClientKocListingTab'
import BrandReviewDraftStatus from '../components/campaigns/BrandReviewDraftStatus'
import Icon from '../components/common/Icon'
import useBrandReviewDraft from '../hooks/useBrandReviewDraft'
import { publicReviewApi } from '../services/publicReviewApi'
import { getApiErrorMessage } from '../services/apiClient'
import { acceptedCampaignCreators, campaignCreatorDeliverables, deliverableFeedbackState } from '../utils/campaignDeliverables'
import { clientResponseChanges } from '../utils/clientProductResponses'
import { initialClientResponses, reconcileFeedbackDrafts, reconcileListingDrafts, reviewSubmissionMessage, reviewSubmissionResult } from '../utils/clientReviewSubmission'
import { readBrandReviewDraft, restoreBrandReviewDraft, writeBrandReviewDraft } from '../utils/brandReviewDraft'
import { reviewLoadFailure } from '../utils/publicReviewLoad'

export default function ClientReviewPage() {
  const { token } = useParams()
  return <ClientReviewWorkspace token={token} key={token} />
}

function ClientReviewWorkspace({ token }) {
  const [campaign, setCampaign] = useState(null)
  const [activeTab, setActiveTab] = useState('listing')
  const [responses, setResponses] = useState({})
  const [deliverableFeedback, setDeliverableFeedback] = useState({})
  const [savedMessage, setSavedMessage] = useState('')
  const [deliverableSavedMessage, setDeliverableSavedMessage] = useState('')
  const [listingResult, setListingResult] = useState(null)
  const [deliverableResult, setDeliverableResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [restoredCount, setRestoredCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savingDeliverables, setSavingDeliverables] = useState(false)
  const draftStatus = useBrandReviewDraft(token, campaign, responses, deliverableFeedback, !loading && Boolean(campaign))

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setLoadError(null); setRetrying(false)
    publicReviewApi.get(token, { signal: controller.signal, onRetry: () => setRetrying(true) }).then((serverCampaign) => {
      if (controller.signal.aborted) return
      const restored = restoreBrandReviewDraft(serverCampaign, readBrandReviewDraft(token))
      setCampaign(serverCampaign)
      setResponses(restored.responses)
      setDeliverableFeedback(restored.feedback)
      setRestoredCount(restored.restoredCount)
    }).catch((error) => {
      if (!controller.signal.aborted) setLoadError(reviewLoadFailure(error))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, loadAttempt])

  const changedCount = useMemo(() => (campaign?.creators || []).filter((creator) => Boolean(clientResponseChanges(creator, responses[String(creator.creatorId)]))).length, [campaign, responses])
  const deliverableChangedCount = useMemo(() => acceptedCampaignCreators(campaign).reduce((count, creator) => count + campaignCreatorDeliverables(campaign, creator).filter((item) => (deliverableFeedback[`${creator.creatorId}:${item.id}`] || '').trim() !== (item.brandFeedback || '').trim()).length, 0), [campaign, deliverableFeedback])
  const acceptedCount = useMemo(() => acceptedCampaignCreators(campaign).length, [campaign])

  if (loading) return <main className="client-review-page client-review-not-found" role="status"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><h1>{retrying ? 'Đang thử kết nối lại...' : 'Đang tải Client Review...'}</h1><p>Backend có thể đang khởi động sau thời gian không sử dụng. Vui lòng giữ trang mở, quá trình này có thể mất khoảng 1–2 phút.</p><p>Bạn không cần đăng nhập. Bản nháp đã lưu trên trình duyệt sẽ được khôi phục khi tải xong.</p></main>
  if (!campaign) return <main className="client-review-page client-review-not-found"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><h1>{loadError?.title || 'Chưa tải được Client Review'}</h1><p>{loadError?.message}</p><button type="button" className="primary-button" onClick={() => setLoadAttempt((value) => value + 1)}><Icon name="redo" size={17} />Thử tải lại</button></main>

  const updateResponse = (creatorId, field, value) => {
    setSavedMessage('')
    setResponses((current) => ({ ...current, [String(creatorId)]: { ...current[String(creatorId)], [field]: value } }))
  }
  const submitListing = async () => {
    if (saving || savingDeliverables) return
    if (!changedCount) { setSavedMessage('Không có thay đổi mới để gửi.'); return }
    const changedResponses = (campaign.creators || []).flatMap((creator) => {
      const changes = clientResponseChanges(creator, responses[String(creator.creatorId)])
      return changes ? [changes] : []
    })
    setSaving(true)
    try {
      const updatedCampaign = await publicReviewApi.submit(token, changedResponses)
      const result = reviewSubmissionResult(updatedCampaign, changedResponses)
      setCampaign(updatedCampaign)
      setResponses(reconcileListingDrafts(campaign, updatedCampaign, responses, result.savedCreatorIds))
      setDeliverableFeedback(reconcileFeedbackDrafts(campaign, updatedCampaign, deliverableFeedback))
      setListingResult(result)
      setSavedMessage(reviewSubmissionMessage(result))
    } catch (error) {
      setSavedMessage(`Chưa gửi được: ${getApiErrorMessage(error)}. Nội dung đang nhập vẫn được giữ lại.`)
    } finally { setSaving(false) }
  }
  const submitDeliverables = async () => {
    if (saving || savingDeliverables) return
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
      const result = reviewSubmissionResult(updatedCampaign, updates, true)
      setCampaign(updatedCampaign)
      setDeliverableFeedback(reconcileFeedbackDrafts(campaign, updatedCampaign, deliverableFeedback, result.savedDeliverables))
      setResponses(reconcileListingDrafts(campaign, updatedCampaign, responses))
      setDeliverableResult(result)
      setDeliverableSavedMessage(reviewSubmissionMessage(result, true))
    } catch (error) {
      setDeliverableSavedMessage(`Chưa gửi được: ${getApiErrorMessage(error)}. Feedback vẫn được giữ lại.`)
    } finally { setSavingDeliverables(false) }
  }
  const discardDraft = () => {
    if (!window.confirm('Xóa các chỉnh sửa chưa gửi trên trình duyệt này? Dữ liệu đã gửi đến team không bị thay đổi.')) return
    if (!writeBrandReviewDraft(token, { version: 1, listing: [], feedback: [] }).ok) { setSavedMessage('Không thể xóa bản nháp trên trình duyệt.'); return }
    setResponses(initialClientResponses(campaign)); setDeliverableFeedback(deliverableFeedbackState(campaign))
    setListingResult(null); setDeliverableResult(null); setRestoredCount(0)
    setSavedMessage('Đã xóa bản nháp chưa gửi.'); setDeliverableSavedMessage('Đã xóa bản nháp chưa gửi.')
  }

  return (
    <main className="client-review-page">
      <header className="client-review-topbar"><div><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><span><strong>Meta Ecom</strong><small>Client Selection Portal</small></span></div><em>Kết nối bảo mật</em></header>
      <section className="client-review-hero"><p className="page-kicker">Client Review · {campaign.id}</p><h1>{campaign.name}</h1><p>{campaign.description}</p><div><span>Client / Brand <strong>{campaign.client}</strong></span><span>Creators <strong>{campaign.creators?.length || 0}</strong></span></div></section>
      <BrandReviewDraftStatus status={draftStatus} restored={restoredCount > 0} saving={saving || savingDeliverables} onDiscard={discardDraft} />
      <nav className="client-review-tabs" aria-label="Client Review"><button type="button" disabled={saving || savingDeliverables} className={activeTab === 'listing' ? 'is-active' : ''} onClick={() => setActiveTab('listing')}><Icon name="users" size={16} />KOC Listing<span>{campaign.creators?.length || 0}</span></button><button type="button" disabled={saving || savingDeliverables} className={activeTab === 'deliverables' ? 'is-active' : ''} onClick={() => setActiveTab('deliverables')}><Icon name="checkSquare" size={16} />Deliverables<span>{acceptedCount}</span></button></nav>
      {activeTab === 'listing' && <ClientKocListingTab campaign={campaign} responses={responses} onUpdate={updateResponse} changedCount={changedCount} savedMessage={savedMessage} submissionResult={listingResult} saving={saving} onSubmit={submitListing} />}
      {activeTab === 'deliverables' && <ClientDeliverablesReviewTab campaign={campaign} feedback={deliverableFeedback} onChange={(key, value) => { setDeliverableSavedMessage(''); setDeliverableFeedback((current) => ({ ...current, [key]: value })) }} changedCount={deliverableChangedCount} savedMessage={deliverableSavedMessage} submissionResult={deliverableResult} saving={savingDeliverables} onSubmit={submitDeliverables} />}
    </main>
  )
}
