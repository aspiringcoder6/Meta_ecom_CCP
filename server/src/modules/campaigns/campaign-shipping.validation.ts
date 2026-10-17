import { ApiError } from '../../utils/api-error.js'

export const SHIPPING_STATUSES = ['NOT_SENT', 'SENT', 'IN_TRANSIT', 'PARTIAL', 'DELIVERED', 'ISSUE'] as const
export const TEAM_RECEIPTS = ['UNCONFIRMED', 'PARTIAL', 'CONFIRMED'] as const
export type ShippingItem = { product: string; quantity: number; receivedQuantity: number }
export type ShippingChanges = {
  items?: ShippingItem[]; status?: string; carrier?: string; trackingCode?: string; sentDate?: string;
  expectedDate?: string; receivedDate?: string; note?: string; teamReceipt?: string;
}
export type ShippingUpdate = { id: string; creatorId: string; expectedRevision: number; changes: ShippingChanges }

export function validateShippingUpdate(raw: unknown, isTeam: boolean): ShippingUpdate {
  const input = raw as Record<string, unknown> | null
  const fail = (message: string): never => { throw new ApiError(422, message, 'INVALID_SHIPMENT') }
  if (!input || typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{12,80}$/.test(input.id)) fail('ID đợt giao hàng không hợp lệ.')
  if (typeof input!.creatorId !== 'string' || !input!.creatorId.trim()) fail('Thiếu KOC nhận hàng.')
  if (!Number.isInteger(input!.expectedRevision) || Number(input!.expectedRevision) < 0) fail('Thiếu phiên bản để kiểm tra thay đổi đồng thời.')
  const source = input!.changes as Record<string, unknown> | null
  if (!source || typeof source !== 'object' || Array.isArray(source)) fail('Thiếu thông tin giao hàng.')
  const changes: Record<string, unknown> = {}
  for (const key of ['carrier', 'trackingCode', 'note', 'sentDate', 'expectedDate', 'receivedDate']) {
    if (!Object.hasOwn(source!, key)) continue
    if (typeof source![key] !== 'string') fail(`${key} phải là văn bản.`)
    const value = String(source![key]).trim()
    if (value.length > (key === 'note' ? 4000 : 250)) fail(`${key} quá dài.`)
    if (key.endsWith('Date') && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) fail('Ngày giao/nhận hàng không hợp lệ.')
    changes[key] = value
  }
  if (source!.status !== undefined) {
    if (!(SHIPPING_STATUSES as readonly unknown[]).includes(source!.status)) fail('Trạng thái giao hàng không hợp lệ.')
    changes.status = source!.status
  }
  if (source!.teamReceipt !== undefined) {
    if (!isTeam) throw new ApiError(403, 'Chỉ team được xác nhận KOC đã nhận hàng.', 'SHIPMENT_CONFIRM_FORBIDDEN')
    if (!(TEAM_RECEIPTS as readonly unknown[]).includes(source!.teamReceipt)) fail('Xác nhận nhận hàng không hợp lệ.')
    changes.teamReceipt = source!.teamReceipt
  }
  if (source!.items !== undefined) {
    if (!Array.isArray(source!.items) || !source!.items.length || source!.items.length > 100) fail('Mỗi đợt cần từ 1–100 sản phẩm.')
    changes.items = (source!.items as Record<string, unknown>[]).map((item) => {
      if (!item || typeof item.product !== 'string' || !item.product.trim() || item.product.length > 250) fail('Thiếu tên sản phẩm hoặc tên quá dài.')
      if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 10000) fail('Số lượng sản phẩm phải là số nguyên từ 1–10.000.')
      if (!Number.isInteger(item.receivedQuantity) || Number(item.receivedQuantity) < 0 || Number(item.receivedQuantity) > Number(item.quantity)) fail('Số đã nhận không được lớn hơn số gửi.')
      return { product: String(item.product).trim(), quantity: Number(item.quantity), receivedQuantity: Number(item.receivedQuantity) }
    })
  }
  if (!Object.keys(changes).length) fail('Không có trường giao hàng hợp lệ để cập nhật.')
  return { id: String(input!.id), creatorId: String(input!.creatorId), expectedRevision: Number(input!.expectedRevision), changes }
}
