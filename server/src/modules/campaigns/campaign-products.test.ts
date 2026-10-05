import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeProducts, sameProducts, withProductVideos } from './campaign-products.js'
import { validateCampaignCreatorChanges, validateClientResponses } from './campaign.validation.js'

test('normalizes free-text products and deduplicates case-insensitively', () => {
  assert.deepEqual(normalizeProducts(' Sữa A, Kem  B, sữa a, ,\nSerum C '), ['Sữa A', 'Kem B', 'Serum C'])
  assert.equal(sameProducts(['Sữa A', 'Kem B'], 'kem b, SỮA A'), true)
})

test('creates exactly one default video per product and reuses untouched template slots', () => {
  const template = [{ id: 'template-1', type: 'Video TikTok', deadline: '2026-11-01', description: 'Brief', status: 'NOT_STARTED' }]
  const videos = withProductVideos(template, 'Sữa A, Kem B, sữa a')
  assert.equal(videos.length, 2)
  assert.equal(videos[0]?.id, 'template-1')
  assert.equal(videos[0]?.deadline, '2026-11-01')
  assert.equal(videos[0]?.description, 'Brief')
  assert.deepEqual(videos.map((item) => item.product), ['Sữa A', 'Kem B'])
  assert.ok(videos.every((item) => item.type === 'Video TikTok' && item.progress === 'Đang liên hệ'))
  assert.deepEqual(withProductVideos(videos, 'kem b, SỮA A'), videos)
  assert.equal(template[0]?.type, 'Video TikTok', 'does not mutate the input')
})

test('preserves existing work, keeps manual livestreams, and does not delete removed products', () => {
  const current = [
    { id: 'done', type: 'VIDEO', product: 'Sữa A', progress: 'Done', brandFeedback: 'OK', airLink: 'url' },
    { id: 'manual', type: 'Video TikTok', product: '', metaEcomNote: 'Already briefed' },
    { id: 'live', type: 'Livestream', product: 'Kem B' },
  ]
  const next = withProductVideos(current, ['Sữa A', 'Kem B'])
  assert.equal(next.length, 4)
  assert.deepEqual(next.slice(0, 3), current)
  assert.equal(next[3]?.product, 'Kem B')
  assert.deepEqual(withProductVideos(next, []), next)
  assert.notEqual(withProductVideos([], 'A')[0]?.id, withProductVideos([], 'A')[0]?.id)
})

test('accepts product-only public/team updates without touching approval or notes', () => {
  assert.deepEqual(validateClientResponses({ responses: [{ creatorId: 'c1', brandProducts: 'A, B, a' }] }), [{ creatorId: 'c1', brandProducts: ['A', 'B'] }])
  assert.deepEqual(validateCampaignCreatorChanges({ brandProducts: ['A', 'B'] }), { brandProducts: ['A', 'B'] })
  assert.deepEqual(validateClientResponses({ responses: [{ creatorId: 'c1', brandProducts: [] }] }), [{ creatorId: 'c1', brandProducts: [] }])
  assert.throws(() => validateClientResponses({ responses: [{ creatorId: 'c1' }] }), /không hợp lệ/)
  assert.throws(() => validateClientResponses({ responses: [{ creatorId: 'c1', brandProducts: [12] }] }), /sản phẩm không hợp lệ/)
  assert.throws(() => validateCampaignCreatorChanges({ brandProducts: 'x'.repeat(201) }), /200 ký tự/)
})
