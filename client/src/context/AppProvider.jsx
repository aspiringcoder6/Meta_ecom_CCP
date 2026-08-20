import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { INITIAL_CREATORS } from '../data/creators'
import { INITIAL_CAMPAIGNS } from '../data/campaigns'
import { creatorApi } from '../services/creatorApi'
import { campaignApi } from '../services/campaignApi'
import { notificationApi } from '../services/notificationApi'
import { getApiErrorMessage } from '../services/apiClient'
import { calculateBookingPricing } from '../utils/pricing'
import { nextCampaignId } from '../utils/campaigns'
import { CAMPAIGN_STORAGE_KEY, campaignReviewToken, readStoredCampaigns, writeStoredCampaigns } from '../utils/campaignStorage'
import { NOTIFICATION_STORAGE_KEY, readStoredNotifications, writeStoredNotifications } from '../utils/notificationStorage'
import { AppContext } from './appContext'

const HISTORY_LIMIT = 60

function normalizeCampaign(campaign) {
  return {
    ...campaign,
    creators: (campaign.creators || []).map((creator) => campaignCreatorAssignment(undefined, campaign.deliverables, creator)),
  }
}

function replaceCampaign(current, campaign) {
  const normalized = normalizeCampaign(campaign)
  return current.some((item) => item.id === normalized.id)
    ? current.map((item) => item.id === normalized.id ? normalized : item)
    : [normalized, ...current]
}

function shouldUseLocalCampaignFallback(error) {
  return !error?.response || [404, 405, 501].includes(error.response.status)
}

function cloneDeliverables(deliverables, creatorId) {
  return (deliverables || []).map((deliverable, index) => ({
    ...deliverable,
    id: `creator-${creatorId}-deliverable-${index + 1}`,
  }))
}

function campaignCreatorAssignment(creator, defaults = [], existing = {}) {
  const suggestedPrice = calculateBookingPricing(creator?.cost, creator?.extraCost).bookingExpense
  const clientDecision = existing.clientDecision || (existing.status === 'CLIENT_APPROVED' || existing.status === 'CONFIRMED' ? 'APPROVED' : existing.status === 'CLIENT_REJECTED' ? 'REJECTED' : 'PENDING')
  return {
    creatorId: creator?.id ?? existing.creatorId,
    name: creator?.name || existing.name,
    tiktokId: creator?.tiktokId || existing.tiktokId,
    segment: creator?.segment || existing.segment || '',
    category: creator?.category || existing.category || [],
    followers: Number(creator?.followers ?? existing.followers) || 0,
    status: existing.status || 'PROPOSED',
    suggestedPrice: Number(existing.suggestedPrice) || suggestedPrice,
    actualPrice: existing.actualPrice ?? '',
    deliverables: existing.deliverables?.length ? existing.deliverables : cloneDeliverables(defaults, creator?.id ?? existing.creatorId),
    clientDecision,
    clientNote: existing.clientNote || '',
    clientChangedAt: existing.clientChangedAt || null,
    clientChangeUnread: Boolean(existing.clientChangeUnread),
    creatorConfirmed: Boolean(existing.creatorConfirmed),
  }
}

function creatorHistoryReducer(state, action) {
  if (action.type === 'apply') {
    const next = action.update(state.present)
    if (next === state.present) return state
    return { past: [...state.past, state.present].slice(-HISTORY_LIMIT), present: next, future: [] }
  }
  if (action.type === 'undo' && state.past.length) {
    return { past: state.past.slice(0, -1), present: state.past.at(-1), future: [state.present, ...state.future] }
  }
  if (action.type === 'redo' && state.future.length) {
    return { past: [...state.past, state.present].slice(-HISTORY_LIMIT), present: state.future[0], future: state.future.slice(1) }
  }
  if (action.type === 'hydrate') return { past: [], present: action.creators, future: [] }
  if (action.type === 'replaceOne') return { ...state, present: state.present.map((creator) => creator.id === action.creatorId ? action.creator : creator) }
  if (action.type === 'restore') return action.state
  return state
}

function getCreatorBatchChanges(originalCreators, currentCreators) {
  const originalById = new Map(originalCreators.map((creator) => [creator.id, creator]))
  const currentIds = new Set(currentCreators.map((creator) => creator.id))
  return {
    creates: currentCreators.filter((creator) => !originalById.has(creator.id)),
    updates: currentCreators.filter((creator) => originalById.has(creator.id) && JSON.stringify(creator) !== JSON.stringify(originalById.get(creator.id))).map((creator) => ({ id: creator.id, changes: creator })),
    deletes: originalCreators.filter((creator) => !currentIds.has(creator.id)).map((creator) => creator.id),
  }
}

function creatorPayloadFromForm(form) {
  const tiktokId = form.handle.trim()
  return {
    name: form.name.trim() || tiktokId, tiktokLink: form.tiktokLink.trim(),
    tiktokId, segment: form.segment, category: form.category.length ? form.category : ['BEAUTY'], type: form.type.length ? form.type : ['VIDEO'],
    cost: Number(form.cost) || 0, extraCost: Number(form.extraCost) || 0, gmvMonth: Number(form.gmvMonth) || 0,
    scope: form.scope.trim(), contact: form.contact.trim() || form.email.trim(), concept: form.concept.trim(), productFocus: form.productFocus.trim(),
    historicalCampaign: form.historicalCampaign || 'Đã hợp tác', mcnNote: form.mcnNote || '',
    followers: Number(form.followers) || 0, engagement: Number(form.engagement) || 0,
    email: form.email.trim(), phone: form.phone.trim(),
  }
}

function createQuickCreator() {
  const id = Date.now()
  const tiktokId = `creator_${String(id).slice(-6)}`
  return {
    id, name: 'Creator mới', handle: `@${tiktokId}`, initials: 'CR', platform: 'TikTok',
    tiktokLink: `https://www.tiktok.com/@${tiktokId}`, tiktokId, segment: 'MINI', category: ['BEAUTY'], type: ['VIDEO'],
    cost: 0, extraCost: 0, followers: 0, gmvMonth: 0, scope: '', contact: '', concept: '', productFocus: '',
    historicalCampaign: 'Đã hợp tác', mcnNote: '', engagement: 0, status: 'Available',
    email: 'Chưa cung cấp', phone: 'Chưa cung cấp', bookingPrice: 0, campaigns: 0,
    color: '#dcecff', accent: '#1769aa',
  }
}

export default function AppProvider({ children }) {
  const [creatorHistory, dispatchCreators] = useReducer(creatorHistoryReducer, { past: [], present: INITIAL_CREATORS, future: [] })
  const [campaigns, setCampaigns] = useState(() => readStoredCampaigns(INITIAL_CAMPAIGNS).map(normalizeCampaign))
  const [notifications, setNotifications] = useState(readStoredNotifications)
  const [isLoadingCreators, setIsLoadingCreators] = useState(true)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [campaignBackendAvailable, setCampaignBackendAvailable] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [recentlyAddedCreatorId, setRecentlyAddedCreatorId] = useState(null)
  const [recentlyCreatedCampaignId, setRecentlyCreatedCampaignId] = useState(null)
  const toastTimer = useRef(null)
  const highlightTimer = useRef(null)
  const campaignHighlightTimer = useRef(null)
  const campaignUpdateTimers = useRef(new Map())
  const pendingCampaignCreatorChanges = useRef(new Map())
  const editSessionSnapshot = useRef(null)
  const creators = creatorHistory.present

  useEffect(() => {
    let active = true
    creatorApi.list().then((serverCreators) => {
      if (!active || editSessionSnapshot.current) return
      dispatchCreators({ type: 'hydrate', creators: serverCreators })
      setBackendAvailable(true)
    }).catch(() => {
      if (active) showToast('Chưa kết nối được backend · Đang dùng dữ liệu demo')
    }).finally(() => {
      if (active) setIsLoadingCreators(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    campaignApi.list().then((serverCampaigns) => {
      if (!active || !Array.isArray(serverCampaigns)) return
      setCampaigns(serverCampaigns.map(normalizeCampaign))
      setCampaignBackendAvailable(true)
    }).catch(() => {
      if (active) setCampaignBackendAvailable(false)
    }).finally(() => {
      if (active) setIsLoadingCampaigns(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!campaignBackendAvailable) return undefined
    let active = true
    let interval
    const refreshNotifications = () => notificationApi.list().then((serverNotifications) => {
      if (!active || !Array.isArray(serverNotifications)) return
      setNotifications((current) => {
        const localMilestones = current.filter((item) => String(item.id).startsWith('milestone-due-'))
        const serverIds = new Set(serverNotifications.map((item) => item.id))
        const serverKeys = new Set(serverNotifications.map((item) => `${item.title}|${item.href}`))
        return [...serverNotifications, ...localMilestones.filter((item) => !serverIds.has(item.id) && !serverKeys.has(`${item.title}|${item.href}`))].slice(0, 40)
      })
    }).catch(() => {
      window.clearInterval(interval)
    })
    void refreshNotifications()
    interval = window.setInterval(refreshNotifications, 10000)
    return () => { active = false; window.clearInterval(interval) }
  }, [campaignBackendAvailable])

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(highlightTimer.current)
    window.clearTimeout(campaignHighlightTimer.current)
    campaignUpdateTimers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    writeStoredCampaigns(campaigns)
  }, [campaigns])

  useEffect(() => {
    const syncStoredState = (event) => {
      if (event.key === CAMPAIGN_STORAGE_KEY && event.newValue) {
        try {
          const nextCampaigns = JSON.parse(event.newValue)
          if (Array.isArray(nextCampaigns)) setCampaigns(nextCampaigns)
        } catch { /* Ignore incomplete storage events. */ }
      }
      if (event.key === NOTIFICATION_STORAGE_KEY && event.newValue) {
        try {
          const nextNotifications = JSON.parse(event.newValue)
          if (Array.isArray(nextNotifications)) setNotifications(nextNotifications)
        } catch { /* Ignore incomplete storage events. */ }
      }
    }
    window.addEventListener('storage', syncStoredState)
    return () => window.removeEventListener('storage', syncStoredState)
  }, [])

  useEffect(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const soon = new Date(now)
    soon.setDate(soon.getDate() + 3)
    const upcoming = campaigns.flatMap((campaign) => (campaign.milestones || []).flatMap((milestone) => {
      if (!milestone.date || milestone.status === 'COMPLETED') return []
      const dueDate = new Date(`${milestone.date}T00:00:00`)
      if (dueDate < now || dueDate > soon) return []
      return [{
        id: `milestone-due-${campaign.id}-${milestone.id}`,
        icon: 'clock',
        title: `Milestone sắp đến hạn · ${milestone.title}`,
        detail: `${campaign.name} · ${milestone.date}${milestone.owner ? ` · ${milestone.owner}` : ''}`,
        campaignId: campaign.id,
        href: `/campaigns/${campaign.id}?tab=timeline`,
        unread: true,
        createdAt: new Date().toISOString(),
      }]
    }))
    if (!upcoming.length) return
    setNotifications((current) => {
      const known = new Set(current.map((item) => item.id))
      const additions = upcoming.filter((item) => !known.has(item.id))
      if (!additions.length) return current
      const next = [...additions, ...current].slice(0, 40)
      writeStoredNotifications(next)
      return next
    })
  }, [campaigns])

  const showToast = (message) => {
    setToastMessage(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMessage(''), 2800)
  }

  const highlightCreator = (creatorId) => {
    setRecentlyAddedCreatorId(creatorId)
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setRecentlyAddedCreatorId(null), 5000)
  }

  const highlightCampaign = (campaign) => {
    setRecentlyCreatedCampaignId(campaign.id)
    window.clearTimeout(campaignHighlightTimer.current)
    campaignHighlightTimer.current = window.setTimeout(() => setRecentlyCreatedCampaignId(null), 5000)
  }

  const createCampaign = async (input) => {
    let campaign
    try {
      campaign = normalizeCampaign(await campaignApi.create(input))
    } catch (error) {
      if (!shouldUseLocalCampaignFallback(error)) {
        const message = getApiErrorMessage(error, 'Không thể tạo Campaign.')
        showToast(message)
        throw new Error(message)
      }
      campaign = {
        ...input,
        creators: (input.creators || []).map((assignment) => campaignCreatorAssignment(
          creators.find((creator) => String(creator.id) === String(assignment.creatorId)),
          input.deliverables,
          assignment,
        )),
        id: nextCampaignId(campaigns),
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
      }
    }
    setCampaigns((current) => replaceCampaign(current, campaign))
    highlightCampaign(campaign)
    showToast(`Đã tạo ${campaign.id} ở trạng thái Draft`)
    return campaign
  }

  const refreshCampaign = useCallback(async (campaignId) => {
    try {
      const campaign = await campaignApi.get(campaignId)
      setCampaigns((current) => replaceCampaign(current, campaign))
      setCampaignBackendAvailable(true)
      return normalizeCampaign(campaign)
    } catch {
      setCampaignBackendAvailable(false)
      return null
    }
  }, [])

  const assignCreatorToCampaign = (creatorId, campaignId) => {
    const creator = creators.find((item) => String(item.id) === String(creatorId))
    const campaign = campaigns.find((item) => item.id === campaignId)
    if (!creator || !campaign) {
      showToast('Không tìm thấy Creator hoặc Campaign.')
      return false
    }
    if ((campaign.creators || []).some((item) => String(item.creatorId) === String(creatorId))) {
      showToast(`${creator.name} đã có trong ${campaign.name}`)
      return false
    }
    const assignment = campaignCreatorAssignment(creator, campaign.deliverables)
    setCampaigns((current) => current.map((item) => item.id === campaignId
      ? { ...item, creators: [...(item.creators || []), assignment] }
      : item))
    void campaignApi.addCreators(campaignId, [String(creatorId)]).then((saved) => {
      setCampaigns((current) => replaceCampaign(current, saved))
    }).catch((error) => {
      if (!shouldUseLocalCampaignFallback(error)) showToast(getApiErrorMessage(error, 'Creator chưa được lưu vào Campaign trên backend.'))
    })
    showToast(`Đã assign ${creator.name} vào ${campaign.name}`)
    return true
  }

  const addCampaignCreators = (campaignId, creatorIds) => {
    const campaign = campaigns.find((item) => item.id === campaignId)
    if (!campaign) return 0
    const existingIds = new Set((campaign.creators || []).map((item) => String(item.creatorId)))
    const additions = creatorIds
      .map((creatorId) => creators.find((creator) => String(creator.id) === String(creatorId)))
      .filter((creator) => creator && !existingIds.has(String(creator.id)))
      .map((creator) => campaignCreatorAssignment(creator, campaign.deliverables))
    if (!additions.length) return 0
    setCampaigns((current) => current.map((item) => item.id === campaignId
      ? { ...item, creators: [...(item.creators || []), ...additions] }
      : item))
    void campaignApi.addCreators(campaignId, additions.map((item) => String(item.creatorId))).then((saved) => {
      setCampaigns((current) => replaceCampaign(current, saved))
    }).catch((error) => {
      if (!shouldUseLocalCampaignFallback(error)) showToast(getApiErrorMessage(error, 'Danh sách Creator chưa được lưu vào backend.'))
    })
    showToast(`Đã thêm ${additions.length} Creator vào ${campaign.name}`)
    return additions.length
  }

  const removeCampaignCreator = (campaignId, creatorId) => {
    const campaign = campaigns.find((item) => item.id === campaignId)
    const assignment = campaign?.creators?.find((item) => String(item.creatorId) === String(creatorId))
    if (!campaign || !assignment) return
    setCampaigns((current) => current.map((item) => item.id === campaignId
      ? { ...item, creators: (item.creators || []).filter((creator) => String(creator.creatorId) !== String(creatorId)) }
      : item))
    void campaignApi.removeCreator(campaignId, creatorId).then((saved) => {
      setCampaigns((current) => replaceCampaign(current, saved))
    }).catch((error) => {
      if (!shouldUseLocalCampaignFallback(error)) showToast(getApiErrorMessage(error, 'Chưa thể xoá Creator trên backend.'))
    })
    showToast(`Đã xoá ${assignment.name} khỏi ${campaign.name}`)
  }

  const updateCampaignCreator = (campaignId, creatorId, changes) => {
    setCampaigns((current) => current.map((campaign) => campaign.id === campaignId
      ? { ...campaign, creators: (campaign.creators || []).map((creator) => String(creator.creatorId) === String(creatorId) ? { ...creator, ...changes } : creator) }
      : campaign))
    const key = `${campaignId}:${creatorId}`
    pendingCampaignCreatorChanges.current.set(key, { ...(pendingCampaignCreatorChanges.current.get(key) || {}), ...changes })
    window.clearTimeout(campaignUpdateTimers.current.get(key))
    campaignUpdateTimers.current.set(key, window.setTimeout(() => {
      const pending = pendingCampaignCreatorChanges.current.get(key) || {}
      pendingCampaignCreatorChanges.current.delete(key)
      campaignUpdateTimers.current.delete(key)
      void campaignApi.updateCreator(campaignId, creatorId, pending).then((saved) => {
        setCampaigns((current) => replaceCampaign(current, saved))
      }).catch((error) => {
        if (!shouldUseLocalCampaignFallback(error)) showToast(getApiErrorMessage(error, 'Thay đổi Creator chưa được lưu vào backend.'))
      })
    }, 650))
  }

  const updateCampaignMilestones = (campaignId, milestones) => {
    setCampaigns((current) => current.map((campaign) => campaign.id === campaignId ? { ...campaign, milestones } : campaign))
    void campaignApi.updateMilestones(campaignId, milestones).then((saved) => {
      setCampaigns((current) => replaceCampaign(current, saved))
    }).catch((error) => {
      if (!shouldUseLocalCampaignFallback(error)) showToast(getApiErrorMessage(error, 'Timeline chưa được lưu vào backend.'))
    })
    showToast('Đã cập nhật Timeline Campaign')
  }

  const markCampaignClientChangesRead = (campaignId) => {
    setCampaigns((current) => current.map((campaign) => campaign.id === campaignId
      ? { ...campaign, creators: (campaign.creators || []).map((creator) => creator.clientChangeUnread ? { ...creator, clientChangeUnread: false } : creator) }
      : campaign))
    void campaignApi.markClientChangesRead(campaignId).then((saved) => {
      setCampaigns((current) => replaceCampaign(current, saved))
    }).catch(() => { /* The optimistic read state is kept while offline. */ })
  }

  const ensureCampaignReviewLink = async (campaignId) => {
    const current = campaigns.find((campaign) => campaign.id === campaignId)
    if (current?.reviewToken) return current.reviewToken
    try {
      const reviewLink = await campaignApi.ensureReviewLink(campaignId)
      setCampaigns((items) => items.map((campaign) => campaign.id === campaignId ? { ...campaign, reviewToken: reviewLink.token, reviewExpiresAt: reviewLink.expiresAt } : campaign))
      return reviewLink.token
    } catch (error) {
      if (!shouldUseLocalCampaignFallback(error)) showToast(getApiErrorMessage(error, 'Không thể tạo link Client Review.'))
      return current ? campaignReviewToken(current) : ''
    }
  }

  const markAllNotificationsRead = () => {
    setNotifications((current) => {
      const next = current.map((notification) => ({ ...notification, unread: false }))
      writeStoredNotifications(next)
      return next
    })
    void notificationApi.markAllRead().catch(() => { /* Local state remains useful while offline. */ })
  }

  const markNotificationRead = (notificationId) => {
    setNotifications((current) => {
      const next = current.map((notification) => notification.id === notificationId ? { ...notification, unread: false } : notification)
      writeStoredNotifications(next)
      return next
    })
    if (!String(notificationId).startsWith('milestone-due-')) void notificationApi.markRead(notificationId).catch(() => { /* Keep optimistic state. */ })
  }

  const addCreator = async (form) => {
    try {
      const savedCreator = await creatorApi.create(creatorPayloadFromForm(form))
      dispatchCreators({ type: 'apply', update: (current) => [savedCreator, ...current] })
      highlightCreator(savedCreator.id)
      setBackendAvailable(true)
      showToast(`Đã thêm ${savedCreator.name} vào kho Creator`)
      return savedCreator
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể lưu Creator mới.')
      showToast(message)
      throw new Error(message)
    }
  }

  const saveCreatorDetails = async (creatorId, form) => {
    try {
      const savedCreator = await creatorApi.update(creatorId, creatorPayloadFromForm(form))
      dispatchCreators({ type: 'replaceOne', creatorId, creator: savedCreator })
      setBackendAvailable(true)
      showToast(`Đã cập nhật hồ sơ ${savedCreator.name}`)
      return savedCreator
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể cập nhật Creator.')
      showToast(message)
      throw new Error(message)
    }
  }

  const addQuickCreator = () => {
    const creator = createQuickCreator()
    dispatchCreators({ type: 'apply', update: (current) => [creator, ...current] })
    highlightCreator(creator.id)
    showToast('Đã thêm một dòng Creator mới')
    return creator
  }

  const applyCreatorImport = (importedCreators, mode, summary = {}) => {
    dispatchCreators({
      type: 'apply',
      update: (current) => {
        if (mode === 'replace') return importedCreators
        const importedById = new Map(importedCreators.map((creator) => [creator.id, creator]))
        const created = importedCreators.filter((creator) => !current.some((currentCreator) => currentCreator.id === creator.id))
        const updated = current.filter((creator) => importedById.has(creator.id)).map((creator) => importedById.get(creator.id))
        const unchanged = current.filter((creator) => !importedById.has(creator.id))
        return [...created, ...updated, ...unchanged]
      },
    })
    showToast(mode === 'replace'
      ? `Đang xem trước ${importedCreators.length} Creator thay thế`
      : `Preview: ${summary.createdCount || 0} mới · ${summary.updatedCount || 0} cập nhật`)
  }

  const updateCreator = (creatorId, changes) => {
    const normalizedChanges = { ...changes }
    if (changes.tiktokId) normalizedChanges.handle = changes.tiktokId.startsWith('@') ? changes.tiktokId : `@${changes.tiktokId}`
    if (Object.hasOwn(changes, 'cost')) normalizedChanges.bookingPrice = changes.cost
    dispatchCreators({ type: 'apply', update: (current) => current.map((creator) => creator.id === creatorId ? { ...creator, ...normalizedChanges } : creator) })
  }

  const deleteCreator = (creatorId) => {
    const creator = creators.find((item) => item.id === creatorId)
    if (!creator) return
    dispatchCreators({ type: 'apply', update: (current) => current.filter((item) => item.id !== creatorId) })
    showToast(`Đã xóa ${creator.tiktokId}. Có thể Undo để khôi phục.`)
  }

  const toggleArchive = (creatorId) => {
    const creator = creators.find((item) => item.id === creatorId)
    if (!creator) return
    const nextStatus = creator.status === 'Archived' ? 'Available' : 'Archived'
    dispatchCreators({ type: 'apply', update: (current) => current.map((item) => item.id === creatorId ? { ...item, status: nextStatus } : item) })
    showToast(`Đã ${nextStatus === 'Archived' ? 'lưu trữ' : 'khôi phục'} ${creator.name}`)
    if (typeof creatorId === 'string') {
      void creatorApi.update(creatorId, { status: nextStatus }).then(() => setBackendAvailable(true)).catch((error) => {
        dispatchCreators({ type: 'apply', update: (current) => current.map((item) => item.id === creatorId ? { ...item, status: creator.status } : item) })
        showToast(getApiErrorMessage(error, 'Không thể cập nhật trạng thái Creator.'))
      })
    }
  }

  const undoCreators = () => {
    dispatchCreators({ type: 'undo' })
    showToast('Đã hoàn tác thay đổi gần nhất')
  }

  const redoCreators = () => {
    dispatchCreators({ type: 'redo' })
    showToast('Đã khôi phục thay đổi')
  }

  const beginCreatorEditSession = () => {
    editSessionSnapshot.current = creatorHistory
  }

  const commitCreatorEditSession = () => {
    const snapshot = editSessionSnapshot.current
    editSessionSnapshot.current = null
    if (!snapshot) return
    const changes = getCreatorBatchChanges(snapshot.present, creatorHistory.present)
    if (!changes.creates.length && !changes.updates.length && !changes.deletes.length) return
    void creatorApi.batch(changes).then((serverCreators) => {
      dispatchCreators({ type: 'hydrate', creators: serverCreators })
      setBackendAvailable(true)
    }).catch((error) => showToast(getApiErrorMessage(error, 'Thay đổi chưa được lưu vào backend.')))
  }

  const cancelCreatorEditSession = () => {
    if (!editSessionSnapshot.current) return
    dispatchCreators({ type: 'restore', state: editSessionSnapshot.current })
    editSessionSnapshot.current = null
    setRecentlyAddedCreatorId(null)
    showToast('Đã hủy tất cả thay đổi trong phiên chỉnh sửa')
  }

  const value = {
    creators, campaigns, notifications, isLoadingCreators, isLoadingCampaigns, backendAvailable, campaignBackendAvailable, toastMessage, recentlyAddedCreatorId, recentlyCreatedCampaignId, showToast, createCampaign, refreshCampaign, ensureCampaignReviewLink, assignCreatorToCampaign, addCampaignCreators, removeCampaignCreator, updateCampaignCreator, updateCampaignMilestones, markCampaignClientChangesRead, markAllNotificationsRead, markNotificationRead, addCreator, saveCreatorDetails, addQuickCreator, applyCreatorImport, updateCreator, deleteCreator, toggleArchive,
    undoCreators, redoCreators, canUndo: creatorHistory.past.length > 0, canRedo: creatorHistory.future.length > 0,
    beginCreatorEditSession, commitCreatorEditSession, cancelCreatorEditSession,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
