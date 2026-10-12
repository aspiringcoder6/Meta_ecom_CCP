import assert from 'node:assert/strict'
import test from 'node:test'
import { loadPublicReview, reviewLoadFailure } from './publicReviewLoad.js'

test('cold start/service errors retry without requiring any login', async () => {
  let attempts = 0
  let retries = 0
  const campaign = { id: 'CMP', creators: [] }
  const result = await loadPublicReview(async () => {
    if (++attempts === 1) throw { response: { status: 503 } }
    return campaign
  }, { onRetry: () => { retries += 1 } })
  assert.deepEqual(result, campaign)
  assert.equal(attempts, 2)
  assert.equal(retries, 1)
})

test('network and Render loading responses are not mistaken for invalid links', async () => {
  assert.equal(reviewLoadFailure({ code: 'ECONNABORTED' }).invalid, false)
  assert.equal(reviewLoadFailure({ response: { status: 503 } }).invalid, false)
  let attempts = 0
  await assert.rejects(loadPublicReview(async () => { attempts += 1; return undefined }))
  assert.equal(attempts, 2)
})

test('invalid/revoked links do not retry, and API route/config errors are not described as invalid tokens', async () => {
  const error = { response: { status: 404, data: { error: { code: 'REVIEW_LINK_INVALID' } } } }
  let attempts = 0
  await assert.rejects(loadPublicReview(async () => { attempts += 1; throw error }))
  assert.equal(attempts, 1)
  assert.equal(reviewLoadFailure(error).invalid, true)
  assert.equal(reviewLoadFailure({ response: { status: 404, data: { error: { code: 'NOT_FOUND' } } } }).invalid, false)
})

test('canceled navigation does not retry or start another request', async () => {
  let attempts = 0
  const controller = new AbortController()
  await assert.rejects(loadPublicReview(async () => { attempts += 1; controller.abort(); throw new Error('aborted') }, { signal: controller.signal }))
  assert.equal(attempts, 1)
})
