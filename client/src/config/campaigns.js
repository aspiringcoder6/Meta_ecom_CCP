export const CAMPAIGN_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'RUNNING', label: 'Đang chạy' },
  { value: 'PAUSED', label: 'Tạm dừng' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
]

export const CAMPAIGN_CREATOR_STATUSES = [
  { value: 'PROPOSED', label: 'Đề xuất' },
  { value: 'CONSIDER', label: 'Cân nhắc' },
  { value: 'CLIENT_APPROVED', label: 'Client đã duyệt' },
  { value: 'CLIENT_REJECTED', label: 'Client từ chối' },
  { value: 'CONFIRMED', label: 'Đã chốt' },
]

export const DELIVERABLE_STATUSES = [
  { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
]

export const CONTENT_TYPES = ['Video TikTok', 'Livestream', 'Post/Story', 'Nội dung khác']

export const CLIENT_REVIEW_DECISIONS = [
  { value: 'PENDING', label: 'Chờ phản hồi' },
  { value: 'APPROVED', label: 'Đồng ý' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'CONSIDER', label: 'Cân nhắc' },
]

export const MILESTONE_STATUSES = [
  { value: 'UPCOMING', label: 'Sắp thực hiện' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
]

export function campaignStatusLabel(value) {
  return CAMPAIGN_STATUSES.find((item) => item.value === value)?.label || value
}

export function campaignCreatorStatusLabel(value) {
  return CAMPAIGN_CREATOR_STATUSES.find((item) => item.value === value)?.label || value
}

export function clientReviewDecisionLabel(value) {
  return CLIENT_REVIEW_DECISIONS.find((item) => item.value === value)?.label || value
}

export function effectiveClientDecision(creator) {
  if (creator.clientDecision && creator.clientDecision !== 'PENDING') return creator.clientDecision
  if (creator.status === 'CLIENT_APPROVED' || creator.status === 'CONFIRMED') return 'APPROVED'
  if (creator.status === 'CLIENT_REJECTED') return 'REJECTED'
  if (creator.status === 'CONSIDER') return 'CONSIDER'
  return creator.clientDecision || 'PENDING'
}
