import { CREATOR_SEGMENTS, CREATOR_TYPES } from '../config/labels'
import { parseCategoryPaths } from './creatorCategoryPaths'
import { toCreatorList } from './creatorLists'

export const HISTORICAL_CAMPAIGN_OPTIONS = ['Chưa hợp tác', 'Đã hợp tác']

const NUMERIC_FIELDS = new Set(['cost', 'extraCost', 'followers', 'gmvMonth'])
const INTEGER_FIELDS = new Set(['followers'])

export const CREATOR_FIELD_OPTIONS = {
  segment: CREATOR_SEGMENTS,
  type: CREATOR_TYPES,
  historicalCampaign: HISTORICAL_CAMPAIGN_OPTIONS,
}

export function normalizeTikTokId(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^@+/, '')
}

export function normalizeTikTokLink(value) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return ''
  try {
    const url = new URL(text)
    const host = url.hostname.replace(/^www\./, '')
    const path = url.pathname.replace(/\/+$/, '') || '/'
    return `${host}${path}`
  } catch {
    return text.replace(/\/+$/, '')
  }
}

function duplicateCreator(field, value, creators, creatorId) {
  if (field !== 'tiktokId' && field !== 'tiktokLink') return null
  const normalize = field === 'tiktokId' ? normalizeTikTokId : normalizeTikTokLink
  const normalizedValue = normalize(value)
  if (!normalizedValue) return null
  return creators.find((creator) => String(creator.id) !== String(creatorId ?? '') && normalize(creator[field]) === normalizedValue) || null
}

export function validateCreatorValue(field, rawValue, context = {}) {
  const text = String(rawValue ?? '').trim()

  if (field === 'tiktokId') {
    if (!text) return { error: 'ID TikTok không được để trống.' }
    const duplicate = duplicateCreator(field, text, context.creators || [], context.creatorId)
    if (duplicate) return { error: `ID TikTok đã được sử dụng bởi ${duplicate.tiktokId}.` }
    return { value: text }
  }

  if (field === 'tiktokLink') {
    if (!text) return { error: 'Link TikTok không được để trống.' }
    const duplicate = duplicateCreator(field, text, context.creators || [], context.creatorId)
    if (duplicate) return { error: `Link TikTok đã được sử dụng bởi ${duplicate.tiktokId}.` }
    return { value: text }
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (text === '') return { value: 0 }
    const normalized = text.replace(/[\s,]/g, '')
    const number = Number(normalized)
    if (!Number.isFinite(number)) return { error: 'Hãy nhập một giá trị số hợp lệ.' }
    if (number < 0) return { error: 'Giá trị không được nhỏ hơn 0.' }
    if (INTEGER_FIELDS.has(field) && !Number.isInteger(number)) return { error: 'Giá trị phải là số nguyên.' }
    return { value: number }
  }

  if (field === 'category') {
    if (!text) return { value: ['OTHER'] }
    const values = parseCategoryPaths(rawValue, [])
    if (!values.length) return { error: 'Category không hợp lệ.' }
    return { value: values }
  }

  if (field === 'type') {
    const values = toCreatorList(rawValue, ['VIDEO'])
    if (values.some((value) => !CREATOR_TYPES.includes(value))) return { error: 'Có giá trị không nằm trong danh sách cho phép.' }
    return { value: values }
  }

  const options = CREATOR_FIELD_OPTIONS[field]
  if (options && !options.includes(text)) return { error: 'Giá trị không nằm trong danh sách cho phép.' }
  return { value: text }
}
