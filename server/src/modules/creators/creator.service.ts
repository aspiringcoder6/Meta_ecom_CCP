import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { calculateBookingPricing } from '../../utils/pricing.js'
import { validateCreatorArray, validateCreatorInput, type CreatorInput } from './creator.validation.js'

const creatorInclude = { _count: { select: { campaigns: true } } } as const

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'CR'
}

function stringList(value: unknown, fallback: string) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  const singleValue = String(value || '').trim()
  return singleValue ? [singleValue] : [fallback]
}

function categoryPathKey(value: unknown) {
  return String(value || '').split(/\s*>\s*/).map((part) => part.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim()).filter(Boolean).join('>')
}

function normalizeCategoryList(values: unknown) {
  const seen = new Set<string>()
  return stringList(values, 'OTHER').map((value) => value.split(/\s*>\s*/).map((part) => part.trim()).filter(Boolean).slice(0, 2).join(' > ')).filter((value) => {
    const key = categoryPathKey(value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function categoryPathMatches(candidate: unknown, selected: unknown) {
  const candidateKey = categoryPathKey(candidate)
  const selectedKey = categoryPathKey(selected)
  return Boolean(candidateKey && selectedKey && (candidateKey === selectedKey || candidateKey.startsWith(`${selectedKey}>`)))
}

function mergeCategoryLists(current: string[], imported: string[]) {
  let merged = normalizeCategoryList(current)
  for (const importedPath of normalizeCategoryList(imported)) {
    const importedParts = importedPath.split(/\s*>\s*/).filter(Boolean)
    if (importedParts.length > 1) {
      const importedRootKey = categoryPathKey(importedParts[0])
      const hasExistingRoot = merged.some((currentPath) => categoryPathKey(currentPath).split('>')[0] === importedRootKey)
      if (hasExistingRoot) {
        merged = merged.filter((currentPath) => {
          const currentParts = currentPath.split(/\s*>\s*/).filter(Boolean)
          return !(currentParts.length === 1 && categoryPathKey(currentParts[0]) === importedRootKey)
        })
      }
    }
    merged = normalizeCategoryList([...merged, importedPath])
  }
  return merged
}

export function toCreatorDto(creator: Record<string, unknown>) {
  const name = String(creator.name)
  const tiktokId = String(creator.tiktokId)
  const cost = Number(creator.cost || 0)
  const count = creator._count as { campaigns?: number } | undefined
  return {
    id: creator.id, name, handle: tiktokId.startsWith('@') ? tiktokId : `@${tiktokId}`, initials: initials(name), platform: 'TikTok',
    tiktokLink: creator.tiktokLink, tiktokId, segment: creator.segment || 'MINI', category: normalizeCategoryList(creator.category), type: stringList(creator.type, 'VIDEO'),
    cost, extraCost: Number(creator.extraCost || 0), followers: Number(creator.followers || 0), gmvMonth: Number(creator.gmvMonth || 0),
    scope: creator.scope || '', contact: creator.contact || '', concept: creator.concept || '', productFocus: creator.productFocus || '',
    historicalCampaign: creator.historicalCampaign || 'Đã hợp tác', mcnNote: creator.mcnNote || '',
    engagement: Number(creator.engagement || 0), status: creator.status || 'Available', email: creator.email || 'Chưa cung cấp', phone: creator.phone || 'Chưa cung cấp',
    bookingPrice: Number(creator.bookingPrice ?? cost), campaigns: count?.campaigns || 0, color: '#dcecff', accent: '#1769aa',
    createdAt: creator.createdAt, updatedAt: creator.updatedAt,
  }
}

export interface CreatorFilters {
  search?: string
  segment?: string[]
  category?: string[]
  type?: string[]
  status?: string
}

export async function listCreators(filters: CreatorFilters = {}) {
  const where = {
    ...(filters.search ? { OR: [{ name: { contains: filters.search, mode: 'insensitive' as const } }, { tiktokId: { contains: filters.search, mode: 'insensitive' as const } }, { tiktokLink: { contains: filters.search, mode: 'insensitive' as const } }] } : {}),
    ...(filters.segment?.length ? { segment: { in: filters.segment } } : {}),
    ...(filters.type?.length ? { type: { hasSome: filters.type } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
  const creators = await prisma.creator.findMany({ where, include: creatorInclude, orderBy: { createdAt: 'desc' } })
  const categoryFiltered = filters.category?.length
    ? creators.filter((creator) => filters.category?.some((selected) => creator.category.some((category) => categoryPathMatches(category, selected))))
    : creators
  return categoryFiltered.map((creator) => toCreatorDto(creator as unknown as Record<string, unknown>))
}

export async function getCreator(id: string) {
  const creator = await prisma.creator.findUnique({ where: { id }, include: creatorInclude })
  if (!creator) throw new ApiError(404, 'Không tìm thấy Creator.', 'CREATOR_NOT_FOUND')
  return toCreatorDto(creator as unknown as Record<string, unknown>)
}

export async function createCreator(value: unknown) {
  const data = validateCreatorInput(value) as CreatorInput
  const creator = await prisma.creator.create({ data, include: creatorInclude })
  return toCreatorDto(creator as unknown as Record<string, unknown>)
}

export async function updateCreator(id: string, value: unknown) {
  const data = validateCreatorInput(value, true)
  if (!Object.keys(data).length) throw new ApiError(400, 'Không có trường nào để cập nhật.', 'EMPTY_UPDATE')
  const creator = await prisma.creator.update({ where: { id }, data, include: creatorInclude })
  return toCreatorDto(creator as unknown as Record<string, unknown>)
}

export async function deleteCreator(id: string) {
  const campaignLinks = await prisma.campaignCreator.count({ where: { creatorId: id } })
  if (campaignLinks) throw new ApiError(409, 'Creator đang thuộc Campaign và không thể xóa. Hãy lưu trữ Creator thay thế.', 'CREATOR_HAS_CAMPAIGNS')
  await prisma.creator.delete({ where: { id } })
}

export async function getCreatorMetrics() {
  const creators = await prisma.creator.findMany({ select: { category: true, followers: true, gmvMonth: true, cost: true, extraCost: true, status: true } })
  const categoryCounts = new Map<string, number>()
  let totalFollowers = 0
  let totalGmv = 0
  let totalBookingExpense = 0
  for (const creator of creators) {
    const categories = [...new Set((creator.category.length ? creator.category : ['OTHER']).map((category) => category.split(/\s*>\s*/)[0] || 'OTHER'))]
    for (const category of categories) categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    totalFollowers += creator.followers
    totalGmv += Number(creator.gmvMonth)
    totalBookingExpense += calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense
  }
  const [topCategory = '—', topCategoryCount = 0] = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0] || []
  return {
    totalCreators: creators.length,
    activeCreators: creators.filter((creator) => creator.status !== 'Archived').length,
    categoryCount: categoryCounts.size,
    topCategory: { name: topCategory, count: topCategoryCount, share: creators.length ? Math.round((topCategoryCount / creators.length) * 100) : 0 },
    totalFollowers, totalGmv, totalBookingExpense,
  }
}

export async function importCreators(value: unknown, mode: 'append' | 'replace') {
  const creators = validateCreatorArray(value)
  const ids = creators.map((creator) => creator.tiktokId)
  if (new Set(ids).size !== ids.length) throw new ApiError(422, 'File import chứa TikTok ID trùng lặp.', 'DUPLICATE_IMPORT_IDS')

  return prisma.$transaction(async (tx) => {
    const existing = await tx.creator.findMany({ where: { tiktokId: { in: ids } }, select: { tiktokId: true, category: true, type: true } })
    const existingById = new Map(existing.map((creator) => [creator.tiktokId, creator]))
    const existingIds = new Set(existing.map((creator) => creator.tiktokId))
    const newCreators = creators.filter((creator) => !existingIds.has(creator.tiktokId))
    const existingCreators = creators.filter((creator) => existingIds.has(creator.tiktokId))

    if (mode === 'replace') {
      if (newCreators.length) await tx.creator.createMany({ data: newCreators, skipDuplicates: true })
      for (const creator of existingCreators) await tx.creator.update({ where: { tiktokId: creator.tiktokId }, data: creator })
      await tx.creator.deleteMany({ where: { tiktokId: { notIn: ids }, campaigns: { none: {} } } })
      await tx.creator.updateMany({ where: { tiktokId: { notIn: ids }, campaigns: { some: {} } }, data: { status: 'Archived' } })
    } else {
      if (newCreators.length) await tx.creator.createMany({ data: newCreators, skipDuplicates: true })
      for (const creator of existingCreators) {
        const current = existingById.get(creator.tiktokId)
        await tx.creator.update({
          where: { tiktokId: creator.tiktokId },
          data: {
            ...creator,
            category: mergeCategoryLists(current?.category || [], creator.category),
            type: [...new Set([...(current?.type || []), ...creator.type])],
          },
        })
      }
    }

    const result = await tx.creator.findMany({ include: creatorInclude, orderBy: { createdAt: 'desc' } })
    return {
      creators: result.map((creator) => toCreatorDto(creator as unknown as Record<string, unknown>)),
      importedCount: creators.length,
      createdCount: newCreators.length,
      updatedCount: existingCreators.length,
      duplicateCount: 0,
    }
  }, { maxWait: 10_000, timeout: 60_000 })
}

interface BatchUpdate { id: string; changes: unknown }

export async function applyCreatorBatch(value: { creates?: unknown; updates?: unknown; deletes?: unknown }) {
  const creates = validateCreatorArray(value.creates || [])
  const updates = Array.isArray(value.updates) ? value.updates as BatchUpdate[] : []
  const deletes = Array.isArray(value.deletes) ? value.deletes.filter((id): id is string => typeof id === 'string') : []

  await prisma.$transaction(async (tx) => {
    const createIds = creates.map((creator) => creator.tiktokId)
    const protectedCreators = deletes.length && createIds.length ? await tx.creator.findMany({ where: { id: { in: deletes }, tiktokId: { in: createIds } }, select: { id: true } }) : []
    const protectedIds = new Set(protectedCreators.map((creator) => creator.id))
    const deletableIds = deletes.filter((id) => !protectedIds.has(id))
    if (deletableIds.length) {
      const linked = await tx.campaignCreator.findMany({ where: { creatorId: { in: deletableIds } }, select: { creatorId: true } })
      const linkedIds = new Set(linked.map((item) => item.creatorId))
      await tx.creator.deleteMany({ where: { id: { in: deletableIds.filter((id) => !linkedIds.has(id)) } } })
      await tx.creator.updateMany({ where: { id: { in: [...linkedIds] } }, data: { status: 'Archived' } })
    }
    if (creates.length) {
      const existingCreators = await tx.creator.findMany({ where: { tiktokId: { in: createIds } }, select: { tiktokId: true, category: true, type: true } })
      const existingById = new Map(existingCreators.map((creator) => [creator.tiktokId, creator]))
      const existingIds = new Set(existingCreators.map((creator) => creator.tiktokId))
      const newCreators = creates.filter((creator) => !existingIds.has(creator.tiktokId))
      if (newCreators.length) await tx.creator.createMany({ data: newCreators, skipDuplicates: true })
      for (const creator of creates) {
        if (existingIds.has(creator.tiktokId)) {
          const current = existingById.get(creator.tiktokId)
          await tx.creator.update({
            where: { tiktokId: creator.tiktokId },
            data: {
              ...creator,
              category: mergeCategoryLists(current?.category || [], creator.category),
              type: [...new Set([...(current?.type || []), ...creator.type])],
            },
          })
        }
      }
    }
    for (const update of updates) {
      if (!update || typeof update.id !== 'string') continue
      const changes = validateCreatorInput(update.changes, true)
      if (Object.keys(changes).length) await tx.creator.update({ where: { id: update.id }, data: changes })
    }
  }, { maxWait: 10_000, timeout: 60_000 })
  return listCreators()
}
