import { ApiError } from '../../utils/api-error.js'
import { validateCreatorInput, type CreatorInput } from '../creators/creator.validation.js'

export type InternalImportValues = Partial<CreatorInput> & { tiktokId: string; tiktokLink: string; pic?: string }
export type InternalImportRow = { rowNumber: number; values: InternalImportValues; errors: string[] }

const fields = ['name', 'tiktokId', 'tiktokLink', 'segment', 'category', 'type', 'followers', 'gmvMonth', 'cost', 'extraCost', 'scope', 'contact', 'mcnNote']

export function validateInternalImport(value: unknown): InternalImportRow[] {
  const body = value as { rows?: unknown[] } | null
  if (!body || !Array.isArray(body.rows) || !body.rows.length) throw new ApiError(400, 'Cần có danh sách Creator để import.', 'INVALID_INTERNAL_IMPORT')
  if (body.rows.length > 5000) throw new ApiError(413, 'Mỗi lần import tối đa 5.000 dòng.', 'INTERNAL_IMPORT_LIMIT')
  return body.rows.map((raw, index) => {
    const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    const rowNumber = Number.isInteger(row.rowNumber) && Number(row.rowNumber) > 0 ? Number(row.rowNumber) : index + 2
    const input = row.values && typeof row.values === 'object' && !Array.isArray(row.values) ? row.values as Record<string, unknown> : {}
    const values = Object.fromEntries(fields.filter((field) => input[field] !== undefined && input[field] !== null && input[field] !== '').map((field) => [field, input[field]]))
    // Identity is always required, including updates. Blank optional cells preserve existing data.
    values.tiktokId = String(input.tiktokId ?? '').trim()
    values.tiktokLink = String(input.tiktokLink ?? '').trim()
    try {
      const validated = validateCreatorInput(values, true) as InternalImportValues
      for (const field of ['cost', 'extraCost', 'gmvMonth'] as const) {
        if (validated[field] !== undefined && validated[field]! >= 1e16) throw new ApiError(422, `${field} vượt giới hạn lưu trữ.`, 'IMPORT_NUMBER_LIMIT')
      }
      if (input.pic != null && String(input.pic).trim()) validated.pic = String(input.pic).trim()
      return { rowNumber, values: validated, errors: [] }
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
      const details = error.details as Record<string, string> | undefined
      return { rowNumber, values: values as InternalImportValues, errors: details ? Object.values(details) : [error.message] }
    }
  })
}
