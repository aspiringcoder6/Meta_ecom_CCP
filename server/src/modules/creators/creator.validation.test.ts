import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../utils/api-error.js'
import { validateCreatorInput } from './creator.validation.js'

test('normalizes a valid creator payload and defaults optional fields', () => {
  const creator = validateCreatorInput({ tiktokId: '@LinhNgo Daily!', tiktokLink: 'TikTok profile Linh', category: ['BEAUTY', 'SKINCARE'], type: 'VIDEO / LIVESTREAM', concept: 'Review hằng ngày', productFocus: 'Serum' })
  assert.equal(creator.tiktokId, '@LinhNgo Daily!')
  assert.equal(creator.tiktokLink, 'TikTok profile Linh')
  assert.equal(creator.name, '@LinhNgo Daily!')
  assert.deepEqual(creator.category, ['BEAUTY', 'SKINCARE'])
  assert.deepEqual(creator.type, ['VIDEO', 'LIVESTREAM'])
  assert.equal(creator.cost, 0)
  assert.equal(creator.historicalCampaign, 'Đã hợp tác')
  assert.equal(creator.concept, 'Review hằng ngày')
  assert.equal(creator.productFocus, 'Serum')
})

test('accepts boolean collaboration values', () => {
  assert.equal(validateCreatorInput({ tiktokId: 'creator.one', tiktokLink: 'https://www.tiktok.com/@creator.one', historicalCampaign: true }).historicalCampaign, 'Đã hợp tác')
  assert.equal(validateCreatorInput({ tiktokId: 'creator.two', tiktokLink: 'https://www.tiktok.com/@creator.two', historicalCampaign: false }).historicalCampaign, 'Chưa hợp tác')
})

test('only requires TikTok ID and TikTok Link to be non-empty', () => {
  assert.throws(() => validateCreatorInput({ tiktokId: '', tiktokLink: '', followers: -1 }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'CREATOR_VALIDATION_ERROR')
    assert.deepEqual(Object.keys(error.details as object).sort(), ['followers', 'tiktokId', 'tiktokLink'])
    return true
  })
})

test('defaults an empty category to OTHER', () => {
  const creator = validateCreatorInput({ tiktokId: 'creator.other', tiktokLink: 'creator-link', category: '' })
  assert.deepEqual(creator.category, ['OTHER'])
})

test('keeps only main category and subcategory', () => {
  const creator = validateCreatorInput({
    tiktokId: 'creator.fashion',
    tiktokLink: 'creator-link',
    category: 'Fashion > Female > Purse, Hat, Fashion > Male > Shoes',
  })
  assert.deepEqual(creator.category, ['FASHION > Female', 'FASHION > Hat', 'FASHION > Male'])
})

test('accepts arbitrary category roots and keeps their hierarchy', () => {
  const creator = validateCreatorInput({
    tiktokId: 'creator.dynamic',
    tiktokLink: 'creator-link',
    category: 'abc > cde, fgh, Newborns & Maternity > Baby Product',
  })
  assert.deepEqual(creator.category, ['abc > cde', 'abc > fgh', 'Newborns & Maternity > Baby Product'])
})
