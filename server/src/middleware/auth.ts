import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { AUTH_COOKIE, verifySessionToken } from '../auth/token.js'
import { isAccountRole, type AccountRole } from '../auth/roles.js'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: {
          id: string
          email: string
          username: string | null
          name: string
          role: AccountRole
          status: 'ACTIVE'
          avatarUrl: string | null
          department: string | null
        }
        csrfToken: string
      }
    }
  }
}

function cookieValue(request: Request, name: string) {
  const cookies = String(request.headers.cookie || '').split(';')
  const item = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`))
  return item ? decodeURIComponent(item.trim().slice(name.length + 1)) : ''
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = cookieValue(request, AUTH_COOKIE)
    if (!token) throw new ApiError(401, 'Bạn cần đăng nhập để tiếp tục.', 'AUTH_REQUIRED')
    const payload = verifySessionToken(token)
    if (!payload.sub || !isAccountRole(payload.role)) throw new ApiError(401, 'Phiên đăng nhập không hợp lệ.', 'INVALID_SESSION')
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || user.status !== 'ACTIVE' || !user.role || !isAccountRole(user.role) || user.tokenVersion !== payload.tokenVersion) {
      throw new ApiError(401, 'Phiên đăng nhập đã hết hiệu lực.', 'SESSION_REVOKED')
    }
    request.auth = {
      user: {
        id: user.id, email: user.email, username: user.username, name: user.name,
        role: user.role, status: 'ACTIVE', avatarUrl: user.avatarUrl, department: user.department,
      },
      csrfToken: payload.csrfToken,
    }
    next()
  } catch (error) {
    if (error instanceof ApiError) next(error)
    else next(new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 'INVALID_SESSION'))
  }
}

export function requireRoles(...roles: AccountRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth || !roles.includes(request.auth.user.role)) {
      next(new ApiError(403, 'Role hiện tại không có quyền thực hiện thao tác này.', 'FORBIDDEN'))
      return
    }
    next()
  }
}

export function requireCsrf(request: Request, _response: Response, next: NextFunction) {
  const token = request.header('x-csrf-token')
  if (!request.auth || !token || token !== request.auth.csrfToken) {
    next(new ApiError(403, 'Yêu cầu bảo mật không hợp lệ. Hãy tải lại trang và thử lại.', 'INVALID_CSRF_TOKEN'))
    return
  }
  next()
}
