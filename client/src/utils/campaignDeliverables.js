import { effectiveClientDecision } from '../config/campaigns.js'

export const DELIVERABLE_TRACKED_STATUSES = [
  { value: 'Done', label: 'Done', icon: 'check', tone: 'done' },
  { value: 'Lên kịch bản', label: 'Lên kịch bản', icon: 'edit', tone: 'script' },
  { value: 'Lên demo', label: 'Lên Demo', icon: 'eye', tone: 'demo' },
  { value: 'Brand feedback', label: 'Brand Feedback', icon: 'message', tone: 'feedback' },
  { value: 'Duyệt, chờ air', label: 'Duyệt chờ air', icon: 'clock', tone: 'air' },
]

export function normalizedDeliverableProgress(deliverable) {
  const statusAliases = {
    COMPLETED: 'Done',
    NOT_STARTED: 'Đang liên hệ',
    IN_PROGRESS: 'Lên kịch bản',
    PENDING_REVIEW: 'Brand feedback',
  }
  return deliverable?.progress || statusAliases[deliverable?.status] || 'Đang liên hệ'
}

export function trackedDeliverableCounts(deliverables) {
  return Object.fromEntries(DELIVERABLE_TRACKED_STATUSES.map(({ value }) => [
    value,
    deliverables.filter((item) => normalizedDeliverableProgress(item) === value).length,
  ]))
}

export function acceptedCampaignCreators(campaign) {
  return (campaign?.creators || []).filter((creator) => effectiveClientDecision(creator) === 'APPROVED' && (creator.kocDecision === 'APPROVED' || creator.creatorConfirmed))
}

export function campaignCreatorDeliverables(campaign, creator) {
  return creator?.deliverables?.length ? creator.deliverables : campaign?.deliverables || []
}

export function isFinalCampaignCreator(campaign, creator) {
  return effectiveClientDecision(creator) === 'APPROVED'
    && (creator.kocDecision === 'APPROVED' || creator.creatorConfirmed)
}

export function finalCampaignCreators(campaign) {
  return (campaign?.creators || []).filter((creator) => isFinalCampaignCreator(campaign, creator))
}

export function deliverableFeedbackState(campaign) {
  return Object.fromEntries(acceptedCampaignCreators(campaign).flatMap((creator) => campaignCreatorDeliverables(campaign, creator).map((item) => [`${creator.creatorId}:${item.id}`, item.brandFeedback || ''])))
}
