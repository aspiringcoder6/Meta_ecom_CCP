import type { prisma } from '../../lib/prisma.js'
import type { Prisma } from '../../../generated/prisma/client.js'
import { REVIEW_TRANSACTION_OPTIONS } from './campaign-review-batch.js'

export type ReviewIssue = { row?: number; creatorId?: string; deliverableId?: string; code: string; message: string }

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
}

function sqlErrorCode(error: unknown) {
  return error && typeof error === 'object' && 'meta' in error ? String((error.meta as { code?: unknown })?.code || '') : ''
}

function canIsolate(error: unknown) {
  const code = errorCode(error)
  if (['P2000', 'P2002', 'P2003', 'P2011', 'P2014', 'P2020', 'P2025', 'P2028', 'REVIEW_BATCH_CONFLICT'].includes(code)) return true
  if (code === 'P2010') return /^(22|23)/.test(sqlErrorCode(error))
  return false
}

function saveError(error: unknown, interrupted: boolean) {
  const code = errorCode(error)
  const sqlCode = code === 'P2010' ? sqlErrorCode(error) : ''
  if (code === 'P2028') return 'Dòng này xử lý quá lâu, chưa được lưu. Vui lòng thử lại.'
  if (['P2000', 'P2020'].includes(code) || ['22001', '22003'].includes(sqlCode)) return 'Dữ liệu vượt giới hạn lưu trữ. Vui lòng kiểm tra nội dung.'
  if (code === 'P2002' || sqlCode === '23505') return 'Thông tin bị trùng với dữ liệu đã lưu. Vui lòng kiểm tra lại.'
  if (code === 'P2011' || sqlCode === '23502') return 'Thiếu thông tin bắt buộc để lưu dòng này.'
  if (['P2003', 'P2025', 'REVIEW_BATCH_CONFLICT'].includes(code) || sqlCode === '23503') return 'KOC hoặc Deliverable vừa thay đổi/không còn tồn tại. Vui lòng kiểm tra lại.'
  if (sqlCode.startsWith('22')) return 'Dữ liệu không đúng định dạng để lưu. Vui lòng kiểm tra lại.'
  if (sqlCode.startsWith('23')) return 'Dữ liệu không đáp ứng điều kiện lưu trữ. Vui lòng kiểm tra lại.'
  return interrupted ? 'Việc lưu bị gián đoạn. Dòng này chưa được xác nhận lưu; vui lòng thử lại.' : 'Không thể lưu dòng này. Vui lòng kiểm tra dữ liệu và thử lại.'
}

// Commit successful chunks independently; split only a failed chunk to isolate row errors.
// Connection/system failures stop retries without undoing earlier commits.
export async function persistReviewChunks<T, R>(items: T[], database: typeof prisma, save: (tx: Prisma.TransactionClient, chunk: T[]) => Promise<R>, identify: (item: T) => Omit<ReviewIssue, 'code' | 'message'>, onCommitted: (receipt: R) => void) {
  const errors: ReviewIssue[] = []
  let interrupted = false
  const deadline = Date.now() + 60_000
  const saveChunk = async (chunk: T[]): Promise<void> => {
    if (!chunk.length) return
    if (interrupted || Date.now() >= deadline) {
      interrupted = true
      errors.push(...chunk.map((item) => ({ ...identify(item), code: 'REVIEW_INTERRUPTED', message: 'Chưa gửi do quá trình lưu bị gián đoạn. Các dòng đã gửi trước đó vẫn được giữ.' })))
      return
    }
    let receipt: R
    try {
      receipt = await database.$transaction((tx) => save(tx, chunk), REVIEW_TRANSACTION_OPTIONS)
    } catch (error) {
      if (canIsolate(error) && chunk.length > 1) {
        const middle = Math.ceil(chunk.length / 2)
        await saveChunk(chunk.slice(0, middle))
        await saveChunk(chunk.slice(middle))
        return
      }
      if (!canIsolate(error)) interrupted = true
      errors.push(...chunk.map((item) => ({ ...identify(item), code: errorCode(error) || 'REVIEW_SAVE_FAILED', message: saveError(error, interrupted) })))
      return
    }
    // A receipt is acknowledged only after the transaction has committed.
    onCommitted(receipt)
  }
  for (let start = 0; start < items.length; start += 50) await saveChunk(items.slice(start, start + 50))
  return { errors, interrupted }
}
