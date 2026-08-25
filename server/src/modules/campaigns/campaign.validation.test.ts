import assert from 'node:assert/strict'
import test from 'node:test'
import { validateCampaignCreatorChanges, validateCampaignStatus, validateCampaignUpdate, validateClientResponses, validateDeliverableFeedback } from './campaign.validation.js'

test('accepts Campaign categories and subcategories in settings', () => {
  const settings = validateCampaignUpdate({
    name: 'Summer Campaign', client: 'Meta Brand', owner: 'Campaign Owner', description: '',
    category: ['Fashion', 'Newborns & Maternity > Baby Product', 'Fashion'],
    startDate: '2026-08-01', endDate: '2026-09-01', totalBudget: 100000000, creatorBudget: null,
  })
  assert.deepEqual(settings.category, ['Fashion', 'Newborns & Maternity > Baby Product'])
})

test('accepts only the supported Campaign statuses', () => {
  assert.equal(validateCampaignStatus({ status: 'RUNNING' }), 'RUNNING')
  assert.equal(validateCampaignStatus({ status: 'COMPLETED' }), 'COMPLETED')
  assert.throws(() => validateCampaignStatus({ status: 'ACTIVE' }), /Trạng thái Campaign không hợp lệ/)
})

test('accepts only campaign-specific Internal Listings values', () => {
  assert.deepEqual(validateCampaignCreatorChanges({
    quotedCost: '12000000',
    quotedExtraCost: '1500000',
    scope: '2 video, 1 livestream',
    pic: 'Campaign Owner',
  }), {
    quotedCost: 12000000,
    quotedExtraCost: 1500000,
    scope: '2 video, 1 livestream',
    pic: 'Campaign Owner',
  })
})

test('allows clearing the campaign Cost and Extra overrides', () => {
  assert.deepEqual(validateCampaignCreatorChanges({ quotedCost: '', quotedExtraCost: null }), {
    quotedCost: null,
    quotedExtraCost: null,
  })
})

test('accepts Meta Ecom Note and the three KOC Confirm states', () => {
  assert.deepEqual(validateCampaignCreatorChanges({ metaEcomNote: 'Ưu tiên deal trong tuần', kocDecision: 'REJECTED' }), {
    metaEcomNote: 'Ưu tiên deal trong tuần',
    kocDecision: 'REJECTED',
  })
  assert.throws(() => validateCampaignCreatorChanges({ kocDecision: 'CONSIDER' }), /KOC Confirm không hợp lệ/)
})

test('accepts manual Final tracking and payment notes', () => {
  assert.deepEqual(validateCampaignCreatorChanges({ finalTracking: '30/09/2026 · Thanh toán 50%', finalNote: 'Chờ thanh toán đợt 2' }), {
    finalTracking: '30/09/2026 · Thanh toán 50%',
    finalNote: 'Chờ thanh toán đợt 2',
  })
})

test('uses Approved, Rejected and Pending for Brand Pick', () => {
  assert.deepEqual(validateClientResponses({ responses: [{ creatorId: 'creator-1', decision: 'PENDING', note: '' }] }), [
    { creatorId: 'creator-1', decision: 'PENDING', note: '' },
  ])
  assert.throws(() => validateClientResponses({ responses: [{ creatorId: 'creator-1', decision: 'CONSIDER' }] }), /Phản hồi Creator không hợp lệ/)
})

test('accepts batched Brand Feedback for multiple deliverables', () => {
  assert.deepEqual(validateDeliverableFeedback({ updates: [{ creatorId: 'creator-1', deliverables: [{ id: 'video-1', brandFeedback: 'Sửa CTA' }, { id: 'video-2', brandFeedback: '' }] }] }), [{
    creatorId: 'creator-1',
    deliverables: [{ id: 'video-1', brandFeedback: 'Sửa CTA' }, { id: 'video-2', brandFeedback: '' }],
  }])
})
