import assert from 'node:assert/strict'
import test from 'node:test'
import { initialClientResponses, reconcileFeedbackDrafts, reconcileListingDrafts, reviewIssuesFor, reviewSubmissionMessage, reviewSubmissionResult } from './clientReviewSubmission.js'
import { deliverableFeedbackState } from './campaignDeliverables.js'

function campaign(size = 2) {
  return { creators: Array.from({ length: size }, (_, index) => ({
    creatorId: `c${index + 1}`, clientDecision: 'APPROVED', creatorConfirmed: true,
    clientNote: '', brandProducts: [], deliverables: [{ id: `d${index + 1}`, brandFeedback: '' }],
  })) }
}

test('partial listing success resets acknowledged rows only; failed input stays exactly as typed', () => {
  const before = campaign(200)
  const drafts = initialClientResponses(before)
  for (const [id, draft] of Object.entries(drafts)) Object.assign(draft, { decision: 'REJECTED', note: ` ${id} note `, brandProducts: 'A, B' })
  const after = structuredClone(before)
  for (const row of after.creators) if (row.creatorId !== 'c72') Object.assign(row, { clientDecision: 'REJECTED', clientNote: `${row.creatorId} note`, brandProducts: ['A', 'B'] })
  const savedIds = after.creators.filter((row) => row.creatorId !== 'c72').map((row) => row.creatorId)
  const next = reconcileListingDrafts(before, after, drafts, savedIds)
  assert.deepEqual(next.c72, drafts.c72)
  assert.equal(next.c1.note, 'c1 note')
  assert.equal(next.c72.note, ' c72 note ')
})

test('listing submission does not erase unsent feedback; feedback submission does not erase unsent listing fields', () => {
  const before = campaign()
  const after = structuredClone(before)
  after.creators[0].clientNote = 'Server update'
  const listing = initialClientResponses(before)
  listing.c2.note = 'Unsent listing draft'
  const feedback = { ...deliverableFeedbackState(before), 'c1:d1': 'Unsent feedback draft' }
  assert.equal(reconcileFeedbackDrafts(before, after, feedback)['c1:d1'], 'Unsent feedback draft')
  assert.equal(reconcileListingDrafts(before, after, listing).c2.note, 'Unsent listing draft')
  assert.equal(reconcileListingDrafts(before, after, listing).c1.note, 'Server update')
})

test('partial feedback preserves failed deliverables while resetting only saved IDs', () => {
  const before = campaign()
  before.creators[0].deliverables.push({ id: 'd-extra', brandFeedback: '' })
  const feedback = { 'c1:d1': 'Saved', 'c1:d-extra': ' Retry this ', 'c2:d2': 'Also saved' }
  const after = structuredClone(before)
  after.creators[0].deliverables[0].brandFeedback = 'Saved'
  after.creators[1].deliverables[0].brandFeedback = 'Also saved'
  const next = reconcileFeedbackDrafts(before, after, feedback, [{ creatorId: 'c1', id: 'd1' }, { creatorId: 'c2', id: 'd2' }])
  assert.deepEqual(next, feedback)
  const result = { savedCount: 2, savedCreatorIds: [], savedDeliverables: [], errors: [{ creatorId: 'c1', deliverableId: 'd-extra', message: 'Failed' }] }
  assert.equal(reviewIssuesFor(result, 'c1', 'd1').length, 0)
  assert.equal(reviewIssuesFor(result, 'c1', 'd-extra').length, 1)
  assert.match(reviewSubmissionMessage(result, true), /Đã lưu 2 feedback/)
  assert.match(reviewSubmissionMessage(result, true), /1 mục chưa lưu/)
})

test('complete failure keeps all drafts and zero saves are never announced as success for all rows', () => {
  const before = campaign()
  const drafts = initialClientResponses(before)
  drafts.c1.note = 'Retain'
  const result = { savedCount: 0, savedCreatorIds: [], errors: [{ creatorId: 'c1', message: 'Connection interrupted' }], interrupted: true }
  assert.deepEqual(reviewSubmissionResult({ ...before, submissionResult: result }, []), result)
  assert.equal(reconcileListingDrafts(before, before, drafts, result.savedCreatorIds).c1.note, 'Retain')
  assert.match(reviewSubmissionMessage(result), /Đã lưu 0 thay đổi/)
})

test('legacy backend results remain compatible during separate deployments', () => {
  const result = reviewSubmissionResult(campaign(), [{ creatorId: 'c1' }])
  assert.equal(result.savedCount, 1)
  assert.deepEqual(result.savedCreatorIds, ['c1'])
  const feedbackResult = reviewSubmissionResult(campaign(), [{ creatorId: 'c1', deliverables: [{ id: 'd1' }, { id: 'd2' }] }], true)
  assert.equal(feedbackResult.savedCount, 2)
})
