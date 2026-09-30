import { Prisma } from '../../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { normalizedTikTokId, normalizedTikTokLink } from '../../utils/creator-identity.js'
import { calculateBookingPricing } from '../../utils/pricing.js'
import { mergeCategoryLists, toCreatorDto } from '../creators/creator.service.js'
import { validateCreatorInput, type CreatorInput } from '../creators/creator.validation.js'
import { getCampaign } from './campaign.service.js'
import type { InternalImportRow } from './campaign-import.validation.js'

export async function importInternalListings(identifier: string, rows: InternalImportRow[], database = prisma, loadCampaign = getCampaign) {
  const campaign = await database.campaign.findFirst({ where: { OR: [{ id: identifier }, { externalId: identifier }] } })
  if (!campaign) throw new ApiError(404, 'Không tìm thấy Campaign.', 'CAMPAIGN_NOT_FOUND')
  const creators = await database.creator.findMany()
  const idOwners = new Map<string, typeof creators>()
  const linkOwners = new Map<string, typeof creators>()
  const indexCreator = (creator: typeof creators[number]) => {
    const id = normalizedTikTokId(creator.tiktokId)
    const link = normalizedTikTokLink(creator.tiktokLink)
    idOwners.set(id, [...(idOwners.get(id) || []).filter((item) => item.id !== creator.id), creator])
    linkOwners.set(link, [...(linkOwners.get(link) || []).filter((item) => item.id !== creator.id), creator])
  }
  creators.forEach(indexCreator)
  const seenIds = new Set<string>()
  const seenLinks = new Set<string>()
  const seenCreators = new Set<string>()
  const savedIds: string[] = []
  const addedCreatorIds: string[] = []
  const updatedCreatorIds: string[] = []
  const result = { createdCount: 0, addedCount: 0, updatedCount: 0, skippedCount: 0, interrupted: false, errors: [] as { rowNumber: number; tiktokId: string; message: string }[] }
  const skip = (row: InternalImportRow, message: string) => {
    result.skippedCount += 1
    result.errors.push({ rowNumber: row.rowNumber, tiktokId: row.values.tiktokId || '', message })
  }

  for (const [index, row] of rows.entries()) {
    if (row.errors.length) { skip(row, row.errors.join('; ')); continue }
    const input = row.values
    const id = normalizedTikTokId(input.tiktokId)
    const link = normalizedTikTokLink(input.tiktokLink)
    const matches = [...new Map([...(idOwners.get(id) || []), ...(linkOwners.get(link) || [])].map((creator) => [creator.id, creator])).values()]
    if (matches.length > 1) { skip(row, 'ID và Link TikTok khớp nhiều hồ sơ khác nhau. Cần kiểm tra lại.'); continue }
    const existing = matches[0]
    if (seenIds.has(id) || seenLinks.has(link) || (existing && seenCreators.has(existing.id))) { skip(row, 'Creator trùng trong file; giữ dòng hợp lệ đầu tiên.'); continue }

    try {
      const saved = await database.$transaction(async (tx) => {
        let creator = existing
        if (creator) {
          // Update shared profile fields, never rename the matched identity or overwrite master pricing.
          const shared = Object.fromEntries(['name', 'segment', 'followers', 'gmvMonth', 'contact', 'mcnNote'].filter((field) => Object.hasOwn(input, field)).map((field) => [field, input[field as keyof typeof input]]))
          const current = await tx.creator.findUniqueOrThrow({ where: { id: creator.id } })
          creator = await tx.creator.update({ where: { id: creator.id }, data: {
            ...shared,
            ...(input.category ? { category: mergeCategoryLists(current.category, input.category) } : {}),
            ...(input.type ? { type: [...new Set([...current.type, ...input.type])] } : {}),
          } })
        } else {
          const { pic: _pic, ...creatorInput } = input
          creator = await tx.creator.create({ data: validateCreatorInput(creatorInput) as CreatorInput })
        }
        const assignment = await tx.campaignCreator.findUnique({ where: { campaignId_creatorId: { campaignId: campaign.id, creatorId: creator.id } } })
        const changes = {
          ...(input.cost !== undefined ? { quotedCost: input.cost } : {}),
          ...(input.extraCost !== undefined ? { quotedExtraCost: input.extraCost } : {}),
          ...(input.scope !== undefined ? { scope: input.scope } : {}),
          ...(input.pic !== undefined ? { pic: input.pic } : {}),
        }
        if (assignment) await tx.campaignCreator.update({ where: { id: assignment.id }, data: changes })
        else await tx.campaignCreator.create({ data: {
          campaignId: campaign.id, creatorId: creator.id, ...changes,
          suggestedPrice: calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense,
          deliverablesData: campaign.defaultDeliverables as Prisma.InputJsonValue,
        } })
        return { creator, wasAssigned: Boolean(assignment) }
      }, { maxWait: 20_000, timeout: 30_000 })
      indexCreator(saved.creator)
      savedIds.push(saved.creator.id)
      seenIds.add(id); seenLinks.add(link); seenCreators.add(saved.creator.id)
      if (!existing) result.createdCount += 1
      if (saved.wasAssigned) { result.updatedCount += 1; updatedCreatorIds.push(saved.creator.id) }
      else { result.addedCount += 1; addedCreatorIds.push(saved.creator.id) }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2000', 'P2020'].includes(error.code)) {
        skip(row, error.code === 'P2002' ? 'ID TikTok đã tồn tại; dữ liệu có thể vừa được thay đổi. Import lại để đối chiếu.' : 'Dữ liệu vượt giới hạn lưu trữ.')
        continue
      }
      if (!savedIds.length) throw error
      // Previously committed rows remain saved; report the remaining rows explicitly on connection failure.
      result.interrupted = true
      for (const remaining of rows.slice(index)) skip(remaining, 'Chưa lưu do kết nối backend/database gián đoạn. Vui lòng import lại.')
      break
    }
  }
  const touched = savedIds.length ? await database.creator.findMany({ where: { id: { in: savedIds } }, include: { _count: { select: { campaigns: true } } } }) : []
  return { ...result, addedCreatorIds, updatedCreatorIds, campaign: await loadCampaign(campaign.id), creators: touched.map((creator) => toCreatorDto(creator as unknown as Record<string, unknown>)) }
}
