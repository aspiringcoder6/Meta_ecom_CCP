import { useEffect, useReducer, useRef, useState } from 'react'
import { INITIAL_CREATORS } from '../data/creators'
import { creatorApi } from '../services/creatorApi'
import { getApiErrorMessage } from '../services/apiClient'
import { AppContext } from './appContext'

const HISTORY_LIMIT = 60

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
  const [isLoadingCreators, setIsLoadingCreators] = useState(true)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [recentlyAddedCreatorId, setRecentlyAddedCreatorId] = useState(null)
  const toastTimer = useRef(null)
  const highlightTimer = useRef(null)
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

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(highlightTimer.current)
  }, [])

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
    creators, isLoadingCreators, backendAvailable, toastMessage, recentlyAddedCreatorId, showToast, addCreator, saveCreatorDetails, addQuickCreator, applyCreatorImport, updateCreator, deleteCreator, toggleArchive,
    undoCreators, redoCreators, canUndo: creatorHistory.past.length > 0, canRedo: creatorHistory.future.length > 0,
    beginCreatorEditSession, commitCreatorEditSession, cancelCreatorEditSession,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
