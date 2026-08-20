import { ApiError } from '../../utils/api-error.js'

function text(value: unknown, field: string, required = false) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (required && !normalized) throw new ApiError(422, `${field} là bắt buộc.`, 'INVALID_CAMPAIGN', { [field]: `${field} là bắt buộc.` })
  return normalized
}

function dateValue(value: unknown, field: string) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) throw new ApiError(422, `${field} không hợp lệ.`, 'INVALID_CAMPAIGN', { [field]: `${field} không hợp lệ.` })
  return date
}

function amount(value: unknown, optional = false) {
  if ((value === '' || value === null || value === undefined) && optional) return null
  const normalized = Number(value)
  if (!Number.isFinite(normalized) || normalized < 0) throw new ApiError(422, 'Ngân sách không hợp lệ.', 'INVALID_CAMPAIGN')
  return normalized
}

export function validateCampaignCreate(value: unknown) {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const startDate = dateValue(input.startDate, 'Ngày bắt đầu')
  const endDate = dateValue(input.endDate, 'Ngày kết thúc')
  if (endDate < startDate) throw new ApiError(422, 'Ngày kết thúc phải sau ngày bắt đầu.', 'INVALID_CAMPAIGN')
  return {
    name: text(input.name, 'Tên Campaign', true), client: text(input.client, 'Client / Brand', true), owner: text(input.owner, 'Owner', true),
    description: text(input.description, 'Mô tả'), startDate, endDate,
    totalBudget: amount(input.totalBudget) ?? 0, creatorBudget: amount(input.creatorBudget, true),
    creators: Array.isArray(input.creators) ? input.creators : [],
    milestones: Array.isArray(input.milestones) ? input.milestones : [],
    deliverables: Array.isArray(input.deliverables) ? input.deliverables : [],
  }
}

export function validateCreatorIds(value: unknown) {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  if (!Array.isArray(input.creatorIds)) throw new ApiError(422, 'Danh sách Creator không hợp lệ.', 'INVALID_CREATORS')
  return [...new Set(input.creatorIds.map(String).filter(Boolean))]
}

export function validateCampaignCreatorChanges(value: unknown) {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const changes: Record<string, unknown> = {}
  if (typeof input.status === 'string') changes.status = input.status
  if (input.actualPrice === '' || input.actualPrice === null) changes.actualPrice = null
  else if (input.actualPrice !== undefined) changes.actualPrice = amount(input.actualPrice, true)
  if (Array.isArray(input.deliverables)) changes.deliverables = input.deliverables
  if (typeof input.creatorConfirmed === 'boolean') changes.creatorConfirmed = input.creatorConfirmed
  if (!Object.keys(changes).length) throw new ApiError(422, 'Không có thay đổi hợp lệ.', 'EMPTY_UPDATE')
  return changes
}

export function validateMilestones(value: unknown) {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  if (!Array.isArray(input.milestones)) throw new ApiError(422, 'Timeline không hợp lệ.', 'INVALID_TIMELINE')
  return input.milestones.map((raw, index) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return {
      title: text(item.title, `Milestone ${index + 1}`, true),
      dueDate: dateValue(item.date || item.dueDate, `Ngày milestone ${index + 1}`),
      owner: text(item.owner, `Người phụ trách milestone ${index + 1}`, true),
      status: text(item.status, 'Trạng thái') || 'UPCOMING',
    }
  })
}

export function validateClientResponses(value: unknown) {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  if (!Array.isArray(input.responses)) throw new ApiError(422, 'Phản hồi không hợp lệ.', 'INVALID_REVIEW')
  const allowed = new Set(['APPROVED', 'REJECTED', 'CONSIDER'])
  return input.responses.map((raw) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const decision = String(item.decision || '')
    if (!item.creatorId || !allowed.has(decision)) throw new ApiError(422, 'Phản hồi Creator không hợp lệ.', 'INVALID_REVIEW')
    return { creatorId: String(item.creatorId), decision, note: text(item.note, 'Ghi chú').slice(0, 2000) }
  })
}
