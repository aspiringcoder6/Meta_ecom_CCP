import assert from 'node:assert/strict'
import test from 'node:test'
import { campaignProductOptions, fillProductToken, normalizeProducts, productSuggestions, productToken, sameProducts, withProductVideos } from './campaignProducts.js'
import { clientResponseChanges } from './clientProductResponses.js'

test('products normalize commas, spaces, duplicates and empty values', () => {
  assert.deepEqual(normalizeProducts(' Sữa A, Kem  B, sữa a, ,\nSerum C '), ['Sữa A', 'Kem B', 'Serum C'])
  assert.equal(sameProducts(['A', 'B'], 'b,a'), true)
})

test('autocomplete replaces only the active product, including a token in the middle', () => {
  const text = 'Sữa A, Se, Kem B'
  assert.deepEqual(productToken(text, 9), { start: 6, end: 9, query: 'Se' })
  assert.deepEqual(fillProductToken(text, 9, 'Serum C'), { value: 'Sữa A, Serum C, Kem B', caret: 14 })
  assert.deepEqual(fillProductToken('Sữa A, ', 7, 'Kem B'), { value: 'Sữa A, Kem B', caret: 12 })
  assert.equal(fillProductToken('Se', 2, 'Serum C', false).value, 'Serum C')
})

test('suggestions match accented names and exclude already selected products', () => {
  assert.deepEqual(productSuggestions(['Kem B', 'Sữa A', 'Sữa B'], 'Sữa A, su', 9), ['Sữa B'])
  assert.deepEqual(productSuggestions(['Serum C', 'Kem B'], 'se', 2), ['Serum C'])
  assert.deepEqual(productSuggestions(['Serum C'], 'Serum C', 7), [])
})

test('campaign recommendations combine saved products, drafts and deliverables only in this campaign', () => {
  assert.deepEqual(campaignProductOptions({ creators: [
    { creatorId: 'a', brandProducts: ['Sữa A'], deliverables: [{ product: 'Kem B' }] },
    { creatorId: 'b', brandProducts: ['sữa a'] },
  ] }, { a: { brandProducts: 'Serum C' } }), ['Kem B', 'Serum C', 'Sữa A'])
})

test('product-only review payload never resets approval/note', () => {
  const creator = { creatorId: 'a', clientDecision: 'APPROVED', clientNote: 'OK', brandProducts: ['A'] }
  assert.deepEqual(clientResponseChanges(creator, { decision: 'APPROVED', note: ' OK ', brandProducts: 'A, B' }), { creatorId: 'a', brandProducts: ['A', 'B'] })
  assert.equal(clientResponseChanges(creator, { decision: 'APPROVED', note: 'OK', brandProducts: 'a' }), null)
})

test('optimistic product videos reuse templates, are idempotent, and preserve existing work', () => {
  const before = [{ id: 'existing', product: 'A', progress: 'Done', brandFeedback: 'OK' }, { id: 'template', status: 'NOT_STARTED' }]
  const next = withProductVideos(before, ['A', 'B', 'C'], 'creator-1')
  assert.equal(next.length, 3)
  assert.deepEqual(next[0], before[0])
  assert.equal(next[1].id, 'template')
  assert.deepEqual(next.map((item) => item.product), ['A', 'B', 'C'])
  assert.deepEqual(withProductVideos(next, ['a', 'b', 'C'], 'creator-1'), next)
  assert.deepEqual(withProductVideos(next, [], 'creator-1'), next)
})
