import assert from 'node:assert/strict'
import test from 'node:test'
import { validateInternalImport } from './campaign-import.validation.js'
import { normalizedTikTokId, normalizedTikTokLink } from '../../utils/creator-identity.js'

test('validates campaign import row by row without rejecting valid rows', () => {
  const rows = validateInternalImport({ rows: [
    { rowNumber: 3, values: { tiktokId: 'first', tiktokLink: 'any link', cost: -1 } },
    { rowNumber: 8, values: { tiktokId: 'second', tiktokLink: 'any other link', followers: 123, cost: 0, pic: 'Owner', scope: '1 video', category: ['abc > cde', 'abc > fgh'] } },
    { values: { tiktokId: 'third' } },
    { values: { tiktokId: 'overflow', tiktokLink: 'link', gmvMonth: 1e16 } },
  ] })
  assert.equal(rows[0]?.errors.length, 1)
  assert.equal(rows[1]?.errors.length, 0)
  assert.equal(rows[1]?.rowNumber, 8)
  assert.equal(rows[1]?.values.cost, 0)
  assert.equal(rows[1]?.values.pic, 'Owner')
  assert.equal(rows[2]?.errors.length, 1)
  assert.equal(rows[3]?.errors.length, 1)
})

test('whitelists import fields and does not overwrite approvals, deliverables or computed fields', () => {
  const [row] = validateInternalImport({ rows: [{ values: { tiktokId: 'alice', tiktokLink: 'link', contact: '', followers: null, status: 'CONFIRMED', clientDecision: 'APPROVED', creatorConfirmed: true, deliverables: [], bookingExpense: 2, totalCast: 3, pic: ' ' } }] })
  assert.deepEqual(row?.values, { tiktokId: 'alice', tiktokLink: 'link' })
  assert.throws(() => validateInternalImport({ rows: [] }), /danh sách/)
  assert.throws(() => validateInternalImport({ rows: Array(5001).fill({}) }), /5.000/)
})

test('identity matching ignores @/case and link protocol/query/trailing slash', () => {
  assert.equal(normalizedTikTokId('@Alice'), normalizedTikTokId('alice'))
  assert.equal(normalizedTikTokLink('https://www.tiktok.com/@alice/?lang=en'), normalizedTikTokLink('http://tiktok.com/@alice'))
})
