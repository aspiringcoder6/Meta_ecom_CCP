import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../utils/api-error.js'
import { validateCreatorInput } from './creator.validation.js'

test('normalizes a valid creator payload and defaults optional fields', () => {
  const creator = validateCreatorInput({ tiktokId: '@LinhNgo.Daily', tiktokLink: 'https://www.tiktok.com/@linhngo.daily', concept: 'Review hằng ngày', productFocus: 'Serum' })
  assert.equal(creator.tiktokId, 'linhngo.daily')
  assert.equal(creator.tiktokLink, 'https://www.tiktok.com/@linhngo.daily')
  assert.equal(creator.name, 'linhngo.daily')
  assert.equal(creator.cost, 0)
  assert.equal(creator.historicalCampaign, 'Đã hợp tác')
  assert.equal(creator.concept, 'Review hằng ngày')
  assert.equal(creator.productFocus, 'Serum')
})

test('accepts boolean collaboration values', () => {
  assert.equal(validateCreatorInput({ tiktokId: 'creator.one', tiktokLink: 'https://www.tiktok.com/@creator.one', historicalCampaign: true }).historicalCampaign, 'Đã hợp tác')
  assert.equal(validateCreatorInput({ tiktokId: 'creator.two', tiktokLink: 'https://www.tiktok.com/@creator.two', historicalCampaign: false }).historicalCampaign, 'Chưa hợp tác')
})

test('requires only valid TikTok ID and TikTok Link', () => {
  assert.throws(() => validateCreatorInput({ tiktokId: 'bad id', followers: -1 }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'CREATOR_VALIDATION_ERROR')
    assert.deepEqual(Object.keys(error.details as object).sort(), ['followers', 'tiktokId', 'tiktokLink'])
    return true
  })
})
