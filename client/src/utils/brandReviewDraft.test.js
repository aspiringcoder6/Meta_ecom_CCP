import assert from 'node:assert/strict'
import test from 'node:test'
import { brandReviewDraftKey, createBrandReviewDraft, readBrandReviewDraft, restoreBrandReviewDraft, writeBrandReviewDraft } from './brandReviewDraft.js'
import { initialClientResponses, reconcileListingDrafts } from './clientReviewSubmission.js'
import { deliverableFeedbackState } from './campaignDeliverables.js'

function campaign() {
  return { id: 'CMP', creators: ['c1', 'c2'].map((creatorId) => ({ creatorId, clientDecision: 'APPROVED', creatorConfirmed: true, clientNote: '', brandProducts: [], deliverables: [{ id: `d-${creatorId}`, brandFeedback: '' }] })) }
}
function memoryStorage() {
  const data = new Map()
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) }
}

test('listing decisions, notes, products and feedback survive closing/reopening with token isolation', () => {
  const before = campaign()
  const responses = initialClientResponses(before)
  responses.c1.note = ' Chờ gửi '
  responses.c1.brandProducts = 'A, B, '
  responses.c2.decision = 'PENDING'
  const feedback = { ...deliverableFeedbackState(before), 'c1:d-c1': 'Feedback nháp' }
  const draft = createBrandReviewDraft(before, responses, feedback)
  const storage = memoryStorage()
  assert.equal(writeBrandReviewDraft('token-a', draft, storage).ok, true)
  assert.equal(readBrandReviewDraft('token-b', storage), null)
  const restored = restoreBrandReviewDraft(before, readBrandReviewDraft('token-a', storage))
  assert.deepEqual(restored.responses, responses)
  assert.equal(restored.feedback['c1:d-c1'], 'Feedback nháp')
  assert.equal(restored.restoredCount, 3)
})

test('partial save removes only acknowledged changes and retains failed rows/other-tab feedback', () => {
  const before = campaign()
  const responses = initialClientResponses(before)
  responses.c1.note = 'Saved'; responses.c2.note = 'Failed'
  const after = structuredClone(before)
  after.creators[0].clientNote = 'Saved'
  const remaining = reconcileListingDrafts(before, after, responses, ['c1'])
  const draft = createBrandReviewDraft(after, remaining, { 'c1:d-c1': 'Unsent feedback' })
  assert.deepEqual(draft.listing.map(({ creatorId }) => creatorId), ['c2'])
  assert.equal(draft.feedback.length, 1)
  const storage = memoryStorage()
  writeBrandReviewDraft('token', draft, storage)
  assert.equal(restoreBrandReviewDraft(after, readBrandReviewDraft('token', storage)).responses.c2.note, 'Failed')
})

test('restoring only changed fields keeps fresh team updates and ignores deleted KOCs/deliverables', () => {
  const next = campaign()
  next.creators[0].brandProducts = ['New team product']
  const restored = restoreBrandReviewDraft(next, { listing: [{ creatorId: 'c1', note: 'Old unsent note' }, { creatorId: 'gone', decision: 'REJECTED' }], feedback: [{ creatorId: 'c1', id: 'deleted', brandFeedback: 'Ignore' }] })
  assert.equal(restored.responses.c1.brandProducts, 'New team product')
  assert.equal(restored.responses.c1.note, 'Old unsent note')
  assert.equal(restored.responses.gone, undefined)
  assert.equal(restored.restoredCount, 1)
})

test('all saved/discarded drafts are removed, corrupt/blocked/full storage fails safely', () => {
  const storage = memoryStorage()
  storage.setItem(brandReviewDraftKey('token'), 'invalid-json')
  assert.equal(readBrandReviewDraft('token', storage), null)
  writeBrandReviewDraft('token', { version: 1, listing: [{ creatorId: 'c1', note: 'Draft' }], feedback: [] }, storage)
  writeBrandReviewDraft('token', { version: 1, listing: [], feedback: [] }, storage)
  assert.equal(storage.getItem(brandReviewDraftKey('token')), null)
  const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('quota') }, removeItem: () => { throw new Error('blocked') } }
  assert.equal(readBrandReviewDraft('token', blocked), null)
  assert.equal(writeBrandReviewDraft('token', { listing: [{ creatorId: 'c1' }], feedback: [] }, blocked).ok, false)
})
