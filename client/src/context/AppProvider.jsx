import { useEffect, useReducer, useRef, useState } from 'react'
import { INITIAL_CREATORS } from '../data/creators'
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
  if (action.type === 'restore') return action.state
  return state
}

function createCreator(form) {
  const words = form.name.trim().split(/\s+/)
  return {
    id: Date.now(), name: form.name.trim(),
    handle: form.handle.trim().startsWith('@') ? form.handle.trim() : `@${form.handle.trim()}`,
    initials: words.slice(0, 2).map((word) => word[0]).join('').toUpperCase(),
    platform: 'TikTok', tiktokLink: form.tiktokLink || `https://www.tiktok.com/${form.handle.trim()}`,
    tiktokId: form.handle.trim().replace(/^@/, ''), segment: form.segment, category: form.category, type: form.type,
    cost: Number(form.cost) || 0, extraCost: Number(form.extraCost) || 0, gmvMonth: Number(form.gmvMonth) || 0,
    scope: form.scope || '', contact: form.contact || form.email || 'Chưa cung cấp',
    historicalCampaign: form.historicalCampaign || 'Chưa hợp tác', mcnNote: form.mcnNote || '',
    followers: Number(form.followers) || 0, engagement: Number(form.engagement) || 0,
    status: 'Available', email: form.email || 'Chưa cung cấp', phone: form.phone || 'Chưa cung cấp',
    bookingPrice: Number(form.cost) || 0, campaigns: 0, color: '#dcecff', accent: '#1769aa',
  }
}

function createQuickCreator() {
  const id = Date.now()
  const tiktokId = `creator_${String(id).slice(-6)}`
  return {
    id, name: 'Creator mới', handle: `@${tiktokId}`, initials: 'CR', platform: 'TikTok',
    tiktokLink: `https://www.tiktok.com/@${tiktokId}`, tiktokId, segment: 'MINI', category: 'BEAUTY', type: 'VIDEO',
    cost: 0, extraCost: 0, followers: 0, gmvMonth: 0, scope: '', contact: '',
    historicalCampaign: 'Chưa hợp tác', mcnNote: '', engagement: 0, status: 'Available',
    email: 'Chưa cung cấp', phone: 'Chưa cung cấp', bookingPrice: 0, campaigns: 0,
    color: '#dcecff', accent: '#1769aa',
  }
}

export default function AppProvider({ children }) {
  const [creatorHistory, dispatchCreators] = useReducer(creatorHistoryReducer, { past: [], present: INITIAL_CREATORS, future: [] })
  const [toastMessage, setToastMessage] = useState('')
  const [recentlyAddedCreatorId, setRecentlyAddedCreatorId] = useState(null)
  const toastTimer = useRef(null)
  const highlightTimer = useRef(null)
  const editSessionSnapshot = useRef(null)
  const creators = creatorHistory.present

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

  const addCreator = (form) => {
    const creator = createCreator(form)
    dispatchCreators({ type: 'apply', update: (current) => [creator, ...current] })
    highlightCreator(creator.id)
    showToast(`Đã thêm ${creator.name} vào kho Creator`)
    return creator
  }

  const addQuickCreator = () => {
    const creator = createQuickCreator()
    dispatchCreators({ type: 'apply', update: (current) => [creator, ...current] })
    highlightCreator(creator.id)
    showToast('Đã thêm một dòng Creator mới')
    return creator
  }

  const updateCreator = (creatorId, changes) => {
    const normalizedChanges = { ...changes }
    if (changes.tiktokId) normalizedChanges.handle = `@${changes.tiktokId}`
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
    editSessionSnapshot.current = null
  }

  const cancelCreatorEditSession = () => {
    if (!editSessionSnapshot.current) return
    dispatchCreators({ type: 'restore', state: editSessionSnapshot.current })
    editSessionSnapshot.current = null
    setRecentlyAddedCreatorId(null)
    showToast('Đã hủy tất cả thay đổi trong phiên chỉnh sửa')
  }

  const value = {
    creators, toastMessage, recentlyAddedCreatorId, showToast, addCreator, addQuickCreator, updateCreator, deleteCreator, toggleArchive,
    undoCreators, redoCreators, canUndo: creatorHistory.past.length > 0, canRedo: creatorHistory.future.length > 0,
    beginCreatorEditSession, commitCreatorEditSession, cancelCreatorEditSession,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
