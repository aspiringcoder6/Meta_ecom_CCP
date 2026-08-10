import bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { ApiError } from '../../utils/api-error.js'
import { createSessionToken } from '../../auth/token.js'
import { isAccountRole } from '../../auth/roles.js'
import { normalizeEmail, normalizeUsername } from './auth.validation.js'

const googleClient = new OAuth2Client()

type UserRecord = Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>

export function toUserDto(user: Pick<UserRecord, 'id' | 'email' | 'username' | 'name' | 'role' | 'status' | 'provider' | 'avatarUrl' | 'department' | 'emailVerified' | 'rejectionReason' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>) {
  return {
    id: user.id, email: user.email, username: user.username, name: user.name, role: user.role,
    status: user.status, provider: user.provider, avatarUrl: user.avatarUrl, department: user.department,
    emailVerified: user.emailVerified, rejectionReason: user.rejectionReason,
    createdAt: user.createdAt, updatedAt: user.updatedAt, lastLoginAt: user.lastLoginAt,
  }
}

function accountStateError(user: UserRecord) {
  const details = { account: toUserDto(user) }
  if (user.status === 'PENDING') return new ApiError(403, 'Tài khoản đang chờ Admin phê duyệt.', 'ACCOUNT_PENDING', details)
  if (user.status === 'REJECTED') return new ApiError(403, user.rejectionReason || 'Yêu cầu truy cập đã bị từ chối.', 'ACCOUNT_REJECTED', details)
  if (user.status === 'SUSPENDED') return new ApiError(403, 'Tài khoản đã bị tạm ngưng. Hãy liên hệ Admin.', 'ACCOUNT_SUSPENDED', details)
  return new ApiError(403, 'Tài khoản chưa được phép truy cập.', 'ACCOUNT_INACTIVE', details)
}

async function createActiveSession(user: UserRecord, rememberMe: boolean) {
  if (user.status !== 'ACTIVE') throw accountStateError(user)
  if (!user.role || !isAccountRole(user.role)) throw new ApiError(403, 'Tài khoản chưa được gán Role.', 'ROLE_NOT_ASSIGNED')
  const session = createSessionToken({ id: user.id, role: user.role, tokenVersion: user.tokenVersion }, rememberMe)
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  return { ...session, user: toUserDto(updated), rememberMe }
}

export async function signupLocal(input: { name: string; email: string; password: string; department: string }) {
  const email = normalizeEmail(input.email)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new ApiError(409, 'Email đã được đăng ký.', 'ACCOUNT_EXISTS')
  const passwordHash = await bcrypt.hash(input.password, 12)
  const user = await prisma.user.create({
    data: { email, name: input.name.trim(), passwordHash, department: input.department, provider: 'LOCAL', status: 'PENDING' },
  })
  await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_SIGNUP_LOCAL', entity: 'User', entityId: user.id } })
  return toUserDto(user)
}

export async function loginLocal(input: { identifier: string; password: string; rememberMe: boolean }) {
  const identifier = input.identifier.trim().toLowerCase()
  const user = await prisma.user.findFirst({ where: { OR: [{ email: normalizeEmail(identifier) }, { username: normalizeUsername(identifier) }] } })
  const passwordValid = user?.passwordHash ? await bcrypt.compare(input.password, user.passwordHash) : false
  if (!user || !passwordValid) throw new ApiError(401, 'Email, username hoặc mật khẩu chưa đúng.', 'INVALID_CREDENTIALS')
  return createActiveSession(user, input.rememberMe)
}

export async function authenticateGoogle(input: { credential: string; department: string | null; rememberMe: boolean }) {
  if (!env.googleClientId) throw new ApiError(503, 'Google authentication chưa được cấu hình.', 'GOOGLE_AUTH_NOT_CONFIGURED')
  let payload
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: input.credential, audience: env.googleClientId })
    payload = ticket.getPayload()
  } catch {
    throw new ApiError(401, 'Google credential không hợp lệ hoặc đã hết hạn.', 'INVALID_GOOGLE_CREDENTIAL')
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) throw new ApiError(401, 'Google account chưa xác minh email.', 'GOOGLE_EMAIL_NOT_VERIFIED')

  const email = normalizeEmail(payload.email)
  let user = await prisma.user.findFirst({ where: { OR: [{ googleSubject: payload.sub }, { email }] } })
  if (user?.googleSubject && user.googleSubject !== payload.sub) throw new ApiError(409, 'Email đã liên kết với Google account khác.', 'GOOGLE_ACCOUNT_CONFLICT')
  if (!user) {
    user = await prisma.user.create({
      data: {
        email, name: payload.name || email.split('@')[0] || 'Google User', provider: 'GOOGLE', googleSubject: payload.sub,
        avatarUrl: payload.picture || null, department: input.department, emailVerified: true, status: 'PENDING',
      },
    })
    await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_SIGNUP_GOOGLE', entity: 'User', entityId: user.id } })
  } else if (!user.googleSubject) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleSubject: payload.sub, avatarUrl: user.avatarUrl || payload.picture || null, emailVerified: true } })
  }

  if (user.status !== 'ACTIVE') return { pending: true as const, user: toUserDto(user) }
  return { pending: false as const, ...(await createActiveSession(user, input.rememberMe)) }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new ApiError(404, 'Không tìm thấy tài khoản.', 'USER_NOT_FOUND')
  return toUserDto(user)
}
