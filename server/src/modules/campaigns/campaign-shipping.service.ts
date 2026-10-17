import { Prisma } from '../../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { validateShippingUpdate, type ShippingChanges, type ShippingItem } from './campaign-shipping.validation.js'

type Actor = { name: string; type: 'BRAND' | 'TEAM' }
const shippingInclude = { events: { orderBy: { createdAt: 'desc' as const }, take: 8 } } satisfies Prisma.CampaignShipmentInclude

export function shipmentDto(shipment: Record<string, unknown>) {
  return { id: shipment.id, creatorId: shipment.creatorId, items: shipment.items, status: shipment.status,
    carrier: shipment.carrier, trackingCode: shipment.trackingCode, sentDate: shipment.sentDate,
    expectedDate: shipment.expectedDate, receivedDate: shipment.receivedDate, note: shipment.note,
    teamReceipt: shipment.teamReceipt, confirmedBy: shipment.confirmedBy, confirmedAt: shipment.confirmedAt,
    revision: shipment.revision, lastBrandRevision: shipment.lastBrandRevision || 0, updatedBy: shipment.updatedBy, updatedByType: shipment.updatedByType,
    updatedAt: shipment.updatedAt, createdAt: shipment.createdAt,
    events: ((shipment.events || []) as Record<string, unknown>[]).map(({ id, actor, actorType, snapshot, createdAt }) => ({ id, actor, actorType, snapshot, createdAt })),
  }
}

function sameChanges(current: Record<string, unknown>, changes: ShippingChanges) {
  return Object.entries(changes).every(([key, value]) => JSON.stringify(current[key]) === JSON.stringify(value))
}

export async function saveShipments(campaign: { id: string; externalId: string; name: string }, raw: unknown, actor: Actor, database = prisma) {
  if (!Array.isArray(raw) || raw.length > 200 || !raw.length) throw new ApiError(422, 'Mỗi lần lưu từ 1–200 đợt giao hàng.', 'INVALID_SHIPPING_BATCH')
  const saved: ReturnType<typeof shipmentDto>[] = []
  const errors: { id: string; creatorId: string; message: string; code: string; current?: ReturnType<typeof shipmentDto> }[] = []
  let changedCount = 0
  for (const input of raw) {
    try {
      const update = validateShippingUpdate(input, actor.type === 'TEAM')
      const receipt = await database.$transaction(async (tx) => {
        const assignment = await tx.campaignCreator.findUnique({ where: { campaignId_creatorId: { campaignId: campaign.id, creatorId: update.creatorId } }, select: { id: true, clientDecision: true, kocDecision: true, creatorConfirmed: true } })
        if (!assignment || assignment.clientDecision !== 'APPROVED' || !(assignment.kocDecision === 'APPROVED' || assignment.creatorConfirmed)) throw new ApiError(422, 'KOC chưa được Brand và KOC cùng đồng ý hoặc không thuộc Campaign.', 'SHIPPING_KOC_NOT_ACCEPTED')
        // One row lock per shipment, not a lock on the entire Campaign.
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CampaignShipment" WHERE "id" = ${update.id} FOR UPDATE`)
        const current = await tx.campaignShipment.findUnique({ where: { id: update.id }, include: shippingInclude })
        if (current && current.campaignCreatorId !== assignment.id) throw new ApiError(403, 'Đợt giao hàng không thuộc KOC này.', 'SHIPMENT_SCOPE_MISMATCH')
        if (current && sameChanges(current, update.changes)) return { shipment: { ...current, creatorId: update.creatorId }, changed: false }
        if ((current?.revision || 0) !== update.expectedRevision) throw new ApiError(409, 'Có người vừa cập nhật đợt giao hàng. Đối chiếu bản mới trước khi lưu lại.', 'SHIPMENT_CONFLICT', { current: current ? shipmentDto({ ...current, creatorId: update.creatorId }) : null })
        const items = update.changes.items || current?.items as ShippingItem[] | undefined
        if (!items?.length) throw new ApiError(422, 'Thêm ít nhất một sản phẩm cho đợt gửi.', 'INVALID_SHIPMENT')
        const status = update.changes.status || current?.status || 'NOT_SENT'
        const sentDate = update.changes.sentDate ?? current?.sentDate ?? ''
        const expectedDate = update.changes.expectedDate ?? current?.expectedDate ?? ''
        const receivedDate = update.changes.receivedDate ?? current?.receivedDate ?? ''
        if (sentDate && ((expectedDate && expectedDate < sentDate) || (receivedDate && receivedDate < sentDate))) throw new ApiError(422, 'Ngày dự kiến nhận/ngày nhận không được trước ngày gửi.', 'INVALID_SHIPMENT')
        const received = items.reduce((total, item) => total + item.receivedQuantity, 0)
        const quantity = items.reduce((total, item) => total + item.quantity, 0)
        if (status === 'DELIVERED' && received !== quantity) throw new ApiError(422, 'Đã nhận đủ yêu cầu số đã nhận bằng số gửi của tất cả sản phẩm.', 'INVALID_SHIPMENT')
        if (status === 'PARTIAL' && (received === 0 || received === quantity)) throw new ApiError(422, 'Nhận một phần cần số đã nhận lớn hơn 0 và nhỏ hơn số gửi.', 'INVALID_SHIPMENT')
        const confirmationChanged = update.changes.teamReceipt !== undefined
        const deliveryChanged = ['items', 'status', 'carrier', 'trackingCode'].some((key) => Object.hasOwn(update.changes, key))
        const data = {
          ...update.changes, items: items as unknown as Prisma.InputJsonValue,
          ...(confirmationChanged ? { confirmedBy: update.changes.teamReceipt === 'UNCONFIRMED' ? '' : actor.name, confirmedAt: update.changes.teamReceipt === 'UNCONFIRMED' ? null : new Date() } : actor.type === 'BRAND' && deliveryChanged ? { teamReceipt: 'UNCONFIRMED', confirmedBy: '', confirmedAt: null } : {}),
          updatedBy: actor.name, updatedByType: actor.type,
          ...(actor.type === 'BRAND' ? { lastBrandRevision: (current?.revision || 0) + 1 } : {}),
        }
        const shipment = current
          ? await tx.campaignShipment.update({ where: { id: update.id }, data: { ...data, revision: { increment: 1 } } })
          : await tx.campaignShipment.create({ data: { ...data, id: update.id, campaignCreatorId: assignment.id } })
        await tx.shipmentEvent.create({ data: { shipmentId: shipment.id, actor: actor.name, actorType: actor.type,
          snapshot: { ...update.changes, revision: shipment.revision } as unknown as Prisma.InputJsonValue } })
        const events = await tx.shipmentEvent.findMany({ where: { shipmentId: shipment.id }, orderBy: { createdAt: 'desc' }, take: 8 })
        return { shipment: { ...shipment, creatorId: update.creatorId, events }, changed: true }
      }, { maxWait: 5000, timeout: 10000 })
      saved.push(shipmentDto(receipt.shipment))
      if (receipt.changed) changedCount++
    } catch (error) {
      const item = input as Record<string, unknown> | null
      const known = error instanceof ApiError
      // A concurrent first creation may race with an earlier retry; do not overwrite it.
      const code = known ? error.code : 'SHIPMENT_SAVE_FAILED'
      const details = known ? error.details as { current?: ReturnType<typeof shipmentDto> } | undefined : undefined
      errors.push({ id: String(item?.id || ''), creatorId: String(item?.creatorId || ''), code,
        message: known ? error.message : 'Chưa lưu được đợt giao hàng. Dữ liệu đang nhập vẫn được giữ, hãy thử lại.', ...(details?.current ? { current: details.current } : {}) })
    }
  }
  // A notification failure must never turn committed shipments into a failed save.
  if (changedCount && actor.type === 'BRAND') {
    try {
      const recipients = await database.user.findMany({ where: { status: 'ACTIVE', role: { in: ['ADMIN', 'CAMPAIGN_MANAGER'] } }, select: { id: true } })
      for (const user of recipients) {
        const unread = await unreadShipping(campaign.id, user.id, database)
        if (!unread.shipments) continue
        const detail = `${campaign.name} · ${unread.creators} KOC / ${unread.shipments} đợt hàng chưa xem`
        await database.notification.upsert({ where: { userId_dedupeKey: { userId: user.id, dedupeKey: `brand-shipping:${campaign.id}` } },
          create: { userId: user.id, campaignId: campaign.id, dedupeKey: `brand-shipping:${campaign.id}`, message: 'Brand cập nhật giao/nhận hàng', detail, href: `/campaigns/${campaign.externalId}?tab=shipping&unread=1`, icon: 'briefcase' },
          update: { read: false, createdAt: new Date(), detail },
        })
      }
    } catch (error) { console.error('Shipping notification delivery failed', error instanceof Error ? error.message : 'unknown error') }
  }
  return { saved, errors, savedCount: saved.length, changedCount }
}

export async function unreadShipping(campaignId: string, userId: string, database = prisma) {
  const counts = await database.$queryRaw<{ shipments: number; creators: number }[]>(Prisma.sql`
    SELECT COUNT(*)::int AS shipments, COUNT(DISTINCT cc."creatorId")::int AS creators
    FROM "CampaignShipment" s JOIN "CampaignCreator" cc ON cc."id" = s."campaignCreatorId"
    LEFT JOIN "ShipmentRead" r ON r."shipmentId" = s."id" AND r."userId" = ${userId}
    WHERE cc."campaignId" = ${campaignId} AND s."lastBrandRevision" > COALESCE(r."brandRevision", 0)
  `)
  return counts[0] || { shipments: 0, creators: 0 }
}

export async function markShippingRead(campaign: { id: string; name: string }, userId: string, raw: unknown, database = prisma) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 100) throw new ApiError(422, 'Mỗi lần xác nhận đã xem tối đa 100 đợt hàng.', 'INVALID_SHIPPING_READ')
  const rows = raw.flatMap((value) => value && typeof value.id === 'string' && Number.isInteger(value.revision) && value.revision >= 0 ? [{ id: value.id, revision: value.revision }] : [])
  if (!rows.length) throw new ApiError(422, 'Thiếu phiên bản đã xem.', 'INVALID_SHIPPING_READ')
  // LEAST prevents acknowledging unseen future edits; GREATEST prevents delayed
  // requests from undoing a newer read marker. Each user's read state is separate.
  await database.$executeRaw(Prisma.sql`
    INSERT INTO "ShipmentRead" ("shipmentId", "userId", "brandRevision")
    SELECT s."id", ${userId}, LEAST(s."lastBrandRevision", MAX(patch.revision))
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS patch(id text, revision int)
    JOIN "CampaignShipment" s ON s."id" = patch.id JOIN "CampaignCreator" cc ON cc."id" = s."campaignCreatorId"
    WHERE cc."campaignId" = ${campaign.id} GROUP BY s."id"
    ON CONFLICT ("shipmentId", "userId") DO UPDATE
    SET "brandRevision" = GREATEST("ShipmentRead"."brandRevision", EXCLUDED."brandRevision")
  `)
  const unread = await unreadShipping(campaign.id, userId, database)
  await database.notification.updateMany({ where: { userId, dedupeKey: `brand-shipping:${campaign.id}` }, data: {
    read: unread.shipments === 0, detail: `${campaign.name} · ${unread.creators} KOC / ${unread.shipments} đợt hàng chưa xem`,
  } })
  return unread
}
