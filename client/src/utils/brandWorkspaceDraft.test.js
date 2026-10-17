import assert from 'node:assert/strict'
import test from 'node:test'
import { acknowledgeWorkspaceDraft, readWorkspaceDraft, workspaceDraftKey, writeWorkspaceDraft } from './brandWorkspaceDraft.js'
import { brandReviewDraftKey } from './brandReviewDraft.js'
function storage() { const entries = new Map(); return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: (key) => entries.delete(key) } }
test('cross-page Brand draft keeps baselines/decisions/products/feedback and is isolated per link', () => {
  const browser = storage()
  const draft = { version: 2, listing: { c1: { expectedRevision: 4, changes: { note: 'draft', brandProducts: 'A, B' } }, c199: { expectedRevision: 2, changes: { decision: 'APPROVED' } } }, feedback: { 'c1:d1': { creatorId: 'c1', id: 'd1', value: 'feedback', expectedRevision: 4 } } }
  assert.equal(writeWorkspaceDraft('token', draft, browser).count, 3)
  assert.deepEqual(readWorkspaceDraft('token', browser), draft)
  assert.deepEqual(readWorkspaceDraft('other-token', browser).listing, {})
  const result = acknowledgeWorkspaceDraft(draft, { savedCreatorIds: ['c1'], savedDeliverables: [] })
  assert.deepEqual(Object.keys(result.listing), ['c199']); assert.equal(Object.keys(result.feedback).length, 1)
})
test('migrates old drafts without sending/losing them and only removes legacy storage after a successful write', () => {
  const browser = storage()
  browser.setItem(brandReviewDraftKey('token'), JSON.stringify({ version: 1, listing: [{ creatorId: 'c1', note: 'legacy' }], feedback: [{ creatorId: 'c1', id: 'd1', brandFeedback: 'legacy feedback' }] }))
  const draft = readWorkspaceDraft('token', browser)
  assert.equal(draft.listing.c1.changes.note, 'legacy'); assert.equal(draft.feedback['c1:d1'].value, 'legacy feedback')
  writeWorkspaceDraft('token', draft, browser)
  assert.equal(browser.getItem(brandReviewDraftKey('token')), null)
  writeWorkspaceDraft('token', { version: 2, listing: {}, feedback: {} }, browser)
  assert.equal(browser.getItem(workspaceDraftKey('token')), null)
  assert.equal(writeWorkspaceDraft('x', draft, { setItem: () => { throw new Error('quota') } }).ok, false)
})
