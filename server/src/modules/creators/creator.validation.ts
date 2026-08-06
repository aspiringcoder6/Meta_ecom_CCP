import { ApiError } from '../../utils/api-error.js'

export const CREATOR_SEGMENTS = ['MINI', 'TOP', 'MASSIVE', 'FREECAST'] as const
export const CREATOR_CATEGORIES = ['BEAUTY', 'MOM&BABY', 'SKINCARE', 'LIFESTYLE', 'CHUYÊN GIA/DƯỢC SĨ', 'HỘ SINH', 'FASHION', 'FOOD', 'TECH'] as const
export const CREATOR_TYPES = ['VIDEO', 'LIVESTREAM', 'VIDEO / LIVESTREAM'] as const
export const CREATOR_STATUSES = ['Active', 'In campaign', 'Available', 'Archived'] as const
export const HISTORICAL_CAMPAIGNS = ['Chưa hợp tác', 'Đã hợp tác'] as const

export interface CreatorInput {
  name: string
  tiktokLink: string
  tiktokId: string
  segment: string
  category: string
  type: string
  cost: number
  extraCost: number
  followers: number
  gmvMonth: number
  scope: string | null
  contact: string | null
  historicalCampaign: string
  mcnNote: string | null
  engagement: number
  status: string
  email: string | null
  phone: string | null
  bookingPrice: number
}

type CreatorUpdate = Partial<CreatorInput>
type FieldErrors = Record<string, string>

function asObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Dữ liệu Creator không đúng định dạng.', 'INVALID_BODY')
  return value as Record<string, unknown>
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function nullableText(value: unknown) {
  const result = text(value)
  return !result || result === 'Chưa cung cấp' ? null : result
}

function numberValue(value: unknown, field: string, errors: FieldErrors, integer = false) {
  const number = typeof value === 'string' && value.trim() === '' ? 0 : Number(value ?? 0)
  if (!Number.isFinite(number) || number < 0) errors[field] = 'Giá trị phải là số lớn hơn hoặc bằng 0.'
  else if (integer && !Number.isInteger(number)) errors[field] = 'Giá trị phải là số nguyên.'
  else if (integer && number > 2_147_483_647) errors[field] = 'Giá trị vượt quá giới hạn cho phép.'
  return Number.isFinite(number) && number >= 0 ? number : 0
}

function optionValue(value: unknown, field: string, options: readonly string[], fallback: string, errors: FieldErrors) {
  const result = text(value) || fallback
  if (!options.includes(result)) errors[field] = 'Giá trị không nằm trong danh sách cho phép.'
  return result
}

export function validateCreatorInput(value: unknown, partial = false): CreatorUpdate {
  const input = asObject(value)
  const errors: FieldErrors = {}
  const output: CreatorUpdate = {}
  const has = (field: string) => Object.hasOwn(input, field)

  if (!partial || has('tiktokId')) {
    const tiktokId = text(input.tiktokId).replace(/^@/, '').toLowerCase()
    if (!tiktokId) errors.tiktokId = 'ID TikTok không được để trống.'
    else if (!/^[\p{L}\p{N}._-]+$/u.test(tiktokId)) errors.tiktokId = 'ID TikTok chỉ được chứa chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'
    output.tiktokId = tiktokId
  }

  if (!partial || has('name')) {
    const name = text(input.name) || output.tiktokId || ''
    if (!name) errors.name = 'Tên Creator không được để trống.'
    output.name = name
  }

  if (!partial || has('tiktokLink') || has('tiktokId')) {
    const tiktokLink = text(input.tiktokLink) || (output.tiktokId ? `https://www.tiktok.com/@${output.tiktokId}` : '')
    try {
      const url = new URL(tiktokLink)
      if (!/(^|\.)tiktok\.com$/i.test(url.hostname) || !url.pathname.startsWith('/@')) errors.tiktokLink = 'Hãy nhập Link TikTok có dạng https://www.tiktok.com/@id.'
    } catch {
      errors.tiktokLink = 'Link TikTok không đúng định dạng URL.'
    }
    output.tiktokLink = tiktokLink
  }

  const optionFields = [
    ['segment', CREATOR_SEGMENTS, 'MINI'], ['category', CREATOR_CATEGORIES, 'BEAUTY'], ['type', CREATOR_TYPES, 'VIDEO'],
    ['historicalCampaign', HISTORICAL_CAMPAIGNS, 'Chưa hợp tác'], ['status', CREATOR_STATUSES, 'Available'],
  ] as const
  for (const [field, options, fallback] of optionFields) {
    if (!partial || has(field)) output[field] = optionValue(input[field], field, options, fallback, errors)
  }

  const numericFields = [['cost', false], ['extraCost', false], ['followers', true], ['gmvMonth', false], ['engagement', false]] as const
  for (const [field, integer] of numericFields) {
    if (!partial || has(field)) output[field] = numberValue(input[field], field, errors, integer)
  }

  for (const field of ['scope', 'contact', 'mcnNote', 'email', 'phone'] as const) {
    if (!partial || has(field)) output[field] = nullableText(input[field])
  }
  if (output.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.email)) errors.email = 'Email không đúng định dạng.'
  if (!partial || has('cost')) output.bookingPrice = output.cost ?? numberValue(input.cost, 'cost', errors)

  if (Object.keys(errors).length) throw new ApiError(422, 'Dữ liệu Creator chưa hợp lệ.', 'CREATOR_VALIDATION_ERROR', errors)
  return output
}

export function validateCreatorArray(value: unknown) {
  if (!Array.isArray(value)) throw new ApiError(400, 'Danh sách Creator phải là một mảng.', 'INVALID_CREATOR_LIST')
  if (value.length > 5000) throw new ApiError(413, 'Mỗi lần chỉ được xử lý tối đa 5.000 Creator.', 'CREATOR_LIMIT_EXCEEDED')
  return value.map((creator, index) => {
    try {
      return validateCreatorInput(creator) as CreatorInput
    } catch (error) {
      if (error instanceof ApiError) throw new ApiError(error.statusCode, `Creator tại vị trí ${index + 1} chưa hợp lệ.`, error.code, { index, errors: error.details })
      throw error
    }
  })
}
