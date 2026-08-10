import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionToken, verifySessionToken } from './token.js'

test('creates a signed session with role, version and CSRF token', () => {
  const session = createSessionToken({ id: 'user-test-id', role: 'ADMIN', tokenVersion: 3 })
  const payload = verifySessionToken(session.token)
  assert.equal(payload.sub, 'user-test-id')
  assert.equal(payload.role, 'ADMIN')
  assert.equal(payload.tokenVersion, 3)
  assert.equal(payload.csrfToken, session.csrfToken)
  assert.ok(session.csrfToken.length >= 32)
})
