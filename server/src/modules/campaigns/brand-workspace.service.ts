import { Prisma } from '../../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { calculateBookingPricing } from '../../utils/pricing.js'
import { brandCampaign } from './brand-access.js'
import { shipmentDto } from './campaign-shipping.service.js'

const profileSelect = { name: true, tiktokId: true, tiktokLink: true, segment: true, category: true, type: true, followers: true, gmvMonth: true, cost: true, extraCost: true, createdAt: true } satisfies Prisma.CreatorSelect
const listingSelect = { id: true, creatorId: true, revision: true, clientDecision: true, clientNote: true, brandProducts: true, kocDecision: true, creatorConfirmed: true,
  quotedCost: true, quotedExtraCost: true, actualPrice: true, metaEcomNote: true, creator: { select: profileSelect } } satisfies Prisma.CampaignCreatorSelect
type Listing = Prisma.CampaignCreatorGetPayload<{ select: typeof listingSelect }>
type Row = ReturnType<typeof publicListingRow> & { deliverables?: Record<string, unknown>[]; shipments?: ReturnType<typeof shipmentDto>[] }

export function publicListingRow(item: Listing) {
  // A whitelist: never serialize Cost/Extra, AGI, contact, PIC, internal financial notes or review tokens.
  return { creatorId: item.creatorId, revision: item.revision || 0, name: item.creator.name, tiktokId: item.creator.tiktokId, tiktokLink: item.creator.tiktokLink,
    segment: item.creator.segment, category: item.creator.category, type: item.creator.type,
    followers: item.creator.followers, gmvMonth: Number(item.creator.gmvMonth),
    expense: item.actualPrice == null ? calculateBookingPricing(item.quotedCost ?? item.creator.cost, item.quotedExtraCost ?? item.creator.extraCost).bookingExpense : Number(item.actualPrice),
    clientDecision: item.clientDecision, clientNote: item.clientNote || '', brandProducts: item.brandProducts,
    kocDecision: item.kocDecision || (item.creatorConfirmed ? 'APPROVED' : 'PENDING'), creatorConfirmed: item.creatorConfirmed,
    metaEcomNote: item.metaEcomNote || '', createdAt: item.creator.createdAt,
  }
}

function publicDeliverables(raw: unknown) {
  const allowed = ['id', 'product', 'progress', 'sdha', 'demoLink', 'metaEcomNote', 'brandFeedback', 'airTime', 'airLink', 'codeAds', 'codeAdsExpiry']
  return (Array.isArray(raw) ? raw : []).map((entry) => {
    const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    return Object.fromEntries(allowed.filter((key) => item[key] !== undefined).map((key) => [key, item[key]]))
  })
}

function readJson(value: unknown, fallback: unknown) {
  try { return typeof value === 'string' ? JSON.parse(value) : fallback } catch { return fallback }
}
const normalized = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const accepted = (row: Row) => row.clientDecision === 'APPROVED' && row.kocDecision === 'APPROVED'
const decisionLabel = (value: string) => ({ APPROVED: 'Đồng ý', REJECTED: 'Từ chối', PENDING: 'Pending' })[value] || value

export function pageBrandRows(rows: Row[], query: Record<string, unknown>) {
  const rawFilters = readJson(query.filters, {})
  const filters = (rawFilters && typeof rawFilters === 'object' && !Array.isArray(rawFilters) ? rawFilters : {}) as Record<string, string[]>
  const search = normalized(query.search)
  const sort = readJson(query.sort, []) as { key: string; direction: string }[]
  const pageSize = [25, 50, 100].includes(Number(query.pageSize)) ? Number(query.pageSize) : 25
  const selected = (field: string, values: unknown[]) => !Array.isArray(filters[field]) || !filters[field]!.length || values.some((value) => filters[field]!.includes(String(value)))
  const result = rows.flatMap((row) => {
    if (!selected('segment', [row.segment]) || !selected('type', row.type) || !selected('brandPick', [row.clientDecision, decisionLabel(row.clientDecision)]) || !selected('kocConfirm', [row.kocDecision, decisionLabel(row.kocDecision)])) return []
    if (Array.isArray(filters.category) && filters.category.length && !filters.category.some((path) => row.category.some((category) => normalized(category) === normalized(path) || normalized(category).startsWith(`${normalized(path)} > `)))) return []
    let deliverables = row.deliverables
    if (deliverables) deliverables = deliverables.filter((item) => selected('progress', [item.progress || 'Đang liên hệ']) && selected('product', [item.product || 'Chưa có Product']) && selected('sdha', [item.sdha ? 'Có SDHA' : 'Không SDHA']) && selected('airStatus', [item.airLink ? 'Đã có Link Air' : 'Chưa có Link Air']))
    if (row.deliverables && !deliverables?.length && Object.values(filters).some((value) => Array.isArray(value) && value.length)) return []
    let shipments = row.shipments
    if (shipments) shipments = shipments.filter((item) => selected('shippingStatus', [item.status]) && selected('teamReceipt', [item.teamReceipt]))
    if (row.shipments && !shipments?.length && ((filters.shippingStatus?.length && !filters.shippingStatus.includes('NOT_SENT')) || filters.teamReceipt?.length)) return []
    if (search && !normalized([row.name, row.tiktokId, row.clientNote, row.metaEcomNote, ...row.brandProducts, ...row.category, JSON.stringify(deliverables || []), JSON.stringify(shipments || [])].join(' ')).includes(search)) return []
    return [{ ...row, ...(deliverables ? { deliverables } : {}), ...(shipments ? { shipments } : {}) }]
  })
  const itemFields = ['product', 'progress', 'airTime', 'codeAdsExpiry', 'sdha']
  const safeSort = Array.isArray(sort) ? sort.slice(0, 8).filter((item) => item && typeof item === 'object' && ['name', 'tiktokId', 'segment', 'category', 'type', 'expense', 'followers', 'gmvMonth', 'clientDecision', 'kocDecision', 'createdAt', ...itemFields].includes(item.key)) : []
  const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })
  for (const row of result) if (row.deliverables) row.deliverables = [...row.deliverables].sort((a, b) => {
    for (const item of safeSort.filter((item) => itemFields.includes(item.key))) {
      const comparison = collator.compare(String(a[item.key] ?? ''), String(b[item.key] ?? ''))
      if (comparison) return item.direction === 'desc' ? -comparison : comparison
    }
    return 0
  })
  result.sort((a, b) => {
    for (const item of safeSort) {
      const av = itemFields.includes(item.key) ? a.deliverables?.[0]?.[item.key] : a[item.key as keyof Row]
      const bv = itemFields.includes(item.key) ? b.deliverables?.[0]?.[item.key] : b[item.key as keyof Row]
      const comparison = typeof av === 'number' && typeof bv === 'number' ? av - bv : collator.compare(String(av ?? ''), String(bv ?? ''))
      if (comparison) return item.direction === 'desc' ? -comparison : comparison
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || a.creatorId.localeCompare(b.creatorId)
  })
  const total = result.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(pages, Math.max(1, Math.floor(Number(query.page) || 1)))
  return { creators: result.slice((page - 1) * pageSize, page * pageSize), pagination: { page, pageSize, total, pages } }
}

export async function brandWorkspace(token: string, query: Record<string, unknown>, database = prisma) {
  const link = await brandCampaign(token, database)
  return workspaceData(link.campaign, query, database)
}

export async function staffShippingWorkspace(identifier: string, query: Record<string, unknown>, database = prisma, userId?: string) {
  const campaign = await database.campaign.findFirst({ where: { OR: [{ id: identifier }, { externalId: identifier }] } })
  if (!campaign) throw new ApiError(404, 'Không tìm thấy Campaign.', 'CAMPAIGN_NOT_FOUND')
  return workspaceData(campaign, { ...query, tab: 'shipping' }, database, userId)
}

async function workspaceData(campaign: Awaited<ReturnType<typeof brandCampaign>>['campaign'], query: Record<string, unknown>, database = prisma, userId?: string) {
  const link = { campaign, campaignId: campaign.id }
  const tab = String(query.tab || 'listing')
  if (!['listing', 'deliverables', 'shipping'].includes(tab)) throw new ApiError(400, 'Tab không hợp lệ.', 'INVALID_BRAND_TAB')
  // Scan only thin public fields for global filter/sort choices. JSON deliverables and
  // shipment histories are never loaded on the initial KOC Listing request.
  const assignments = await database.campaignCreator.findMany({ where: { campaignId: link.campaignId }, select: listingSelect })
  const listing = assignments.map(publicListingRow)
  const allAccepted = listing.filter(accepted)
  let rows: Row[] = tab === 'listing' ? listing : allAccepted
  if (tab === 'deliverables') {
    const payload = await database.campaignCreator.findMany({ where: { campaignId: link.campaignId, creatorId: { in: allAccepted.map((row) => row.creatorId) } }, select: { creatorId: true, deliverablesData: true } })
    const byCreator = new Map(payload.map((item) => [item.creatorId, item.deliverablesData]))
    rows = rows.map((row) => {
      const stored = byCreator.get(row.creatorId)
      return { ...row, deliverables: publicDeliverables(Array.isArray(stored) && stored.length ? stored : link.campaign.defaultDeliverables) }
    })
  }
  if (tab === 'shipping') {
    const payload = await database.campaignShipment.findMany({ where: { campaignCreator: { campaignId: link.campaignId } }, include: { campaignCreator: { select: { creatorId: true } } }, orderBy: { createdAt: 'asc' } })
    const markers = userId ? await database.shipmentRead.findMany({ where: { userId, shipmentId: { in: payload.map((item) => item.id) } } }) : []
    const seen = new Map(markers.map((item) => [item.shipmentId, item.brandRevision]))
    rows = rows.map((row) => ({ ...row, shipments: payload.filter((item) => item.campaignCreator.creatorId === row.creatorId).map((item) => ({ ...shipmentDto({ ...item, creatorId: row.creatorId }), ...(userId ? { unread: item.lastBrandRevision > (seen.get(item.id) || 0) } : {}) })) }))
    if (userId && query.unread === '1') rows = rows.filter((row) => row.shipments!.some((item) => 'unread' in item && item.unread))
  }
  const handles = readJson(query.handles, [])
  if (Array.isArray(handles) && handles.length) {
    if (handles.length > 200) throw new ApiError(422, 'Mỗi lần đối chiếu tối đa 200 KOC.', 'SHIPPING_LOOKUP_LIMIT')
    const selected = new Set(handles.map((value) => String(value).trim().replace(/^@/, '').toLowerCase()))
    rows = rows.filter((row) => selected.has(row.tiktokId.trim().replace(/^@/, '').toLowerCase()))
  }
  const unique = (values: unknown[]) => [...new Set(values.filter((value) => value !== null && value !== undefined && value !== '').map(String))].sort()
  const options = { segment: unique(listing.map((row) => row.segment)), category: unique(listing.flatMap((row) => row.category)), type: unique(listing.flatMap((row) => row.type)),
    brandPick: ['APPROVED', 'PENDING', 'REJECTED'], kocConfirm: ['APPROVED', 'PENDING', 'REJECTED'],
    product: unique(rows.flatMap((row) => (row.deliverables || []).map((item) => item.product))),
    progress: unique(rows.flatMap((row) => (row.deliverables || []).map((item) => item.progress || 'Đang liên hệ'))),
    productRecommendations: unique(listing.flatMap((row) => row.brandProducts)),
  }
  return { tab, id: link.campaign.externalId, name: link.campaign.name, description: link.campaign.description || '', client: link.campaign.client,
    startDate: link.campaign.startDate, endDate: link.campaign.endDate, status: link.campaign.status,
    summary: { total: listing.length, accepted: allAccepted.length, approved: listing.filter((row) => row.clientDecision === 'APPROVED').length,
      pending: listing.filter((row) => row.clientDecision === 'PENDING').length, rejected: listing.filter((row) => row.clientDecision === 'REJECTED').length },
    options, ...pageBrandRows(rows, query),
  }
}
