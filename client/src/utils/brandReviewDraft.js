import { campaignCreatorDeliverables, deliverableFeedbackState } from './campaignDeliverables.js'
import { clientResponseChanges } from './clientProductResponses.js'
import { initialClientResponses } from './clientReviewSubmission.js'
import { normalizeProducts } from './campaignProducts.js'

export const brandReviewDraftKey = (token) => `meta-ecom-brand-review-draft-v1:${encodeURIComponent(token)}`

export function readBrandReviewDraft(token, storage) {
  try {
    storage ||= window.localStorage
    const value = JSON.parse(storage.getItem(brandReviewDraftKey(token)))
    return value?.version === 1 && Array.isArray(value.listing) && Array.isArray(value.feedback) ? value : null
  } catch { return null }
}

export function createBrandReviewDraft(campaign, responses, feedback) {
  const listing = (campaign.creators || []).flatMap((creator) => {
    const draft = responses[String(creator.creatorId)]
    const changes = clientResponseChanges(creator, draft)
    return changes ? [{ ...changes,
      ...(changes.note !== undefined ? { note: draft.note } : {}),
      ...(changes.brandProducts !== undefined ? { brandProducts: draft.brandProducts } : {}),
    }] : []
  })
  const feedbackChanges = (campaign.creators || []).flatMap((creator) => campaignCreatorDeliverables(campaign, creator).flatMap((item) => {
    const value = feedback[`${creator.creatorId}:${item.id}`]
    return value !== undefined && String(value).trim() !== String(item.brandFeedback || '').trim()
      ? [{ creatorId: creator.creatorId, id: item.id, brandFeedback: value }] : []
  }))
  return { version: 1, listing, feedback: feedbackChanges }
}

export function restoreBrandReviewDraft(campaign, draft) {
  const responses = initialClientResponses(campaign)
  const feedback = deliverableFeedbackState(campaign)
  const creators = new Map((campaign.creators || []).map((creator) => [String(creator.creatorId), creator]))
  for (const entry of draft?.listing || []) {
    if (!entry || !creators.has(String(entry.creatorId))) continue
    const value = responses[String(entry.creatorId)]
    if (['APPROVED', 'REJECTED', 'PENDING'].includes(entry.decision)) value.decision = entry.decision
    if (typeof entry.note === 'string') value.note = entry.note
    if (typeof entry.brandProducts === 'string' || Array.isArray(entry.brandProducts)) value.brandProducts = typeof entry.brandProducts === 'string' ? entry.brandProducts : normalizeProducts(entry.brandProducts).join(', ')
  }
  for (const entry of draft?.feedback || []) {
    if (!entry || typeof entry.brandFeedback !== 'string') continue
    const creator = creators.get(String(entry.creatorId))
    if (creator && campaignCreatorDeliverables(campaign, creator).some((item) => String(item.id) === String(entry.id))) feedback[`${entry.creatorId}:${entry.id}`] = entry.brandFeedback
  }
  const remaining = createBrandReviewDraft(campaign, responses, feedback)
  return { responses, feedback, restoredCount: remaining.listing.length + remaining.feedback.length }
}

export function writeBrandReviewDraft(token, draft, storage) {
  try {
    storage ||= window.localStorage
    const count = draft.listing.length + draft.feedback.length
    if (count) storage.setItem(brandReviewDraftKey(token), JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }))
    else storage.removeItem(brandReviewDraftKey(token))
    return { ok: true, count }
  } catch { return { ok: false, count: draft.listing.length + draft.feedback.length } }
}
