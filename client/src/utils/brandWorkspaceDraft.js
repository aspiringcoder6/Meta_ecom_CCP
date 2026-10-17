import { brandReviewDraftKey } from './brandReviewDraft.js'

export const workspaceDraftKey = (token) => `meta-ecom-brand-workspace-v2:${encodeURIComponent(token)}`
export function readWorkspaceDraft(token, storage) {
  try {
    storage ||= window.localStorage
    const value = JSON.parse(storage.getItem(workspaceDraftKey(token)))
    if (value?.version === 2 && value.listing && value.feedback && typeof value.listing === 'object' && typeof value.feedback === 'object' && !Array.isArray(value.listing) && !Array.isArray(value.feedback)) return {
      version: 2,
      listing: Object.fromEntries(Object.entries(value.listing).filter(([, entry]) => entry && entry.changes && typeof entry.changes === 'object')),
      feedback: Object.fromEntries(Object.entries(value.feedback).filter(([, entry]) => entry && typeof entry.creatorId === 'string' && typeof entry.id === 'string' && typeof entry.value === 'string')),
    }
    const old = JSON.parse(storage.getItem(brandReviewDraftKey(token)))
    if (old?.version === 1) return { version: 2,
      listing: Object.fromEntries((old.listing || []).map(({ creatorId, decision, note, brandProducts }) => [creatorId, { changes: { ...(decision !== undefined ? { decision } : {}), ...(note !== undefined ? { note } : {}), ...(brandProducts !== undefined ? { brandProducts } : {}) } }])),
      feedback: Object.fromEntries((old.feedback || []).map(({ creatorId, id, brandFeedback }) => [`${creatorId}:${id}`, { creatorId, id, value: brandFeedback }])),
    }
  } catch { /* Blocked or corrupt storage never prevents opening Brand Review. */ }
  return { version: 2, listing: {}, feedback: {} }
}
export function writeWorkspaceDraft(token, value, storage) {
  try {
    storage ||= window.localStorage
    const count = Object.keys(value.listing).length + Object.keys(value.feedback).length
    if (count) storage.setItem(workspaceDraftKey(token), JSON.stringify({ ...value, version: 2 }))
    else storage.removeItem(workspaceDraftKey(token))
    // Remove legacy data only after the v2 draft was successfully persisted.
    storage.removeItem(brandReviewDraftKey(token))
    return { ok: true, count }
  } catch { return { ok: false, count: Object.keys(value.listing).length + Object.keys(value.feedback).length } }
}

export function acknowledgeWorkspaceDraft(draft, result) {
  const listing = { ...draft.listing }, feedback = { ...draft.feedback }
  for (const id of result.savedCreatorIds || []) delete listing[id]
  for (const item of result.savedDeliverables || []) delete feedback[`${item.creatorId}:${item.id}`]
  return { version: 2, listing, feedback }
}
