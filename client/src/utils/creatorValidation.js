import { CREATOR_CATEGORIES, CREATOR_SEGMENTS, CREATOR_TYPES } from '../config/labels'

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
    const normalized = text.replace(/^@/, '')
    if (!normalized) return { error: 'ID TikTok không được để trống.' }
    if (!/^[\p{L}\p{N}._-]+$/u.test(normalized)) return { error: 'ID chỉ được chứa chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.' }
    return { value: normalized }
  }

  if (field === 'tiktokLink') {
    if (!text) return { error: 'Link TikTok không được để trống.' }
    try {
      const url = new URL(text)
      if (!url.hostname.toLowerCase().includes('tiktok.com')) return { error: 'Hãy nhập một đường dẫn TikTok hợp lệ.' }
      return { value: text }
    } catch {
      return { error: 'Đường dẫn không đúng định dạng URL.' }
    }
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (text === '') return { error: 'Giá trị số không được để trống.' }
    const normalized = text.replace(/[\s,]/g, '')
    const number = Number(normalized)
    if (!Number.isFinite(number)) return { error: 'Hãy nhập một giá trị số hợp lệ.' }
    if (number < 0) return { error: 'Giá trị không được nhỏ hơn 0.' }
    if (INTEGER_FIELDS.has(field) && !Number.isInteger(number)) return { error: 'Giá trị phải là số nguyên.' }
    return { value: number }
  }

  const options = CREATOR_FIELD_OPTIONS[field]
  if (options && !options.includes(text)) return { error: 'Giá trị không nằm trong danh sách cho phép.' }
  return { value: text }
}
