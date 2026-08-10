import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import type { AccountRole } from '../../auth/roles.js'
import { toUserDto } from '../auth/auth.service.js'

async function activeAdminCount() {
  return prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } })
}

async function protectAdminContinuity(target: { id: string; role: string | null; status: string }, actorId: string, next: { role?: string; status?: string }, deleting = false) {
  if (target.id === actorId && (deleting || (next.role && next.role !== 'ADMIN') || (next.status && next.status !== 'ACTIVE'))) {
    throw new ApiError(409, 'Bạn không thể xóa, hạ Role hoặc tạm ngưng chính tài khoản đang đăng nhập.', 'CANNOT_MODIFY_SELF')
  }
  const removesActiveAdmin = target.role === 'ADMIN' && target.status === 'ACTIVE' && (deleting || (next.role && next.role !== 'ADMIN') || (next.status && next.status !== 'ACTIVE'))
  if (removesActiveAdmin && await activeAdminCount() <= 1) throw new ApiError(409, 'Hệ thống phải luôn có ít nhất một Admin đang hoạt động.', 'LAST_ADMIN_REQUIRED')
}

async function audit(actorId: string, action: string, entityId: string) {
  await prisma.auditLog.create({ data: { userId: actorId, action, entity: 'User', entityId } })
}

export async function listUsers(filters: { status?: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' }) {
  const users = await prisma.user.findMany({
    where: filters.status ? { status: filters.status } : {},
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return users.map(toUserDto)
}

export async function getUserMetrics() {
  const grouped = await prisma.user.groupBy({ by: ['status'], _count: { _all: true } })
  const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count._all]))
  return {
    total: grouped.reduce((total, item) => total + item._count._all, 0),
    pending: counts.PENDING || 0, active: counts.ACTIVE || 0, rejected: counts.REJECTED || 0, suspended: counts.SUSPENDED || 0,
  }
}

export async function createUser(input: { name: string; email: string; username: string | null; password: string; role: AccountRole; department: string | null }, actorId: string) {
  const passwordHash = await bcrypt.hash(input.password, 12)
  const user = await prisma.user.create({
    data: {
      name: input.name, email: input.email, username: input.username, passwordHash, role: input.role,
      department: input.department, provider: 'LOCAL', status: 'ACTIVE', emailVerified: true,
      reviewedAt: new Date(), reviewedById: actorId,
    },
  })
  await audit(actorId, `ADMIN_CREATE_${input.role}`, user.id)
  return toUserDto(user)
}

export async function updateUser(userId: string, input: { status?: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'; role?: AccountRole; rejectionReason: string | null }, actorId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) throw new ApiError(404, 'Không tìm thấy tài khoản.', 'USER_NOT_FOUND')
  await protectAdminContinuity(target, actorId, input)

  const nextStatus = input.status || target.status
  const nextRole = input.role || target.role
  if (nextStatus === 'ACTIVE' && !nextRole) throw new ApiError(422, 'Hãy gán Role trước khi phê duyệt tài khoản.', 'ROLE_REQUIRED_FOR_APPROVAL')

  const stateChanged = input.status !== undefined && input.status !== target.status
  const roleChanged = input.role !== undefined && input.role !== target.role
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.status === 'REJECTED' ? { role: null, rejectionReason: input.rejectionReason || 'Yêu cầu truy cập không được phê duyệt.' } : {}),
      ...(input.status === 'ACTIVE' ? { rejectionReason: null } : {}),
      ...((input.status && input.status !== 'PENDING') || input.role ? { reviewedAt: new Date(), reviewedById: actorId } : {}),
      ...(stateChanged || roleChanged ? { tokenVersion: { increment: 1 } } : {}),
    },
  })
  await audit(actorId, `ADMIN_UPDATE_${user.status}_${user.role || 'NO_ROLE'}`, user.id)
  return toUserDto(user)
}

export async function deleteUser(userId: string, actorId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) throw new ApiError(404, 'Không tìm thấy tài khoản.', 'USER_NOT_FOUND')
  await protectAdminContinuity(target, actorId, {}, true)
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ])
  await audit(actorId, 'ADMIN_DELETE_USER', userId)
}
