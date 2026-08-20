import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Icon from '../components/common/Icon'
import { INITIAL_CAMPAIGNS } from '../data/campaigns'
import { findCampaignByReviewToken, readStoredCampaigns, writeStoredCampaigns } from '../utils/campaignStorage'
import { formatCompactCurrency } from '../utils/formatters'
import { appendStoredNotification } from '../utils/notificationStorage'
import { effectiveClientDecision } from '../config/campaigns'
import { publicReviewApi } from '../services/campaignApi'

const DECISIONS = [
  { value: 'APPROVED', label: 'Đồng ý', icon: 'check' },
  { value: 'CONSIDER', label: 'Cân nhắc', icon: 'clock' },
  { value: 'REJECTED', label: 'Từ chối', icon: 'close' },
]

function initialResponses(campaign) {
  return Object.fromEntries((campaign?.creators || []).map((creator) => [String(creator.creatorId), {
    decision: effectiveClientDecision(creator),
    note: creator.clientNote || '',
  }]))
}

export default function ClientReviewPage() {
  const { token } = useParams()
  const [campaign, setCampaign] = useState(() => findCampaignByReviewToken(readStoredCampaigns(INITIAL_CAMPAIGNS), token))
  const [responses, setResponses] = useState(() => initialResponses(campaign))
  const [savedMessage, setSavedMessage] = useState('')
  const [loading, setLoading] = useState(!campaign)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    publicReviewApi.get(token).then((serverCampaign) => {
      if (!active) return
      setCampaign(serverCampaign)
      setResponses(initialResponses(serverCampaign))
    }).catch(() => { /* Fall back to the locally stored demo campaign. */ }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token])
  const changedCount = useMemo(() => (campaign?.creators || []).filter((creator) => {
    const response = responses[String(creator.creatorId)]
    return response && (response.decision !== effectiveClientDecision(creator) || response.note.trim() !== (creator.clientNote || '').trim())
  }).length, [campaign, responses])
  if (loading) return <main className="client-review-page client-review-not-found"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><h1>Đang tải Client Review...</h1><p>Vui lòng chờ trong giây lát.</p></main>
  if (!campaign) return <main className="client-review-page client-review-not-found"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><h1>Link review không hợp lệ</h1><p>Campaign không tồn tại hoặc link đã hết hiệu lực.</p></main>

  const updateResponse = (creatorId, field, value) => setResponses((current) => ({ ...current, [String(creatorId)]: { ...current[String(creatorId)], [field]: value } }))
  const submit = async () => {
    if (!changedCount) { setSavedMessage('Không có thay đổi mới để gửi.'); return }
    const changedResponses = (campaign.creators || []).flatMap((creator) => {
      const response = responses[String(creator.creatorId)]
      if (!response || (response.decision === effectiveClientDecision(creator) && response.note.trim() === (creator.clientNote || '').trim())) return []
      return [{ creatorId: creator.creatorId, decision: response.decision, note: response.note.trim() }]
    })
    setSaving(true)
    try {
      const updatedCampaign = await publicReviewApi.submit(token, changedResponses)
      setCampaign(updatedCampaign)
      setResponses(initialResponses(updatedCampaign))
      setSavedMessage(`Đã gửi ${changedResponses.length} thay đổi đến team Campaign.`)
      setSaving(false)
      return
    } catch { /* Use the same review flow locally when the API is unavailable. */ }
    const allCampaigns = readStoredCampaigns(INITIAL_CAMPAIGNS)
    const latest = findCampaignByReviewToken(allCampaigns, token)
    if (!latest) {
      setSavedMessage('Không thể kết nối hệ thống. Vui lòng thử lại.')
      setSaving(false)
      return
    }
    const changedAt = new Date().toISOString()
    const counts = { APPROVED: 0, REJECTED: 0, CONSIDER: 0, notes: 0 }
    const nextCreators = (latest.creators || []).map((creator) => {
      const response = responses[String(creator.creatorId)] || { decision: 'PENDING', note: '' }
      const changed = response.decision !== effectiveClientDecision(creator) || response.note.trim() !== (creator.clientNote || '').trim()
      if (!changed) return creator
      if (counts[response.decision] !== undefined) counts[response.decision] += 1
      if (response.note.trim() !== (creator.clientNote || '').trim()) counts.notes += 1
      const status = response.decision === 'APPROVED' ? 'CLIENT_APPROVED' : response.decision === 'REJECTED' ? 'CLIENT_REJECTED' : 'CONSIDER'
      return { ...creator, clientDecision: response.decision, clientNote: response.note.trim(), clientChangedAt: changedAt, clientChangeUnread: true, status }
    })
    const updatedCampaign = { ...latest, creators: nextCreators, lastClientReviewAt: changedAt }
    writeStoredCampaigns(allCampaigns.map((item) => item.id === latest.id ? updatedCampaign : item))
    const parts = [counts.APPROVED && `đồng ý ${counts.APPROVED}`, counts.REJECTED && `từ chối ${counts.REJECTED}`, counts.CONSIDER && `cân nhắc ${counts.CONSIDER}`, counts.notes && `${counts.notes} ghi chú`].filter(Boolean)
    appendStoredNotification({
      id: `client-review-${latest.id}-${Date.now()}`,
      icon: 'userCheck',
      title: `${latest.client} đã cập nhật Client Review`,
      detail: `${latest.name} · ${parts.join(' · ')}`,
      campaignId: latest.id,
      href: `/campaigns/${latest.id}?tab=creators`,
    })
    setCampaign(updatedCampaign)
    setResponses(initialResponses(updatedCampaign))
    setSavedMessage(`Đã gửi ${changedCount} thay đổi đến team Campaign.`)
    setSaving(false)
  }

  return (
    <main className="client-review-page">
      <header className="client-review-topbar"><div><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><span><strong>Meta Ecom</strong><small>Client Selection Portal</small></span></div><em>Kết nối bảo mật</em></header>
      <section className="client-review-hero"><p className="page-kicker">Client Review · {campaign.id}</p><h1>{campaign.name}</h1><p>{campaign.description}</p><div><span>Client / Brand <strong>{campaign.client}</strong></span><span>Creators <strong>{campaign.creators?.length || 0}</strong></span></div></section>
      <section className="client-review-instruction"><Icon name="message" size={19} /><div><strong>Chọn phản hồi cho từng Creator</strong><p>Bạn có thể Đồng ý, Từ chối hoặc Cân nhắc và để lại ghi chú. Các thay đổi chỉ gửi thành một thông báo khi bấm “Gửi phản hồi”.</p></div></section>
      <section className="client-review-creators">{(campaign.creators || []).map((creator, index) => {
        const response = responses[String(creator.creatorId)] || { decision: 'PENDING', note: '' }
        const deliverables = creator.deliverables?.length ? creator.deliverables : campaign.deliverables || []
        return <article className={`client-review-creator-card is-${response.decision.toLowerCase()}`} key={creator.creatorId}><header><span>{String(index + 1).padStart(2, '0')}</span><div className="client-review-avatar">{creator.name?.slice(0, 1).toUpperCase()}</div><div><h2>{creator.name}</h2><p>@{String(creator.tiktokId).replace(/^@/, '')}</p></div><strong>{creator.actualPrice === '' || creator.actualPrice == null ? 'Giá đang cập nhật' : formatCompactCurrency(creator.actualPrice)}</strong></header><div className="client-review-deliverables"><small>Deliverable yêu cầu</small>{deliverables.map((item) => <div key={item.id}><span><Icon name="checkSquare" size={14} /></span><p><strong>{item.type}</strong><em>{item.description || 'Chưa có mô tả chi tiết'}</em></p><small>{item.deadline || 'Chưa có deadline'}</small></div>)}{!deliverables.length && <p>Chưa có yêu cầu Deliverable.</p>}</div><div className="client-review-decisions">{DECISIONS.map((decision) => <button type="button" className={response.decision === decision.value ? 'is-selected' : ''} onClick={() => updateResponse(creator.creatorId, 'decision', decision.value)} key={decision.value}><Icon name={decision.icon} size={15} />{decision.label}</button>)}</div><label className="client-review-note"><span>Ghi chú cho team</span><textarea rows="2" value={response.note} onChange={(event) => updateResponse(creator.creatorId, 'note', event.target.value)} placeholder="VD: Deal giá xuống dưới 10 triệu..." /></label></article>
      })}</section>
      <footer className="client-review-submit"><div><strong>{changedCount} thay đổi chưa gửi</strong><small>{savedMessage || 'Phản hồi sẽ được cập nhật đến Campaign theo thời gian thực.'}</small></div><button type="button" disabled={!changedCount || saving} onClick={submit}><Icon name="check" size={17} />{saving ? 'Đang gửi...' : 'Gửi phản hồi'}</button></footer>
    </main>
  )
}
