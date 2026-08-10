import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../utils/api-error.js'
import { validateLogin, validateSignup } from './auth.validation.js'

test('normalizes a valid pending account signup', () => {
  const result = validateSignup({ name: 'Nguyễn Minh Anh', email: '  MINH.ANH@EXAMPLE.COM ', password: 'Secure123', department: 'marketing' })
  assert.deepEqual(result, { name: 'Nguyễn Minh Anh', email: 'minh.anh@example.com', password: 'Secure123', department: 'marketing' })
})

test('requires a strong password and known department', () => {
  assert.throws(() => validateSignup({ name: 'A', email: 'invalid', password: 'weak', department: 'unknown' }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'SIGNUP_VALIDATION_ERROR')
    assert.deepEqual(Object.keys(error.details as object).sort(), ['department', 'email', 'name', 'password'])
    return true
  })
})

test('accepts email or username as a login identifier', () => {
  assert.deepEqual(validateLogin({ identifier: ' Admin.User ', password: 'Secret123', rememberMe: true }), { identifier: 'admin.user', password: 'Secret123', rememberMe: true })
})
