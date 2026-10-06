import { randomUUID } from 'node:crypto'
import { Prisma } from '../../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { calculateBookingPricing } from '../../utils/pricing.js'
import { normalizeProducts, sameProducts, withProductVideos } from './campaign-products.js'
import { lockReviewCreators, updateReviewCreators, type ReviewCreatorPatch } from './campaign-review-batch.js'
import { persistReviewChunks, type ReviewIssue } from './campaign-review-submission.js'
import { parseClientResponses, parseDeliverableFeedback } from './campaign.validation.js'

const campaignInclude = {
  creators: { include: { creator: true }, orderBy: { id: 'asc' as const } },
  milestones: { orderBy: { dueDate: 'asc' as const } },
  reviewLinks: { where: { revoked: false }, orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }], take: 1 },
} satisfies Prisma.CampaignInclude

type CampaignRecord = Awaited<ReturnType<typeof prisma.campaign.findFirstOrThrow<{ include: typeof campaignInclude }>>>

function dateOnly(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : ''
}

function jsonArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value : []
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function toCampaignDto(campaign: CampaignRecord) {
  return {
    id: campaign.externalId,
    databaseId: campaign.id,
    name: campaign.name,
    client: campaign.client,
    owner: campaign.owner,
    description: campaign.description || '',
    category: campaign.category,
    segmentGoals: jsonObject(campaign.segmentGoals),
    startDate: dateOnly(campaign.startDate),
    endDate: dateOnly(campaign.endDate),
    totalBudget: Number(campaign.budget || 0),
    creatorBudget: campaign.creatorBudget == null ? null : Number(campaign.creatorBudget),
    status: campaign.status,
    deliverables: jsonArray(campaign.defaultDeliverables),
    milestones: campaign.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, date: dateOnly(milestone.dueDate), owner: milestone.owner, status: milestone.status })),
    creators: campaign.creators.map((item) => ({
      creatorId: item.creatorId, name: item.creator.name, tiktokLink: item.creator.tiktokLink, tiktokId: item.creator.tiktokId, segment: item.creator.segment || '',
      category: item.creator.category, type: item.creator.type, concept: item.creator.concept || '', followers: item.creator.followers,
      gmvMonth: Number(item.creator.gmvMonth), status: item.status,
      suggestedPrice: Number(item.suggestedPrice), actualPrice: item.actualPrice == null ? '' : Number(item.actualPrice),
      expense: calculateBookingPricing(item.quotedCost ?? item.creator.cost, item.quotedExtraCost ?? item.creator.extraCost).bookingExpense,
      quotedCost: item.quotedCost == null ? '' : Number(item.quotedCost), quotedExtraCost: item.quotedExtraCost == null ? '' : Number(item.quotedExtraCost), scope: item.scope || '', pic: item.pic || '',
      metaEcomNote: item.metaEcomNote || '', brandProducts: item.brandProducts, finalTracking: item.finalTracking || '', finalNote: item.finalNote || '',
      kocDecision: item.kocDecision || (item.creatorConfirmed ? 'APPROVED' : 'PENDING'),
      deliverables: jsonArray(item.deliverablesData).length ? jsonArray(item.deliverablesData) : jsonArray(campaign.defaultDeliverables), clientDecision: item.clientDecision, clientNote: item.clientNote || '',
      clientChangedAt: item.clientChangedAt, clientChangeUnread: item.clientChangeUnread, creatorConfirmed: item.creatorConfirmed,
    })),
    reviewToken: campaign.reviewLinks[0]?.token || null,
    reviewExpiresAt: null,
    lastClientReviewAt: campaign.lastClientReviewAt,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  }
}

async function campaignRecord(identifier: string, database = prisma) {
  const campaign = await database.campaign.findFirst({ where: { OR: [{ externalId: identifier }, { id: identifier }] }, include: campaignInclude })
  if (!campaign) throw new ApiError(404, 'Không tìm thấy Campaign.', 'CAMPAIGN_NOT_FOUND')
  return campaign
}

async function nextExternalId(database = prisma) {
  const year = new Date().getFullYear()
  const prefix = `CMP-${year}-`
  const rows = await database.campaign.findMany({ where: { externalId: { startsWith: prefix } }, select: { externalId: true } })
  const highest = rows.reduce((max, row) => Math.max(max, Number(row.externalId.slice(prefix.length)) || 0), 0)
  return `${prefix}${String(highest + 1).padStart(3, '0')}`
}

function deliverableJson(value: unknown) {
  return JSON.parse(JSON.stringify(value || [])) as Prisma.InputJsonValue
}

export async function listCampaigns() {
  const campaigns = await prisma.campaign.findMany({ include: campaignInclude, orderBy: { createdAt: 'desc' } })
  return campaigns.map(toCampaignDto)
}

export async function getCampaign(identifier: string, database = prisma) {
  return toCampaignDto(await campaignRecord(identifier, database))
}

export async function updateCampaignStatus(identifier: string, status: string) {
  const campaign = await campaignRecord(identifier)
  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status },
    include: campaignInclude,
  })
  return toCampaignDto(updated)
}

export async function createCampaign(input: {
  name: string; client: string; owner: string; description: string; startDate: Date; endDate: Date; totalBudget: number; creatorBudget: number | null;
  category: string[]; segmentGoals: Record<string, number>; creators: unknown[]; milestones: unknown[]; deliverables: unknown[];
}, database = prisma) {
  const creatorIds = [...new Set(input.creators.map((item) => String((item as Record<string, unknown>)?.creatorId || '')).filter(Boolean))]
  const creators = creatorIds.length ? await database.creator.findMany({ where: { id: { in: creatorIds } } }) : []
  const creatorById = new Map(creators.map((creator) => [creator.id, creator]))
  const milestones = input.milestones.flatMap((raw) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const dueDate = new Date(String(item.date || ''))
    if (!item.title || Number.isNaN(dueDate.getTime())) return []
    return [{ title: String(item.title), dueDate, owner: String(item.owner || input.owner), status: String(item.status || 'UPCOMING') }]
  })
  const campaign = await database.campaign.create({
    data: {
      externalId: await nextExternalId(database), name: input.name, client: input.client, owner: input.owner, description: input.description,
      category: input.category, segmentGoals: deliverableJson(input.segmentGoals), startDate: input.startDate, endDate: input.endDate, budget: input.totalBudget, creatorBudget: input.creatorBudget,
      defaultDeliverables: deliverableJson(input.deliverables), status: 'DRAFT',
      milestones: { create: milestones },
      creators: { create: creatorIds.flatMap((creatorId) => {
        const creator = creatorById.get(creatorId)
        if (!creator) return []
        const pricing = calculateBookingPricing(creator.cost, creator.extraCost)
        return [{ creatorId, status: 'PROPOSED', suggestedPrice: pricing.bookingExpense, deliverablesData: deliverableJson(input.deliverables) }]
      }) },
      reviewLinks: { create: { token: randomUUID(), expiresAt: null } },
    },
    include: campaignInclude,
  })
  return toCampaignDto(campaign)
}

export async function updateCampaignInformation(identifier: string, input: {
  name: string; client: string; owner: string; description: string; category: string[]; segmentGoals: Record<string, number>;
  startDate: Date; endDate: Date; totalBudget: number; creatorBudget: number | null;
}) {
  const campaign = await campaignRecord(identifier)
  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      name: input.name,
      client: input.client,
      owner: input.owner,
      description: input.description,
      category: input.category,
      segmentGoals: deliverableJson(input.segmentGoals),
      startDate: input.startDate,
      endDate: input.endDate,
      budget: input.totalBudget,
      creatorBudget: input.creatorBudget,
    },
    include: campaignInclude,
  })
  return toCampaignDto(updated)
}

export async function addCreators(identifier: string, creatorIds: string[]) {
  const campaign = await campaignRecord(identifier)
  const existing = new Set(campaign.creators.map((item) => item.creatorId))
  const creators = await prisma.creator.findMany({ where: { id: { in: creatorIds.filter((id) => !existing.has(id)) } } })
  if (creators.length) await prisma.campaignCreator.createMany({ data: creators.map((creator) => ({
    campaignId: campaign.id, creatorId: creator.id, status: 'PROPOSED',
    suggestedPrice: calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense,
    deliverablesData: deliverableJson(campaign.defaultDeliverables),
  })), skipDuplicates: true })
  return getCampaign(campaign.id)
}

export async function updateCampaignCreator(identifier: string, creatorId: string, changes: Record<string, unknown>, database = prisma) {
  const campaign = await campaignRecord(identifier, database)
  const assignment = await database.campaignCreator.findUnique({ where: { campaignId_creatorId: { campaignId: campaign.id, creatorId } } })
  if (!assignment) throw new ApiError(404, 'Creator không thuộc Campaign.', 'CAMPAIGN_CREATOR_NOT_FOUND')
  await database.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CampaignCreator" WHERE "id" = ${assignment.id} FOR UPDATE`)
    const current = await tx.campaignCreator.findUniqueOrThrow({ where: { id: assignment.id } })
    const products = changes.brandProducts !== undefined ? normalizeProducts(changes.brandProducts) : current.brandProducts
    const stored = jsonArray(current.deliverablesData)
    const deliverables = changes.deliverables ?? (stored.length ? stored : jsonArray(campaign.defaultDeliverables))
    await tx.campaignCreator.update({ where: { id: assignment.id }, data: {
      ...(changes.status !== undefined ? { status: String(changes.status) } : {}),
      ...(Object.hasOwn(changes, 'actualPrice') ? { actualPrice: changes.actualPrice == null ? null : Number(changes.actualPrice) } : {}),
      ...(Object.hasOwn(changes, 'quotedCost') ? { quotedCost: changes.quotedCost == null ? null : Number(changes.quotedCost) } : {}),
      ...(Object.hasOwn(changes, 'quotedExtraCost') ? { quotedExtraCost: changes.quotedExtraCost == null ? null : Number(changes.quotedExtraCost) } : {}),
      ...(changes.scope !== undefined ? { scope: String(changes.scope) } : {}),
      ...(changes.pic !== undefined ? { pic: String(changes.pic) } : {}),
      ...(changes.metaEcomNote !== undefined ? { metaEcomNote: String(changes.metaEcomNote) } : {}),
      ...(changes.brandProducts !== undefined ? { brandProducts: products } : {}),
      ...(changes.finalTracking !== undefined ? { finalTracking: String(changes.finalTracking) } : {}),
      ...(changes.finalNote !== undefined ? { finalNote: String(changes.finalNote) } : {}),
      ...(changes.kocDecision !== undefined ? { kocDecision: String(changes.kocDecision), creatorConfirmed: String(changes.kocDecision) === 'APPROVED' } : {}),
      ...(changes.deliverables !== undefined || changes.brandProducts !== undefined ? { deliverablesData: deliverableJson(changes.brandProducts !== undefined ? withProductVideos(deliverables, products) : deliverables) } : {}),
      ...(changes.creatorConfirmed !== undefined && changes.kocDecision === undefined ? { creatorConfirmed: Boolean(changes.creatorConfirmed), kocDecision: Boolean(changes.creatorConfirmed) ? 'APPROVED' : 'PENDING' } : {}),
    } })
  })
  return getCampaign(campaign.id, database)
}

export async function removeCreator(identifier: string, creatorId: string) {
  const campaign = await campaignRecord(identifier)
  await prisma.campaignCreator.deleteMany({ where: { campaignId: campaign.id, creatorId } })
  return getCampaign(campaign.id)
}

export async function replaceMilestones(identifier: string, milestones: { title: string; dueDate: Date; owner: string; status: string }[]) {
  const campaign = await campaignRecord(identifier)
  await prisma.$transaction([
    prisma.milestone.deleteMany({ where: { campaignId: campaign.id } }),
    prisma.milestone.createMany({ data: milestones.map((milestone) => ({ ...milestone, campaignId: campaign.id })) }),
  ])
  return getCampaign(campaign.id)
}

export async function markClientChangesRead(identifier: string) {
  const campaign = await campaignRecord(identifier)
  await prisma.campaignCreator.updateMany({ where: { campaignId: campaign.id, clientChangeUnread: true }, data: { clientChangeUnread: false } })
  return getCampaign(campaign.id)
}

export async function ensureReviewLink(identifier: string, database = prisma) {
  const campaign = await campaignRecord(identifier, database)
  return database.$transaction(async (tx) => {
    // Serialize requests for the same campaign so concurrent opens cannot create different links.
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Campaign" WHERE "id" = ${campaign.id} FOR UPDATE`)
    const active = await tx.reviewLink.findFirst({
      where: { campaignId: campaign.id, revoked: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    if (active) {
      if (active.expiresAt !== null) await tx.reviewLink.update({ where: { id: active.id }, data: { expiresAt: null } })
      return { token: active.token, expiresAt: null }
    }
    const reviewLink = await tx.reviewLink.create({ data: { campaignId: campaign.id, token: randomUUID(), expiresAt: null } })
    return { token: reviewLink.token, expiresAt: null }
  })
}

async function reviewLinkRecord(token: string, database = prisma) {
  const reviewLink = await database.reviewLink.findUnique({ where: { token }, include: { campaign: { include: campaignInclude } } })
  // Also honor previously shared, non-revoked links even if their legacy expiry is in the past.
  if (!reviewLink || reviewLink.revoked) throw new ApiError(404, 'Link review không hợp lệ hoặc đã bị thu hồi.', 'REVIEW_LINK_INVALID')
  return reviewLink
}

export async function getPublicReview(token: string, database = prisma) {
  const reviewLink = await reviewLinkRecord(token, database)
  return toCampaignDto(reviewLink.campaign)
}

type ReviewCounts = { APPROVED: number; REJECTED: number; PENDING: number; notes: number; products: number }
function emptyReviewCounts(): ReviewCounts { return { APPROVED: 0, REJECTED: 0, PENDING: 0, notes: 0, products: 0 } }
function plusReviewCounts(a: ReviewCounts, b: ReviewCounts): ReviewCounts {
  return { APPROVED: a.APPROVED + b.APPROVED, REJECTED: a.REJECTED + b.REJECTED, PENDING: a.PENDING + b.PENDING, notes: a.notes + b.notes, products: a.products + b.products }
}

async function reviewSummaryNotification(tx: Prisma.TransactionClient, link: Awaited<ReturnType<typeof reviewLinkRecord>>, key: string, detail: string, deliverables: boolean, changedAt: Date) {
  const recipients = await tx.user.findMany({ where: { status: 'ACTIVE', role: { in: ['ADMIN', 'CAMPAIGN_MANAGER'] } }, select: { id: true } })
  for (const user of recipients) {
    await tx.notification.upsert({
      where: { userId_dedupeKey: { userId: user.id, dedupeKey: key } },
      create: { userId: user.id, campaignId: link.campaignId, message: `${link.campaign.client} đã cập nhật ${deliverables ? 'Deliverable' : 'Brand Review'}`, detail, icon: deliverables ? 'checkSquare' : 'userCheck', href: `/campaigns/${link.campaign.externalId}?tab=${deliverables ? 'deliverables' : 'external-listings'}`, dedupeKey: key },
      update: { detail, read: false, createdAt: changedAt },
    })
  }
}

async function reviewSubmissionCampaign(link: Awaited<ReturnType<typeof reviewLinkRecord>>, database: typeof prisma) {
  try { return await getCampaign(link.campaignId, database) }
  catch { return toCampaignDto(link.campaign) } // Earlier commits remain acknowledged if the connection drops afterwards.
}

export async function submitPublicReview(token: string, responses: unknown, database = prisma) {
  const reviewLink = await reviewLinkRecord(token, database)
  const parsed = parseClientResponses(responses)
  const responsesByCreator = new Map<string, typeof parsed.items[number]>()
  for (const response of parsed.items) responsesByCreator.set(response.creatorId, { ...responsesByCreator.get(response.creatorId), ...response })
  let committedCounts = emptyReviewCounts()
  const errors: ReviewIssue[] = [...parsed.errors]
  const savedCreatorIds: string[] = []
  const changedAt = new Date()
  const notificationKey = `client-review:${reviewLink.campaignId}:${randomUUID()}`
  const outcome = await persistReviewChunks([...responsesByCreator.values()], database, async (tx, chunk) => {
    const assignmentByCreator = await lockReviewCreators(tx, reviewLink.campaignId, chunk.map((item) => item.creatorId))
    const patches: ReviewCreatorPatch[] = []
    const feedback: Prisma.ClientFeedbackCreateManyInput[] = []
    const counts = emptyReviewCounts()
    const chunkErrors: ReviewIssue[] = []
    const accepted: string[] = []
    for (const response of chunk) {
      const assignment = assignmentByCreator.get(response.creatorId)
      if (!assignment) {
        chunkErrors.push({ row: response.row, creatorId: response.creatorId, code: 'KOC_NOT_FOUND', message: 'KOC không còn thuộc Campaign này.' })
        continue
      }
      accepted.push(response.creatorId)
      const decision = response.decision ?? assignment.clientDecision
      const note = response.note ?? (assignment.clientNote || '')
      const products = response.brandProducts === undefined ? assignment.brandProducts : normalizeProducts(response.brandProducts)
      const decisionChanged = decision !== assignment.clientDecision
      const noteChanged = note !== (assignment.clientNote || '')
      const productsChanged = !sameProducts(products, assignment.brandProducts)
      if (!decisionChanged && !noteChanged && !productsChanged) continue
      if (decisionChanged) counts[decision as 'APPROVED' | 'REJECTED' | 'PENDING'] += 1
      if (noteChanged) counts.notes += 1
      if (productsChanged) counts.products += 1
      const stored = jsonArray(assignment.deliverablesData)
      const status = decision === 'APPROVED' ? 'CLIENT_APPROVED' : decision === 'REJECTED' ? 'CLIENT_REJECTED' : 'PROPOSED'
      patches.push({
        id: assignment.id,
        ...(decisionChanged ? { clientDecision: decision, status } : {}),
        ...(noteChanged ? { clientNote: note } : {}),
        ...(productsChanged ? { brandProducts: products, deliverablesData: deliverableJson(withProductVideos(stored.length ? stored : reviewLink.campaign.defaultDeliverables, products)) } : {}),
      })
      feedback.push({ reviewLinkId: reviewLink.id, campaignCreatorId: assignment.id, action: productsChanged && !decisionChanged ? 'PRODUCT_ASSIGNMENT' : decision, comment: productsChanged ? `Sản phẩm: ${products.join(', ')}${note ? ` · ${note}` : ''}` : note })
    }
    if (patches.length) {
      await updateReviewCreators(tx, reviewLink.campaignId, patches, changedAt)
      await tx.clientFeedback.createMany({ data: feedback })
      await tx.campaign.update({ where: { id: reviewLink.campaignId }, data: { lastClientReviewAt: changedAt } })
      const total = plusReviewCounts(committedCounts, counts)
      const parts = [total.APPROVED && `đồng ý ${total.APPROVED}`, total.REJECTED && `từ chối ${total.REJECTED}`, total.PENDING && `pending ${total.PENDING}`, total.notes && `${total.notes} ghi chú`, total.products && `${total.products} KOC cập nhật sản phẩm`].filter(Boolean)
      await reviewSummaryNotification(tx, reviewLink, notificationKey, `${reviewLink.campaign.name} · ${parts.join(' · ')}`, false, changedAt)
    }
    const patchesById = new Map(patches.map((patch) => [patch.id, patch]))
    const states = [...assignmentByCreator.values()].map((state) => ({ ...state, ...(patchesById.has(state.id) ? { ...patchesById.get(state.id), clientChangedAt: changedAt, clientChangeUnread: true } : {}) }))
    return { accepted, counts, errors: chunkErrors, states }
  }, (item) => ({ row: item.row, creatorId: item.creatorId }), (receipt) => {
    savedCreatorIds.push(...receipt.accepted); errors.push(...receipt.errors)
    committedCounts = plusReviewCounts(committedCounts, receipt.counts)
    if (receipt.counts.APPROVED || receipt.counts.REJECTED || receipt.counts.PENDING || receipt.counts.notes || receipt.counts.products) reviewLink.campaign.lastClientReviewAt = changedAt
    for (const state of receipt.states) {
      const assignment = reviewLink.campaign.creators.find((item) => item.creatorId === state.creatorId)
      if (assignment) Object.assign(assignment, state)
    }
  })
  errors.push(...outcome.errors)
  return { ...await reviewSubmissionCampaign(reviewLink, database), submissionResult: { savedCount: savedCreatorIds.length, skippedCount: errors.length, savedCreatorIds, savedDeliverables: [], errors, interrupted: outcome.interrupted } }
}

export async function submitPublicDeliverableFeedback(token: string, updates: unknown, database = prisma) {
  const reviewLink = await reviewLinkRecord(token, database)
  const parsed = parseDeliverableFeedback(updates)
  const updatesByCreator = new Map<string, typeof parsed.items[number]>()
  for (const update of parsed.items) {
    const merged = new Map((updatesByCreator.get(update.creatorId)?.deliverables || []).map((item) => [item.id, item]))
    for (const item of update.deliverables) merged.set(item.id, item)
    updatesByCreator.set(update.creatorId, { ...update, deliverables: [...merged.values()] })
  }
  const errors: ReviewIssue[] = [...parsed.errors]
  const savedDeliverables: { creatorId: string; id: string }[] = []
  const changedAt = new Date()
  const notificationKey = `deliverable-feedback:${reviewLink.campaignId}:${randomUUID()}`
  let committedDeliverables = 0
  let committedCreators = 0
  const outcome = await persistReviewChunks([...updatesByCreator.values()], database, async (tx, chunk) => {
    const assignmentByCreator = await lockReviewCreators(tx, reviewLink.campaignId, chunk.map((item) => item.creatorId))
    const patches: ReviewCreatorPatch[] = []
    const feedback: Prisma.ClientFeedbackCreateManyInput[] = []
    const accepted: typeof savedDeliverables = []
    const chunkErrors: ReviewIssue[] = []
    let totalDeliverables = 0
    let changedCreators = 0
    for (const update of chunk) {
      const assignment = assignmentByCreator.get(update.creatorId)
      if (!assignment || assignment.clientDecision !== 'APPROVED' || !assignment.creatorConfirmed) {
        chunkErrors.push(...update.deliverables.map((item) => ({ row: update.row, creatorId: update.creatorId, deliverableId: item.id, code: 'KOC_NOT_ACCEPTED', message: 'KOC không còn thuộc Campaign hoặc chưa được Brand và KOC cùng đồng ý.' })))
        continue
      }
      let changedCount = 0
      const stored = jsonArray(assignment.deliverablesData)
      const currentDeliverables = stored.length ? stored : jsonArray(reviewLink.campaign.defaultDeliverables)
      const knownIds = new Set(currentDeliverables.map((raw) => raw && typeof raw === 'object' && !Array.isArray(raw) ? String(raw.id || '') : ''))
      const feedbackById = new Map<string, string>()
      for (const item of update.deliverables) {
        if (!knownIds.has(item.id)) chunkErrors.push({ row: update.row, creatorId: update.creatorId, deliverableId: item.id, code: 'DELIVERABLE_NOT_FOUND', message: 'Deliverable không còn tồn tại trong Campaign.' })
        else { feedbackById.set(item.id, item.brandFeedback); accepted.push({ creatorId: update.creatorId, id: item.id }) }
      }
      const nextDeliverables = currentDeliverables.map((raw) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
        const item = raw as Record<string, Prisma.JsonValue>
        const id = String(item.id || '')
        if (!feedbackById.has(id)) return raw
        const brandFeedback = feedbackById.get(id) || ''
        if (brandFeedback === String(item.brandFeedback || '')) return raw
        changedCount += 1
        return { ...item, brandFeedback }
      })
      if (!changedCount) continue
      totalDeliverables += changedCount
      changedCreators += 1
      patches.push({ id: assignment.id, deliverablesData: deliverableJson(nextDeliverables) })
      feedback.push({ reviewLinkId: reviewLink.id, campaignCreatorId: assignment.id, action: 'DELIVERABLE_FEEDBACK', comment: `${changedCount} deliverable được cập nhật` })
    }
    if (patches.length) {
      await updateReviewCreators(tx, reviewLink.campaignId, patches, changedAt)
      await tx.clientFeedback.createMany({ data: feedback })
      await reviewSummaryNotification(tx, reviewLink, notificationKey, `${reviewLink.campaign.name} · ${committedDeliverables + totalDeliverables} feedback · ${committedCreators + changedCreators} KOC`, true, changedAt)
    }
    const patchesById = new Map(patches.map((patch) => [patch.id, patch]))
    const states = [...assignmentByCreator.values()].map((state) => ({ ...state, ...(patchesById.has(state.id) ? { ...patchesById.get(state.id), clientChangedAt: changedAt, clientChangeUnread: true } : {}) }))
    return { accepted, errors: chunkErrors, totalDeliverables, changedCreators, states }
  }, (item) => ({ row: item.row, creatorId: item.creatorId }), (receipt) => {
    savedDeliverables.push(...receipt.accepted); errors.push(...receipt.errors)
    committedDeliverables += receipt.totalDeliverables; committedCreators += receipt.changedCreators
    for (const state of receipt.states) {
      const assignment = reviewLink.campaign.creators.find((item) => item.creatorId === state.creatorId)
      if (assignment) Object.assign(assignment, state)
    }
  })
  for (const issue of outcome.errors) {
    const update = updatesByCreator.get(issue.creatorId || '')
    errors.push(...(update ? update.deliverables.map((item) => ({ ...issue, deliverableId: item.id })) : [issue]))
  }
  return { ...await reviewSubmissionCampaign(reviewLink, database), submissionResult: { savedCount: savedDeliverables.length, skippedCount: errors.length, savedCreatorIds: [], savedDeliverables, errors, interrupted: outcome.interrupted } }
}
