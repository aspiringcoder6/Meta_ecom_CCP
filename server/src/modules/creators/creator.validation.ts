import { ApiError } from '../../utils/api-error.js'

export const CREATOR_SEGMENTS = ['MINI', 'TOP', 'MASSIVE', 'FREECAST'] as const
export const CREATOR_CATEGORIES = ['BEAUTY', 'MOM&BABY', 'SKINCARE', 'LIFESTYLE', 'CHUYÊN GIA/DƯỢC SĨ', 'HỘ SINH', 'FASHION', 'FOOD', 'TECH', 'OTHER'] as const
export const CREATOR_TYPES = ['VIDEO', 'LIVESTREAM'] as const
export const CREATOR_STATUSES = ['Active', 'In campaign', 'Available', 'Archived'] as const
export const HISTORICAL_CAMPAIGNS = ['Chưa hợp tác', 'Đã hợp tác'] as const

export interface CreatorInput {
  name: string
  tiktokLink: string
  tiktokId: string
  segment: string
  category: string[]
  type: string[]
  cost: number
  extraCost: number
  followers: number
  gmvMonth: number
  scope: string | null
  contact: string | null
  concept: string | null
  productFocus: string | null
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

function multiOptionValue(value: unknown, field: string, options: readonly string[], fallback: string, errors: FieldErrors) {
  const rawItems = Array.isArray(value)
    ? value.flatMap((item) => text(item).split(/[,;|\n]+/))
    : text(value).split(/[,;|\n]+/)
  const expandedItems = field === 'type'
    ? rawItems.flatMap((item) => text(item) === 'VIDEO / LIVESTREAM' ? ['VIDEO', 'LIVESTREAM'] : [item])
    : rawItems
  const result = [...new Set(expandedItems.map((item) => text(item)).filter(Boolean))]
  const values = result.length ? result : [fallback]
  if (values.some((item) => !options.includes(item))) errors[field] = 'Có giá trị không nằm trong danh sách cho phép.'
  return values
}

function categoryKey(value: unknown) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function categoryPathValue(value: unknown, errors: FieldErrors) {
  const rawValues = Array.isArray(value) ? value : [value]
  const tokens = rawValues.flatMap((item) => text(item).split(/[,;|\n]+/)).map((item) => text(item)).filter(Boolean)
  if (!tokens.length) return ['OTHER']
  const rootsByKey = new Map(CREATOR_CATEGORIES.map((category) => [categoryKey(category), category]))
  rootsByKey.set('mom baby', 'MOM&BABY')
  rootsByKey.set('mom and baby', 'MOM&BABY')
  const paths: string[] = []
  const seen = new Set<string>()
  let previousParts: string[] = []

  for (const token of tokens) {
    const tokenParts = token.split(/\s*>\s*/).map((part) => text(part)).filter(Boolean)
    const tokenHead = tokenParts[0]
    if (!tokenHead) continue
    const parts = tokenParts.length === 1 && previousParts.length > 1 ? [...previousParts.slice(0, -1), tokenHead] : tokenParts
    const firstPart = parts[0] ?? tokenHead
    const root = rootsByKey.get(categoryKey(firstPart)) || firstPart.replace(/\s+/g, ' ').trim()
    const retainedParts = parts.slice(0, 2)
    if (retainedParts.some((part) => part.length > 80)) {
      errors.category = 'Main Category và Subcategory tối đa 80 ký tự cho mỗi cấp.'
      continue
    }
    const normalizedParts = [root, ...retainedParts.slice(1).map((part) => part.replace(/\s+/g, ' ').trim())]
    const path = normalizedParts.join(' > ')
    const key = normalizedParts.map(categoryKey).join('>')
    if (!seen.has(key)) {
      seen.add(key)
      paths.push(path)
    }
    previousParts = normalizedParts
  }

  if (!paths.length && !errors.category) errors.category = 'Category không hợp lệ.'
  return paths.length ? paths : ['OTHER']
}

function collaborationValue(value: unknown, errors: FieldErrors) {
  if (value === undefined || value === null || text(value) === '') return 'Đã hợp tác'
  if (value === true) return 'Đã hợp tác'
  if (value === false) return 'Chưa hợp tác'
  const normalized = text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
  if (['true', 'yes', '1', 'da hop tac'].includes(normalized)) return 'Đã hợp tác'
  if (['false', 'no', '0', 'chua hop tac'].includes(normalized)) return 'Chưa hợp tác'
  errors.historicalCampaign = 'Giá trị phải là Đã hợp tác/Chưa hợp tác hoặc true/false.'
  return 'Đã hợp tác'
}

export function validateCreatorInput(value: unknown, partial = false): CreatorUpdate {
  const input = asObject(value)
  const errors: FieldErrors = {}
  const output: CreatorUpdate = {}
  const has = (field: string) => Object.hasOwn(input, field)

  if (!partial || has('tiktokId')) {
    const tiktokId = text(input.tiktokId)
    if (!tiktokId) errors.tiktokId = 'ID TikTok không được để trống.'
    output.tiktokId = tiktokId
  }

  if (!partial || has('name')) {
    const name = text(input.name) || output.tiktokId || ''
    output.name = name
  }

  if (!partial || has('tiktokLink')) {
    const tiktokLink = text(input.tiktokLink)
    if (!tiktokLink) errors.tiktokLink = 'Link TikTok không được để trống.'
    output.tiktokLink = tiktokLink
  }

  const optionFields = [
    ['segment', CREATOR_SEGMENTS, 'MINI'], ['status', CREATOR_STATUSES, 'Available'],
  ] as const
  for (const [field, options, fallback] of optionFields) {
    if (!partial || has(field)) output[field] = optionValue(input[field], field, options, fallback, errors)
  }
  if (!partial || has('category')) output.category = categoryPathValue(input.category, errors)
  if (!partial || has('type')) output.type = multiOptionValue(input.type, 'type', CREATOR_TYPES, 'VIDEO', errors)
  if (!partial || has('historicalCampaign')) output.historicalCampaign = collaborationValue(input.historicalCampaign, errors)

  const numericFields = [['cost', false], ['extraCost', false], ['followers', true], ['gmvMonth', false], ['engagement', false]] as const
  for (const [field, integer] of numericFields) {
    if (!partial || has(field)) output[field] = numberValue(input[field], field, errors, integer)
  }

  for (const field of ['scope', 'contact', 'concept', 'productFocus', 'mcnNote', 'email', 'phone'] as const) {
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
