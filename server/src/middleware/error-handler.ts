import type { ErrorRequestHandler } from 'express'
import { ApiError } from '../utils/api-error.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: { code: error.code, message: error.message, details: error.details } })
    return
  }

  const prismaCode = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (prismaCode === 'P2002') {
    response.status(409).json({ error: { code: 'DUPLICATE_TIKTOK_ID', message: 'TikTok ID đã tồn tại trong hệ thống.' } })
    return
  }
  if (prismaCode === 'P2025') {
    response.status(404).json({ error: { code: 'CREATOR_NOT_FOUND', message: 'Không tìm thấy Creator.' } })
    return
  }
  if (prismaCode === 'P2028') {
    response.status(504).json({ error: { code: 'TRANSACTION_TIMEOUT', message: 'Giao dịch xử lý quá lâu. Không có thay đổi nào được lưu; vui lòng thử lại.' } })
    return
  }
  if (prismaCode === 'P1001' || prismaCode === 'ECONNREFUSED') {
    response.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Không thể kết nối PostgreSQL.' } })
    return
  }

  console.error(error)
  response.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Đã xảy ra lỗi phía server.' } })
}
