import { ACCOUNT_ROLES, isAccountRole, type AccountRole } from '../../auth/roles.js'
import { ApiError } from '../../utils/api-error.js'
import { normalizeEmail, normalizeUsername } from '../auth/auth.validation.js'

const USER_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const

function object(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Dữ liệu tài khoản không đúng định dạng.', 'INVALID_BODY')
  return value as Record<string, unknown>
}

export function validateUserFilters(query: Record<string, unknown>) {
  const status = query.status ? String(query.status).toUpperCase() : undefined
  if (status && !USER_STATUSES.includes(status as (typeof USER_STATUSES)[number])) throw new ApiError(422, 'Trạng thái tài khoản không hợp lệ.', 'INVALID_USER_STATUS')
  return { status: status as (typeof USER_STATUSES)[number] | undefined }
}

export function validateAdminCreate(value: unknown) {
  const input = object(value)
  const name = String(input.name || '').trim()
  const email = normalizeEmail(input.email)
  const username = normalizeUsername(input.username) || null
  const password = String(input.password || '')
  const role = String(input.role || '').toUpperCase()
  const errors: Record<string, string> = {}
  if (name.length < 2) errors.name = 'Họ và tên cần có ít nhất 2 ký tự.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email không hợp lệ.'
  if (username && !/^[a-z0-9._-]{3,40}$/.test(username)) errors.username = 'Username cần 3–40 ký tự và chỉ gồm chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.'
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) errors.password = 'Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường và số.'
  if (!isAccountRole(role)) errors.role = `Role phải là một trong: ${ACCOUNT_ROLES.join(', ')}.`
  if (Object.keys(errors).length) throw new ApiError(422, 'Thông tin tài khoản chưa hợp lệ.', 'USER_VALIDATION_ERROR', errors)
  return {
    name,
    email,
    username,
    password,
    role: role as AccountRole,
    department: String(input.department || '').trim().toLowerCase() || null,
  }
}

export function validateAdminUpdate(value: unknown) {
  const input = object(value)
  const status = input.status === undefined ? undefined : String(input.status).toUpperCase()
  const role = input.role === undefined || input.role === null || input.role === '' ? undefined : String(input.role).toUpperCase()
  if (status && !USER_STATUSES.includes(status as (typeof USER_STATUSES)[number])) throw new ApiError(422, 'Trạng thái tài khoản không hợp lệ.', 'INVALID_USER_STATUS')
  if (role && !isAccountRole(role)) throw new ApiError(422, 'Role tài khoản không hợp lệ.', 'INVALID_USER_ROLE')
  if (!status && !role) throw new ApiError(422, 'Không có thay đổi tài khoản nào được gửi lên.', 'EMPTY_USER_UPDATE')
  return {
    status: status as (typeof USER_STATUSES)[number] | undefined,
    role: role as AccountRole | undefined,
    rejectionReason: String(input.rejectionReason || '').trim() || null,
  }
}
