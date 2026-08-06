import { useEffect, useRef, useState } from 'react'
import { INITIAL_CREATORS } from '../data/creators'
import { AppContext } from './appContext'

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

export default function AppProvider({ children }) {
  const [creators, setCreators] = useState(INITIAL_CREATORS)
  const [toastMessage, setToastMessage] = useState('')
  const toastTimer = useRef(null)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = (message) => {
    setToastMessage(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMessage(''), 2800)
  }

  const addCreator = (form) => {
    const creator = createCreator(form)
    setCreators((current) => [creator, ...current])
    showToast(`Đã thêm ${creator.name} vào kho Creator`)
    return creator
  }

  const toggleArchive = (creatorId) => {
    const creator = creators.find((item) => item.id === creatorId)
    if (!creator) return
    const nextStatus = creator.status === 'Archived' ? 'Available' : 'Archived'
    setCreators((current) => current.map((item) => item.id === creatorId ? { ...item, status: nextStatus } : item))
    showToast(`Đã ${nextStatus === 'Archived' ? 'lưu trữ' : 'khôi phục'} ${creator.name}`)
  }

  return <AppContext.Provider value={{ creators, toastMessage, showToast, addCreator, toggleArchive }}>{children}</AppContext.Provider>
}
