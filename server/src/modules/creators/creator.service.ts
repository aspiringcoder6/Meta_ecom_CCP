import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { calculateBookingPricing } from '../../utils/pricing.js'
import { validateCreatorArray, validateCreatorInput, type CreatorInput } from './creator.validation.js'

const creatorInclude = { _count: { select: { campaigns: true } } } as const
const BULK_TRANSACTION_OPTIONS = { maxWait: 20_000, timeout: 150_000 } as const

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'CR'
}

function normalizedTikTokId(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/^@+/, '')
}

function normalizedTikTokLink(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return ''
  try {
    const url = new URL(text)
    const host = url.hostname.replace(/^www\./, '')
    const path = url.pathname.replace(/\/+$/, '') || '/'
    return `${host}${path}`
  } catch {
    return text.replace(/\/+$/, '')
  }
}

type CreatorIdentity = { id: string; tiktokId: string; tiktokLink: string }

function assertCreatorIdentityRowsUnique(creators: CreatorIdentity[], affectedIds?: Set<string>) {
  const idOwners = new Map<string, CreatorIdentity>()
  const linkOwners = new Map<string, CreatorIdentity>()
  for (const creator of creators) {
    const idKey = normalizedTikTokId(creator.tiktokId)
    const linkKey = normalizedTikTokLink(creator.tiktokLink)
    const duplicateId = idOwners.get(idKey)
    const duplicateLink = linkOwners.get(linkKey)
    const conflictIsRelevant = (other: CreatorIdentity | undefined) => other && (!affectedIds || affectedIds.has(creator.id) || affectedIds.has(other.id))
    if (idKey && conflictIsRelevant(duplicateId)) {
      throw new ApiError(409, `ID TikTok đã được sử dụng bởi ${duplicateId?.tiktokId}.`, 'DUPLICATE_TIKTOK_ID', { tiktokId: 'ID TikTok đã tồn tại trong hệ thống.' })
    }
    if (linkKey && conflictIsRelevant(duplicateLink)) {
      throw new ApiError(409, `Link TikTok đã được sử dụng bởi ${duplicateLink?.tiktokId}.`, 'DUPLICATE_TIKTOK_LINK', { tiktokLink: 'Link TikTok đã tồn tại trong hệ thống.' })
    }
    if (idKey && !duplicateId) idOwners.set(idKey, creator)
    if (linkKey && !duplicateLink) linkOwners.set(linkKey, creator)
  }
}

async function assertCreatorIdentityAvailable(tiktokId: string, tiktokLink: string, excludeId?: string) {
  const creators = await prisma.creator.findMany({ select: { id: true, tiktokId: true, tiktokLink: true } })
  const candidate: CreatorIdentity = { id: excludeId || '__candidate__', tiktokId, tiktokLink }
  assertCreatorIdentityRowsUnique([...creators.filter((creator) => creator.id !== excludeId), candidate], new Set([candidate.id]))
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
    const importedRootKey = categoryPathKey(importedParts[0])
    const hasExistingRoot = merged.some((currentPath) => categoryPathKey(currentPath).split('>')[0] === importedRootKey)
    if (importedParts.length === 1 && hasExistingRoot) continue
    if (importedParts.length > 1) {
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
  await assertCreatorIdentityAvailable(data.tiktokId, data.tiktokLink)
  const creator = await prisma.creator.create({ data, include: creatorInclude })
  return toCreatorDto(creator as unknown as Record<string, unknown>)
}

export async function updateCreator(id: string, value: unknown) {
  const data = validateCreatorInput(value, true)
  if (!Object.keys(data).length) throw new ApiError(400, 'Không có trường nào để cập nhật.', 'EMPTY_UPDATE')
  const current = await prisma.creator.findUnique({ where: { id }, select: { tiktokId: true, tiktokLink: true } })
  if (!current) throw new ApiError(404, 'Không tìm thấy Creator.', 'CREATOR_NOT_FOUND')
  await assertCreatorIdentityAvailable(data.tiktokId ?? current.tiktokId, data.tiktokLink ?? current.tiktokLink, id)
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

    const importedRows = await tx.creator.findMany({ where: { tiktokId: { in: ids } }, select: { id: true } })
    const affectedIds = new Set(importedRows.map((creator) => creator.id))
    const identities = await tx.creator.findMany({ select: { id: true, tiktokId: true, tiktokLink: true } })
    assertCreatorIdentityRowsUnique(identities, affectedIds)
    const result = await tx.creator.findMany({ include: creatorInclude, orderBy: { createdAt: 'desc' } })
    return {
      creators: result.map((creator) => toCreatorDto(creator as unknown as Record<string, unknown>)),
      importedCount: creators.length,
      createdCount: newCreators.length,
      updatedCount: existingCreators.length,
      duplicateCount: 0,
    }
  }, BULK_TRANSACTION_OPTIONS)
}

interface BatchUpdate { id: string; changes: unknown }

interface ValidatedBatchUpdate {
  id: string
  changes: ReturnType<typeof validateCreatorInput>
  index: number
}

interface CreatorBatchIssue {
  operation: 'create' | 'update'
  index: number
  identifier: string
  messages: string[]
}

function batchIdentifier(value: unknown, fallback: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const creator = value as Record<string, unknown>
  return String(creator.tiktokId || creator.tiktokLink || creator.id || fallback).trim()
}

function validationMessages(error: ApiError) {
  const messages: string[] = []
  const visit = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) messages.push(value.trim())
    else if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(visit)
  }
  visit(error.details)
  return [...new Set(messages.length ? messages : [error.message])]
}

function validateBatchCreates(value: unknown, issues: CreatorBatchIssue[]) {
  if (!Array.isArray(value)) throw new ApiError(400, 'Danh sách Creator cần tạo phải là một mảng.', 'INVALID_CREATOR_LIST')
  if (value.length > 5000) throw new ApiError(413, 'Mỗi lần chỉ được xử lý tối đa 5.000 Creator.', 'CREATOR_LIMIT_EXCEEDED')
  const creators: CreatorInput[] = []
  value.forEach((creator, index) => {
    try {
      creators.push(validateCreatorInput(creator) as CreatorInput)
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
      issues.push({
        operation: 'create',
        index,
        identifier: batchIdentifier(creator, `Creator ${index + 1}`),
        messages: validationMessages(error),
      })
    }
  })
  return creators
}

function validateBatchUpdates(value: unknown, issues: CreatorBatchIssue[]) {
  if (!Array.isArray(value)) throw new ApiError(400, 'Danh sách Creator cần cập nhật phải là một mảng.', 'INVALID_CREATOR_LIST')
  if (value.length > 5000) throw new ApiError(413, 'Mỗi lần chỉ được xử lý tối đa 5.000 Creator.', 'CREATOR_LIMIT_EXCEEDED')
  const updates: ValidatedBatchUpdate[] = []
  value.forEach((rawUpdate, index) => {
    const update = rawUpdate as BatchUpdate | null
    if (!update || typeof update.id !== 'string' || !update.id.trim()) {
      issues.push({ operation: 'update', index, identifier: batchIdentifier(rawUpdate, `Creator ${index + 1}`), messages: ['Thiếu ID hệ thống của Creator cần cập nhật.'] })
      return
    }
    try {
      const changes = validateCreatorInput(update.changes, true)
      if (Object.keys(changes).length) updates.push({ id: update.id, changes, index })
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
      issues.push({
        operation: 'update',
        index,
        identifier: batchIdentifier(update.changes, update.id),
        messages: validationMessages(error),
      })
    }
  })
  return updates
}

export async function applyCreatorBatch(value: { creates?: unknown; updates?: unknown; deletes?: unknown }) {
  const issues: CreatorBatchIssue[] = []
  const creates = validateBatchCreates(value.creates || [], issues)
  const updates = validateBatchUpdates(value.updates || [], issues)
  const deletes = Array.isArray(value.deletes) ? value.deletes.filter((id): id is string => typeof id === 'string') : []
  let createdCount = 0
  let updatedCount = 0
  let deletedCount = 0

  await prisma.$transaction(async (tx) => {
    const requestedUpdateIds = updates.map((update) => update.id)
    const existingUpdateRows = requestedUpdateIds.length
      ? await tx.creator.findMany({ where: { id: { in: requestedUpdateIds } }, select: { id: true } })
      : []
    const existingUpdateIds = new Set(existingUpdateRows.map((creator) => creator.id))
    const applicableUpdates = updates.filter((update) => {
      if (existingUpdateIds.has(update.id)) return true
      issues.push({ operation: 'update', index: update.index, identifier: update.id, messages: ['Creator không còn tồn tại trong database.'] })
      return false
    })
    const affectedIds = new Set(applicableUpdates.map((update) => update.id))
    const createIds = creates.map((creator) => creator.tiktokId)
    const protectedCreators = deletes.length && createIds.length ? await tx.creator.findMany({ where: { id: { in: deletes }, tiktokId: { in: createIds } }, select: { id: true } }) : []
    const protectedIds = new Set(protectedCreators.map((creator) => creator.id))
    const deletableIds = deletes.filter((id) => !protectedIds.has(id))
    if (deletableIds.length) {
      const linked = await tx.campaignCreator.findMany({ where: { creatorId: { in: deletableIds } }, select: { creatorId: true } })
      const linkedIds = new Set(linked.map((item) => item.creatorId))
      const deleted = await tx.creator.deleteMany({ where: { id: { in: deletableIds.filter((id) => !linkedIds.has(id)) } } })
      const archived = await tx.creator.updateMany({ where: { id: { in: [...linkedIds] } }, data: { status: 'Archived' } })
      deletedCount += deleted.count + archived.count
    }
    if (creates.length) {
      const existingCreators = await tx.creator.findMany({ where: { tiktokId: { in: createIds } }, select: { tiktokId: true, category: true, type: true } })
      const existingById = new Map(existingCreators.map((creator) => [creator.tiktokId, creator]))
      const existingIds = new Set(existingCreators.map((creator) => creator.tiktokId))
      const newCreators = creates.filter((creator) => !existingIds.has(creator.tiktokId))
      if (newCreators.length) {
        const created = await tx.creator.createMany({ data: newCreators, skipDuplicates: true })
        createdCount += created.count
      }
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
          updatedCount += 1
        }
      }
      const createdOrUpdated = await tx.creator.findMany({ where: { tiktokId: { in: createIds } }, select: { id: true } })
      createdOrUpdated.forEach((creator) => affectedIds.add(creator.id))
    }
    for (const update of applicableUpdates) {
      await tx.creator.update({ where: { id: update.id }, data: update.changes })
      updatedCount += 1
    }
    const identities = await tx.creator.findMany({ select: { id: true, tiktokId: true, tiktokLink: true } })
    assertCreatorIdentityRowsUnique(identities, affectedIds)
  }, BULK_TRANSACTION_OPTIONS)
  return {
    creators: await listCreators(),
    createdCount,
    updatedCount,
    deletedCount,
    skippedCount: issues.length,
    errors: issues,
  }
}
