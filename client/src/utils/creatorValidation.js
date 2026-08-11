import { CREATOR_CATEGORIES, CREATOR_SEGMENTS, CREATOR_TYPES } from '../config/labels'
import { toCreatorList } from './creatorLists'

export const HISTORICAL_CAMPAIGN_OPTIONS = ['Chưa hợp tác', 'Đã hợp tác']

const NUMERIC_FIELDS = new Set(['cost', 'extraCost', 'followers', 'gmvMonth'])
const INTEGER_FIELDS = new Set(['followers'])

export const CREATOR_FIELD_OPTIONS = {
  segment: CREATOR_SEGMENTS,
  category: CREATOR_CATEGORIES,
  type: CREATOR_TYPES,
  historicalCampaign: HISTORICAL_CAMPAIGN_OPTIONS,
}

export function validateCreatorValue(field, rawValue) {
  const text = String(rawValue ?? '').trim()

  if (field === 'tiktokId') {
    if (!text) return { error: 'ID TikTok không được để trống.' }
    return { value: text }
  }

  if (field === 'tiktokLink') {
    if (!text) return { error: 'Link TikTok không được để trống.' }
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

  if (field === 'category' || field === 'type') {
    const fallback = field === 'category' ? ['BEAUTY'] : ['VIDEO']
    const values = toCreatorList(rawValue, fallback)
    const options = CREATOR_FIELD_OPTIONS[field]
    if (values.some((value) => !options.includes(value))) return { error: 'Có giá trị không nằm trong danh sách cho phép.' }
    return { value: values }
  }

  const options = CREATOR_FIELD_OPTIONS[field]
  if (options && !options.includes(text)) return { error: 'Giá trị không nằm trong danh sách cho phép.' }
  return { value: text }
}
