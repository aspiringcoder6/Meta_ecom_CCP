import { ApiError } from '../../utils/api-error.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEPARTMENTS = ['sales', 'operations', 'hr', 'mcn', 'manager', 'marketing', 'agency', 'uni']

function object(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Dữ liệu không đúng định dạng.', 'INVALID_BODY')
  return value as Record<string, unknown>
}

export function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeUsername(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function validateSignup(value: unknown) {
  const input = object(value)
  const name = String(input.name || input.fullName || '').trim()
  const email = normalizeEmail(input.email)
  const password = String(input.password || '')
  const department = String(input.department || '').trim().toLowerCase()
  const errors: Record<string, string> = {}
  if (name.length < 2) errors.name = 'Họ và tên cần có ít nhất 2 ký tự.'
  if (!EMAIL_PATTERN.test(email)) errors.email = 'Email không đúng định dạng.'
  if (password.length < 8) errors.password = 'Mật khẩu cần có ít nhất 8 ký tự.'
  else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) errors.password = 'Mật khẩu cần có chữ hoa, chữ thường và ít nhất một số.'
  if (!DEPARTMENTS.includes(department)) errors.department = 'Bộ phận không hợp lệ.'
  if (Object.keys(errors).length) throw new ApiError(422, 'Thông tin đăng ký chưa hợp lệ.', 'SIGNUP_VALIDATION_ERROR', errors)
  return { name, email, password, department }
}

export function validateLogin(value: unknown) {
  const input = object(value)
  const identifier = String(input.identifier || input.email || '').trim().toLowerCase()
  const password = String(input.password || '')
  if (!identifier || !password) throw new ApiError(422, 'Hãy nhập đầy đủ thông tin đăng nhập.', 'LOGIN_VALIDATION_ERROR')
  return { identifier, password, rememberMe: Boolean(input.rememberMe) }
}

export function validateGoogleCredential(value: unknown) {
  const input = object(value)
  const credential = String(input.credential || '').trim()
  if (!credential) throw new ApiError(422, 'Google credential không hợp lệ.', 'GOOGLE_CREDENTIAL_REQUIRED')
  return { credential, department: String(input.department || '').trim().toLowerCase() || null, rememberMe: Boolean(input.rememberMe) }
}
