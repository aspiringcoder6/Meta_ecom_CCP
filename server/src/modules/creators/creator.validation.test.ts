import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../utils/api-error.js'
import { validateCreatorInput } from './creator.validation.js'

test('normalizes a valid creator payload', () => {
  const creator = validateCreatorInput({ name: 'Linh Ngô', tiktokId: '@LinhNgo.Daily', segment: 'MASSIVE', category: 'LIFESTYLE', type: 'VIDEO', cost: 42_000_000, extraCost: 2_000_000, followers: 845_000, gmvMonth: 1_250_000_000 })
  assert.equal(creator.tiktokId, 'linhngo.daily')
  assert.equal(creator.tiktokLink, 'https://www.tiktok.com/@linhngo.daily')
  assert.equal(creator.bookingPrice, 42_000_000)
})

test('returns field-level validation details', () => {
  assert.throws(() => validateCreatorInput({ name: '', tiktokId: 'bad id', followers: -1 }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'CREATOR_VALIDATION_ERROR')
    assert.deepEqual(Object.keys(error.details as object).sort(), ['followers', 'tiktokId'])
    return true
  })
})
