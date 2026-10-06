import { effectiveClientDecision } from '../config/campaigns.js'
import { deliverableFeedbackState } from './campaignDeliverables.js'
import { normalizeProducts } from './campaignProducts.js'
import { clientResponseChanges } from './clientProductResponses.js'

export function initialClientResponses(campaign) {
  return Object.fromEntries((campaign?.creators || []).map((creator) => [String(creator.creatorId), {
    decision: effectiveClientDecision(creator), note: creator.clientNote || '',
    brandProducts: normalizeProducts(creator.brandProducts).join(', '),
  }]))
}

// Only reset drafts explicitly acknowledged by the server. Keep failed rows and
// unsent edits in the other tab when replacing the campaign with fresh data.
export function reconcileListingDrafts(previous, next, drafts, savedCreatorIds = []) {
  const result = initialClientResponses(next)
  const saved = new Set(savedCreatorIds.map(String))
  for (const creator of previous?.creators || []) {
    const id = String(creator.creatorId)
    if (!saved.has(id) && clientResponseChanges(creator, drafts[id])) result[id] = drafts[id]
  }
  return result
}

export function reconcileFeedbackDrafts(previous, next, drafts, savedDeliverables = []) {
  const before = deliverableFeedbackState(previous)
  const result = deliverableFeedbackState(next)
  const saved = new Set(savedDeliverables.map(({ creatorId, id }) => `${creatorId}:${id}`))
  for (const [key, value] of Object.entries(drafts)) {
    if (!saved.has(key) && (value || '').trim() !== (before[key] || '').trim()) result[key] = value
  }
  return result
}

export function reviewSubmissionResult(campaign, submitted, deliverables = false) {
  if (campaign.submissionResult) return campaign.submissionResult
  // Compatibility with an older backend while frontend/backend deploy separately.
  const savedDeliverables = deliverables ? submitted.flatMap((creator) => creator.deliverables.map(({ id }) => ({ creatorId: creator.creatorId, id }))) : []
  const savedCreatorIds = deliverables ? [] : submitted.map(({ creatorId }) => creatorId)
  return { savedCount: deliverables ? savedDeliverables.length : savedCreatorIds.length, savedCreatorIds, savedDeliverables, errors: [], interrupted: false }
}

export function reviewSubmissionMessage(result, deliverables = false) {
  const saved = `Đã lưu ${result.savedCount} ${deliverables ? 'feedback' : 'thay đổi'} đến team Campaign.`
  return result.errors?.length ? `${saved} ${result.errors.length} mục chưa lưu; xem lỗi bên trên. Nội dung chưa lưu vẫn được giữ lại để sửa và gửi lại.` : saved
}

export function reviewIssuesFor(result, creatorId, deliverableId) {
  return (result?.errors || []).filter((issue) => String(issue.creatorId) === String(creatorId)
    && (deliverableId === undefined || !issue.deliverableId || String(issue.deliverableId) === String(deliverableId)))
}
